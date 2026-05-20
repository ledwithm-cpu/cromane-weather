import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { m, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const DISMISS_KEY = 'discoverBannerDismissed:v1';

export default function DiscoverEmailBanner() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(
    () => typeof window !== 'undefined' && window.localStorage.getItem(DISMISS_KEY) === '1',
  );
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (user || dismissed) return null;

  const dismiss = () => {
    window.localStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed)) {
      toast.error('Please enter a valid email.');
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from('marketing_subscribers')
      .insert({ email: trimmed, source: 'banner' });
    setBusy(false);
    if (error && !error.message.toLowerCase().includes('duplicate')) {
      toast.error('Could not subscribe. Please try again.');
      return;
    }
    setSubmitted(true);
    toast.success("You're on the list. We'll be in touch.");
    setTimeout(dismiss, 1500);
  };

  return (
    <AnimatePresence>
      <m.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className="absolute top-[68px] left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:right-auto md:max-w-md z-[1000] pointer-events-auto"
      >
        <div className="glass-card rounded-2xl shadow-lg px-4 py-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[12px] sm:text-[13px] text-foreground leading-snug">
              🌊 Get notified when conditions are perfect at your saved saunas — it's free.
            </p>
            {!submitted && (
              <form onSubmit={handleSubmit} className="mt-2 flex items-center gap-2">
                <input
                  type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="flex-1 min-w-0 h-9 rounded-full bg-background/80 border border-border/50 px-3 text-[13px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <button
                  type="submit" disabled={busy}
                  className="h-9 px-3.5 rounded-full bg-primary text-primary-foreground text-[12px] font-medium inline-flex items-center gap-1.5 active:scale-[0.97] transition disabled:opacity-60"
                >
                  {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Notify me
                </button>
              </form>
            )}
          </div>
          <button
            onClick={dismiss}
            aria-label="Dismiss"
            className="p-1.5 -mr-1 rounded-full hover:bg-muted/60 transition"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </m.div>
    </AnimatePresence>
  );
}
