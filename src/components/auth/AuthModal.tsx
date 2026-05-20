import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable';
import { IRISH_COUNTIES } from '@/lib/irish-counties';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

type Mode = 'signin' | 'signup';

export default function AuthModal() {
  const { modal, closeAuthModal } = useAuth();
  const [mode, setMode] = useState<Mode>('signup');
  const [firstName, setFirstName] = useState('');
  const [county, setCounty] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const intentHeading = mode === 'signup' ? 'Create your account' : 'Welcome back';
  const intentSub = modal.message
    ?? (mode === 'signup'
      ? 'Save saunas, sync across devices, get conditions alerts.'
      : 'Sign in to your Saunas in Ireland account.');

  const reset = () => {
    setFirstName(''); setCounty(''); setEmail(''); setPassword(''); setBusy(false);
  };

  const handleClose = (open: boolean) => {
    if (!open) { closeAuthModal(); reset(); }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === 'signup') {
        if (!firstName.trim() || !county || !email.trim() || password.length < 6) {
          toast.error('Please complete all fields. Password must be at least 6 characters.');
          setBusy(false);
          return;
        }
        const redirectUrl = `${window.location.origin}/`;
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: redirectUrl,
            data: { first_name: firstName.trim(), county },
          },
        });
        if (error) throw error;
        toast.success('Account created. Check your email to confirm.');
        // Fire welcome email (non-blocking)
        supabase.functions.invoke('send-welcome-email', {
          body: { email: email.trim(), firstName: firstName.trim() },
        }).catch(() => {/* silent */});
        closeAuthModal();
        reset();
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        toast.success('Signed in');
        closeAuthModal();
        reset();
      }
    } catch (err: any) {
      const msg = err?.message ?? 'Something went wrong';
      toast.error(msg.includes('User already registered')
        ? 'An account already exists with that email. Try signing in.'
        : msg);
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth('google', {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error('Google sign-in failed');
        setBusy(false);
        return;
      }
      // Either redirected, or tokens already set — modal will close on auth state change.
    } catch {
      toast.error('Google sign-in failed');
      setBusy(false);
    }
  };

  return (
    <Dialog open={modal.open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden bg-card border-border/40 rounded-2xl">
        <div className="px-7 pt-7 pb-6">
          <DialogTitle className="text-[22px] font-light tracking-tight text-foreground">
            {intentHeading}
          </DialogTitle>
          <DialogDescription className="text-[13px] text-muted-foreground mt-1.5 leading-relaxed">
            {intentSub}
          </DialogDescription>
        </div>

        <div className="px-7 pb-7 space-y-4">
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={handleGoogle}
            className="w-full h-11 rounded-xl bg-background hover:bg-muted/50 border-border/60 font-normal text-[14px]"
          >
            <svg className="w-4 h-4 mr-2.5" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </Button>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border/60" />
            <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/70">or</span>
            <div className="h-px flex-1 bg-border/60" />
          </div>

          <form onSubmit={handleEmailSubmit} className="space-y-3">
            {mode === 'signup' && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="firstName" className="text-[12px] font-normal text-muted-foreground">First name</Label>
                  <Input
                    id="firstName" autoComplete="given-name" required
                    value={firstName} onChange={(e) => setFirstName(e.target.value)}
                    className="h-11 rounded-xl bg-background border-border/60"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="county" className="text-[12px] font-normal text-muted-foreground">County</Label>
                  <Select value={county} onValueChange={setCounty}>
                    <SelectTrigger id="county" className="h-11 rounded-xl bg-background border-border/60">
                      <SelectValue placeholder="Select your county" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {IRISH_COUNTIES.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[12px] font-normal text-muted-foreground">Email</Label>
              <Input
                id="email" type="email" autoComplete="email" required
                value={email} onChange={(e) => setEmail(e.target.value)}
                className="h-11 rounded-xl bg-background border-border/60"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-[12px] font-normal text-muted-foreground">Password</Label>
              <Input
                id="password" type="password" required minLength={6}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                value={password} onChange={(e) => setPassword(e.target.value)}
                className="h-11 rounded-xl bg-background border-border/60"
              />
            </div>

            <Button
              type="submit" disabled={busy}
              className="w-full h-11 rounded-xl font-normal text-[14px] mt-2"
            >
              {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {mode === 'signup' ? 'Create account' : 'Sign in'}
            </Button>
          </form>

          <p className="text-center text-[12px] text-muted-foreground pt-1">
            {mode === 'signup' ? 'Already have an account?' : 'New here?'}{' '}
            <button
              type="button"
              onClick={() => setMode(mode === 'signup' ? 'signin' : 'signup')}
              className="text-foreground underline-offset-4 hover:underline"
            >
              {mode === 'signup' ? 'Sign in' : 'Create an account'}
            </button>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
