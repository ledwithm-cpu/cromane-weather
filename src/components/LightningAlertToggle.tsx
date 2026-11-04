import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import {
  getLightningAlertStatus,
  isPushSupported,
  subscribeLightningAlerts,
  unsubscribeLightningAlerts,
} from '@/lib/firebase-messaging';

interface Props {
  location: { id: string; lat: number; lon: number; name: string };
}

const LightningAlertToggle = ({ location }: Props) => {
  const [supported, setSupported] = useState(false);
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setOn(false);
    isPushSupported().then(async (ok) => {
      if (cancelled) return;
      setSupported(ok);
      if (ok) {
        const subscribed = await getLightningAlertStatus(location).catch(() => false);
        if (!cancelled) setOn(subscribed);
      }
    });
    return () => { cancelled = true; };
  }, [location.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!supported) return null;

  const handleChange = async (next: boolean) => {
    setBusy(true);
    try {
      if (next) {
        const r = await subscribeLightningAlerts(location);
        if (r === 'subscribed') {
          setOn(true);
          toast(`Lightning alerts on for ${location.name}`);
        } else if (r === 'open-in-new-tab') {
          toast('Open the site in its own tab to turn on alerts.');
        } else if (r === 'denied') {
          toast('Notifications are blocked · allow them in your browser’s site settings.');
        } else {
          toast('Couldn’t turn on alerts right now · try again shortly.');
        }
      } else if (await unsubscribeLightningAlerts(location)) {
        setOn(false);
        toast(`Lightning alerts off for ${location.name}`);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <label className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
      <Switch checked={on} onCheckedChange={handleChange} disabled={busy} aria-label="Lightning alerts for this sauna" />
      Lightning alerts for this sauna
    </label>
  );
};

export default LightningAlertToggle;
