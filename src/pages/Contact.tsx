import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail } from 'lucide-react';
import AppFooter from '@/components/AppFooter';

// Static, low-cost map placeholder of Ireland (CARTO light, no labels).
// Avoids loading react-leaflet on this route for faster mobile paint.
const MAP_PLACEHOLDER_URL =
  'https://a.basemaps.cartocdn.com/light_nolabels/7/61/40.png';

const Contact = () => {
  return (
    <div className="min-h-screen bg-background relative">
      {/* Static map background */}
      <div
        className="absolute inset-0 opacity-[0.35] pointer-events-none z-0 bg-center bg-cover"
        style={{ backgroundImage: `url(${MAP_PLACEHOLDER_URL})` }}
        aria-hidden="true"
      />

      {/* Content */}
      <div className="relative z-10 max-w-md mx-auto px-4 py-8 space-y-6">
        <motion.header
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-3"
        >
          <Link
            to="/"
            className="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-light tracking-tight text-foreground">
            Contact Us
          </h1>
        </motion.header>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="space-y-4"
        >
          <p className="text-sm text-muted-foreground leading-relaxed">
            Have a question, suggestion, or want to list your sauna? Get in touch — we'd love to hear from you.
          </p>

          <a
            href="mailto:ledwith.m@gmail.com"
            className="inline-flex items-center gap-2.5 rounded-full border border-border/40 bg-card/60 backdrop-blur-sm px-5 py-3 text-sm text-foreground hover:bg-card/80 hover:border-border/60 active:scale-[0.97] transition-all"
          >
            <Mail className="w-4 h-4 text-primary" />
            ledwith.m@gmail.com
          </a>
        </motion.div>

        <AppFooter delay={0.4} />
      </div>
    </div>
  );
};

export default Contact;
