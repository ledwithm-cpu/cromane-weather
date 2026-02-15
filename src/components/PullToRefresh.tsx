import { useState, useRef, useCallback, type ReactNode } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
}

const THRESHOLD = 80;

const PullToRefresh = ({ onRefresh, children }: PullToRefreshProps) => {
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const pulling = useRef(false);
  const pullDistance = useMotionValue(0);

  const indicatorOpacity = useTransform(pullDistance, [0, THRESHOLD * 0.5, THRESHOLD], [0, 0.5, 1]);
  const indicatorScale = useTransform(pullDistance, [0, THRESHOLD], [0.5, 1]);
  const rotation = useTransform(pullDistance, [0, THRESHOLD], [0, 180]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
    if (scrollTop <= 0 && !refreshing) {
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    }
  }, [refreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!pulling.current) return;
    const delta = Math.max(0, (e.touches[0].clientY - startY.current) * 0.4);
    pullDistance.set(Math.min(delta, THRESHOLD * 1.5));
  }, [pullDistance]);

  const handleTouchEnd = useCallback(async () => {
    if (!pulling.current) return;
    pulling.current = false;
    const distance = pullDistance.get();

    if (distance >= THRESHOLD) {
      setRefreshing(true);
      pullDistance.set(THRESHOLD * 0.6);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        pullDistance.set(0);
      }
    } else {
      pullDistance.set(0);
    }
  }, [onRefresh, pullDistance]);

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <motion.div
        className="flex justify-center items-center overflow-hidden"
        style={{ height: pullDistance, opacity: indicatorOpacity }}
      >
        <motion.div style={{ scale: indicatorScale, rotate: refreshing ? undefined : rotation }}>
          <RefreshCw
            className={`w-5 h-5 text-muted-foreground ${refreshing ? 'animate-spin' : ''}`}
          />
        </motion.div>
      </motion.div>

      {children}
    </div>
  );
};

export default PullToRefresh;
