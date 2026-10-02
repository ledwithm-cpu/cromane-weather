import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { LOCATIONS } from '@/features/location/data/locations';
import { openExternal } from '@/lib/open-external';

interface Stat {
  location_id: string;
  clicks_total: number;
  clicks_7d: number;
  clicks_30d: number;
  clicks_detail: number;
  clicks_map: number;
  last_click_at: string | null;
  home_sauna_users: number;
  bucket_list_saves: number;
  pending_proposals: number;
  last_checked_at: string | null;
}
interface Totals {
  clicks_total: number; clicks_7d: number; clicks_30d: number;
  subscribers: number; accounts: number; contact_messages: number;
  daily: { day: string; n: number }[];
}

type SortKey = 'clicks_total' | 'clicks_7d' | 'clicks_30d' | 'home_sauna_users' | 'bucket_list_saves' | 'name' | 'county';

const urlKind = (u?: string) => {
  if (!u) return 'None';
  if (/instagram|facebook/i.test(u)) return 'Social';
  if (/fresha|simplybook|bookwhen|acuity|as\.me|eventbrite/i.test(u)) return 'Booking platform';
  return 'Website';
};

const fmtDate = (s: string | null) => (s ? new Date(s).toLocaleDateString('en-IE', { day: 'numeric', month: 'short' }) : '·');

