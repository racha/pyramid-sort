import { motion } from 'motion/react';
import { useDeferredValue, useMemo, useState } from 'react';

import { Mono } from './ui';
import { PLAYGROUND, SAMPLES } from './samples';
import { sortSource, type Lang } from './sorter';
import { highlight, keyed, Lines, Panel } from './code';

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

function SourceEditor({
  value,
  lang,
  onChange,
}: {
  value: string;
  lang: Lang;
  onChange: (value: string) => void;
}) {
  const html = useMemo(
    () => highlight(value.endsWith('\n') ? `${value}\u200b` : value, lang),
    [value, lang],
  );
  return (
    <div className="h-[30rem] overflow-auto">
      <div className="relative min-h-full w-max min-w-full">
        <pre
          aria-hidden
          className="pointer-events-none m-0 min-h-full whitespace-pre font-mono text-[0.8rem] leading-[1.8] text-ink [tab-size:2] sm:text-[0.84rem]"
        >
          <code dangerouslySetInnerHTML={{ __html: html }} />
        </pre>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          wrap="off"
          aria-label="Code to sort"
          className="absolute inset-0 m-0 h-full w-full resize-none overflow-hidden border-0 bg-transparent p-0 font-mono text-[0.8rem] leading-[1.8] text-transparent caret-ink outline-none [tab-size:2] selection:bg-cyan/30 sm:text-[0.84rem]"
        />
      </div>
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
          <SourceEditor value={text} lang={lang} onChange={setText} />
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
