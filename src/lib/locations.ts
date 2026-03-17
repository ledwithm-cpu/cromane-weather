export interface Location {
  id: string;
  name: string;
  subtitle: string; // e.g. "Co. Kerry · 52.11°N"
  lat: number;
  lon: number;
  county: string;
  province: string;
  tideStation: string;       // ERDDAP station name
  tideOffsetMinutes: number; // delay from station to location
  metEireannStation?: string; // nearest Met Éireann obs station
}

export const LOCATIONS: Location[] = [
  // Kerry
  {
    id: 'cromane',
    name: 'Cromane',
    subtitle: 'Co. Kerry · 52.11°N',
    lat: 52.105818, lon: -9.895735,
    county: 'Kerry', province: 'Munster',
    tideStation: 'Fenit', tideOffsetMinutes: 25,
    metEireannStation: 'valentia',
  },
  {
    id: 'inch-beach',
    name: 'Inch Beach',
    subtitle: 'Co. Kerry · 52.13°N',
    lat: 52.131, lon: -9.965,
    county: 'Kerry', province: 'Munster',
    tideStation: 'Fenit', tideOffsetMinutes: 20,
    metEireannStation: 'valentia',
  },
  {
    id: 'dingle',
    name: 'Dingle',
    subtitle: 'Co. Kerry · 52.14°N',
    lat: 52.141, lon: -10.268,
    county: 'Kerry', province: 'Munster',
    tideStation: 'Fenit', tideOffsetMinutes: 10,
    metEireannStation: 'valentia',
  },
  {
    id: 'ballybunion',
    name: 'Ballybunion',
    subtitle: 'Co. Kerry · 52.51°N',
    lat: 52.511, lon: -9.673,
    county: 'Kerry', province: 'Munster',
    tideStation: 'Fenit', tideOffsetMinutes: 15,
    metEireannStation: 'valentia',
  },
  {
    id: 'banna-strand',
    name: 'Banna Strand',
    subtitle: 'Co. Kerry · 52.38°N',
    lat: 52.381, lon: -9.818,
    county: 'Kerry', province: 'Munster',
    tideStation: 'Fenit', tideOffsetMinutes: 5,
    metEireannStation: 'valentia',
  },
  {
    id: 'cahersiveen',
    name: 'Cahersiveen',
    subtitle: 'Co. Kerry · 51.95°N',
    lat: 51.949, lon: -10.223,
    county: 'Kerry', province: 'Munster',
    tideStation: 'Fenit', tideOffsetMinutes: 30,
    metEireannStation: 'valentia',
  },
  {
    id: 'waterville',
    name: 'Waterville',
    subtitle: 'Co. Kerry · 51.83°N',
    lat: 51.829, lon: -10.168,
    county: 'Kerry', province: 'Munster',
    tideStation: 'Fenit', tideOffsetMinutes: 35,
    metEireannStation: 'valentia',
  },
  // Cork
  {
    id: 'kinsale',
    name: 'Kinsale',
    subtitle: 'Co. Cork · 51.70°N',
    lat: 51.706, lon: -8.527,
    county: 'Cork', province: 'Munster',
    tideStation: 'Cobh', tideOffsetMinutes: 15,
    metEireannStation: 'roches-point',
  },
  {
    id: 'inchydoney',
    name: 'Inchydoney',
    subtitle: 'Co. Cork · 51.60°N',
    lat: 51.598, lon: -8.862,
    county: 'Cork', province: 'Munster',
    tideStation: 'Cobh', tideOffsetMinutes: 30,
    metEireannStation: 'roches-point',
  },
  {
    id: 'schull',
    name: 'Schull',
    subtitle: 'Co. Cork · 51.53°N',
    lat: 51.527, lon: -9.554,
    county: 'Cork', province: 'Munster',
    tideStation: 'Castletownbere', tideOffsetMinutes: 20,
    metEireannStation: 'sherkin-island',
  },
  // Clare
  {
    id: 'lahinch',
    name: 'Lahinch',
    subtitle: 'Co. Clare · 52.94°N',
    lat: 52.937, lon: -9.351,
    county: 'Clare', province: 'Munster',
    tideStation: 'Galway', tideOffsetMinutes: -30,
    metEireannStation: 'shannon',
  },
  {
    id: 'fanore',
    name: 'Fanore',
    subtitle: 'Co. Clare · 53.12°N',
    lat: 53.121, lon: -9.280,
    county: 'Clare', province: 'Munster',
    tideStation: 'Galway', tideOffsetMinutes: -20,
    metEireannStation: 'shannon',
  },
  // Galway
  {
    id: 'salthill',
    name: 'Salthill',
    subtitle: 'Co. Galway · 53.26°N',
    lat: 53.257, lon: -9.077,
    county: 'Galway', province: 'Connacht',
    tideStation: 'Galway', tideOffsetMinutes: 5,
    metEireannStation: 'athenry',
  },
  {
    id: 'dogs-bay',
    name: 'Dog\'s Bay',
    subtitle: 'Co. Galway · 53.38°N',
    lat: 53.383, lon: -9.982,
    county: 'Galway', province: 'Connacht',
    tideStation: 'Galway', tideOffsetMinutes: -15,
    metEireannStation: 'athenry',
  },
  // Sligo
  {
    id: 'strandhill',
    name: 'Strandhill',
    subtitle: 'Co. Sligo · 54.27°N',
    lat: 54.271, lon: -8.604,
    county: 'Sligo', province: 'Connacht',
    tideStation: 'Ballyglass', tideOffsetMinutes: 20,
    metEireannStation: 'knock',
  },
  // Donegal
  {
    id: 'bundoran',
    name: 'Bundoran',
    subtitle: 'Co. Donegal · 54.47°N',
    lat: 54.474, lon: -8.281,
    county: 'Donegal', province: 'Ulster',
    tideStation: 'Ballyglass', tideOffsetMinutes: 25,
    metEireannStation: 'malin-head',
  },
  {
    id: 'portnoo',
    name: 'Portnoo',
    subtitle: 'Co. Donegal · 54.83°N',
    lat: 54.834, lon: -8.493,
    county: 'Donegal', province: 'Ulster',
    tideStation: 'Aranmore', tideOffsetMinutes: 10,
    metEireannStation: 'malin-head',
  },
  // Dublin
  {
    id: 'portmarnock',
    name: 'Portmarnock',
    subtitle: 'Co. Dublin · 53.42°N',
    lat: 53.423, lon: -6.131,
    county: 'Dublin', province: 'Leinster',
    tideStation: 'Howth', tideOffsetMinutes: 5,
    metEireannStation: 'dublin-airport',
  },
  // Waterford
  {
    id: 'tramore',
    name: 'Tramore',
    subtitle: 'Co. Waterford · 52.16°N',
    lat: 52.159, lon: -7.146,
    county: 'Waterford', province: 'Munster',
    tideStation: 'Dunmore East', tideOffsetMinutes: 10,
    metEireannStation: 'johnstown-castle',
  },
  // Wexford
  {
    id: 'curracloe',
    name: 'Curracloe',
    subtitle: 'Co. Wexford · 52.39°N',
    lat: 52.392, lon: -6.385,
    county: 'Wexford', province: 'Leinster',
    tideStation: 'Arklow', tideOffsetMinutes: 20,
    metEireannStation: 'johnstown-castle',
  },
];

export const DEFAULT_LOCATION = LOCATIONS[0]; // Cromane

export function getLocationById(id: string): Location {
  return LOCATIONS.find(l => l.id === id) ?? DEFAULT_LOCATION;
}
