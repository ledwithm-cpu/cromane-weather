import AppNav from '@/components/AppNav';
import ThemeToggle from '@/components/ThemeToggle';
import SEOHead from '@/components/SEOHead';
import SaunaMapSection from '@/features/location/components/SaunaMapSection';
import { SAUNAS } from '@/features/location/lib/directory';

const DiscoverMap = () => (
  <div className="h-dvh w-full relative overflow-hidden bg-background flex flex-col">
    <SEOHead
      title={`Sauna Map · ${SAUNAS.length} Coastal Saunas in Ireland, Scotland, Wales & England`}
      description={`Interactive map of ${SAUNAS.length} coastal saunas across Ireland, Scotland, Wales and England. Tap a pin for live tide times, sea conditions and booking links.`}
      canonicalPath="/discover"
    />
    <AppNav />
    {/* Hero */}
    <section className="shrink-0 border-b border-border/40 bg-[hsl(110,28%,82%)]/70 dark:bg-[hsl(110,18%,22%)]/60 backdrop-blur-sm px-4 py-0.5 text-center">
      <h1 className="text-lg md:text-xl font-normal tracking-wide text-foreground leading-tight">
        Sauna map · Ireland, Scotland, Wales &amp; England
      </h1>
      <p className="mt-0.5 text-xs md:text-sm text-foreground/80 max-w-3xl mx-auto leading-snug overflow-hidden text-ellipsis whitespace-nowrap">
        Discover sea-side saunas around the coast — save your favourites and tick them off.
      </p>
    </section>

    <SaunaMapSection className="flex-1" topRightSlot={<ThemeToggle />} />
  </div>
);

export default DiscoverMap;
