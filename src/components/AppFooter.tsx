import { Link, useLocation } from 'react-router-dom';
import { m } from 'framer-motion';

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
    <m.footer
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
    </m.footer>
  );
};

export default AppFooter;
