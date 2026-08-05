// Directory helpers: regions, county hubs and nearby-sauna lookups.
// All derived from the existing LOCATIONS dataset — no new data entry.

import { LOCATIONS, Location } from '@/features/location/data/locations';
import { haversine } from '@/lib/geo-math';

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/** 'Anglesey (North Wales)' → 'Anglesey' */
export const countyLabel = (county: string) =>
  county.replace(/\s*\([^)]*\)\s*/g, '').trim();

export interface Region {
  slug: string;
  name: string;
  country: string;
  blurb: string;
}

export const REGIONS: Region[] = [
  {
    slug: 'ireland',
    name: 'Ireland',
    country: 'Ireland',
    blurb:
      'Wood-fired beach saunas along the Wild Atlantic Way, the Irish Sea and everywhere between.',
  },
  {
    slug: 'scotland',
    name: 'Scotland',
    country: 'Scotland',
    blurb:
      'Sea saunas on Scottish firths, islands and long northern beaches.',
  },
  {
    slug: 'wales',
    name: 'Wales',
    country: 'Wales',
    blurb: 'Coastal saunas from Anglesey down to the Gower and Pembrokeshire.',
  },
  {
    slug: 'england',
    name: 'England',
    country: 'England',
    blurb: 'Beach saunas across Cornwall, Devon, the south coast and the north.',
  },
];

/** Every listing in the directory, with or without an online booking link. */
export const SAUNAS: Location[] = LOCATIONS;

export const getRegion = (slug: string) => REGIONS.find((r) => r.slug === slug);

export const getRegionSaunas = (country: string) =>
  SAUNAS.filter((l) => (l.country ?? 'Ireland') === country);

export interface CountyHub {
  slug: string;
  name: string;
  country: string;
  region?: Region;
  saunas: Location[];
}

const buildCountyHubs = (): CountyHub[] => {
  const map = new Map<string, CountyHub>();
  for (const loc of SAUNAS) {
    const name = countyLabel(loc.county);
    const slug = slugify(name);
    const country = loc.country ?? 'Ireland';
    const existing = map.get(slug);
    if (existing) {
      existing.saunas.push(loc);
    } else {
      map.set(slug, {
        slug,
        name,
        country,
        region: REGIONS.find((r) => r.country === country),
        saunas: [loc],
      });
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
};

const ALL_COUNTY_HUBS = buildCountyHubs();

/** County/area hubs worth their own page (2+ saunas). */
export const COUNTY_HUBS = ALL_COUNTY_HUBS.filter((c) => c.saunas.length >= 2);

export const getCountyHub = (slug: string) =>
  COUNTY_HUBS.find((c) => c.slug === slug);

/** Hub for a given sauna (may be undefined when the county has only one sauna). */
export const getCountyHubForLocation = (loc: Location) =>
  getCountyHub(slugify(countyLabel(loc.county)));

export const getRegionForLocation = (loc: Location) =>
  REGIONS.find((r) => r.country === (loc.country ?? 'Ireland'));

/** Closest other saunas, by great-circle distance. */
export const getNearbySaunas = (loc: Location, count = 3): Location[] =>
  SAUNAS.filter((l) => l.id !== loc.id)
    .map((l) => ({ l, d: haversine(loc.lat, loc.lon, l.lat, l.lon) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, count)
    .map((x) => x.l);

export const saunaTitle = (loc: Location) =>
  loc.saunaName ? `${loc.saunaName}, ${loc.name}` : loc.name;
