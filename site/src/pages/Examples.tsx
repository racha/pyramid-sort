import { SAMPLES } from '../samples';
import { SortDemo } from '../code';
import { Kicker, PageHero, Reveal } from '../ui';

export default function Examples() {
  return (
    <div className="mx-auto max-w-[88rem] px-5">
      <PageHero kicker="Examples" title="From jagged to pyramid.">
        Every After panel on this page is produced by the real sorter as you scroll. Press{' '}
        <strong className="text-ink">Replay</strong> to watch it again. A blank line is a group boundary, and both sides keep it.
      </PageHero>

      <div className="grid gap-20">
        {SAMPLES.map((s) => (
          <section key={s.id}>
            <Reveal>
              <Kicker>{s.lang === 'css' ? 'CSS' : s.lang === 'typescript' ? 'TypeScript' : 'TSX'}</Kicker>
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{s.title}</h2>
              <p className="mt-3 max-w-2xl text-mute">{s.lead}</p>
            </Reveal>
            <Reveal delay={0.1} className="mt-8">
              <SortDemo source={s.source} lang={s.lang} />
            </Reveal>
          </section>
        ))}
      </div>
    </div>
  );
}
