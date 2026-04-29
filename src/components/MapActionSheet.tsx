import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Navigation, MapPin, Ticket, ArrowRight, Bookmark, BookmarkCheck } from 'lucide-react';
import { Location } from '@/lib/locations';
import { useBucketList } from '@/hooks/use-bucket-list';
import { openExternal, buildDirectionsUrls } from '@/lib/open-external';

interface Props {
  location: Location;
  onClose: () => void;
  onAddedToBucketList?: () => void;
}

const MapActionSheet = ({ location, onClose, onAddedToBucketList }: Props) => {
  const { has, add, remove } = useBucketList();
  const saved = has(location.id);
  const { google: googleMapsUrl, apple: appleMapsUrl } = buildDirectionsUrls(location.lat, location.lon);

  const open = (url: string) => {
    openExternal(url);
    onClose();
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[2000] bg-background/40 backdrop-blur-[2px]"
      />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 320 }}
        className="fixed bottom-0 left-0 right-0 z-[2001] rounded-t-3xl bg-background border-t border-border/40 shadow-2xl pb-[env(safe-area-inset-bottom)]"
      >
        <div className="mx-auto mt-2 mb-1 h-1 w-10 rounded-full bg-muted-foreground/30" />
        <div className="px-5 pt-3 pb-5 space-y-3">
          <div className="text-center">
            <h3 className="text-lg font-light tracking-tight text-foreground">{location.name}</h3>
            {location.saunaName && (
              <p className="text-sm text-primary font-medium mt-0.5">{location.saunaName}</p>
            )}
          </div>

          <div className="space-y-2 pt-2">
            <button
              onClick={() => open(googleMapsUrl)}
              className="flex items-center gap-3 w-full rounded-2xl bg-muted/40 border border-border/30 px-4 py-3.5 text-left hover:bg-muted/60 active:scale-[0.98] transition-all"
            >
              <Navigation className="w-5 h-5 text-foreground/70" />
              <span className="text-sm font-medium text-foreground flex-1">Directions · Google Maps</span>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
            </button>

            <button
              onClick={() => open(appleMapsUrl)}
              className="flex items-center gap-3 w-full rounded-2xl bg-muted/40 border border-border/30 px-4 py-3.5 text-left hover:bg-muted/60 active:scale-[0.98] transition-all"
            >
              <MapPin className="w-5 h-5 text-foreground/70" />
              <span className="text-sm font-medium text-foreground flex-1">Directions · Apple Maps</span>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
            </button>

            {location.saunaUrl && (
              <button
                onClick={() => open(location.saunaUrl!)}
                className="flex items-center gap-3 w-full rounded-2xl bg-primary/10 border border-primary/20 px-4 py-3.5 text-left hover:bg-primary/15 active:scale-[0.98] transition-all"
              >
                <Ticket className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium text-foreground flex-1">
                  Book {location.saunaName ?? 'sauna'}
                </span>
                <ArrowRight className="w-4 h-4 text-primary" />
              </button>
            )}

            <button
              onClick={() => {
                if (saved) {
                  remove(location.id);
                } else {
                  add(location.id);
                  onAddedToBucketList?.();
                  onClose();
                }
              }}
              className={`flex items-center gap-3 w-full rounded-2xl border px-4 py-3.5 text-left active:scale-[0.98] transition-all ${
                saved
                  ? 'bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/15'
                  : 'bg-muted/40 border-border/30 hover:bg-muted/60'
              }`}
            >
              {saved ? (
                <BookmarkCheck className="w-5 h-5 text-amber-500" />
              ) : (
                <Bookmark className="w-5 h-5 text-foreground/70" />
              )}
              <span className="text-sm font-medium text-foreground flex-1">
                {saved ? 'Saved to Bucket List' : 'Add to Bucket List'}
              </span>
              <ArrowRight className={`w-4 h-4 ${saved ? 'text-amber-500' : 'text-muted-foreground'}`} />
            </button>

            <Link
              to={`/${location.id}`}
              onClick={onClose}
              className="flex items-center justify-center w-full rounded-2xl py-3 text-xs font-medium text-muted-foreground hover:text-foreground transition-all"
            >
              View full details →
            </Link>
          </div>
        </div>
      </motion.div>
    </>
  );
};

export default MapActionSheet;
