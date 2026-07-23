import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

// The @supabase/supabase-js `auth.oauth` namespace is beta and not yet in the
// generated types. Use a minimal local wrapper so this file type-checks.
type OAuthClient = { name?: string; client_name?: string; logo_uri?: string };
type OAuthDetails = {
  client?: OAuthClient;
  scope?: string;
  scopes?: string[];
  redirect_url?: string;
  redirect_to?: string;
};
type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<{ data: OAuthDetails | null; error: { message: string } | null }>;
  approveAuthorization: (id: string) => Promise<{ data: { redirect_url?: string; redirect_to?: string } | null; error: { message: string } | null }>;
  denyAuthorization: (id: string) => Promise<{ data: { redirect_url?: string; redirect_to?: string } | null; error: { message: string } | null }>;
};
const oauthApi = (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [session, setSession] = useState<import("@supabase/supabase-js").Session | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [details, setDetails] = useState<OAuthDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Sign-in form state (shown when not authenticated)
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (sessionLoading || !session) return;
    if (!authorizationId) {
      setError("Missing authorization_id in the URL.");
      return;
    }
    let active = true;
    (async () => {
      const { data, error } = await oauthApi.getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error) return setError(error.message);
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId, session, sessionLoading]);

  async function decide(approve: boolean) {
    if (!authorizationId) return;
    setBusy(true);
    const { data, error } = approve
      ? await oauthApi.approveAuthorization(authorizationId)
      : await oauthApi.denyAuthorization(authorizationId);
    if (error) {
      setBusy(false);
      return setError(error.message);
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      return setError("No redirect returned by the authorization server.");
    }
    window.location.href = target;
  }

  async function handlePasswordSignIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setBusy(false);
    if (error) toast.error(error.message);
  }

  async function handleGoogle() {
    setBusy(true);
    try {
      // Return to this exact consent URL after Google redirect.
      const next = window.location.pathname + window.location.search;
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}${next}`,
      });
      if (result.error) {
        toast.error("Google sign-in failed");
        setBusy(false);
      }
    } catch {
      toast.error("Google sign-in failed");
      setBusy(false);
    }
  }

  if (sessionLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-2xl font-serif text-foreground">Authorization error</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-serif text-foreground">Sign in to continue</h1>
            <p className="text-sm text-muted-foreground">
              Sign in to authorize access to your Saunas in Ireland account.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={handleGoogle}
            className="w-full h-11 rounded-xl"
          >
            Continue with Google
          </Button>
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border/60" />
            <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/70">or</span>
            <div className="h-px flex-1 bg-border/60" />
          </div>
          <form onSubmit={handlePasswordSignIn} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>
            <Button type="submit" disabled={busy} className="w-full h-11 rounded-xl">
              {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Sign in
            </Button>
          </form>
        </div>
      </main>
    );
  }

  if (!details) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </main>
    );
  }

  const clientName = details.client?.client_name ?? details.client?.name ?? "an app";
  const account = session.user.email ?? session.user.id;

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-border/60 bg-card p-8 shadow-sm">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-serif text-foreground">
            Connect {clientName} to Saunas in Ireland
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {clientName} will be able to call this app's enabled tools while you are signed in
            as <span className="text-foreground">{account}</span>.
          </p>
        </div>
        <div className="text-xs text-muted-foreground rounded-lg bg-muted/40 p-3 leading-relaxed">
          This does not bypass this app's permissions. Your data is still protected by the app's
          backend policies.
        </div>
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            disabled={busy}
            onClick={() => decide(true)}
            className="w-full h-11 rounded-xl"
          >
            {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Approve
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => decide(false)}
            className="w-full h-11 rounded-xl"
          >
            Cancel connection
          </Button>
        </div>
      </div>
    </main>
  );
}
