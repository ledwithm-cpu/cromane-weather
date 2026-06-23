import { Button } from '@/components/ui/button';
import { useHomeSauna } from '@/hooks/use-home-sauna';

interface HomeSaunaToggleProps {
  slug: string;
  label?: string;
}

const HomeSaunaToggle = ({ slug, label }: HomeSaunaToggleProps) => {
  const { homeSauna, setHomeSauna, clearHomeSauna, loading } = useHomeSauna();
  const isHome = homeSauna === slug;

  if (isHome) {
    return (
      <div className="flex items-center justify-center gap-2">
        <Button variant="secondary" size="sm" disabled className="opacity-100">
          ★ Your home sauna
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => clearHomeSauna()}
          disabled={loading}
        >
          Unset
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setHomeSauna(slug)}
      disabled={loading}
      className="mx-auto"
    >
      Set {label ? `${label} ` : ''}as my home sauna
    </Button>
  );
};

export default HomeSaunaToggle;
