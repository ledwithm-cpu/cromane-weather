revoke all on function public.has_role(uuid, public.app_role) from public, anon, authenticated;
revoke all on function public.grant_owner_admin() from public, anon, authenticated;
revoke all on function public.admin_sauna_stats() from anon;
revoke all on function public.admin_site_totals() from anon;