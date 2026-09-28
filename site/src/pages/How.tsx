import type { ReactNode } from 'react';

import { Mono, PageHero, Reveal } from '../ui';

function Rule({ n, title, children }: { n: string; title: string; children: ReactNode }) {
  return (
    <Reveal>
      <section className="grid gap-4 border-t border-white/10 py-12 md:grid-cols-[5rem_1fr]">
        <span className="font-mono text-sm text-cyan">{n}</span>
        <div className="grid max-w-3xl gap-3 text-mute">
          <h2 className="text-3xl font-semibold tracking-tight text-ink">{title}</h2>
          {children}
        </div>
      </section>
    </Reveal>
  );
}

export default function How() {
  return (
    <div className="mx-auto max-w-5xl px-5">
      <PageHero kicker="How it works" title="One measurement. A shape you can see.">
        Pyramid Sort does not alphabetize. It measures the trimmed length of a line and puts the short ones where your
        eye starts. The same rule runs on save, from the command palette, and from <Mono>npx pyramid-sort</Mono>.
      </PageHero>

      <Rule n="01" title="The sort key is the line.">
        <p>
          Whitespace at the ends is ignored. What remains is the length. Ascending puts the shortest line first, so a
          block reads as a pyramid: a point at the top, the long line at the bottom. Descending flips it. Names,
          keywords, and “importance” never enter the comparison.
        </p>
      </Rule>

      <Rule n="02" title="Imports are two groups on purpose.">
        <p>
          A file’s imports split into what you installed and what you wrote. External is a package name:{' '}
          <Mono>react</Mono>, <Mono>date-fns</Mono>, <Mono>clsx</Mono>. Local is a path that starts with <Mono>./</Mono>{' '}
          or <Mono>../</Mono>, plus aliases such as <Mono>@/</Mono> and <Mono>~/</Mono>. Aliases are also read from the
          nearest <Mono>tsconfig.json</Mono>, <Mono>jsconfig.json</Mono>, and Vite config, so your real alias counts as
          local.
        </p>
        <p>
          Each group sorts by length on its own. A blank line stays between them, so packages never land in the middle
          of your own files. That is the second stack you see after a sort. Set <Mono>groupExternalLocal</Mono> to{' '}
          <Mono>false</Mono> and the blank line goes away: one list, still by length.
        </p>
        <p>
          An import that is already several lines can reflow to fit <Mono>maxLineWidth</Mono> (Prettier’s print width,
          unless you set one). An import that is already one line stays one line. Pyramid Sort will not wrap it just to
          make it shorter.
        </p>
      </Rule>

      <Rule n="03" title="A blank line is a wall.">
        <p>
          Everywhere the sorter runs — imports, attributes, types, objects, CSS, and force sort — a blank line splits
          the block into groups. Each group sorts alone. The blank line stays where you put it. Use it when two sets of
          lines should not mix, like required fields above optional ones.
        </p>
      </Rule>

      <Rule n="04" title="Auto follows the line above the block.">
        <p>
          Every category has its own <Mono>direction</Mono>: <Mono>ascending</Mono>, <Mono>descending</Mono>, or{' '}
          <Mono>auto</Mono>. Auto compares the opening line to the median length of the lines inside.
        </p>
        <p>
          The opening line is the <Mono>{'<Tag'}</Mono>, the line with <Mono>{'{'}</Mono>, the CSS selector, or the line
          above an import block. If that line is shorter than the median, the body sorts ascending: short lines sit
          under a short opener. If it is longer or equal, the body sorts descending, so the long lines sit against the
          long opener and the block tapers away from it.
        </p>
        <p>The pyramid follows the boundary. It does not fight it.</p>
      </Rule>

      <Rule n="05" title="Five parsers. One idea.">
        <p>
          <strong className="text-ink">Attributes</strong> sort inside multiline JSX and HTML tags. A tag written on one
          line is left as one line. <Mono>{'{...props}'}</Mono> and <Mono>{'{...rest}'}</Mono> stay exactly where they
          were written. Named attributes sort on each side and never cross the spread, so override order does not
          change. <Mono>skipGroupsWithSpread</Mono> leaves a whole group untouched when it contains a spread.
        </p>
        <p>
          If an opening tag is not safe to rewrite — a nested element, or a callback that itself contains a{' '}
          <Mono>&gt;</Mono> — that tag is skipped. Pyramid Sort would rather do nothing than break the file.
        </p>
        <p>
          <strong className="text-ink">Types</strong> sort the members of <Mono>type</Mono>, <Mono>interface</Mono>, and{' '}
          <Mono>enum</Mono>, including <Mono>export</Mono>. The name of the type stays. Only the body moves.
        </p>
        <p>
          <strong className="text-ink">Objects</strong> sort <Mono>const</Mono>, <Mono>let</Mono>, and <Mono>var</Mono>{' '}
          assignments of <Mono>{'{ … }'}</Mono>, and <Mono>return {'{ … }'}</Mono>. Nested objects and objects passed
          into a call stay intact unless <Mono>sortNestedObjects</Mono> is on. Then those are sorted too, still by
          length, still aware of braces.
        </p>
        <p>
          <strong className="text-ink">CSS</strong> sorts declarations inside a rule, in CSS, SCSS, and Less. The
          selector stays the selector. A nested rule stays a nested rule. Steps inside <Mono>@keyframes</Mono> are not
          reshuffled as if they were properties.
        </p>
        <p>
          <strong className="text-ink">Force sort</strong> has no parser. It orders the lines you selected, in any
          language, by length. Blank lines still split groups. Use it when the file is not one of the five kinds above.
        </p>
      </Rule>

      <Rule n="06" title="On by default, and what is not.">
        <p>
          On save, imports and attributes run. Types, objects, and CSS wait until you turn on{' '}
          <Mono>sortTypesOnSave</Mono>, <Mono>sortObjectsOnSave</Mono>, or <Mono>sortCssOnSave</Mono>. A manual command
          still sorts a category even when its on-save toggle is off.
        </p>
        <p>
          <Mono>diagnostics</Mono> is a different switch. It only adds an information entry in the Problems tab when a
          block is out of order, with a quick fix that runs the matching sort. Turning diagnostics on does not sort
          anything. Imports and attributes report by default. The others are opt-in.
        </p>
        <p>
          <strong className="text-ink">Save Without Sorting</strong> writes the file once and skips the on-save pass.
        </p>
      </Rule>

      <Rule n="07" title="The nearest .pyramidsort wins.">
        <p>
          Drop a JSON file named <Mono>.pyramidsort</Mono> in a folder. The editor and the CLI read the nearest one,
          walking up from the file. It holds directions, grouping, extensions, on-save toggles, and diagnostics. Missing
          keys fall back to your editor settings, then to the defaults.
        </p>
        <p>
          <strong className="text-ink">Pyramid Sort: Generate Config File</strong> writes that file from your current
          editor settings. Commit it, and a teammate and an agent get the same shape.
        </p>
        <p>
          <Mono>.pyramidsortignore</Mono> uses gitignore syntax. The nearest ignore file wins. It applies to scan, sort
          all, the CLI, on save, and diagnostics. A manual sort command in the editor is not blocked by it.
        </p>
      </Rule>

      <Rule n="08" title="The CLI is the same sorter.">
        <p>
          <Mono>npx pyramid-sort a.tsx b.tsx</Mono> sorts every path you pass, in order, using the{' '}
          <Mono>.pyramidsort</Mono> beside each file. It does not sort every category. It runs the same on-save toggles
          the editor uses. <Mono>--imports-only</Mono> and the other <Mono>--*-only</Mono> flags override that.{' '}
          <Mono>--all-categories</Mono> ignores the toggles and sorts everything.
        </p>
        <p>
          A missing path exits non-zero, names the path, and writes nothing. With more than one path, the paths that
          changed are printed. A directory needs <Mono>--scan</Mono> (a report, no writes, exit 1 if anything is out of
          order) or <Mono>--sort-all</Mono> (rewrite the tree).
        </p>
      </Rule>
    </div>
  );
}
