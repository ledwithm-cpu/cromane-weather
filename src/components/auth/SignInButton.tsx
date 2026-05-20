import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/integrations/supabase/client';
import { LogIn, LogOut, User as UserIcon } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface SignInButtonProps {
  className?: string;
  /** When true renders as a compact glass-card pill (map overlay). */
  glass?: boolean;
}

export default function SignInButton({ className = '', glass = false }: SignInButtonProps) {
  const { user, openAuthModal, signOut } = useAuth();
  const [firstName, setFirstName] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { setFirstName(null); return; }
    let cancelled = false;
    supabase.from('profiles').select('first_name').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => { if (!cancelled) setFirstName(data?.first_name ?? null); });
    return () => { cancelled = true; };
  }, [user]);

  const base = glass
    ? 'glass-card rounded-full px-4 py-2.5 shadow-lg hover:bg-card/90'
    : 'rounded-full px-4 py-2 hover:bg-muted/60';

  if (!user) {
    return (
      <button
        onClick={() => openAuthModal()}
        className={`${base} inline-flex items-center gap-2 text-sm font-normal text-foreground active:scale-[0.97] transition-all ${className}`}
        aria-label="Sign in"
      >
        <LogIn className="w-4 h-4" />
        <span>Sign in</span>
      </button>
    );
  }

  const display = firstName || user.email?.split('@')[0] || 'Account';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={`${base} inline-flex items-center gap-2 text-sm font-normal text-foreground active:scale-[0.97] transition-all ${className}`}
          aria-label="Account menu"
        >
          <UserIcon className="w-4 h-4" />
          <span className="max-w-[120px] truncate">{display}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal text-xs text-muted-foreground truncate">
          {user.email}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut()} className="cursor-pointer">
          <LogOut className="w-4 h-4 mr-2" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
