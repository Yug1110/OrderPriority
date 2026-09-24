-- Run: docker exec -i supabase_db_wynoak psql -U postgres -v ON_ERROR_STOP=1 < supabase/tests/payments_test.sql
begin;
create temp table results (name text, ok boolean, detail text);
grant all on results to anon, authenticated;
insert into public.stock values ('hooded-teddy-suit', 'cream', '6–12M', 5);

select public.create_order(
  '{"id":"PAY-1","source":"buy_now","customer_name":"A","customer_phone":"9876543210","email":"a@test","address":"x","payment":"online","subtotal":999,"total":999}',
  '[{"product_id":"hooded-teddy-suit","colour_key":"cream","name":"Teddy","colour_label":"Cream","size":"6–12M","qty":2,"unit_price":999}]');
update public.orders set razorpay_order_id = 'order_T1' where id = 'PAY-1';
insert into results select 'online order starts awaiting_payment', status = 'awaiting_payment' and payment_status = 'pending', status || '/' || payment_status from public.orders where id = 'PAY-1';
insert into results select 'awaiting does not take stock', qty = 5, qty::text from public.stock where product_id = 'hooded-teddy-suit' and colour_key = 'cream' and size = '6–12M';

insert into results select 'wrong amount rejected', public.mark_order_paid('order_T1', 'pay_x', 100) = 'amount_mismatch', 'mismatch';
insert into results select 'unknown order', public.mark_order_paid('order_nope', 'pay_x', 99900) = 'not_found', 'not_found';
insert into results select 'correct amount marks paid', public.mark_order_paid('order_T1', 'pay_1', 99900) = 'paid', 'paid';
insert into results select 'paid order status + stock taken', o.status = 'paid' and o.payment_status = 'paid' and o.paid_at is not null and s.qty = 3, o.status || ' qty=' || s.qty
  from public.orders o, public.stock s where o.id = 'PAY-1' and s.product_id = 'hooded-teddy-suit' and s.colour_key = 'cream' and s.size = '6–12M';
insert into results select 'second confirmation is idempotent', public.mark_order_paid('order_T1', 'pay_1', 99900) = 'already_paid', 'already_paid';
insert into results select 'stock not taken twice', qty = 3, qty::text from public.stock where product_id = 'hooded-teddy-suit' and colour_key = 'cream' and size = '6–12M';

-- expiry of unpaid online orders
select public.create_order('{"id":"PAY-2","payment":"online","customer_name":"B","customer_phone":"9","subtotal":549,"total":628}',
  '[{"product_id":"sleeveless-button-romper","colour_key":"green","name":"R","colour_label":"G","size":"3–6M","qty":1,"unit_price":549}]');
update public.orders set created_at = now() - interval '2 hours' where id = 'PAY-2';
insert into results select 'expire cancels stale unpaid', public.expire_unpaid_orders(60) = 1, 'expired';
insert into results select 'expired order state', status = 'cancelled' and payment_status = 'failed', status || '/' || payment_status from public.orders where id = 'PAY-2';

-- browsers can't call the payment functions
set local role anon;
do $$ begin
  begin perform public.mark_order_paid('order_T1', 'p', 1); insert into results values ('anon cannot mark paid', false, 'allowed');
  exception when insufficient_privilege then insert into results values ('anon cannot mark paid', true, 'denied'); end;
  begin perform public.expire_unpaid_orders(1); insert into results values ('anon cannot expire', false, 'allowed');
  exception when insufficient_privilege then insert into results values ('anon cannot expire', true, 'denied'); end;
end $$;
reset role;

-- stats: unpaid online orders are "abandoned", not placed
select json_build_object('sub', user_id, 'role', 'authenticated', 'email', email)::text as admin_claims from public.admins limit 1 \gset
set local role authenticated;
select set_config('request.jwt.claims', :'admin_claims', true);
insert into results select 'stats count online + abandoned', (s->>'online_orders')::int = 1 and (s->>'abandoned')::int = 1 and (s->>'placed')::int = 1, s::text
  from (select public.admin_stats(now() - interval '1 day', now() + interval '1 minute') s) t;
reset role;

select case when ok then 'PASS' else 'FAIL' end as result, name, left(detail, 70) as detail from results;
select count(*) filter (where not ok) as failures from results;
rollback;
