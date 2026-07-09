import { Link, NavLink } from 'react-router-dom';
import { ThemeToggle } from './ThemeToggle';

const GITHUB_URL = 'https://github.com/Ryziou/MatchMind';

const NAV_LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/how-it-works', label: 'How It Works', end: false },
  { to: '/about', label: 'About', end: false },
];

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="app-shell">
      <div className="app-shell__glow" aria-hidden />
      <header className="app-header">
        <div className="app-header__top">
          <Link to="/" className="brand-mark">
            MatchMind
          </Link>
          <div className="app-header__actions">
            <nav className="app-nav" aria-label="Primary">
              {NAV_LINKS.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  className={({ isActive }) =>
                    `app-nav__link ${isActive ? 'app-nav__link--active' : ''}`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="app-main">{children}</main>

      <footer className="app-footer">
        <p className="app-footer__text m-0">
          MatchMind uses Retrieval-Augmented Generation (RAG) to ground every analysis in the most
          relevant sections of your CV, helping produce more accurate and evidence-based results.
        </p>
        <div className="app-footer__links">
          <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="app-footer__link">
            <i className="pi pi-github" aria-hidden />
            GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}