function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const { error, data } = mode === 'in'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/admin` } });
    setBusy(false);
    if (error) setMsg(error.message);
    else if (mode === 'up' && !data.session) setMsg('Check your email to confirm your account, then sign in.');
  };

  return (
    <form onSubmit={submit} className="mx-auto mt-24 max-w-sm space-y-3 rounded-3xl border border-border bg-card p-6">
      <h1 className="font-serif text-2xl text-foreground">Owner sign in</h1>
      <input className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <input className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" type="password" placeholder="Password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required />
      <button disabled={busy} className="w-full rounded-xl bg-primary py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">
        {mode === 'in' ? 'Sign in' : 'Create account'}
      </button>
      <button type="button" onClick={() => setMode(mode === 'in' ? 'up' : 'in')} className="w-full text-xs text-muted-foreground">
        {mode === 'in' ? 'First time? Create your account' : 'Have an account? Sign in'}
      </button>
      {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
    </form>
  );
}

export default function Admin() {
  const { user, loading, signOut } = useAuth();
  const [stats, setStats] = useState<Stat[] | null>(null);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<SortKey>('clicks_total');

  useEffect(() => {
    if (!user) return;
    setError(null);
    const rpc = supabase.rpc as unknown as (fn: string) => Promise<{ data: unknown; error: { message: string } | null }>;
    Promise.all([rpc('admin_sauna_stats'), rpc('admin_site_totals')]).then(([s, t]) => {
      if (s.error || t.error) { setError('This account does not have access to the stats.'); return; }
      setStats(s.data as Stat[]);
      setTotals(t.data as Totals);
    });
  }, [user]);

  const rows = useMemo(() => {
    const byId = new Map((stats ?? []).map((s) => [s.location_id, s]));
    const list = LOCATIONS.map((l) => {
      const s = byId.get(l.id);
      return {
        loc: l,
        clicks_total: Number(s?.clicks_total ?? 0),
        clicks_7d: Number(s?.clicks_7d ?? 0),
        clicks_30d: Number(s?.clicks_30d ?? 0),
        clicks_detail: Number(s?.clicks_detail ?? 0),
        clicks_map: Number(s?.clicks_map ?? 0),
        last_click_at: s?.last_click_at ?? null,
        home_sauna_users: Number(s?.home_sauna_users ?? 0),
        bucket_list_saves: Number(s?.bucket_list_saves ?? 0),
        pending_proposals: Number(s?.pending_proposals ?? 0),
        last_checked_at: s?.last_checked_at ?? null,
      };
    });
    const term = q.trim().toLowerCase();
    const filtered = term
      ? list.filter((r) => [r.loc.saunaName, r.loc.name, r.loc.county, r.loc.country, r.loc.saunaUrl].some((v) => v?.toLowerCase().includes(term)))
      : list;
    return filtered.sort((a, b) => {
      if (sort === 'name') return (a.loc.saunaName ?? a.loc.name).localeCompare(b.loc.saunaName ?? b.loc.name);
      if (sort === 'county') return a.loc.county.localeCompare(b.loc.county);
      return b[sort] - a[sort];
    });
  }, [stats, q, sort]);

  const exportCsv = () => {
    const head = ['Sauna', 'Place', 'County', 'Country', 'Booking link', 'Link type', 'Page', 'Clicks total', 'Clicks 7d', 'Clicks 30d', 'From sauna page', 'From map', 'Last click', 'Home sauna users', 'Bucket list saves', 'Pending link issues'];
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = rows.map((r) => [r.loc.saunaName, r.loc.name, r.loc.county, r.loc.country, r.loc.saunaUrl, urlKind(r.loc.saunaUrl), `https://saunasinireland.com/${r.loc.id}`, r.clicks_total, r.clicks_7d, r.clicks_30d, r.clicks_detail, r.clicks_map, r.last_click_at ?? '', r.home_sauna_users, r.bucket_list_saves, r.pending_proposals].map(esc).join(','));
    const blob = new Blob([[head.map(esc).join(','), ...lines].join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `sauna-performance-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const maxDaily = Math.max(1, ...(totals?.daily ?? []).map((d) => d.n));

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <Helmet><title>Owner dashboard · Saunas in Ireland</title><meta name="robots" content="noindex,nofollow" /></Helmet>
      {loading ? null : !user ? <SignIn /> : (
        <div className="mx-auto max-w-7xl space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="font-serif text-3xl text-foreground">Sauna performance</h1>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>{user.email}</span>
              <button onClick={() => signOut()} className="rounded-full border border-border px-3 py-1">Sign out</button>
            </div>
          </div>

          {error && <p className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">{error}</p>}

          {totals && (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {[
                  ['Booking clicks', totals.clicks_total],
                  ['Last 7 days', totals.clicks_7d],
                  ['Last 30 days', totals.clicks_30d],
                  ['Email subscribers', totals.subscribers],
                  ['Accounts', totals.accounts],
                  ['Contact messages', totals.contact_messages],
                ].map(([label, n]) => (
                  <div key={label as string} className="rounded-2xl border border-border bg-card p-4">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="mt-1 text-2xl font-medium tabular-nums text-foreground">{n as number}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="mb-3 text-xs text-muted-foreground">Booking clicks per day · last 30 days</p>
                <div className="flex h-24 items-end gap-1">
                  {totals.daily.length === 0 && <p className="text-sm text-muted-foreground">No clicks yet</p>}
                  {totals.daily.map((d) => (
                    <div key={d.day} title={`${d.day}: ${d.n}`} className="flex-1 rounded-t bg-primary" style={{ height: `${(d.n / maxDaily) * 100}%` }} />
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search sauna, place, county, link…" className="min-w-[220px] flex-1 rounded-xl border border-border bg-card px-3 py-2 text-sm" />
            <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="rounded-xl border border-border bg-card px-3 py-2 text-sm">
              <option value="clicks_total">Most clicks</option>
              <option value="clicks_7d">Most clicks · 7 days</option>
              <option value="clicks_30d">Most clicks · 30 days</option>
              <option value="home_sauna_users">Most home-sauna users</option>
              <option value="bucket_list_saves">Most bucket-list saves</option>
              <option value="name">Name A–Z</option>
              <option value="county">County</option>
            </select>
            <button onClick={exportCsv} className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Download spreadsheet</button>
            <span className="text-xs text-muted-foreground">{rows.length} saunas</span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border text-xs text-muted-foreground">
                <tr>
                  {['Sauna', 'Location', 'Booking link', 'Clicks', '7d', '30d', 'Page / Map', 'Last click', 'Home', 'Saved', 'Link check'].map((h) => (
                    <th key={h} className="whitespace-nowrap px-3 py-2 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.loc.id} className="border-b border-border/50 last:border-0">
                    <td className="px-3 py-2">
                      <button onClick={() => openExternal(`/${r.loc.id}`)} className="text-left font-medium text-foreground hover:underline">{r.loc.saunaName ?? r.loc.name}</button>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{r.loc.name} · {r.loc.county}, {r.loc.country ?? 'Ireland'}</td>
                    <td className="max-w-[260px] px-3 py-2">
                      {r.loc.saunaUrl ? (
                        <button onClick={() => openExternal(r.loc.saunaUrl!)} className="block truncate text-left text-primary hover:underline" title={r.loc.saunaUrl}>
                          {r.loc.saunaUrl.replace(/^https?:\/\/(www\.)?/, '')}
                        </button>
                      ) : <span className="text-muted-foreground">None</span>}
                      <span className="text-[11px] text-muted-foreground">{urlKind(r.loc.saunaUrl)}</span>
                    </td>
                    <td className="px-3 py-2 font-medium tabular-nums">{r.clicks_total}</td>
                    <td className="px-3 py-2 tabular-nums">{r.clicks_7d}</td>
                    <td className="px-3 py-2 tabular-nums">{r.clicks_30d}</td>
                    <td className="whitespace-nowrap px-3 py-2 tabular-nums text-muted-foreground">{r.clicks_detail} / {r.clicks_map}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{fmtDate(r.last_click_at)}</td>
                    <td className="px-3 py-2 tabular-nums">{r.home_sauna_users}</td>
                    <td className="px-3 py-2 tabular-nums">{r.bucket_list_saves}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                      {r.pending_proposals > 0 ? `${r.pending_proposals} to review` : r.last_checked_at ? `OK · ${fmtDate(r.last_checked_at)}` : 'Not checked'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
