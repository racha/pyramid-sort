import { motion } from 'motion/react';

import { HERO } from '../samples';
import { Logo } from '../Logo';
import { Cmd, SortDemo } from '../code';
import { Playground } from '../Playground';
import { ButtonLink, EASE_OUT, H2, Kicker, Lead, MARKETPLACE, Mono, Reveal } from '../ui';

const REASONS = [
  {
    title: 'You read the short line first.',
    body: 'A ref should not hide under a class string the width of the editor. Length is the sort key, so the outline of a block matches the order you read it.',
  },
  {
    title: 'The argument about import order ends.',
    body: 'Two people, or a person and an agent, stop rearranging the same block. Packages stay above local paths. A blank line is a wall between groups.',
  },
  {
    title: 'Spreads do not move.',
    body: '{...props} stays where it was written. Named attributes sort on each side of it, so override order never changes behind your back.',
  },
  {
    title: 'Unsafe JSX is left alone.',
    body: 'If an opening tag is not safe to rewrite, like a nested element or a callback with a >, Pyramid Sort does not touch it.',
  },
];

const CARDS = [
  { tag: 'Imports', title: 'Packages, then your code.', body: 'Length inside each group. Aliases from tsconfig, jsconfig, and Vite count as local. Multi-line imports can reflow.' },
  { tag: 'Attributes', title: 'Every tag, a wedge.', body: 'Multiline JSX and HTML. Spreads are boundaries. Groups that contain a spread can be skipped entirely.' },
  { tag: 'Types', title: 'Members, not names.', body: 'Bodies of type, interface, and enum. Blank lines keep separate groups.' },
  { tag: 'Objects', title: 'Literals with a spine.', body: 'const objects and return { … }. Nested objects are opt-in, and they stay intact.' },
  { tag: 'CSS', title: 'Declarations, not selectors.', body: 'Rules in CSS, SCSS, and Less. Nested rules stay put. @keyframes steps are not reshuffled.' },
  { tag: 'Force sort', title: 'Any selection.', body: 'No parser. Selected lines in any language, ordered by length. Blank lines still split groups.' },
];

const STEPS = [
  { title: 'Install', body: 'The VS Code extension, which Cursor and Antigravity load too, or the pyramid-sort package on npm.' },
  { title: 'Generate the config', body: 'Pyramid Sort: Generate Config File writes your editor settings to .pyramidsort. Commit it.' },
  { title: 'Save, or pass the paths', body: 'Sorts on save in the editor. After an agent edits files, npx pyramid-sort a.tsx b.tsx.' },
];

const WHERE = ['VS Code', 'Cursor', 'Antigravity', 'npx CLI', 'CI with --scan', 'Agent stop hooks'];

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } } };
const rise = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE_OUT } } };

