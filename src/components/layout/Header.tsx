import { NavLink, useLocation, useNavigate } from "react-router-dom";
import logo from "@/assets/images/branding/logo-transparent.png";
import { useState, useEffect } from "react";
import { Menu, User, LogOut, X, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { NavigationMenu, NavigationMenuItem, NavigationMenuList } from "@/components/ui/navigation-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminCheck } from "@/hooks/useAdminCheck";

const DISMISS_KEY = "ffe-emergency-bar-dismissed";
const DISMISS_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

interface HeaderProps {
  showUtility?: boolean;
  showCrisis?: boolean;
}

const primaryNavLinks = [
  { to: '/', label: 'Home' },
  { to: '/help', label: 'Get Help Now' },
  { to: '/youth-futures', label: 'Youth Futures' },
  { to: '/about', label: 'About Us' },
];

const resourceNavLinks = [
  { to: '/victim-services', label: 'Healing Hub' },
  { to: '/blog', label: 'Knowledge Hub' },
  { to: '/learn', label: 'The Collective' },
];

const portalNavLinks = [
  { to: '/auth', label: 'Client Portal' },
  { to: '/partners', label: 'Partner Portal' },
];

const Header = ({ showUtility = true, showCrisis = true }: HeaderProps) => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);
  const [emergencyDismissed, setEmergencyDismissed] = useState(false);
  const { isAdmin } = useAdminCheck(user);

  useEffect(() => {
    const handleScroll = () => setHasScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    try {
      const t = localStorage.getItem(DISMISS_KEY);
      if (t && Date.now() - parseInt(t, 10) < DISMISS_TTL) setEmergencyDismissed(true);
    } catch { /* noop */ }
  }, []);

  if (location.pathname === '/auth' || location.pathname === '/register') return null;

  const dismissEmergency = () => {
    setEmergencyDismissed(true);
    try { localStorage.setItem(DISMISS_KEY, Date.now().toString()); } catch { /* noop */ }
  };

  const navLinkCls = ({ isActive }: { isActive: boolean }) =>
    `text-sm transition-colors duration-150 ${isActive
      ? 'text-[#BB0000]'
      : 'text-foreground/65 hover:text-foreground'
    }`;

  const dropdownItemCls =
    "block select-none rounded-md p-3 text-sm leading-none no-underline outline-none transition-colors duration-150 text-foreground/75 hover:text-foreground hover:bg-accent/60 focus:bg-accent/60";

  return (
    <header
      className="sticky top-0 z-50"
      style={{ fontFamily: 'Outfit, sans-serif' }}
    >
      {/* ── Main nav ── */}
      <div
        className="w-full transition-all duration-300"
        style={{
          background: hasScrolled
            ? 'rgba(255,255,255,0.88)'
            : 'rgba(255,255,255,0.82)',
          borderBottom: '1px solid rgba(214,214,214,0.9)',
          backdropFilter: hasScrolled ? 'blur(12px)' : 'none'
        }}
      >
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between py-3">

            {/* Mobile hamburger */}
            <div className="flex md:hidden">
              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                  <button
                    className="p-2 text-foreground/60 hover:text-foreground transition-colors"
                    aria-label="Open menu"
                  >
                    <Menu className="h-5 w-5" />
                  </button>
                </SheetTrigger>
                <SheetContent
                  side="left"
                  className="w-[300px] border-r"
                  style={{
                    background: '#FFFFFF',
                    borderColor: 'rgba(214,214,214,0.9)'
                  }}
                >
                  <SheetTitle
                    style={{
                      fontFamily: 'Cormorant Garamond, serif',
                      fontWeight: 300,
                      fontSize: '22px',
                      color: 'rgba(41,27,16,0.92)',
                      letterSpacing: '-0.01em'
                    }}
                  >
                    Navigation
                  </SheetTitle>
                  <SheetDescription className="sr-only">
                    Browse the main navigation links, resource categories, and portal links.
                  </SheetDescription>
                  <nav className="mt-6 space-y-1">
                    {primaryNavLinks.map(({ to, label }) => (
                      <NavLink
                        key={to}
                        to={to}
                        onClick={() => setOpen(false)}
                        className={({ isActive }) =>
                          `block px-4 py-2.5 rounded-sm text-sm transition-colors ${isActive
                            ? 'text-[#BB0000]'
                            : 'text-foreground/65 hover:text-foreground hover:bg-accent/40'
                          }`
                        }
                        style={{ fontFamily: 'Outfit, sans-serif' }}
                      >
                        {label}
                      </NavLink>
                    ))}
                    <div className="px-4 pt-4 pb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-foreground/40">
                      Resources
                    </div>
                    {resourceNavLinks.map(({ to, label }) => (
                      <NavLink
                        key={to}
                        to={to}
                        onClick={() => setOpen(false)}
                        className={({ isActive }) =>
                          `block px-4 py-2.5 rounded-sm text-sm transition-colors ${isActive
                            ? 'text-[#BB0000]'
                            : 'text-foreground/65 hover:text-foreground hover:bg-accent/40'
                          }`
                        }
                        style={{ fontFamily: 'Outfit, sans-serif' }}
                      >
                        {label}
                      </NavLink>
                    ))}
                    <div className="px-4 pt-4 pb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-foreground/40">
                      Portal
                    </div>
                    {portalNavLinks.map(({ to, label }) => (
                      <NavLink
                        key={to}
                        to={to}
                        onClick={() => setOpen(false)}
                        className={({ isActive }) =>
                          `block px-4 py-2.5 rounded-sm text-sm transition-colors ${isActive
                            ? 'text-[#BB0000]'
                            : 'text-foreground/65 hover:text-foreground hover:bg-accent/40'
                          }`
                        }
                        style={{ fontFamily: 'Outfit, sans-serif' }}
                      >
                        {label}
                      </NavLink>
                    ))}
                    {user && (
                      <>
                        <div
                          className="mt-4 pt-4 flex items-center gap-2 px-4 text-sm text-foreground/45"
                          style={{ borderTop: '1px solid rgba(214,214,214,0.9)' }}
                        >
                          <User className="h-3.5 w-3.5" />
                          <span className="truncate">{user.email}</span>
                        </div>
                        {isAdmin && (
                          <NavLink
                            to="/admin"
                            onClick={() => setOpen(false)}
                            className="block px-4 py-2.5 text-sm text-foreground/65 hover:text-foreground"
                          >
                            Admin Dashboard
                          </NavLink>
                        )}
                        <button
                          onClick={() => { signOut(); setOpen(false); }}
                          className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground/65 hover:text-foreground w-full text-left"
                        >
                          <LogOut className="h-3.5 w-3.5" />
                          Sign Out
                        </button>
                      </>
                    )}
                  </nav>
                </SheetContent>
              </Sheet>
            </div>

            {/* Logo */}
            <NavLink to="/" className="flex items-center group flex-shrink-0">
              <img
                src={logo}
                alt="Forward Focus Elevation"
                className="h-12 w-auto transition-opacity duration-300 group-hover:opacity-80"
                style={{ filter: 'brightness(1.1)' }}
              />
            </NavLink>

            {/* Desktop navigation */}
            <nav className="hidden md:flex items-center gap-6">
              <NavigationMenu>
                <NavigationMenuList className="flex items-center gap-6">
                  {primaryNavLinks.map(({ to, label }) => (
                    <NavigationMenuItem key={to}>
                      <NavLink to={to} className={navLinkCls}>{label}</NavLink>
                    </NavigationMenuItem>
                  ))}
                  <NavigationMenuItem>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className="text-sm text-foreground/65 hover:text-foreground outline-none font-normal"
                        style={{ fontFamily: 'Outfit, sans-serif' }}
                      >
                        Resources ▾
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="start"
                        className="z-[60] w-[180px] rounded-md p-1"
                        style={{ background: '#FFFFFF', border: '1px solid rgba(214,214,214,0.9)' }}
                      >
                        {resourceNavLinks.map(({ to, label }) => (
                          <DropdownMenuItem asChild key={to}>
                            <NavLink to={to} className={dropdownItemCls}>{label}</NavLink>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </NavigationMenuItem>

                  <NavigationMenuItem>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className="text-sm text-foreground/65 hover:text-foreground outline-none font-normal"
                        style={{ fontFamily: 'Outfit, sans-serif' }}
                      >
                        Portal ▾
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="start"
                        className="z-[60] w-[180px] rounded-md p-1"
                        style={{ background: '#FFFFFF', border: '1px solid rgba(214,214,214,0.9)' }}
                      >
                        {portalNavLinks.map(({ to, label }) => (
                          <DropdownMenuItem asChild key={to}>
                            <NavLink to={to} className={dropdownItemCls}>{label}</NavLink>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </NavigationMenuItem>
                </NavigationMenuList>
              </NavigationMenu>
            </nav>

            {/* Right side: auth + CTA */}
            <div className="hidden md:flex items-center gap-3">
              {!user && (
                <button
                  onClick={() => navigate('/auth')}
                  className="text-sm text-foreground/55 hover:text-foreground transition-colors"
                  style={{ fontFamily: 'Outfit, sans-serif' }}
                >
                  Sign In
                </button>
              )}
              {user && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="flex items-center gap-1.5 text-sm text-foreground/55 hover:text-foreground transition-colors"
                      style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', letterSpacing: '0.05em' }}
                    >
                      <User className="h-3.5 w-3.5" />
                      <span className="max-w-[100px] truncate">{user.email}</span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="z-[60] rounded-md"
                    style={{ background: '#FFFFFF', border: '1px solid rgba(214,214,214,0.9)' }}
                  >
                    {isAdmin && (
                      <DropdownMenuItem asChild>
                        <NavLink to="/admin" className={dropdownItemCls}>Admin Dashboard</NavLink>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem asChild>
                      <NavLink to="/partner-dashboard" className={dropdownItemCls}>Partner Dashboard</NavLink>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={signOut}
                      className="text-foreground/65 hover:text-foreground focus:text-foreground"
                    >
                      <LogOut className="mr-2 h-3.5 w-3.5" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              <NavLink to="/support" className="cipher-btn-gold" style={{ padding: '10px 20px', fontSize: '10px' }}>
                Get Involved
              </NavLink>
            </div>

            {/* Mobile CTA */}
            <div className="flex md:hidden">
              <NavLink
                to="/support"
                className="cipher-btn-gold"
                style={{ padding: '8px 14px', fontSize: '10px' }}
              >
                Get Involved
              </NavLink>
            </div>

          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;

