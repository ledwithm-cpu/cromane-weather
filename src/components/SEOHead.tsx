import { useEffect } from 'react';

interface SEOHeadProps {
  title: string;
  description: string;
  canonicalPath: string;
  ogImage?: string;
  ogUrl?: string;
}

const BASE_URL = 'https://irishsaunas.lovable.app';
const DEFAULT_OG_IMAGE = 'https://images.unsplash.com/photo-1588869715773-c66526732f6f?w=1200&h=630&fit=crop';

const SEOHead = ({ title, description, canonicalPath, ogImage, ogUrl }: SEOHeadProps) => {
  useEffect(() => {
    document.title = title;

    const setMeta = (attr: string, key: string, content: string) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    const url = ogUrl || `${BASE_URL}${canonicalPath}`;
    const imageUrl = ogImage || DEFAULT_OG_IMAGE;

    // Standard meta
    setMeta('name', 'description', description);

    // Open Graph meta
    setMeta('property', 'og:title', title);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:url', url);
    setMeta('property', 'og:type', 'website');
    setMeta('property', 'og:image', imageUrl);
    setMeta('property', 'og:image:width', '1200');
    setMeta('property', 'og:image:height', '630');
    setMeta('property', 'og:locale', 'en_IE');
    setMeta('property', 'og:site_name', 'Irish Beach Saunas');

    // Twitter Card meta
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', title);
    setMeta('name', 'twitter:description', description);
    setMeta('name', 'twitter:image', imageUrl);

    // Canonical link
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', url);

    return () => {
      // Reset to defaults on unmount
      document.title = 'Irish Beach Saunas | Find Coastal Saunas, Tide Times & Weather';
    };
  }, [title, description, canonicalPath, ogImage, ogUrl]);

  return null;
};

export default SEOHead;
