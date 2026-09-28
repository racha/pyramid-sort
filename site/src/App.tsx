import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';

import Ai from './pages/Ai';
import { Logo } from './Logo';
import Home from './pages/Home';
import Editors from './pages/Editors';
import Examples from './pages/Examples';
import Developer from './pages/Developer';
import { EASE_OUT, GITHUB, MARKETPLACE, NPM } from './ui';

const ROUTES = [
  { path: '', label: 'Overview', title: 'Pyramid Sort — code, sorted by shape', Page: Home },
  { path: 'examples', label: 'Examples', title: 'Examples — Pyramid Sort', Page: Examples },
  { path: 'editors', label: 'Editors', title: 'Editors — Pyramid Sort', Page: Editors },
  { path: 'ai', label: 'AI workflow', title: 'AI workflow — Pyramid Sort', Page: Ai },
  { path: 'developer', label: 'Developer', title: 'Developer — Pyramid Sort', Page: Developer },
];

const currentPath = () => window.location.hash.replace(/^#\/?/, '');

function useRoute() {
  const [path, setPath] = useState(currentPath);
  useEffect(() => {
    const onChange = () => {
      setPath(currentPath());
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return ROUTES.find((r) => r.path === path) ?? ROUTES[0];
}

export default function App() {
  const route = useRoute();
  useEffect(() => {
    document.title = route.title;
  }, [route]);

  return (
    <div className="min-h-screen overflow-x-clip">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(700px_380px_at_85%_-5%,rgba(0,147,243,0.22),transparent_60%),radial-gradient(520px_300px_at_5%_5%,rgba(21,228,192,0.10),transparent_60%)]"
      />

      <header className="sticky top-0 z-30 border-b border-white/10 bg-night/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-5 py-3">
          <motion.a
            href="#/"
            initial="rest"
            animate="rest"
            whileHover="shuffle"
            whileFocus="shuffle"
            className="flex items-center gap-2.5 text-[1.05rem] font-semibold tracking-tight"
          >
            <Logo mode="hover" className="size-7" />
            Pyramid <span className="-ml-1.5 text-cyan">Sort</span>
          </motion.a>
          <nav className="-mx-2 flex max-w-full gap-1 overflow-x-auto whitespace-nowrap px-2 text-sm sm:mx-0 sm:px-0">
            {ROUTES.map((r) => (
              <a
                key={r.path}
                href={`#/${r.path}`}
                className={`relative rounded-full px-3 py-1.5 transition ${r === route ? 'text-ink' : 'text-mute hover:text-ink'}`}
              >
                {r === route && (
                  <motion.span
                    layoutId="nav-pill"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                    className="absolute inset-0 -z-10 rounded-full bg-white/[0.07] ring-1 ring-white/10"
                  />
                )}
                {r.label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <AnimatePresence mode="wait">
        <motion.main
          key={route.path}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.35, ease: EASE_OUT }}
        >
          <route.Page />
        </motion.main>
      </AnimatePresence>

      <footer className="mx-auto mt-24 flex max-w-6xl flex-wrap items-center justify-between gap-4 border-t border-white/10 px-5 py-8 text-sm text-mute">
        <span>MIT · INVEON Development</span>
        <span className="flex flex-wrap gap-4">
          <a className="hover:text-cyan" href={MARKETPLACE}>Marketplace</a>
          <a className="hover:text-cyan" href={NPM}>npm</a>
          <a className="hover:text-cyan" href={GITHUB}>GitHub</a>
          <a className="hover:text-cyan" href="#/developer">Stefan Račić</a>
        </span>
      </footer>
    </div>
  );
}
