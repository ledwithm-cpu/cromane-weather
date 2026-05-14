import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LOCATIONS } from '@/lib/locations';
import { useLocation } from '@/hooks/use-location';
import SEOHead from '@/components/SEOHead';
import Index from './Index';

const LocationPage = () => {
  const { locationId } = useParams<{ locationId: string }>();
  const { setLocationById } = useLocation();
  const navigate = useNavigate();

  const loc = LOCATIONS.find(l => l.id === locationId);

  useEffect(() => {
    if (loc) {
      setLocationById(loc.id);
    }
  }, [loc, setLocationById]);

  if (!loc) {
    navigate('/', { replace: true });
    return null;
  }

  const title = loc.saunaName
    ? `${loc.name} Sauna – ${loc.saunaName} Beach Sauna & Sea Swimming, Co. ${loc.county}`
    : `${loc.name} Beach Sauna & Sea Swimming – Tides & Weather, Co. ${loc.county}`;

  const description = loc.saunaName
    ? `${loc.name} sauna guide: book ${loc.saunaName}, a wood-fired beach sauna in ${loc.name}, Co. ${loc.county}. Live tide times, sea temperature, and weather for sea swimming and cold-water plunges in ${loc.name}.`
    : `${loc.name} beach sauna and sea swimming guide for Co. ${loc.county}. Live tide times, sea temperature, and weather to plan a coastal sauna and cold-water swim in ${loc.name}.`;

  const h1 = loc.saunaName
    ? `${loc.name} Sauna · ${loc.saunaName} Beach Sauna & Sea Swimming in ${loc.name}, Co. ${loc.county}`
    : `${loc.name} Beach Sauna & Sea Swimming · ${loc.name}, Co. ${loc.county}`;

  const intro = loc.saunaName
    ? `${loc.name} Sauna guide for ${loc.name}, Co. ${loc.county}. Book ${loc.saunaName}, a wood-fired beach sauna on the ${loc.name} coast, and check live tide times, sea temperature, and weather to plan your sea swimming and cold-water plunge session in ${loc.name}.`
    : `${loc.name} Beach Sauna and sea swimming guide for ${loc.name}, Co. ${loc.county}. Live tide times, sea temperature, and weather conditions to plan a coastal sauna and sea swim in ${loc.name}.`;

  return (
    <>
      <SEOHead
        title={title}
        description={description}
        canonicalPath={`/${loc.id}`}
      />
      <h1 className="sr-only">{h1}</h1>
      <p className="sr-only">{intro}</p>
      <Index />
    </>
  );
};

export default LocationPage;
