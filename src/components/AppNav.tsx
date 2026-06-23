import { Link, useLocation } from 'react-router-dom';

const AppNav = () => {
  const { pathname } = useLocation();

  const isExplore =
    pathname === '/' || pathname === '/discover' || pathname === '/explore';
  const isTides =
    !isExplore &&
    pathname !== '/how-it-works' &&
    pathname !== '/contact';

  const navItems = [
    { to: '/tides', label: 'Tides', isActive: isTides },
    { to: '/discover', label: 'Explore', isActive: isExplore },
  ];

  return (
    <nav
      className="sticky top-0 z-[2000] w-full h-11 md:h-12 flex items-center justify-center gap-6 bg-[hsl(110,22%,76%)] dark:bg-[hsl(110,14%,18%)] border-b border-border/30"
      aria-label="Primary"
    >
      {navItems.map(({ to, label, isActive }) => (
        <Link
          key={to}
          to={to}
          className={`relative text-[13px] font-medium tracking-wide transition-colors ${
            isActive
              ? 'text-foreground'
              : 'text-foreground/50 hover:text-foreground/75'
          }`}
          aria-current={isActive ? 'page' : undefined}
        >
          {label}
          {isActive && (
            <span className="absolute -bottom-[2px] left-0 right-0 h-[2px] bg-primary/60 rounded-full" />
          )}
        </Link>
      ))}
    </nav>
  );
};

export default AppNav;
