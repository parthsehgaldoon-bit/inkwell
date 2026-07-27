import { useAuth } from "@/hooks/useAuth";
import { Link, useRouterState } from "@tanstack/react-router";
import { Feather, LogOut, Newspaper, PenLine, ScrollText } from "lucide-react";

/**
 * Application shell — header with primary navigation, main content slot,
 * and a footer with the Caffeine attribution.
 *
 * Header uses `bg-card` with a `border-b` and `shadow-subtle` so it reads as
 * a distinct paper edge above the `bg-background` main area. The footer
 * uses `bg-card` as well to close the page visually.
 */
export function Layout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, principalShort, login, logout, isInitializing } =
    useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-30 bg-card border-b shadow-subtle">
        <div className="container flex h-16 items-center gap-6">
          <Link
            to="/feed"
            className="flex items-center gap-2 font-display text-xl font-semibold text-foreground transition-smooth hover:text-primary"
            data-ocid="nav.brand"
          >
            <Feather className="h-5 w-5 text-primary" aria-hidden />
            <span>Inkwell</span>
          </Link>

          <nav className="ml-2 flex items-center gap-1" aria-label="Primary">
            <NavLink
              to="/my-entries"
              icon={<ScrollText className="h-4 w-4" />}
              label="My Entries"
              ocid="nav.my_entries"
            />
            <NavLink
              to="/editor/new"
              icon={<PenLine className="h-4 w-4" />}
              label="New Entry"
              ocid="nav.new_entry"
            />
            <NavLink
              to="/feed"
              icon={<Newspaper className="h-4 w-4" />}
              label="Public Feed"
              ocid="nav.public_feed"
            />
          </nav>

          <div className="ml-auto flex items-center gap-3">
            {isAuthenticated && principalShort ? (
              <div className="hidden items-center gap-3 sm:flex">
                <span
                  className="font-mono text-xs text-muted-foreground"
                  title="Your Internet Identity principal"
                >
                  {principalShort}
                </span>
                <button
                  type="button"
                  onClick={logout}
                  className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-secondary px-3 text-sm font-medium text-secondary-foreground transition-smooth hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  data-ocid="nav.sign_out_button"
                >
                  <LogOut className="h-4 w-4" aria-hidden />
                  Sign out
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={login}
                disabled={isInitializing}
                className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-smooth hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                data-ocid="nav.sign_in_button"
              >
                {isInitializing ? "Connecting…" : "Sign in"}
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 bg-background">
        <div className="container py-8">{children}</div>
      </main>

      <footer className="bg-card border-t">
        <div className="container flex h-16 items-center justify-between text-sm text-muted-foreground">
          <p className="font-display italic">
            Inkwell — write, refine, publish.
          </p>
          <p>
            © {new Date().getFullYear()}. Built with love using{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(
                typeof window !== "undefined"
                  ? window.location.hostname
                  : "inkwell",
              )}`}
              target="_blank"
              rel="noreferrer"
              className="text-primary underline-offset-2 hover:underline"
            >
              caffeine.ai
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}

function NavLink({
  to,
  icon,
  label,
  ocid,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  ocid: string;
}) {
  const router = useRouterState();
  const active =
    router.location.pathname === to ||
    router.location.pathname.startsWith(`${to}/`);
  return (
    <Link
      to={to}
      className={`inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
      }`}
      data-ocid={ocid}
      aria-current={active ? "page" : undefined}
    >
      {icon}
      {label}
    </Link>
  );
}
