import { Link } from "react-router-dom";
import { useAuthContext } from "../context/useAuthContext";
import { Button } from "./ui/button";
import NotificationsMenu from "./NotificationsMenu";
import UserMenu from "./UserMenu";

const NAV_AUTH = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/how-it-works", label: "How it works" },
  { to: "/about", label: "About us" },
] as const;

const NAV_PUBLIC = [
  { to: "/how-it-works", label: "How it works" },
  { to: "/about", label: "About us" },
] as const;

const Header = () => {
  const { isAuthenticated } = useAuthContext();
  const navLinks = isAuthenticated ? NAV_AUTH : NAV_PUBLIC;

  return (
    <header className="relative z-20 flex w-full flex-wrap items-center justify-between gap-4 border-b border-slate-700/10 bg-emerald-50/90 px-3 py-3 md:px-8 lg:flex-nowrap lg:px-10">
      <Link
        className="inline-flex items-center gap-3 no-underline"
        to="/"
        aria-label="RefConnect Kenya home"
      >
        <span className="size-3.5 rounded-full bg-linear-to-br from-emerald-700 to-amber-500 shadow-[0_0_0_6px_rgba(17,122,101,0.12)]" />
        <span className="inline-flex flex-col leading-tight">
          <strong className="font-(--font-heading) text-[clamp(0.95rem,1.8vw,1.08rem)] text-slate-900">
            RefConnect Kenya
          </strong>
          <small className="text-[0.72rem] uppercase tracking-[0.08em] text-slate-500">
            Medical Referral Exchange
          </small>
        </span>
      </Link>

      <nav
        className="order-3 flex w-full items-center gap-2 overflow-x-auto lg:order-0 lg:w-auto lg:flex-1 lg:justify-center"
        aria-label="Primary"
      >
        {navLinks.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="whitespace-nowrap rounded-full px-3 py-2 text-sm font-bold text-slate-700 no-underline transition hover:bg-white hover:text-slate-900"
          >
            {link.label}
          </Link>
        ))}
      </nav>

      {isAuthenticated ? (
        <div className="inline-flex items-center gap-2">
          <NotificationsMenu />
          <UserMenu />
        </div>
      ) : (
        <div className="inline-flex items-center gap-2">
          <Button asChild variant="ghost">
            <Link to="/signin">Sign in</Link>
          </Button>
          <Button asChild variant="primary">
            <Link to="/signup">Sign up</Link>
          </Button>
        </div>
      )}
    </header>
  );
};

export default Header;
