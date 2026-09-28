import Prism from 'prismjs';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-json';
import { motion, useInView, useReducedMotion } from 'motion/react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { sortSource, type Lang } from './sorter';

const PRISM: Record<Lang | 'bash' | 'json', string> = {
  typescriptreact: 'tsx',
  typescript: 'typescript',
  css: 'css',
  bash: 'bash',
  json: 'json',
};

export function highlight(code: string, lang: keyof typeof PRISM): string {
  const name = PRISM[lang];
  return Prism.highlight(code, Prism.languages[name], name);
}

export interface Line {
  id: string;
  text: string;
}

/** Same text keeps the same id in both orders, so a line animates to its new row instead of remounting. */
export function keyed(text: string): Line[] {
  const seen = new Map<string, number>();
  return text.split('\n').map((t) => {
    const n = seen.get(t) ?? 0;
    seen.set(t, n + 1);
    return { id: `${n}:${t}`, text: t };
  });
}

const SPRING = { type: 'spring', stiffness: 260, damping: 30, mass: 0.9 } as const;

export function Lines({ lines, lang }: { lines: Line[]; lang: Lang }) {
  return (
    <div className="overflow-x-auto font-mono text-[0.8rem] leading-[1.8] sm:text-[0.84rem]">
      {lines.map((l) => (
        <motion.div
          key={l.id}
          layout="position"
          transition={SPRING}
          className="min-h-[1.8em] whitespace-pre"
          dangerouslySetInnerHTML={{ __html: highlight(l.text, lang) }}
        />
      ))}
    </div>
  );
}

export function Panel({
  label,
  after,
  action,
  children,
}: {
  label: string;
  after?: boolean;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <figure
      className={`relative min-w-0 rounded-2xl border bg-deep/90 p-4 shadow-2xl shadow-black/30 backdrop-blur sm:p-5 ${
        after ? 'border-sky/40' : 'border-white/10'
      }`}
    >
      <figcaption className="mb-3 flex h-6 items-center justify-between font-mono text-[0.68rem] uppercase tracking-[0.14em]">
        <span className={after ? 'text-cyan' : 'text-mute'}>{label}</span>
        {action}
      </figcaption>
      {children}
    </figure>
  );
}

/** Before stays put. After starts in the before order and sorts itself once it scrolls into view. */
export function SortDemo({ source, lang }: { source: string; lang: Lang }) {
  const reduce = useReducedMotion();
  const before = useMemo(() => keyed(source), [source]);
  const after = useMemo(() => keyed(sortSource(source, lang).result), [source, lang]);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const [run, setRun] = useState(0);
  const [sorted, setSorted] = useState(!!reduce);

  useEffect(() => {
    if (!inView || reduce) return;
    setSorted(false);
    const t = setTimeout(() => setSorted(true), run ? 650 : 400);
    return () => clearTimeout(t);
  }, [inView, run, reduce]);

  return (
    <div ref={ref} className="grid gap-4 md:grid-cols-2">
      <Panel label="Before">
        <Lines lines={before} lang={lang} />
      </Panel>
      <Panel
        label="After"
        after
        action={
          <button
            type="button"
            onClick={() => setRun((n) => n + 1)}
            className="rounded-full px-2 py-0.5 text-mute transition hover:bg-white/5 hover:text-ink"
          >
            ↻ Replay
          </button>
        }
      >
        <Lines lines={sorted ? after : before} lang={lang} />
      </Panel>
    </div>
  );
}

export function Cmd({ code, lang = 'bash', title }: { code: string; lang?: 'bash' | 'json'; title?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }

  return (
    <div className="relative min-w-0 overflow-hidden rounded-xl border border-white/10 bg-deep">
      {title && (
        <div className="border-b border-white/10 px-4 py-2 font-mono text-xs text-mute">{title}</div>
      )}
      <button
        type="button"
        onClick={copy}
        className="absolute right-2 top-1.5 rounded-md px-2 py-1 font-mono text-[0.7rem] text-mute transition hover:bg-white/5 hover:text-ink"
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
      <pre className="overflow-x-auto p-4 pr-16 font-mono text-[0.82rem] leading-7">
        <code dangerouslySetInnerHTML={{ __html: highlight(code, lang) }} />
      </pre>
    </div>
  );
}
