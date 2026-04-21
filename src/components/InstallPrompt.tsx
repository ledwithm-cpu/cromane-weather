import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share, Plus, MoreVertical, X, Smartphone } from 'lucide-react';

const STORAGE_KEY = 'a2hs-prompt-dismissed-v1';

type Platform = 'ios' | 'android' | null;

const detectPlatform = (): Platform => {
  if (typeof window === 'undefined') return null;
  const ua = window.navigator.userAgent;
  // iOS: iPhone, iPad, iPod — and iPadOS 13+ which masquerades as Mac with touch
  const isIOS =
    /iPhone|iPad|iPod/.test(ua) ||
    (ua.includes('Mac') && 'ontouchend' in document);
  if (isIOS) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return null;
};

const isStandalone = (): boolean => {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    // iOS Safari
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
};

const InstallPrompt = () => {
  const [platform, setPlatform] = useState<Platform>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    if (localStorage.getItem(STORAGE_KEY)) return;

    const p = detectPlatform();
    if (!p) return;

    setPlatform(p);
    // Small delay so it doesn't flash on first paint
    const t = window.setTimeout(() => setOpen(true), 1800);
    return () => window.clearTimeout(t);
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setOpen(false);
  };

  if (!platform) return null;

  const isIOS = platform === 'ios';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ type: 'spring', stiffness: 240, damping: 26 }}
          className="fixed inset-x-0 bottom-0 z-50 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pointer-events-none"
          role="dialog"
          aria-modal="false"
          aria-label="Install Irish Saunas to your home screen"
        >
          <div className="pointer-events-auto mx-auto max-w-md rounded-2xl border border-border/40 bg-card/85 backdrop-blur-xl shadow-2xl p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-primary" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">
                  Add Irish Saunas to your home screen
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Faster access to live tides, weather and warnings.
                </p>

                <ol className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                  {isIOS ? (
                    <>
                      <li className="flex items-center gap-2">
                        <span className="text-foreground/60">1.</span>
                        Tap
                        <Share className="w-3.5 h-3.5 text-primary" aria-label="Share" />
                        <span>Share in Safari</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-foreground/60">2.</span>
                        Choose
                        <Plus className="w-3.5 h-3.5 text-primary" aria-label="Add" />
                        <span>"Add to Home Screen"</span>
                      </li>
                    </>
                  ) : (
                    <>
                      <li className="flex items-center gap-2">
                        <span className="text-foreground/60">1.</span>
                        Tap
                        <MoreVertical className="w-3.5 h-3.5 text-primary" aria-label="Menu" />
                        <span>menu in Chrome</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-foreground/60">2.</span>
                        <span>Choose "Install app" or "Add to Home screen"</span>
                      </li>
                    </>
                  )}
                </ol>

                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={dismiss}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
                  >
                    Got it
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={dismiss}
                aria-label="Dismiss"
                className="flex-shrink-0 -mt-1 -mr-1 p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default InstallPrompt;
