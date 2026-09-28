import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';

import Ai from './pages/Ai';
import { Logo } from './Logo';
import How from './pages/How';
import Home from './pages/Home';
import Editors from './pages/Editors';
import Examples from './pages/Examples';
import Changelog from './pages/Changelog';
import { EASE_OUT, GITHUB, MARKETPLACE, NPM, OPEN_VSX } from './ui';

const ROUTES = [
  { path: '', label: 'Overview', title: 'Pyramid Sort — code, sorted', Page: Home },
  { path: 'how', label: 'How it works', title: 'How it works — Pyramid Sort', Page: How },
  { path: 'examples', label: 'Examples', title: 'Examples — Pyramid Sort', Page: Examples },
  { path: 'editors', label: 'Editors', title: 'Editors — Pyramid Sort', Page: Editors },
  { path: 'ai', label: 'AI workflow', title: 'AI workflow — Pyramid Sort', Page: Ai },
  { path: 'changelog', label: 'Changelog', title: 'Changelog — Pyramid Sort', Page: Changelog },
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
  const [menu, setMenu] = useState(false);
  useEffect(() => {
    document.title = route.title;
  }, [route]);
  useEffect(() => {
    setMenu(false);
  }, [route]);
  useEffect(() => {
    const wide = window.matchMedia('(min-width: 1280px)');
    const close = () => {
      if (wide.matches) setMenu(false);
    };
    wide.addEventListener('change', close);
    return () => wide.removeEventListener('change', close);
  }, []);
  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenu(false);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [menu]);

  return (
    <div className="min-h-screen overflow-x-clip">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(700px_380px_at_85%_-5%,rgba(0,147,243,0.22),transparent_60%),radial-gradient(520px_300px_at_5%_5%,rgba(21,228,192,0.10),transparent_60%)]"
      />

      <header className="sticky top-0 z-30 border-b border-white/10 bg-night/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[88rem] items-center justify-between gap-6 px-5 py-3">
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
          <nav className="hidden gap-1 text-sm xl:flex">
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
          <button
            type="button"
            className="rounded-lg p-2 text-ink xl:hidden"
            aria-label="Open menu"
            aria-expanded={menu}
            onClick={() => setMenu(true)}
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
              <path d="M3 6h16M3 11h16M3 16h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </header>

      <AnimatePresence>
        {menu && (
          <>
            <motion.button
              type="button"
              aria-label="Close menu"
              className="fixed inset-0 z-40 bg-black/60 xl:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenu(false)}
            />
            <motion.aside
              className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-white/10 bg-deep px-5 py-6 xl:hidden"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            >
              <div className="mb-8 flex items-center justify-between">
                <span className="font-semibold tracking-tight">
                  Pyramid <span className="text-cyan">Sort</span>
                </span>
                <button type="button" className="rounded-lg p-2" aria-label="Close menu" onClick={() => setMenu(false)}>
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                    <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
              <nav className="grid gap-1 text-lg">
                {ROUTES.map((r) => (
                  <a
                    key={r.path}
                    href={`#/${r.path}`}
                    onClick={() => setMenu(false)}
                    className={`rounded-xl px-3 py-3 ${r === route ? 'bg-white/[0.07] text-cyan' : 'text-ink'}`}
                  >
                    {r.label}
                  </a>
                ))}
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

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

      <footer className="mx-auto mt-24 flex max-w-[88rem] flex-wrap items-center justify-between gap-4 border-t border-white/10 px-5 py-8 text-sm text-mute">
        <span>MIT · Stefan Račić · INVEON Development</span>
        <span className="flex flex-wrap gap-4">
          <a className="hover:text-cyan" href={MARKETPLACE}>VS Code</a>
          <a className="hover:text-cyan" href={OPEN_VSX}>Open VSX</a>
          <a className="hover:text-cyan" href={NPM}>npm</a>
          <a className="hover:text-cyan" href={GITHUB}>GitHub</a>
          <a className="hover:text-cyan" href="#/changelog">Changelog</a>
        </span>
      </footer>
    </div>
  );
}