function scrollToPlayground() {
  document.getElementById('playground')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export default function Home() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-5 pb-20 pt-14 sm:pt-20">
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="grid items-center gap-10 md:grid-cols-[auto_1fr] md:gap-14"
        >
          <motion.div variants={rise}>
            <Logo mode="loop" className="size-36 drop-shadow-[0_20px_50px_rgba(0,147,243,0.25)] sm:size-52" />
          </motion.div>
          <div>
            <motion.div variants={rise}>
              <Kicker>Line-length formatter for VS Code, Cursor, and the CLI</Kicker>
            </motion.div>
            <motion.h1
              variants={rise}
              className="text-5xl font-semibold leading-[0.98] tracking-tight text-balance sm:text-7xl"
            >
              Code, sorted <span className="text-cyan">by shape.</span>
            </motion.h1>
            <motion.p variants={rise} className="mt-5 max-w-2xl text-lg text-pretty text-mute sm:text-xl">
              Pyramid Sort orders imports, JSX attributes, types, objects, and CSS by line length. Every block reads
              short to long. The same order on save, in the CLI, and after your agent edits the file.
            </motion.p>
            <motion.div variants={rise} className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href={MARKETPLACE}>Install the extension</ButtonLink>
              <motion.button
                type="button"
                onClick={scrollToPlayground}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                className="inline-flex items-center rounded-full border border-white/20 px-5 py-2.5 text-[0.95rem] font-semibold transition hover:border-white/50"
              >
                Try it in the browser
              </motion.button>
            </motion.div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.45, ease: EASE_OUT }}
          className="mt-14"
        >
          <SortDemo source={HERO.source} lang={HERO.lang} />
        </motion.div>
      </section>

      <section className="border-y border-white/10 bg-deep/60">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-8 gap-y-3 px-5 py-6 font-mono text-sm text-mute">
          {WHERE.map((w, i) => (
            <motion.span
              key={w}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
            >
              {w}
            </motion.span>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-12 px-5 py-24 md:grid-cols-[0.85fr_1.15fr]">
        <Reveal>
          <Kicker>Why</Kicker>
          <H2>Order you can see.</H2>
          <Lead>
            Alphabetical order hides the long line in the middle. Pyramid Sort puts weight where your eye already goes:
            short first, then the line that needs the room.
          </Lead>
        </Reveal>
        <div>
          {REASONS.map((r, i) => (
            <Reveal key={r.title} delay={i * 0.08}>
              <div className="grid grid-cols-[2.5rem_1fr] border-t border-white/10 py-5">
                <span className="pt-0.5 font-mono text-sm text-cyan">0{i + 1}</span>
                <div>
                  <h3 className="text-lg font-semibold">{r.title}</h3>
                  <p className="mt-1 text-mute">{r.body}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-12">
        <Reveal>
          <Kicker>What</Kicker>
          <H2>Five kinds of block. One rule.</H2>
          <Lead>
            Each category has its own direction, including <Mono>auto</Mono>: a short opener sorts the body ascending, a
            long opener sorts it descending, so the pyramid follows the line above it.
          </Lead>
        </Reveal>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CARDS.map((c, i) => (
            <Reveal key={c.tag} delay={(i % 3) * 0.08}>
              <motion.article
                whileHover={{ y: -4 }}
                transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                className="h-full rounded-2xl border border-white/10 bg-card/70 p-6 transition-colors hover:border-cyan/40"
              >
                <p className="font-mono text-xs uppercase tracking-[0.14em] text-cyan">{c.tag}</p>
                <h3 className="mt-2 text-xl font-semibold">{c.title}</h3>
                <p className="mt-2 text-mute">{c.body}</p>
              </motion.article>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="playground" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-24">
        <Reveal>
          <Kicker>Playground</Kicker>
          <H2>Paste something messy.</H2>
          <Lead>Edit the left side. The right side sorts as you type.</Lead>
        </Reveal>
        <Reveal delay={0.1} className="mt-10">
          <Playground />
        </Reveal>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-12">
        <Reveal>
          <Kicker>How</Kicker>
          <H2>One file decides.</H2>
          <Lead>
            <Mono>.pyramidsort</Mono> is JSON. The editor and the CLI read the nearest one. Its on-save toggles are what a
            bare <Mono>npx pyramid-sort</Mono> runs.
          </Lead>
        </Reveal>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <Reveal key={s.title} delay={i * 0.1}>
              <div className="h-full rounded-2xl border border-white/10 bg-card/70 p-6">
                <span className="flex size-8 items-center justify-center rounded-full bg-cyan/10 font-mono text-sm text-cyan">
                  {i + 1}
                </span>
                <h3 className="mt-4 text-xl font-semibold">{s.title}</h3>
                <p className="mt-2 text-mute">{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={0.2}>
          <p className="mt-6 rounded-xl border-l-2 border-cyan bg-card/50 px-5 py-4 text-mute">
            Imports and attributes are on by default. Types, objects, and CSS wait for <Mono>sortTypesOnSave</Mono>,{' '}
            <Mono>sortObjectsOnSave</Mono>, or <Mono>sortCssOnSave</Mono>. <Mono>diagnostics</Mono> only controls the
            Problems tab. It does not turn sorting on.
          </p>
        </Reveal>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-24">
        <Reveal>
          <div className="grid items-center gap-10 rounded-3xl border border-white/10 bg-card/60 p-8 sm:p-12 md:grid-cols-2">
            <div>
              <H2>In the editor. Or after the agent.</H2>
              <Lead>
                Marketplace id <Mono>INVEON-Development.pyramid-sort</Mono>. The CLI sorts every path you pass and reads{' '}
                <Mono>.pyramidsort</Mono> beside each file.
              </Lead>
              <div className="mt-8 flex flex-wrap gap-3">
                <ButtonLink href="#/editors">VS Code, Cursor, Antigravity</ButtonLink>
                <ButtonLink href="#/ai" ghost>
                  Wire it into an agent
                </ButtonLink>
              </div>
            </div>
            <div className="grid gap-3">
              <Cmd title="editor" code="code --install-extension INVEON-Development.pyramid-sort" />
              <Cmd title="after an agent edits files" code="npx pyramid-sort src/App.tsx src/pages/home.tsx" />
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
