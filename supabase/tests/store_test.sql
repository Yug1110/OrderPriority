-- Run: docker exec -i supabase_db_wynoak psql -U postgres -v ON_ERROR_STOP=1 < supabase/tests/store_test.sql
-- Everything runs in a transaction that is rolled back.
begin;
create temp table results (name text, ok boolean, detail text);
grant all on results to anon, authenticated;

-- fixtures
insert into auth.users (id, email, aud, role) values ('00000000-0000-0000-0000-00000000000b', 'stranger@test', 'authenticated', 'authenticated');
insert into public.stock values ('sleeveless-button-romper', 'green', '3–6M', 5);
select public.create_order(
  '{"id":"TST-1","source":"bag","customer_name":"A","customer_phone":"9","address":"x","pincode":"","note":"","payment":"cod","subtotal":1098,"shipping":0,"cod_fee":49,"total":1147}',
  '[{"product_id":"sleeveless-button-romper","colour_key":"green","name":"Romper","colour_label":"Green","size":"3–6M","qty":2,"unit_price":549}]');

-- stock trigger
update public.orders set status = 'confirmed' where id = 'TST-1';
insert into results select 'confirm takes stock', qty = 3, qty::text from public.stock where colour_key = 'green' and size = '3–6M' and product_id = 'sleeveless-button-romper';
update public.orders set status = 'shipped' where id = 'TST-1';
insert into results select 'later status keeps stock', qty = 3, qty::text from public.stock where colour_key = 'green' and size = '3–6M' and product_id = 'sleeveless-button-romper';
update public.orders set status = 'cancelled' where id = 'TST-1';
insert into results select 'cancel restores stock', qty = 5, qty::text from public.stock where colour_key = 'green' and size = '3–6M' and product_id = 'sleeveless-button-romper';
insert into results select 'history recorded', jsonb_array_length(history) = 3, history::text from public.orders where id = 'TST-1';
update public.orders set status = 'confirmed' where id = 'TST-1';

-- anon: no direct access
set local role anon;
insert into results select 'anon cannot read products', count(*) = 0, count(*)::text from public.products;
insert into results select 'anon cannot read orders', count(*) = 0, count(*)::text from public.orders;
do $$ begin
  begin perform public.create_order('{}', '[]'); insert into results values ('anon cannot call create_order', false, 'allowed');
  exception when insufficient_privilege then insert into results values ('anon cannot call create_order', true, 'denied'); end;
  begin perform public.admin_stats(now() - interval '1 day', now()); insert into results values ('anon cannot call admin_stats', false, 'allowed');
  exception when insufficient_privilege then insert into results values ('anon cannot call admin_stats', true, 'denied'); end;
end $$;
reset role;

-- logged-in non-admin
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated","email":"stranger@test"}', true);
insert into results select 'non-admin cannot read orders', count(*) = 0, count(*)::text from public.orders;
update public.products set price = 1 where id = 'sleeveless-button-romper';
do $$ begin
  begin perform public.admin_stats(now() - interval '1 day', now()); insert into results values ('non-admin cannot get stats', false, 'allowed');
  exception when insufficient_privilege then insert into results values ('non-admin cannot get stats', true, 'denied'); end;
end $$;
reset role;
insert into results select 'non-admin update had no effect', price = 549, price::text from public.products where id = 'sleeveless-button-romper';

-- admin
select json_build_object('sub', user_id, 'role', 'authenticated', 'email', email)::text as admin_claims from public.admins limit 1 \gset
set local role authenticated;
select set_config('request.jwt.claims', :'admin_claims', true);
insert into results select 'admin reads all products', count(*) = 15, count(*)::text from public.products;
insert into results select 'admin reads orders', count(*) = 1, count(*)::text from public.orders;
insert into results select 'admin stats', (s ->> 'confirmed')::int = 1 and (s ->> 'revenue')::int = 1147 and (s -> 'top_products' -> 0 ->> 'qty')::int = 2, s::text
  from (select public.admin_stats(now() - interval '1 day', now() + interval '1 minute') s) t;
update public.orders set status = 'paid' where id = 'TST-1';
insert into results select 'history records admin email', history -> -1 ->> 'by' = 'owner@wynoak.test', history -> -1 ->> 'by' from public.orders where id = 'TST-1';
do $$ begin
  begin delete from public.admins where user_id = auth.uid();
    insert into results select 'admin cannot remove self', count(*) = 1, count(*)::text from public.admins;
  end;
end $$;
reset role;

select case when ok then 'PASS' else 'FAIL' end as result, name, left(detail, 80) as detail from results;
select count(*) filter (where not ok) as failures from results;
rollback;
