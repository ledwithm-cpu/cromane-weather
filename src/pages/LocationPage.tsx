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
    ? `${loc.name} Sauna – ${loc.saunaName} Beach Sauna, Co. ${loc.county}`
    : `${loc.name} Beach Sauna – Sea Swimming, Tides & Weather`;

  const description = loc.saunaName
    ? `${loc.saunaName} beach sauna in ${loc.name}, Co. ${loc.county}. Book a wood-fired sauna and cold plunge with live tide times, sea temperature, and weather for sea swimming in ${loc.name}.`
    : `${loc.name} beach sauna and sea swimming guide. Live tide times, sea temperature, and weather for cold-water swimming and sauna sessions in ${loc.name}, Co. ${loc.county}.`;

  return (
    <>
      <SEOHead
        title={title}
        description={description}
        canonicalPath={`/${loc.id}`}
      />
      <Index />
    </>
  );
};

export default LocationPage;
