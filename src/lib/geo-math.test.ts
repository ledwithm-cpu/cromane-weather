import { describe, it, expect } from 'vitest';
import { haversine, bearing, bearingToCompass } from './geo-math';

// ─── Reference coordinates ───
// Sources: Wikipedia / OS Ireland city centre coordinates.
const DUBLIN = { lat: 53.3498, lon: -6.2603 };
const GALWAY = { lat: 53.2707, lon: -9.0568 };
const CORK = { lat: 51.8985, lon: -8.4756 };
const BELFAST = { lat: 54.5973, lon: -5.9301 };
const CROMANE = { lat: 52.0833, lon: -9.9 };

describe('haversine', () => {
  it('returns 0 for identical points', () => {
    expect(haversine(DUBLIN.lat, DUBLIN.lon, DUBLIN.lat, DUBLIN.lon)).toBe(0);
  });

  it('is symmetric: distance(A→B) === distance(B→A)', () => {
    const ab = haversine(DUBLIN.lat, DUBLIN.lon, GALWAY.lat, GALWAY.lon);
    const ba = haversine(GALWAY.lat, GALWAY.lon, DUBLIN.lat, DUBLIN.lon);
    expect(ab).toBeCloseTo(ba, 6);
  });

  it('computes Dublin → Galway ≈ 187 km (±2 km)', () => {
    // Known great-circle distance ≈ 187 km
    const km = haversine(DUBLIN.lat, DUBLIN.lon, GALWAY.lat, GALWAY.lon);
    expect(km).toBeGreaterThan(185);
    expect(km).toBeLessThan(189);
  });

  it('computes Dublin → Cork ≈ 219 km (±3 km)', () => {
    const km = haversine(DUBLIN.lat, DUBLIN.lon, CORK.lat, CORK.lon);
    expect(km).toBeGreaterThan(216);
    expect(km).toBeLessThan(222);
  });

  it('computes Dublin → Belfast ≈ 139 km (±3 km)', () => {
    const km = haversine(DUBLIN.lat, DUBLIN.lon, BELFAST.lat, BELFAST.lon);
    expect(km).toBeGreaterThan(136);
    expect(km).toBeLessThan(142);
  });

  it('handles short distances (~1 km offset)', () => {
    // ~0.009° latitude ≈ 1 km
    const km = haversine(53.0, -9.0, 53.009, -9.0);
    expect(km).toBeCloseTo(1, 1);
  });
});

describe('bearing', () => {
  it('returns ~0° (North) when target is due north', () => {
    const brng = bearing(53.0, -9.0, 54.0, -9.0);
    expect(brng).toBeCloseTo(0, 1);
  });

  it('returns ~90° (East) when target is due east', () => {
    const brng = bearing(53.0, -9.0, 53.0, -8.0);
    expect(brng).toBeGreaterThan(89);
    expect(brng).toBeLessThan(91);
  });

  it('returns ~180° (South) when target is due south', () => {
    const brng = bearing(53.0, -9.0, 52.0, -9.0);
    expect(brng).toBeCloseTo(180, 1);
  });

  it('returns ~270° (West) when target is due west', () => {
    const brng = bearing(53.0, -9.0, 53.0, -10.0);
    expect(brng).toBeGreaterThan(269);
    expect(brng).toBeLessThan(271);
  });

  it('always returns a value in [0, 360)', () => {
    const samples = [
      bearing(DUBLIN.lat, DUBLIN.lon, GALWAY.lat, GALWAY.lon),
      bearing(GALWAY.lat, GALWAY.lon, DUBLIN.lat, DUBLIN.lon),
      bearing(CROMANE.lat, CROMANE.lon, BELFAST.lat, BELFAST.lon),
      bearing(BELFAST.lat, BELFAST.lon, CORK.lat, CORK.lon),
    ];
    for (const b of samples) {
      expect(b).toBeGreaterThanOrEqual(0);
      expect(b).toBeLessThan(360);
    }
  });

  it('Dublin → Galway is roughly westward (≈ 260°–270°)', () => {
    const brng = bearing(DUBLIN.lat, DUBLIN.lon, GALWAY.lat, GALWAY.lon);
    expect(brng).toBeGreaterThan(255);
    expect(brng).toBeLessThan(275);
  });

  it('Dublin → Cork is roughly south-southwest (≈ 200°–215°)', () => {
    const brng = bearing(DUBLIN.lat, DUBLIN.lon, CORK.lat, CORK.lon);
    expect(brng).toBeGreaterThan(198);
    expect(brng).toBeLessThan(218);
  });
});

describe('bearingToCompass', () => {
  it('maps cardinal directions correctly', () => {
    expect(bearingToCompass(0)).toBe('N');
    expect(bearingToCompass(90)).toBe('E');
    expect(bearingToCompass(180)).toBe('S');
    expect(bearingToCompass(270)).toBe('W');
  });

  it('maps intercardinal directions correctly', () => {
    expect(bearingToCompass(45)).toBe('NE');
    expect(bearingToCompass(135)).toBe('SE');
    expect(bearingToCompass(225)).toBe('SW');
    expect(bearingToCompass(315)).toBe('NW');
  });

  it('maps secondary intercardinal directions correctly', () => {
    expect(bearingToCompass(22.5)).toBe('NNE');
    expect(bearingToCompass(67.5)).toBe('ENE');
    expect(bearingToCompass(112.5)).toBe('ESE');
    expect(bearingToCompass(247.5)).toBe('WSW');
  });

  it('wraps 360° back to N', () => {
    expect(bearingToCompass(360)).toBe('N');
  });

  it('rounds to the nearest 22.5° bucket', () => {
    // 10° → nearest is 0° → N
    expect(bearingToCompass(10)).toBe('N');
    // 80° → nearest is 78.75° (E) bucket → E (Math.round(80/22.5)=4 → 'E')
    expect(bearingToCompass(80)).toBe('E');
    // 200° → Math.round(200/22.5)=9 → 'SSW'
    expect(bearingToCompass(200)).toBe('SSW');
  });
});

describe('integration: haversine + bearing + compass', () => {
  it('gives consistent direction labels for known routes', () => {
    const brngDubGal = bearing(DUBLIN.lat, DUBLIN.lon, GALWAY.lat, GALWAY.lon);
    const compass = bearingToCompass(brngDubGal);
    // Dublin → Galway is roughly West / WSW
    expect(['W', 'WSW', 'WNW']).toContain(compass);
  });

  it('Cromane → Dublin is roughly East / ENE', () => {
    const brng = bearing(CROMANE.lat, CROMANE.lon, DUBLIN.lat, DUBLIN.lon);
    const compass = bearingToCompass(brng);
    expect(['E', 'ENE', 'NE']).toContain(compass);
  });
});
