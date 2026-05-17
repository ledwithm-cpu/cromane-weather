import { Facebook, Instagram, Share2 } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  /** Pre-built text snippet, e.g. "Cromane · Tomorrow 15°/8° · Partly cloudy" */
  text: string;
  /** Absolute URL to share back to */
  url: string;
}

// WhatsApp isn't in lucide — inline brand glyph at matching stroke weight
const WhatsAppIcon = ({ size = 14 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
);

const WeatherShareRow = ({ text, url }: Props) => {
  const fullText = `${text} — ${url}`;

  const openShare = (href: string) => {
    window.open(href, '_blank', 'noopener,noreferrer,width=600,height=520');
  };

  const shareWhatsApp = () => {
    openShare(`https://wa.me/?text=${encodeURIComponent(fullText)}`);
  };

  const shareFacebook = () => {
    openShare(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`,
    );
  };

  // Instagram has no public share-by-URL. Use the Web Share API (which on
  // mobile surfaces Instagram if installed) and fall back to copying.
  const shareInstagram = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: text, text, url });
        return;
      } catch {
        /* user dismissed or share failed — fall through to copy */
      }
    }
    try {
      await navigator.clipboard.writeText(fullText);
      toast.success('Copied — paste it into your Instagram story or DM');
    } catch {
      toast.error('Could not copy link');
    }
  };

  const btn =
    'inline-flex items-center justify-center w-7 h-7 rounded-full border border-border/50 text-muted-foreground hover:text-foreground hover:bg-card/80 active:scale-95 transition-all';

  return (
    <div
      className="flex items-center justify-center gap-2 pt-2"
      aria-label="Share this forecast"
    >
      <span className="text-[9px] uppercase tracking-wider text-muted-foreground/60 mr-1">
        Share
      </span>
      <button type="button" onClick={shareWhatsApp} className={btn} aria-label="Share on WhatsApp">
        <WhatsAppIcon />
      </button>
      <button type="button" onClick={shareFacebook} className={btn} aria-label="Share on Facebook">
        <Facebook size={13} strokeWidth={1.6} />
      </button>
      <button type="button" onClick={shareInstagram} className={btn} aria-label="Share on Instagram">
        <Instagram size={13} strokeWidth={1.6} />
      </button>
    </div>
  );
};

export default WeatherShareRow;
