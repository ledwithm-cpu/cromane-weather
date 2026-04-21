import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bug } from 'lucide-react';
import { useDebugMode } from '@/hooks/use-debug-mode';

interface AppFooterProps {
  delay?: number;
}

const AppFooter = ({ delay = 0.5 }: AppFooterProps) => {
  const { pathname } = useLocation();
  const { isDebugMode, toggle } = useDebugMode();

  const links = [
    { to: '/discover', label: 'Map' },
    { to: '/how-it-works', label: 'How it works' },
    { to: '/contact', label: 'Contact' },
  ];

  return (
    <motion.footer
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay }}
      className="pt-12 pb-14 text-center space-y-5"
    >
      <div className="flex items-center justify-center gap-5 flex-wrap">
        {links.map(({ to, label }) => (
          <Link
            key={to}
            to={to}
            className={`text-[11px] tracking-[0.18em] uppercase transition-colors ${
              pathname === to
                ? 'text-foreground/80 pointer-events-none'
                : 'text-muted-foreground/45 hover:text-foreground/70'
            }`}
          >
            {label}
          </Link>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground/30 tracking-[0.25em] uppercase font-light">
        Irish Saunas · Live
      </p>
      <button
        type="button"
        onClick={toggle}
        title={isDebugMode ? 'Disable Debug Mode' : 'Enable Debug Mode (uses mock extreme data)'}
        aria-pressed={isDebugMode}
        className={`inline-flex items-center gap-1.5 text-[9px] tracking-[0.22em] uppercase transition-colors ${
          isDebugMode
            ? 'text-warning-orange'
            : 'text-muted-foreground/25 hover:text-muted-foreground/60'
        }`}
      >
        <Bug className="w-2.5 h-2.5" strokeWidth={2} />
        {isDebugMode ? 'Debug On' : 'Debug'}
      </button>
    </motion.footer>
  );
};

export default AppFooter;
