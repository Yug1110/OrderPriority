-- Phase 1: online payments (Razorpay), order emails, Buy now.

alter table public.orders
  add column email               text not null default '',
  add column customer_id         uuid references auth.users (id) on delete set null,
  add column payment_status      text not null default 'none'
                                 check (payment_status in ('none', 'pending', 'paid', 'failed', 'refunded')),
  add column razorpay_order_id   text,
  add column razorpay_payment_id text,
  add column paid_at             timestamptz,
  add column invoice_no          text unique;

-- "online" = paid on the website through Razorpay; "prepaid" = paid by link/UPI after WhatsApp.
alter table public.orders drop constraint orders_payment_check;
alter table public.orders add constraint orders_payment_check check (payment in ('prepaid', 'cod', 'online'));

alter table public.orders drop constraint orders_status_check;
alter table public.orders add constraint orders_status_check check (status in
  ('awaiting_payment', 'new', 'confirmed', 'paid', 'packed', 'shipped', 'delivered', 'exchange', 'cancelled', 'returned'));

alter table public.orders drop constraint orders_source_check;
alter table public.orders add constraint orders_source_check check (source in ('bag', 'buy_now', 'quick', 'admin'));

create index orders_razorpay_order_idx on public.orders (razorpay_order_id);
create index orders_customer_idx on public.orders (customer_id);

-- Every email sent (or attempted) for an order; also prevents duplicate automatic emails.
create table public.email_log (
  id         bigint generated always as identity primary key,
  order_id   text references public.orders (id) on update cascade on delete cascade,
  kind       text not null,
  to_email   text not null,
  status     text not null check (status in ('sent', 'failed', 'skipped')),
  error      text,
  created_at timestamptz not null default now()
);
create index email_log_order_idx on public.email_log (order_id);
alter table public.email_log enable row level security;
create policy admin_all on public.email_log for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- create_order: now also takes email, payment "online" (starts as awaiting_payment) and source.
create or replace function public.create_order(p_order jsonb, p_items jsonb)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  new_id text := p_order ->> 'id';
begin
  insert into public.orders (id, source, customer_name, customer_phone, email, address, city, state, pincode, note,
                             payment, subtotal, shipping, cod_fee, total, status, payment_status, customer_id)
  select new_id, coalesce(r.source, 'bag'), coalesce(r.customer_name, ''), coalesce(r.customer_phone, ''), coalesce(r.email, ''),
         coalesce(r.address, ''), coalesce(r.city, ''), coalesce(r.state, ''), coalesce(r.pincode, ''), coalesce(r.note, ''),
         coalesce(r.payment, 'prepaid'), r.subtotal, coalesce(r.shipping, 0), coalesce(r.cod_fee, 0), r.total,
         case when r.payment = 'online' then 'awaiting_payment' else 'new' end,
         case when r.payment = 'online' then 'pending' else 'none' end,
         r.customer_id
    from jsonb_to_record(p_order) as r(source text, customer_name text, customer_phone text, email text, address text,
                                       city text, state text, pincode text, note text, payment text, subtotal int,
                                       shipping int, cod_fee int, total int, customer_id uuid);
  insert into public.order_items (order_id, product_id, colour_key, name, colour_label, size, qty, unit_price)
  select new_id, i.product_id, i.colour_key, i.name, i.colour_label, i.size, i.qty, i.unit_price
    from jsonb_to_recordset(p_items) as i(product_id text, colour_key text, name text, colour_label text,
                                          size text, qty int, unit_price int);
  return new_id;
end $$;
revoke execute on function public.create_order(jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.create_order(jsonb, jsonb) to service_role;

-- Mark an online order paid after the payment signature was verified on the
-- server. Checks the amount (in paise) against the order total. Idempotent:
-- returns 'already_paid' if it was paid before. Moving to "paid" takes the
-- items out of stock through the status trigger.
create or replace function public.mark_order_paid(p_razorpay_order_id text, p_payment_id text, p_amount_paise bigint)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  o public.orders;
begin
  select * into o from public.orders where razorpay_order_id = p_razorpay_order_id for update;
  if not found then return 'not_found'; end if;
  if o.payment_status = 'paid' then return 'already_paid'; end if;
  if p_amount_paise is not null and p_amount_paise <> o.total::bigint * 100 then return 'amount_mismatch'; end if;
  update public.orders
     set payment_status = 'paid', razorpay_payment_id = p_payment_id, paid_at = now(),
         status = case when status in ('awaiting_payment', 'new', 'cancelled') then 'paid' else status end
   where id = o.id;
  return 'paid';
end $$;
revoke execute on function public.mark_order_paid(text, text, bigint) from public, anon, authenticated;
grant execute on function public.mark_order_paid(text, text, bigint) to service_role;

-- Online orders whose payment never completed are cancelled after an hour.
create or replace function public.expire_unpaid_orders(p_minutes int default 60)
returns int
language plpgsql security definer set search_path = public
as $$
declare
  n int;
begin
  update public.orders set status = 'cancelled', payment_status = 'failed'
   where status = 'awaiting_payment' and created_at < now() - make_interval(mins => p_minutes);
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function public.expire_unpaid_orders(int) from public, anon, authenticated;
grant execute on function public.expire_unpaid_orders(int) to service_role;

-- Stats: online orders that were never paid are "abandoned" and left out of
-- placed/cancelled counts (reported separately).
create or replace function public.admin_stats(p_from timestamptz, p_to timestamptz)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  result jsonb;
begin
  if not public.is_admin() then
    raise exception 'not authorised' using errcode = '42501';
  end if;

  with period as (
    select * from public.orders where created_at >= p_from and created_at < p_to
  ), o as (
    select * from period where not (payment = 'online' and paid_at is null)
  ), sold as (
    select * from o where public.status_holds_stock(status)
  )
  select jsonb_build_object(
    'placed',     (select count(*) from o),
    'confirmed',  (select count(*) from sold),
    'revenue',    (select coalesce(sum(total), 0) from sold),
    'aov',        (select coalesce(round(avg(total)), 0) from sold),
    'cod_orders', (select count(*) from sold where payment = 'cod'),
    'online_orders', (select count(*) from sold where payment = 'online'),
    'abandoned',  (select count(*) from period where payment = 'online' and paid_at is null),
    'cancelled',  (select count(*) from o where status in ('cancelled', 'returned')),
    'by_status',  (select coalesce(jsonb_object_agg(status, n), '{}'::jsonb)
                     from (select status, count(*) n from period group by status) t),
    'top_products', (select coalesce(jsonb_agg(t order by t.qty desc), '[]'::jsonb) from (
                       select i.name, sum(i.qty) qty, sum(i.qty * i.unit_price) revenue
                         from public.order_items i join sold on sold.id = i.order_id
                        group by i.name order by 2 desc limit 5) t),
    'daily', (select coalesce(jsonb_agg(t order by t.day), '[]'::jsonb) from (
                select to_char(date_trunc('day', created_at at time zone 'Asia/Kolkata'), 'YYYY-MM-DD') as day,
                       count(*) as orders,
                       coalesce(sum(total) filter (where public.status_holds_stock(status)), 0) as revenue
                  from o group by 1) t)
  ) into result;
  return result;
end $$;
revoke execute on function public.admin_stats(timestamptz, timestamptz) from public, anon;
