import { NavLink, useLocation, useNavigate } from "react-router-dom";
import logo from "@/assets/images/branding/logo-transparent.png";
import { useState, useEffect } from "react";
import { Menu, User, LogOut, Search, Globe, Phone, ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger } from "@/components/ui/navigation-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { CrisisEmergencyBot } from "@/components/ai/CrisisEmergencyBot";

const linkCls = ({
  isActive
}: {
  isActive?: boolean;
} | any) => isActive ? "text-foreground font-medium" : "text-foreground hover:text-foreground/80";

interface HeaderProps {
  showUtility?: boolean;
  showCrisis?: boolean;
}

const Header = ({
  showUtility = true,
  showCrisis = true
}: HeaderProps) => {
  const {
    user,
    signOut
  } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [hasScrolled, setHasScrolled] = useState(false);
  const { isAdmin } = useAdminCheck(user);

  useEffect(() => {
    const handleScroll = () => {
      setHasScrolled(window.scrollY > 0);
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Hide header on auth pages
  if (location.pathname === '/auth' || location.pathname === '/register') {
    return null;
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-border/50 shadow-sm">
      {/* Main Navigation */}
      <div className="container mx-auto px-6">
          <div className="grid grid-cols-12 gap-4 items-center py-2 max-w-full">
            {/* Mobile menu button - Column 1 */}
            <div className="col-span-1 md:hidden">
              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm" className="p-2 hover:bg-white/10">
                    <Menu className="h-5 w-5 text-foreground" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[300px]">
                  <SheetTitle className="font-heading text-foreground">Menu</SheetTitle>
                  <div className="py-4 space-y-3">
                     {/* Mobile Navigation */}
                    <nav className="space-y-2">
                      <Button variant="ghost" size="sm" asChild className="justify-start w-full">
                        <NavLink to="/" onClick={() => setOpen(false)}>Home</NavLink>
                      </Button>
                      <Button variant="ghost" size="sm" asChild className="justify-start w-full">
                        <NavLink to="/help" onClick={() => setOpen(false)}>Get Help Now</NavLink>
                      </Button>
                      <Button variant="ghost" size="sm" asChild className="justify-start w-full">
                        <NavLink to="/victim-services" onClick={() => setOpen(false)}>Healing Hub</NavLink>
                      </Button>
                      <Button variant="ghost" size="sm" asChild className="justify-start w-full">
                        <NavLink to="/youth-futures" onClick={() => setOpen(false)}>Youth Futures</NavLink>
                      </Button>
                      
                      {/* About Dropdown */}
                      <div className="border-t pt-2 mt-2">
                        <p className="text-xs text-muted-foreground px-3 mb-1">About</p>
                        <Button variant="ghost" size="sm" asChild className="justify-start w-full pl-6">
                          <NavLink to="/about" onClick={() => setOpen(false)}>About Us</NavLink>
                        </Button>
                        <Button variant="ghost" size="sm" asChild className="justify-start w-full pl-6">
                          <NavLink to="/learn" onClick={() => setOpen(false)}>The Collective</NavLink>
                        </Button>
                      </div>

                      {/* Portal Dropdown */}
                      <div className="border-t pt-2 mt-2">
                        <p className="text-xs text-muted-foreground px-3 mb-1">Portal</p>
                        <Button variant="ghost" size="sm" asChild className="justify-start w-full pl-6">
                          <NavLink to="/auth" onClick={() => setOpen(false)}>Client Portal</NavLink>
                        </Button>
                        <Button variant="ghost" size="sm" asChild className="justify-start w-full pl-6">
                          <NavLink to="/partners" onClick={() => setOpen(false)}>Partner Portal</NavLink>
                        </Button>
                      </div>
                    </nav>

                      {/* Mobile Auth */}
                    {user ? <>
                        <div className="flex items-center gap-2 py-2 text-sm text-foreground border-t border-border pt-3 mt-2">
                          <User className="h-4 w-4" />
                          <span className="truncate">{user.email}</span>
                        </div>
                        {isAdmin && <Button variant="ghost" size="sm" asChild className="justify-start w-full">
                            <NavLink to="/admin" onClick={() => setOpen(false)}>Admin Dashboard</NavLink>
                          </Button>}
                        <Button variant="ghost" size="sm" asChild className="justify-start w-full">
                          <NavLink to="/partner-dashboard" onClick={() => setOpen(false)}>Partner Dashboard</NavLink>
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => {
                      signOut();
                      setOpen(false);
                    }} className="justify-start w-full">
                          <LogOut className="mr-2 h-4 w-4" />
                          Sign Out
                        </Button>
                      </> : null}
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {/* Logo - Columns 2-4 on mobile, 1-2 on desktop */}
            <div className="col-span-10 md:col-span-2 flex justify-center md:justify-start">
              <NavLink to="/" className="flex items-center md:hover:scale-105 transition-all duration-300 group">
                <img
                  src={logo}
                  alt="Forward Focus Elevation"
                  className="h-14 w-auto mix-blend-multiply group-hover:scale-105 transition-transform duration-300"
                />
              </NavLink>
            </div>

            {/* Main Navigation - Desktop - Columns 3-9 */}
            <nav className="hidden md:flex col-span-7 items-center justify-end pr-4">
              <NavigationMenu>
                <NavigationMenuList className="flex items-center space-x-6">
                  <NavigationMenuItem>
                    <NavLink to="/" className={linkCls}>Home</NavLink>
                  </NavigationMenuItem>
                  
                  <NavigationMenuItem>
                    <NavLink to="/help" className={linkCls}>Get Help Now</NavLink>
                  </NavigationMenuItem>
                  
                  <NavigationMenuItem>
                    <NavLink to="/victim-services" className={linkCls}>Healing Hub</NavLink>
                  </NavigationMenuItem>
                  
                  <NavigationMenuItem>
                    <NavLink to="/youth-futures" className={linkCls}>Youth Futures</NavLink>
                  </NavigationMenuItem>

                  <NavigationMenuItem>
                    <NavigationMenuTrigger className="text-foreground hover:bg-gray-100 data-[state=open]:text-red-700 data-[state=open]:bg-red-100 bg-transparent h-auto px-3 py-2 text-sm font-medium rounded-md transition-all duration-150">
                      About
                    </NavigationMenuTrigger>
                    <NavigationMenuContent className="z-[60]">
                      <ul className="grid w-[200px] gap-1 p-2 bg-white rounded-md shadow-lg border border-border">
                        <li>
                          <NavigationMenuLink asChild>
                            <NavLink
                              to="/about"
                              className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-all duration-150 hover:bg-gray-100 focus:bg-gray-100"
                            >
                              <div className="text-sm font-medium leading-none">About Us</div>
                            </NavLink>
                          </NavigationMenuLink>
                        </li>
                        <li>
                          <NavigationMenuLink asChild>
                            <NavLink
                              to="/learn"
                              className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-all duration-150 hover:bg-gray-100 focus:bg-gray-100"
                            >
                              <div className="text-sm font-medium leading-none">The Collective</div>
                            </NavLink>
                          </NavigationMenuLink>
                        </li>
                      </ul>
                    </NavigationMenuContent>
                  </NavigationMenuItem>
                  
                  <NavigationMenuItem>
                    <NavigationMenuTrigger className="text-foreground hover:bg-gray-100 data-[state=open]:text-red-700 data-[state=open]:bg-red-100 bg-transparent h-auto px-3 py-2 text-sm font-medium rounded-md transition-all duration-150">
                      Portal
                    </NavigationMenuTrigger>
                    <NavigationMenuContent className="z-[60]">
                      <ul className="grid w-[200px] gap-1 p-2 bg-white rounded-md shadow-lg border border-border">
                        <li>
                          <NavigationMenuLink asChild>
                            <NavLink
                              to="/auth"
                              className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-all duration-150 hover:bg-gray-100 focus:bg-gray-100"
                            >
                              <div className="text-sm font-medium leading-none">Client Portal</div>
                            </NavLink>
                          </NavigationMenuLink>
                        </li>
                        <li>
                          <NavigationMenuLink asChild>
                            <NavLink
                              to="/partners"
                              className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-all duration-150 hover:bg-gray-100 focus:bg-gray-100"
                            >
                              <div className="text-sm font-medium leading-none">Partner Portal</div>
                            </NavLink>
                          </NavigationMenuLink>
                        </li>
                      </ul>
                    </NavigationMenuContent>
                  </NavigationMenuItem>
                </NavigationMenuList>
              </NavigationMenu>
            </nav>

            {/* Auth Links - Columns 10-12 */}
            <div className="hidden md:flex col-span-3 items-center justify-end">
              <div className="flex items-center gap-2">
                {!user && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => navigate('/auth')}
                    className="mr-2 text-foreground font-medium"
                  >
                    Sign In
                  </Button>
                )}
                {user ? <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-foreground font-medium">
                        <User className="mr-2 h-4 w-4" />
                        <span className="max-w-[120px] truncate">{user.email}</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="z-[60] bg-background border border-border shadow-lg">
                      {isAdmin && <DropdownMenuItem asChild>
                          <NavLink to="/admin">Admin Dashboard</NavLink>
                        </DropdownMenuItem>}
                      <DropdownMenuItem asChild>
                        <NavLink to="/partner-dashboard">Partner Dashboard</NavLink>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={signOut}>
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign Out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu> : null}

                  {/* Get Involved CTA - 3D Gold Styling */}
                  <Button size="sm" asChild className="get-involved-gold-button">
                    <NavLink to="/support">Get Involved</NavLink>
                  </Button>
                </div>
            </div>

            {/* Mobile Get Involved - Column 12 */}
            <div className="col-span-1 md:hidden flex justify-end">
              <Button size="sm" asChild className="get-involved-gold-button border-none px-3 py-2">
                <NavLink to="/support">Join</NavLink>
              </Button>
            </div>
          </div>
      </div>
    </header>
  );
};

export default Header;