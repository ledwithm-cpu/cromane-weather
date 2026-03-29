import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

interface AppFooterProps {
  delay?: number;
}

const AppFooter = ({ delay = 0.5 }: AppFooterProps) => {
  const { pathname } = useLocation();

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
      className="pt-8 pb-12 text-center space-y-3"
    >
      <div className="flex items-center justify-center gap-3 flex-wrap">
        {links.map(({ to, label }) => (
          <Link
            key={to}
            to={to}
            className={`text-xs tracking-wider uppercase transition-colors ${
              pathname === to
                ? 'text-foreground pointer-events-none'
                : 'text-muted-foreground/60 hover:text-foreground'
            }`}
          >
            {label}
          </Link>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground/40 tracking-wider uppercase">
        Irish Saunas · Live
      </p>
    </motion.footer>
  );
};

export default AppFooter;
