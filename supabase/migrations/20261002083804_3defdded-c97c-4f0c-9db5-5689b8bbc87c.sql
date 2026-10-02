create type public.app_role as enum ('admin', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "Users view own roles" on public.user_roles for select to authenticated using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- Owner email becomes admin automatically when that account is created.
create or replace function public.grant_owner_admin()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if lower(NEW.email) = 'ledwith.m@gmail.com' then
    insert into public.user_roles (user_id, role) values (NEW.id, 'admin') on conflict do nothing;
  end if;
  return NEW;
end;
$$;
create trigger on_auth_user_created_grant_admin
  after insert on auth.users for each row execute function public.grant_owner_admin();

-- Per-sauna performance stats, admin only.
create or replace function public.admin_sauna_stats()
returns table (
  location_id text,
  clicks_total bigint,
  clicks_7d bigint,
  clicks_30d bigint,
  clicks_detail bigint,
  clicks_map bigint,
  last_click_at timestamptz,
  home_sauna_users bigint,
  bucket_list_saves bigint,
  pending_proposals bigint,
  last_checked_at timestamptz
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'not authorised';
  end if;
  return query
  with ids as (
    select b.location_id from public.booking_clicks b
    union select p.home_sauna_slug from public.profiles p where p.home_sauna_slug is not null
    union select i.location_id from public.bucket_list_items i
    union select r.location_id from public.agent_listing_registry r
  )
  select ids.location_id,
    (select count(*) from public.booking_clicks b where b.location_id = ids.location_id),
    (select count(*) from public.booking_clicks b where b.location_id = ids.location_id and b.created_at > now() - interval '7 days'),
    (select count(*) from public.booking_clicks b where b.location_id = ids.location_id and b.created_at > now() - interval '30 days'),
    (select count(*) from public.booking_clicks b where b.location_id = ids.location_id and b.source = 'detail-page'),
    (select count(*) from public.booking_clicks b where b.location_id = ids.location_id and b.source in ('map-sheet','map-drawer')),
    (select max(b.created_at) from public.booking_clicks b where b.location_id = ids.location_id),
    (select count(*) from public.profiles p where p.home_sauna_slug = ids.location_id),
    (select count(*) from public.bucket_list_items i where i.location_id = ids.location_id),
    (select count(*) from public.listing_update_proposals u where u.location_id = ids.location_id and u.status = 'pending'),
    (select r.last_checked_at from public.agent_listing_registry r where r.location_id = ids.location_id)
  from ids;
end;
$$;
revoke all on function public.admin_sauna_stats() from public, anon;
grant execute on function public.admin_sauna_stats() to authenticated;

-- Site-wide totals, admin only.
create or replace function public.admin_site_totals()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'not authorised';
  end if;
  return jsonb_build_object(
    'clicks_total', (select count(*) from public.booking_clicks),
    'clicks_7d', (select count(*) from public.booking_clicks where created_at > now() - interval '7 days'),
    'clicks_30d', (select count(*) from public.booking_clicks where created_at > now() - interval '30 days'),
    'subscribers', (select count(*) from public.marketing_subscribers),
    'accounts', (select count(*) from public.profiles),
    'contact_messages', (select count(*) from public.contact_submissions),
    'daily', (select coalesce(jsonb_agg(jsonb_build_object('day', d, 'n', n) order by d), '[]'::jsonb)
              from (select created_at::date d, count(*) n from public.booking_clicks
                    where created_at > now() - interval '30 days' group by 1) x)
  );
end;
$$;
revoke all on function public.admin_site_totals() from public, anon;
grant execute on function public.admin_site_totals() to authenticated;