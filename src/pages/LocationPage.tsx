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
    ? `${loc.name} Beach Sauna – ${loc.saunaName} | Tides & Weather`
    : `${loc.name} – Tide Times & Weather | Irish Beach Saunas`;

  const description = loc.saunaName
    ? `Book ${loc.saunaName} in ${loc.name}, Co. ${loc.county}. Live tide times, sea temperature, and weather conditions for your sauna and swim session.`
    : `Live tide times, sea temperature, and weather for ${loc.name}, Co. ${loc.county}. Plan your coastal swim with real-time data.`;

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
