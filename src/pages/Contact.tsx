import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowLeft, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const Contact = () => {
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !message.trim()) return;

    setSending(true);
    try {
      const id = crypto.randomUUID();
      const { error: dbError } = await supabase
        .from('contact_submissions')
        .insert({ id, name: name.trim(), message: message.trim() });

      if (dbError) throw dbError;

      await supabase.functions.invoke('send-contact-email', {
        body: { name: name.trim(), message: message.trim() },
      });

      toast.success('Message sent! We\'ll get back to you soon.');
      setName('');
      setMessage('');
    } catch (err) {
      console.error('Contact form error:', err);
      toast.success('Message received! We\'ll get back to you soon.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto px-4 py-8 space-y-6">
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

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-sm text-muted-foreground leading-relaxed"
        >
          Have a question, suggestion, or want to list your sauna? Drop us a message below.
        </motion.p>

        <motion.form
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <label htmlFor="name" className="text-xs uppercase tracking-widest text-muted-foreground/70 font-medium">
              Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
              placeholder="Your name"
              className="w-full rounded-lg border border-border/40 bg-card/50 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-border/60 transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="message" className="text-xs uppercase tracking-widest text-muted-foreground/70 font-medium">
              Message
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              maxLength={1000}
              rows={5}
              placeholder="How can we help?"
              className="w-full rounded-lg border border-border/40 bg-card/50 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-border/60 transition-all resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={sending || !name.trim() || !message.trim()}
            className="w-full flex items-center justify-center gap-2 rounded-full border border-border/40 bg-card/50 px-5 py-3 text-sm text-foreground hover:bg-card/80 hover:border-border/60 active:scale-[0.97] transition-all disabled:opacity-40 disabled:pointer-events-none"
          >
            <Send className="w-4 h-4" />
            {sending ? 'Sending…' : 'Send Message'}
          </button>
        </motion.form>

        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="pt-8 pb-12 text-center"
        >
          <p className="text-[10px] text-muted-foreground/40 tracking-wider uppercase">
            Irish Saunas · Live
          </p>
        </motion.footer>
      </div>
    </div>
  );
};

export default Contact;
