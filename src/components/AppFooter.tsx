import { m } from 'framer-motion';
import { Link } from 'react-router-dom';
import { openExternal } from '@/lib/open-external';
import { REGIONS } from '@/features/location/lib/directory';

interface AppFooterProps {
  delay?: number;
}

const AppFooter = ({ delay = 0.5 }: AppFooterProps) => {
  return (
    <m.footer
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay }}
      className="pt-12 pb-14 text-center space-y-5"
    >
      <nav aria-label="Regions" className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs">
        {REGIONS.map((r) => (
          <Link
            key={r.slug}
            to={`/${r.slug}`}
            className="text-foreground/70 hover:text-foreground hover:underline"
          >
            Saunas in {r.name}
          </Link>
        ))}
      </nav>
      <button
        type="button"
        onClick={() => openExternal('https://pawwarning.com')}
        className="text-sm text-foreground/70 hover:text-foreground transition-colors"
      >
        Sister site: PawWarning
      </button>
    </m.footer>
  );
};

export default AppFooter;
