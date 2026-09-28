import { motion } from 'motion/react';
import { useDeferredValue, useMemo, useState } from 'react';

import { Mono } from './ui';
import { PLAYGROUND, SAMPLES } from './samples';
import { sortSource, type Lang } from './sorter';
import { keyed, Lines, Panel } from './code';

const LANGS: { id: Lang; label: string; sample: string }[] = [
  { id: 'typescriptreact', label: 'TSX', sample: PLAYGROUND },
  { id: 'css', label: 'CSS', sample: SAMPLES.find((s) => s.id === 'css')!.source },
];

const DIRECTIONS = [
  { id: 'ascending', label: 'Ascending' },
  { id: 'descending', label: 'Descending' },
] as const;

function Segmented<T extends string>({
  name,
  options,
  value,
  onChange,
}: {
  name: string;
  options: readonly { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex rounded-full bg-deep p-1 ring-1 ring-white/10">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={`relative rounded-full px-3.5 py-1 text-sm transition ${value === o.id ? 'text-night' : 'text-mute hover:text-ink'}`}
        >
          {value === o.id && (
            <motion.span
              layoutId={`seg-${name}`}
              transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              className="absolute inset-0 rounded-full bg-cyan"
            />
          )}
          <span className="relative">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

export function Playground() {
  const [lang, setLang] = useState<Lang>('typescriptreact');
  const [direction, setDirection] = useState<'ascending' | 'descending'>('ascending');
  const [text, setText] = useState(PLAYGROUND);
  const source = useDeferredValue(text);

  const { result, changed } = useMemo(() => {
    try {
      return sortSource(source, lang, direction);
    } catch {
      return { result: source, changed: null };
    }
  }, [source, lang, direction]);
  const lines = useMemo(() => keyed(result), [result]);
  const touched = changed ? Object.entries(changed).filter(([, v]) => v).map(([k]) => k) : [];

  function pickLang(id: Lang) {
    setLang(id);
    setText(LANGS.find((l) => l.id === id)!.sample);
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Segmented name="lang" options={LANGS} value={lang} onChange={pickLang} />
        <Segmented name="dir" options={DIRECTIONS} value={direction} onChange={setDirection} />
        <button
          type="button"
          onClick={() => setText(LANGS.find((l) => l.id === lang)!.sample)}
          className="rounded-full px-3 py-1.5 text-sm text-mute transition hover:bg-white/5 hover:text-ink"
        >
          Reset
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel label="Your code">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
            aria-label="Code to sort"
            className="block h-[30rem] w-full resize-none bg-transparent font-mono text-[0.8rem] leading-[1.8] text-ink outline-none sm:text-[0.84rem]"
          />
        </Panel>
        <Panel
          label="Pyramid Sort"
          after
          action={
            <span className="normal-case tracking-normal text-mute">
              {touched.length ? `sorted ${touched.join(', ')}` : 'already sorted'}
            </span>
          }
        >
          <div className="h-[30rem] overflow-auto">
            <Lines lines={lines} lang={lang} />
          </div>
        </Panel>
      </div>
      <p className="mt-4 text-sm text-mute">
        This is the extension’s own sort pipeline running in your browser, with every category on. In a project,{' '}
        <Mono>.pyramidsort</Mono> decides which categories run.
      </p>
    </div>
  );
}
