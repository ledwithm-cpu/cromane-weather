// Met Office public warnings RSS for Northern Ireland.
// Item format (verified against the live feed shape):
//   <title>Yellow warning of rain, wind affecting Northern Ireland</title>
//   <description>Yellow warning of rain, wind affecting Northern Ireland: Antrim, Down valid from 0600 Wed 04 Nov to 1800 Wed 04 Nov</description>
export const MET_OFFICE_NI_RSS = 'https://www.metoffice.gov.uk/public/data/PWSCache/WarningsRSS/Region/ni';

const LEVELS: Record<string, 'yellow' | 'orange' | 'red'> = {
  yellow: 'yellow',
  amber: 'orange',
  red: 'red',
};

function decode(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ').trim();
}

/** "Derry (NI)" → ["derry", "londonderry"]; "Antrim (NI)" → ["antrim"]. */
function countyAliases(county: string): string[] {
  const base = county.replace(/\(NI\)/i, '').trim().toLowerCase();
  if (base === 'derry' || base === 'londonderry') return ['derry', 'londonderry'];
  return [base];
}

export function parseMetOfficeRss(xml: string, county: string) {
  const warnings: any[] = [];
  const aliases = countyAliases(county);
  const items = xml.match(/<item>[\s\S]*?<\/item>/gi) ?? [];

  for (const item of items) {
    const title = decode(item.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? '');
    const description = decode(item.match(/<description>([\s\S]*?)<\/description>/i)?.[1] ?? '');
    const levelWord = title.match(/^(yellow|amber|red)\b/i)?.[1]?.toLowerCase();
    if (!levelWord) continue;
    const level = LEVELS[levelWord];
    const type = title.match(/warning of (.+?) affecting/i)?.[1]?.trim() ?? 'weather';

    // Areas listed between ":" and " valid from"
    const areasText = description.match(/:\s*(.+?)\s+valid from/i)?.[1] ?? '';
    const areas = areasText.split(',').map(a => a.trim().toLowerCase()).filter(Boolean);
    if (areas.length > 0 && !areas.some(a => aliases.some(c => a.includes(c)))) continue;

    const valid = description.match(/valid from (.+)$/i)?.[1];
    const validUntil = valid?.match(/to (.+)$/i)?.[1] ?? valid ?? 'Check metoffice.gov.uk';

    const isThunderstorm = /thunder|lightning/i.test(title + ' ' + description);
    const elevated = isThunderstorm && level === 'yellow';
    const headline = `${type.charAt(0).toUpperCase()}${type.slice(1)} warning`;
    if (warnings.some(w => w.headline === headline && w.level === (elevated ? 'orange' : level))) continue;

    warnings.push({
      level: elevated ? 'orange' : level,
      headline,
      description: description || `${headline} in effect.`,
      valid_until: validUntil,
      is_thunderstorm: isThunderstorm,
      elevated,
    });
  }
  return warnings;
}
