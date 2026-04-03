import { Link } from "react-router-dom";

const Footer = () => {
  return <footer className="border-t">
    <div className="container py-16 grid gap-16 md:grid-cols-3 md:gap-8 justify-items-center text-center md:text-left">
      <div>
        <div className="font-heading font-bold text-lg text-osu-scarlet">Forward Focus Elevation</div>
        <p className="mt-4 text-base text-foreground/80 leading-relaxed">
          Empowering justice-impacted families with the tools to rebuild and thrive.
        </p>
      </div>
      <nav>
        <div className="font-bold text-lg mb-4 mx-[5px] text-osu-gray">Explore</div>
        <ul className="space-y-3 text-base">
          <li>
            <Link to="/help" className="text-foreground/80 hover:text-osu-scarlet transition-colors duration-200 focus:text-osu-scarlet focus:outline-none focus:ring-2 focus:ring-osu-scarlet/20 rounded px-1">
              Get Help Now
            </Link>
          </li>
          <li>
            <Link to="/victim-services" className="text-foreground/80 hover:text-osu-scarlet transition-colors duration-200 focus:text-osu-scarlet focus:outline-none focus:ring-2 focus:ring-osu-scarlet/20 rounded px-1">
              Healing Hub
            </Link>
          </li>
          <li>
            <Link to="/blog" className="text-foreground/80 hover:text-osu-scarlet transition-colors duration-200 focus:text-osu-scarlet focus:outline-none focus:ring-2 focus:ring-osu-scarlet/20 rounded px-1">
              Knowledge Hub
            </Link>
          </li>
          <li>
            <Link to="/learn" className="text-foreground/80 hover:text-osu-scarlet transition-colors duration-200 focus:text-osu-scarlet focus:outline-none focus:ring-2 focus:ring-osu-scarlet/20 rounded px-1">
              The Collective
            </Link>
          </li>
          <li>
            <Link to="/youth-futures" className="text-foreground/80 hover:text-osu-scarlet transition-colors duration-200 focus:text-osu-scarlet focus:outline-none focus:ring-2 focus:ring-osu-scarlet/20 rounded px-1">
              Youth Futures
            </Link>
          </li>
          <li>
            <Link to="/about" className="text-foreground/80 hover:text-osu-scarlet transition-colors duration-200 focus:text-osu-scarlet focus:outline-none focus:ring-2 focus:ring-osu-scarlet/20 rounded px-1">
              About Us
            </Link>
          </li>
        </ul>
      </nav>
      <div>
        <div className="font-bold text-lg mb-4 text-destructive my-0 mx-[3px]">Crisis Support (24/7)</div>
        <ul className="space-y-3 text-base">
          <li>
            <a href="tel:988" className="text-foreground hover:text-osu-scarlet transition-colors duration-200 focus:text-osu-scarlet focus:outline-none focus:ring-2 focus:ring-osu-scarlet/20 rounded px-1 font-bold text-base">
              988 Suicide & Crisis Lifeline
            </a>
          </li>
          <li>
            <a href="tel:18007997233" className="text-foreground hover:text-osu-scarlet transition-colors duration-200 focus:text-osu-scarlet focus:outline-none focus:ring-2 focus:ring-osu-scarlet/20 rounded px-1 font-bold text-base">
              National DV Hotline: 1-800-799-7233
            </a>
          </li>
          <li>
            <a href="tel:211" className="text-foreground hover:text-osu-scarlet transition-colors duration-200 focus:text-osu-scarlet focus:outline-none focus:ring-2 focus:ring-osu-scarlet/20 rounded px-1 font-bold text-base">
              Call 211 for local services
            </a>
          </li>
        </ul>
      </div>
    </div>
    <div className="border-t border-osu-scarlet/20">
      <div className="container py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-foreground/60">
        <div className="text-center sm:text-left">
          © {new Date().getFullYear()} Forward Focus Elevation. All rights reserved.
        </div>
        <div className="flex gap-6">
          <Link to="/privacy" className="text-foreground/80 hover:text-osu-scarlet transition-colors duration-200 focus:text-osu-scarlet focus:outline-none focus:ring-2 focus:ring-osu-scarlet/20 rounded px-1">
            Privacy Policy
          </Link>
          <Link to="/terms" className="text-foreground/80 hover:text-osu-scarlet transition-colors duration-200 focus:text-osu-scarlet focus:outline-none focus:ring-2 focus:ring-osu-scarlet/20 rounded px-1">
            Terms of Service
          </Link>
        </div>
      </div>
    </div>
  </footer>;
};
export default Footer;
