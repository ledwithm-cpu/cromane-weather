import { useDebugMode } from '@/hooks/use-debug-mode';
import { Bug } from 'lucide-react';

/**
 * Persistent on-screen indicator shown whenever Debug Mode is active.
 * Fixed top-left so it can't be missed before publishing.
 */
const DebugModeIndicator = () => {
  const { isDebugMode, toggle } = useDebugMode();
  if (!isDebugMode) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      title="Click to disable Debug Mode"
      className="fixed top-3 left-3 z-[3000] flex items-center gap-1.5 rounded-full bg-warning-orange px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-black shadow-lg shadow-warning-orange/40 ring-1 ring-black/10 hover:bg-warning-orange/90 active:scale-95 transition"
    >
      <Bug className="w-3 h-3" strokeWidth={2.25} />
      Debug Mode
    </button>
  );
};

export default DebugModeIndicator;
