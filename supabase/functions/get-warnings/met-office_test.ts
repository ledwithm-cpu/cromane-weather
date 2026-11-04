import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { parseMetOfficeRss } from "./met-office.ts";

const item = (title: string, desc: string) =>
  `<item><title>${title}</title><link>https://www.metoffice.gov.uk/x</link><description>${desc}</description></item>`;

const FEED = `<?xml version="1.0"?><rss><channel><title>Met Office warnings for Northern Ireland</title>
${item("Amber warning of wind affecting Northern Ireland", "Amber warning of wind affecting Northern Ireland: Antrim, Down valid from 0600 Wed 04 Nov to 1800 Wed 04 Nov")}
${item("Yellow warning of thunderstorm affecting Northern Ireland", "Yellow warning of thunderstorm affecting Northern Ireland: Londonderry, Tyrone valid from 1200 Wed 04 Nov to 2100 Wed 04 Nov")}
${item("Red warning of rain affecting Northern Ireland", "Red warning of rain affecting Northern Ireland valid from 0000 Thu 05 Nov to 1200 Thu 05 Nov")}
</channel></rss>`;

Deno.test("met office NI: amber maps to orange and filters by county", () => {
  const w = parseMetOfficeRss(FEED, "Antrim (NI)");
  assertEquals(w.map((x) => x.level), ["orange", "red"]);
  assertEquals(w[0].headline, "Wind warning");
  assertEquals(w[0].valid_until, "1800 Wed 04 Nov");
});

Deno.test("met office NI: Derry matches Londonderry and thunderstorm is elevated", () => {
  const w = parseMetOfficeRss(FEED, "Derry (NI)");
  assertEquals(w.length, 2);
  assertEquals(w[0].is_thunderstorm, true);
  assertEquals(w[0].elevated, true);
  assertEquals(w[0].level, "orange");
});

Deno.test("met office NI: warnings with no area list apply NI-wide", () => {
  const w = parseMetOfficeRss(FEED, "Down (NI)");
  assertEquals(w.map((x) => x.level), ["orange", "red"]);
});

Deno.test("met office NI: empty feed returns no warnings", () => {
  assertEquals(parseMetOfficeRss("<rss><channel></channel></rss>", "Antrim (NI)"), []);
});
