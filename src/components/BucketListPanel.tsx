import { Reorder, motion, AnimatePresence } from 'framer-motion';
import { Bookmark, GripVertical, X, ListChecks } from 'lucide-react';
import { useBucketList, BucketItem } from '@/hooks/use-bucket-list';
import { LOCATIONS } from '@/lib/locations';
import { useIsMobile } from '@/hooks/use-mobile';

interface Props {
  open: boolean;
  onClose: () => void;
}

interface RowData extends BucketItem {
  name: string;
  saunaName?: string;
  county: string;
}

const BucketListPanel = ({ open, onClose }: Props) => {
  const isMobile = useIsMobile();
  const { items, remove, reorder } = useBucketList();

  const rows: RowData[] = items
    .map((it) => {
      const loc = LOCATIONS.find((l) => l.id === it.locationId);
      if (!loc) return null;
      return {
        ...it,
        name: loc.name,
        saunaName: loc.saunaName,
        county: loc.county,
      };
    })
    .filter((r): r is RowData => r !== null);

  const handleReorder = (next: RowData[]) => {
    reorder(
      next.map((r) => ({
        locationId: r.locationId,
        priorityIndex: 0, // re-normalised in hook
        createdAt: r.createdAt,
      })),
    );
  };

  const Empty = (
    <div className="flex flex-col items-center justify-center text-center gap-3 py-10 px-6">
      <div className="rounded-full bg-muted/50 p-3">
        <Bookmark className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
      </div>
      <p className="text-sm text-foreground font-medium">Your bucket list is empty</p>
      <p className="text-xs text-muted-foreground max-w-[220px] leading-relaxed">
        Tap a sauna on the map and choose <span className="text-foreground">Add to Bucket List</span> to save it here.
      </p>
    </div>
  );

  const List = (
    <Reorder.Group
      axis="y"
      values={rows}
      onReorder={handleReorder}
      className="space-y-2 px-3 pb-4"
    >
      {rows.map((row) => (
        <Reorder.Item
          key={row.locationId}
          value={row}
          className="group flex items-center gap-2 rounded-xl bg-muted/40 border border-border/40 px-3 py-3 cursor-grab active:cursor-grabbing"
          whileDrag={{ scale: 1.02, boxShadow: '0 8px 24px rgba(0,0,0,0.18)' }}
        >
          <GripVertical className="w-4 h-4 text-muted-foreground/60 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {row.saunaName ?? row.name}
            </p>
            <p className="text-[11px] text-muted-foreground truncate">
              {row.name} · Co. {row.county}
            </p>
          </div>
          <button
            onClick={() => remove(row.locationId)}
            aria-label={`Remove ${row.saunaName ?? row.name}`}
            className="shrink-0 rounded-full p-1.5 text-muted-foreground hover:text-foreground hover:bg-background/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </Reorder.Item>
      ))}
    </Reorder.Group>
  );

  const Header = (
    <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border/40">
      <div className="flex items-center gap-2">
        <ListChecks className="w-4 h-4 text-primary" strokeWidth={1.75} />
        <h2 className="text-sm font-medium tracking-wide text-foreground">
          Bucket List
        </h2>
        {rows.length > 0 && (
          <span className="text-[11px] tabular-nums text-muted-foreground">
            · {rows.length}
          </span>
        )}
      </div>
      <button
        onClick={onClose}
        aria-label="Close bucket list"
        className="rounded-full p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );

  return (
    <AnimatePresence>
      {open && (
        <>
          {isMobile && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 z-[2000] bg-background/40 backdrop-blur-[2px]"
            />
          )}
          <motion.aside
            key="bucket-panel"
            initial={isMobile ? { y: '100%' } : { x: '100%' }}
            animate={isMobile ? { y: 0 } : { x: 0 }}
            exit={isMobile ? { y: '100%' } : { x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            drag={isMobile ? 'y' : false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, info) => {
              if (isMobile && info.offset.y > 120) onClose();
            }}
            className={
              isMobile
                ? 'fixed bottom-0 left-0 right-0 z-[2001] rounded-t-3xl bg-background border-t border-border/40 shadow-2xl pb-[env(safe-area-inset-bottom)] max-h-[80vh] flex flex-col'
                : 'fixed top-0 right-0 bottom-0 z-[1500] w-[340px] bg-background border-l border-border/40 shadow-2xl flex flex-col'
            }
            role="dialog"
            aria-label="Bucket list"
          >
            {isMobile && (
              <div className="mx-auto mt-2 mb-1 h-1 w-10 rounded-full bg-muted-foreground/30 shrink-0" />
            )}
            {Header}
            <div className="flex-1 overflow-y-auto pt-3">
              {rows.length === 0 ? Empty : List}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};

export default BucketListPanel;
