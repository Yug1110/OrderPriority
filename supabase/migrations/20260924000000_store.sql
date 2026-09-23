-- Wynoak store: catalogue, stock, orders, settings, admins.
--
-- Access model
--   * anon / public: no direct table access. The storefront reads through
--     /api/catalog and writes orders through /api/orders, which use the
--     service-role key on the server (service role bypasses RLS).
--   * authenticated users listed in public.admins: full access (admin app).

-- ---------------------------------------------------------------- tables

create table public.categories (
  id    text primary key check (id ~ '^[a-z0-9-]+$'),
  label text not null,
  blurb text not null default '',
  sort  int  not null default 0
);

create table public.products (
  id          text primary key check (id ~ '^[a-z0-9-]+$'),
  name        text not null,
  category    text references public.categories (id) on update cascade on delete set null,
  description text not null default '',
  fabric      text not null default '',
  price       int  not null check (price >= 0),
  mrp         int  check (mrp is null or mrp >= 0),
  badge       text,
  status      text not null default 'active' check (status in ('active', 'hidden')),
  sort        int  not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- One row per colour of a product. `images` holds ordered image base paths
-- (without the ".webp" / "-sm.webp" suffix), either site-relative
-- ("assets/products/…") or storage paths served via /media/ ("media/…").
create table public.product_colours (
  product_id text not null references public.products (id) on update cascade on delete cascade,
  colour_key text not null check (colour_key ~ '^[a-z0-9-]+$'),
  label      text not null,
  hex        text not null default '#e9ddd0',
  sort       int  not null default 0,
  images     text[] not null default '{}',
  primary key (product_id, colour_key)
);

-- Stock per colour and size. No row = not tracked (always available).
-- qty may go negative if more is confirmed than was in stock; the admin
-- app highlights that.
create table public.stock (
  product_id text not null,
  colour_key text not null,
  size       text not null,
  qty        int  not null default 0,
  primary key (product_id, colour_key, size),
  foreign key (product_id, colour_key)
    references public.product_colours (product_id, colour_key) on update cascade on delete cascade
);

-- Store settings (brand, contact, fees, policy values). Single row.
create table public.settings (
  id         int primary key default 1 check (id = 1),
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
insert into public.settings (id) values (1);

create table public.orders (
  id             text primary key,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  source         text not null default 'bag' check (source in ('bag', 'quick', 'admin')),
  customer_name  text not null default '',
  customer_phone text not null default '',
  address        text not null default '',
  city           text not null default '',
  state          text not null default '',
  pincode        text not null default '',
  note           text not null default '',
  payment        text not null default 'prepaid' check (payment in ('prepaid', 'cod')),
  subtotal       int  not null default 0,
  shipping       int  not null default 0,
  cod_fee        int  not null default 0,
  total          int  not null default 0,
  status         text not null default 'new' check (status in
                   ('new', 'confirmed', 'paid', 'packed', 'shipped', 'delivered', 'exchange', 'cancelled', 'returned')),
  courier        text not null default '',
  tracking       text not null default '',
  admin_notes    text not null default '',
  history        jsonb not null default '[]'::jsonb,
  stock_applied  boolean not null default false
);
create index orders_created_at_idx on public.orders (created_at desc);
create index orders_status_idx on public.orders (status);

create table public.order_items (
  id           bigint generated always as identity primary key,
  order_id     text not null references public.orders (id) on update cascade on delete cascade,
  product_id   text not null,
  colour_key   text not null,
  name         text not null,
  colour_label text not null,
  size         text not null,
  qty          int  not null check (qty > 0),
  unit_price   int  not null check (unit_price >= 0)
);
create index order_items_order_idx on public.order_items (order_id);

create table public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  email      text not null,
  invited_by uuid,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- helpers

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();
create trigger settings_touch before update on public.settings
  for each row execute function public.touch_updated_at();
create trigger orders_touch before update on public.orders
  for each row execute function public.touch_updated_at();

-- Statuses in which an order's items are taken out of stock.
create or replace function public.status_holds_stock(s text)
returns boolean language sql immutable as $$
  select s in ('confirmed', 'paid', 'packed', 'shipped', 'delivered', 'exchange');
$$;

-- On status change: record history; take items out of stock when an order
-- is confirmed (or later) and put them back when it is cancelled, returned
-- or reset to "new". Only tracked stock rows are touched.
create or replace function public.orders_on_status()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  sign int := 0;
begin
  if new.status is distinct from old.status then
    new.history := coalesce(old.history, '[]'::jsonb) || jsonb_build_object(
      'at', now(), 'from', old.status, 'to', new.status,
      'by', coalesce(auth.jwt() ->> 'email', 'system'));
  end if;

  if public.status_holds_stock(new.status) and not old.stock_applied then
    sign := -1;
    new.stock_applied := true;
  elsif not public.status_holds_stock(new.status) and old.stock_applied then
    sign := 1;
    new.stock_applied := false;
  end if;

  if sign <> 0 then
    update public.stock s
       set qty = s.qty + sign * i.qty
      from (select product_id, colour_key, size, sum(qty) as qty
              from public.order_items where order_id = new.id
             group by 1, 2, 3) i
     where s.product_id = i.product_id and s.colour_key = i.colour_key and s.size = i.size;
  end if;
  return new;
end $$;

create trigger orders_status before update on public.orders
  for each row execute function public.orders_on_status();

-- Save an order and its items in one transaction (called by /api/orders
-- with the service-role key; not callable from browsers).
create or replace function public.create_order(p_order jsonb, p_items jsonb)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  new_id text := p_order ->> 'id';
begin
  insert into public.orders (id, source, customer_name, customer_phone, address, city, state, pincode, note,
                             payment, subtotal, shipping, cod_fee, total)
  select new_id, coalesce(r.source, 'bag'), coalesce(r.customer_name, ''), coalesce(r.customer_phone, ''),
         coalesce(r.address, ''), coalesce(r.city, ''), coalesce(r.state, ''), coalesce(r.pincode, ''), coalesce(r.note, ''),
         coalesce(r.payment, 'prepaid'), r.subtotal, coalesce(r.shipping, 0), coalesce(r.cod_fee, 0), r.total
    from jsonb_to_record(p_order) as r(source text, customer_name text, customer_phone text, address text, city text, state text,
                                       pincode text, note text, payment text, subtotal int, shipping int,
                                       cod_fee int, total int);
  insert into public.order_items (order_id, product_id, colour_key, name, colour_label, size, qty, unit_price)
  select new_id, i.product_id, i.colour_key, i.name, i.colour_label, i.size, i.qty, i.unit_price
    from jsonb_to_recordset(p_items) as i(product_id text, colour_key text, name text, colour_label text,
                                          size text, qty int, unit_price int);
  return new_id;
end $$;
revoke execute on function public.create_order(jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.create_order(jsonb, jsonb) to service_role;

-- Dashboard numbers for a period. "Revenue" counts orders that were
-- confirmed or later and not cancelled/returned.
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

  with o as (
    select * from public.orders where created_at >= p_from and created_at < p_to
  ), sold as (
    select * from o where public.status_holds_stock(status)
  )
  select jsonb_build_object(
    'placed',     (select count(*) from o),
    'confirmed',  (select count(*) from sold),
    'revenue',    (select coalesce(sum(total), 0) from sold),
    'aov',        (select coalesce(round(avg(total)), 0) from sold),
    'cod_orders', (select count(*) from sold where payment = 'cod'),
    'cancelled',  (select count(*) from o where status in ('cancelled', 'returned')),
    'by_status',  (select coalesce(jsonb_object_agg(status, n), '{}'::jsonb)
                     from (select status, count(*) n from o group by status) t),
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

-- ---------------------------------------------------------------- security

alter table public.categories      enable row level security;
alter table public.products        enable row level security;
alter table public.product_colours enable row level security;
alter table public.stock           enable row level security;
alter table public.settings        enable row level security;
alter table public.orders          enable row level security;
alter table public.order_items     enable row level security;
alter table public.admins          enable row level security;

create policy admin_all on public.categories      for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_all on public.products        for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_all on public.product_colours for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_all on public.stock           for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_all on public.settings        for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_all on public.orders          for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_all on public.order_items     for all to authenticated using (public.is_admin()) with check (public.is_admin());
-- Admins can see the team and remove members; adding goes through /api/admin-invite.
create policy admin_read   on public.admins for select to authenticated using (public.is_admin());
create policy admin_delete on public.admins for delete to authenticated using (public.is_admin() and user_id <> auth.uid());

revoke execute on function public.admin_stats(timestamptz, timestamptz) from public, anon;

-- ---------------------------------------------------------------- storage
-- Public bucket for product photos uploaded from the admin app.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 5242880, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

create policy media_admin_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and public.is_admin());
create policy media_admin_update on storage.objects for update to authenticated
  using (bucket_id = 'media' and public.is_admin());
create policy media_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'media' and public.is_admin());
