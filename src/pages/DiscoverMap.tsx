import { useState, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { LOCATIONS, Location } from '@/lib/locations';
import MapLocationDrawer from '@/components/MapLocationDrawer';
import ThemeToggle from '@/components/ThemeToggle';
import 'leaflet/dist/leaflet.css';

// Fix default marker icon issue with bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;

const createSaunaIcon = (hasSauna: boolean) =>
  L.divIcon({
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    html: `<div style="
      width: 28px; height: 28px;
      display: flex; align-items: center; justify-content: center;
      background: ${hasSauna ? 'hsl(210, 60%, 45%)' : 'hsl(215, 12%, 50%)'};
      border: 2.5px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 12px rgba(0,0,0,0.18);
      transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
      cursor: pointer;
    "></div>`,
  });

const saunaIcon = createSaunaIcon(true);
const noSaunaIcon = createSaunaIcon(false);

// Center of Ireland
const IRELAND_CENTER: [number, number] = [53.5, -8.0];
const IRELAND_ZOOM = 7;

function FlyToLocation({ location, resetToOverview }: { location: Location | null; resetToOverview: boolean }) {
  const map = useMap();
  if (location) {
    map.flyTo([location.lat, location.lon], 11, { duration: 0.8 });
  } else if (resetToOverview) {
    map.flyTo(IRELAND_CENTER, IRELAND_ZOOM, { duration: 0.8 });
  }
  return null;
}

const DiscoverMap = () => {
  const [selected, setSelected] = useState<Location | null>(null);
  const [hasClosedDrawer, setHasClosedDrawer] = useState(false);

  const handleMarkerClick = useCallback((loc: Location) => {
    setSelected(loc);
    setHasClosedDrawer(false);
  }, []);

  const handleClose = useCallback(() => {
    setSelected(null);
    setHasClosedDrawer(true);
  }, []);

  const saunaLocations = useMemo(() => LOCATIONS.filter((loc) => loc.saunaUrl), []);

  const markers = useMemo(
    () =>
      saunaLocations.map((loc) => (
        <Marker
          key={loc.id}
          position={[loc.lat, loc.lon]}
          icon={saunaIcon}
          eventHandlers={{
            click: () => handleMarkerClick(loc),
          }}
        />
      )),
    [saunaLocations, handleMarkerClick]
  );

  return (
    <div className="h-screen w-screen relative overflow-hidden bg-background">
      {/* Map */}
      <MapContainer
        center={IRELAND_CENTER}
        zoom={IRELAND_ZOOM}
        className="h-full w-full z-0"
        zoomControl={false}
        attributionControl={false}
        style={{ background: 'hsl(210, 30%, 96%)' }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
        />
        {markers}
        <FlyToLocation location={selected} resetToOverview={hasClosedDrawer} />
      </MapContainer>

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-[1000] pointer-events-none">
        <div className="flex items-center justify-between px-4 py-4 max-w-screen-xl mx-auto">
          <Link
            to="/"
            className="pointer-events-auto inline-flex items-center gap-2 glass-card rounded-full px-4 py-2.5 text-sm font-normal text-foreground hover:bg-card/90 active:scale-[0.97] transition-all shadow-lg"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
          <div className="pointer-events-auto flex items-center gap-2">
            <div className="glass-card rounded-full px-4 py-2.5 shadow-lg">
              <span className="text-sm font-normal tracking-wide text-foreground">
                Discover Saunas
              </span>
            </div>
            <div className="glass-card rounded-full shadow-lg">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-6 left-4 z-[1000] glass-card rounded-2xl px-4 py-3 shadow-lg">
        <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">
          {saunaLocations.length} saunas across Ireland
        </p>
      </div>

      {/* Location drawer */}
      <AnimatePresence>
        {selected && (
          <MapLocationDrawer location={selected} onClose={handleClose} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default DiscoverMap;
