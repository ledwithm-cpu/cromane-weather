import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { Location } from '@/features/location/data/locations';
import { countyLabel } from '@/features/location/lib/directory';

interface SaunaCardProps {
  location: Location;
}

/** Crawlable link card for a sauna, reused across the homepage and hub pages. */
const SaunaCard = ({ location }: SaunaCardProps) => (
  <Link
    to={`/${location.id}`}
    className="group flex flex-col rounded-3xl border border-border/60 bg-card/70 px-5 py-4 backdrop-blur-sm transition-colors hover:border-primary/50 hover:bg-card"
  >
    <h3 className="font-serif text-lg leading-snug text-foreground">
      {location.saunaName ?? location.name}
    </h3>
    <p className="mt-1 inline-flex items-center gap-1.5 text-[13px] text-muted-foreground">
      <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
      {location.name} · {countyLabel(location.county)}
    </p>
    <span className="mt-3 text-[13px] font-medium text-primary">
      Tides &amp; conditions
      <span className="ml-1 inline-block transition-transform group-hover:translate-x-0.5">→</span>
    </span>
  </Link>
);

export default SaunaCard;
