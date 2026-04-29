import { useState, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ListChecks, Bookmark, BookmarkCheck } from 'lucide-react';
import { LOCATIONS, Location } from '@/lib/locations';
import MapLocationDrawer from '@/components/MapLocationDrawer';
import MapActionSheet from '@/components/MapActionSheet';
import BucketListPanel from '@/components/BucketListPanel';
import ThemeToggle from '@/components/ThemeToggle';
import { useIsMobile } from '@/hooks/use-mobile';
import { useBucketList } from '@/hooks/use-bucket-list';
import 'leaflet/dist/leaflet.css';

// Fix default marker icon issue with bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;

// Marker styles: blue (default sauna), grey (no sauna), gold + bookmark badge (saved).
const createSaunaIcon = (opts: { hasSauna: boolean; saved: boolean }) => {
  const baseColor = opts.saved
    ? 'hsl(42, 92%, 52%)' // gold (saved)
    : opts.hasSauna
    ? 'hsl(110, 28%, 38%)' // sage primary
    : 'hsl(95, 8%, 48%)';   // muted sage-grey

  // Tiny bookmark glyph for saved markers
  const badge = opts.saved
    ? `<div style="
        position: absolute; top: -4px; right: -4px;
        width: 14px; height: 14px;
        display: flex; align-items: center; justify-content: center;
        background: hsl(0, 0%, 100%);
        border: 1.5px solid hsl(42, 92%, 52%);
        border-radius: 50%;
        box-shadow: 0 1px 3px rgba(0,0,0,0.15);
      ">
        <svg width="7" height="7" viewBox="0 0 24 24" fill="hsl(42, 92%, 52%)" stroke="hsl(42, 92%, 52%)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
        </svg>
      </div>`
    : '';

  return L.divIcon({
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    html: `<div style="position: relative; width: 28px; height: 28px;">
      <div style="
        width: 28px; height: 28px;
        background: ${baseColor};
        border: 2.5px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 12px rgba(0,0,0,0.18);
        transition: background 0.2s ease;
      "></div>
      ${badge}
    </div>`,
  });
};

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
  const isMobile = useIsMobile();
  const { items: bucketItems, has: isSaved, add: addToBucket, remove: removeFromBucket } = useBucketList();

  // Mobile: tap dot → preview (name popup); tap preview → action sheet
  const [preview, setPreview] = useState<Location | null>(null);
  const [sheetLocation, setSheetLocation] = useState<Location | null>(null);
  // Desktop: keep existing drawer behavior
  const [selected, setSelected] = useState<Location | null>(null);
  const [hasClosedDrawer, setHasClosedDrawer] = useState(false);
  // Bucket list panel
  const [bucketOpen, setBucketOpen] = useState(false);

  const handleMarkerClick = useCallback(
    (loc: Location) => {
      if (isMobile) {
        setPreview(loc);
      } else {
        setSelected(loc);
        setHasClosedDrawer(false);
      }
    },
    [isMobile]
  );

  const handleCloseDrawer = useCallback(() => {
    setSelected(null);
    setHasClosedDrawer(true);
  }, []);

  const handleOpenSheet = useCallback((loc: Location) => {
    setSheetLocation(loc);
    setPreview(null);
  }, []);

  const saunaLocations = useMemo(() => LOCATIONS.filter((loc) => loc.saunaUrl), []);

  // Memoise saved-id set so marker icons re-render when bucket list changes
  const savedIds = useMemo(() => new Set(bucketItems.map((i) => i.locationId)), [bucketItems]);

  const markers = useMemo(
    () =>
      saunaLocations.map((loc) => {
        const saved = savedIds.has(loc.id);
        const icon = createSaunaIcon({ hasSauna: true, saved });
        return (
          <Marker
            key={`${loc.id}-${saved ? 'saved' : 'unsaved'}`}
            position={[loc.lat, loc.lon]}
            icon={icon}
            eventHandlers={{
              click: () => handleMarkerClick(loc),
            }}
          >
            {isMobile && (
              <Popup
                closeButton={false}
                autoPan={true}
                offset={[0, -8]}
                className="sauna-name-popup"
              >
                <button
                  onClick={() => handleOpenSheet(loc)}
                  className="block px-1 py-0.5 text-sm font-medium text-foreground active:opacity-70 transition-opacity"
                >
                  {loc.saunaName ?? loc.name}
                  <span className="ml-1.5 text-primary">→</span>
                </button>
              </Popup>
            )}
            {!isMobile && (
              <Popup closeButton={false} offset={[0, -8]} className="sauna-name-popup">
                <div className="flex flex-col gap-1.5 px-1 py-0.5">
                  <p className="text-sm font-medium text-foreground">
                    {loc.saunaName ?? loc.name}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {loc.name} · Co. {loc.county}
                  </p>
                  <button
                    onClick={() => {
                      if (saved) {
                        removeFromBucket(loc.id);
                      } else {
                        addToBucket(loc.id);
                        setBucketOpen(true);
                      }
                    }}
                    className={`mt-1 inline-flex items-center justify-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                      saved
                        ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 hover:bg-amber-500/25'
                        : 'bg-primary/10 text-primary hover:bg-primary/20'
                    }`}
                  >
                    {saved ? (
                      <>
                        <BookmarkCheck className="w-3 h-3" /> Saved
                      </>
                    ) : (
                      <>
                        <Bookmark className="w-3 h-3" /> Add to Bucket List
                      </>
                    )}
                  </button>
                </div>
              </Popup>
            )}
          </Marker>
        );
      }),
    [saunaLocations, handleMarkerClick, handleOpenSheet, isMobile, savedIds, addToBucket, removeFromBucket]
  );

  return (
    <div className="h-screen w-screen relative overflow-hidden bg-background">
      {/* Map */}
      <MapContainer
        center={IRELAND_CENTER}
        zoom={IRELAND_ZOOM}
        className="h-full w-full z-0 sage-map"
        zoomControl={false}
        attributionControl={false}
        style={{ background: 'hsl(85, 16%, 88%)' }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
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
            <button
              onClick={() => setBucketOpen((o) => !o)}
              aria-label="Toggle bucket list"
              aria-expanded={bucketOpen}
              className="relative glass-card rounded-full p-2.5 shadow-lg hover:bg-card/90 active:scale-[0.97] transition-all"
            >
              <ListChecks className="w-4 h-4 text-foreground" />
              {bucketItems.length > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center rounded-full bg-amber-500 text-[10px] font-semibold text-white tabular-nums shadow">
                  {bucketItems.length}
                </span>
              )}
            </button>
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

      {/* Desktop drawer */}
      <AnimatePresence>
        {selected && !isMobile && (
          <MapLocationDrawer
            location={selected}
            onClose={handleCloseDrawer}
            onAddToBucketList={() => setBucketOpen(true)}
          />
        )}
      </AnimatePresence>

      {/* Mobile action sheet */}
      <AnimatePresence>
        {sheetLocation && (
          <MapActionSheet
            location={sheetLocation}
            onClose={() => setSheetLocation(null)}
            onAddedToBucketList={() => setBucketOpen(true)}
          />
        )}
      </AnimatePresence>

      {/* Bucket list panel — desktop right sidebar / mobile bottom sheet */}
      <BucketListPanel open={bucketOpen} onClose={() => setBucketOpen(false)} />
    </div>
  );
};

export default DiscoverMap;
