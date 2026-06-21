import { m } from 'framer-motion';
import { openExternal } from '@/lib/open-external';

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
