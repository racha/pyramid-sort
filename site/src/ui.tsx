import { motion } from 'motion/react';
import type { ReactNode } from 'react';

export const EASE_OUT = [0.22, 1, 0.36, 1] as const;

export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.55, delay, ease: EASE_OUT }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function Kicker({ children }: { children: ReactNode }) {
  return <p className="mb-3 font-mono text-xs uppercase tracking-[0.16em] text-cyan">{children}</p>;
}

export function Mono({ children }: { children: ReactNode }) {
  return <code className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[0.88em] text-ink">{children}</code>;
}

export function H2({ children }: { children: ReactNode }) {
  return <h2 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">{children}</h2>;
}

export function Lead({ children }: { children: ReactNode }) {
  return <p className="mt-4 max-w-2xl text-lg text-pretty text-mute">{children}</p>;
}

export function PageHero({ kicker, title, children }: { kicker: string; title: ReactNode; children: ReactNode }) {
  return (
    <header className="pb-10 pt-14 sm:pt-20">
      <Reveal>
        <Kicker>{kicker}</Kicker>
        <h1 className="max-w-4xl text-5xl font-semibold tracking-tight text-balance sm:text-6xl">{title}</h1>
        <Lead>{children}</Lead>
      </Reveal>
    </header>
  );
}

const BTN = 'inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[0.95rem] font-semibold transition';

export function ButtonLink({ href, ghost, children }: { href: string; ghost?: boolean; children: ReactNode }) {
  const external = href.startsWith('http');
  return (
    <motion.a
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noreferrer' : undefined}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.97 }}
      className={
        ghost
          ? `${BTN} border border-white/20 text-ink hover:border-white/50`
          : `${BTN} bg-cyan text-night hover:bg-[#3cf0d0]`
      }
    >
      {children}
    </motion.a>
  );
}

export const MARKETPLACE = 'https://marketplace.visualstudio.com/items?itemName=INVEON-Development.pyramid-sort';
export const OPEN_VSX = 'https://open-vsx.org/extension/INVEON-Development/pyramid-sort';
export const GITHUB = 'https://github.com/racha/pyramid-sort';
export const NPM = 'https://www.npmjs.com/package/pyramid-sort';
