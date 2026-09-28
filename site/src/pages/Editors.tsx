import type { ReactNode } from 'react';

import { Cmd } from '../code';
import { MARKETPLACE, Mono, OPEN_VSX, PageHero, Reveal } from '../ui';

function Editor({ who, title, children }: { who: string; title: string; children: ReactNode }) {
  return (
    <Reveal>
      <article className="grid gap-6 rounded-3xl border border-white/10 bg-card/60 p-6 sm:p-8 md:grid-cols-[14rem_1fr]">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-cyan">{who}</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h2>
        </div>
        <div className="grid min-w-0 gap-4 text-mute">{children}</div>
      </article>
    </Reveal>
  );
}

export default function Editors() {
  return (
    <div className="mx-auto max-w-[88rem] px-5">
      <PageHero kicker="Editors" title="Wherever the file is open.">
        It is a VS Code extension. Cursor loads it. Antigravity runs it and the same CLI. <Mono>.pyramidsort</Mono> is
        the shared config, so the editor and the terminal never drift apart.
      </PageHero>

      <div className="grid gap-5">
        <Editor who="VS Code" title="On save.">
          <p>
            Install <strong className="text-ink">Pyramid Sort</strong> by <Mono>INVEON-Development</Mono> from the{' '}
            <a className="text-cyan underline-offset-4 hover:underline" href={MARKETPLACE} target="_blank" rel="noreferrer">
              VS Code Marketplace
            </a>{' '}
            or{' '}
            <a className="text-cyan underline-offset-4 hover:underline" href={OPEN_VSX} target="_blank" rel="noreferrer">
              Open VSX
            </a>
            .
          </p>
          <Cmd code="code --install-extension INVEON-Development.pyramid-sort" />
          <p>
            Imports and attributes sort on save. Types, objects, and CSS wait until you enable them. The Problems tab
            reports unsorted blocks when diagnostics for that category are on, and the lightbulb runs the matching sort.
          </p>
          <p>
            Commands: <strong className="text-ink">Pyramid Sort</strong>, one per category,{' '}
            <strong className="text-ink">Force Sort</strong>, <strong className="text-ink">Save Without Sorting</strong>,{' '}
            <strong className="text-ink">Generate Config File</strong>, <strong className="text-ink">Scan All Files</strong>,{' '}
            <strong className="text-ink">Sort All Files</strong>.
          </p>
        </Editor>

        <Editor who="Cursor" title="Extension, then the agent.">
          <p>Install the same extension. Cursor runs VS Code extensions, so on-save and the Problems tab behave the same.</p>
          <Cmd code="cursor --install-extension INVEON-Development.pyramid-sort" />
          <p>
            Agent edits made through tools do not trigger on-save.{' '}
            <strong className="text-ink">Pyramid Sort: Setup AI Hook &amp; Cursor Rules</strong> writes{' '}
            <Mono>.cursor/rules/pyramid-sort.mdc</Mono> so the agent calls the CLI, and a stop hook can do it without
            being asked. See the{' '}
            <a className="text-cyan underline-offset-4 hover:underline" href="#/ai">
              AI workflow
            </a>
            .
          </p>
        </Editor>

        <Editor who="Antigravity" title="Same CLI. Same file.">
          <p>
            There is no separate Antigravity plugin. The Antigravity IDE is built on VS Code, so install the VSIX from the
            Extensions view (<strong className="text-ink">Install from VSIX</strong>) or from the{' '}
            <a className="text-cyan underline-offset-4 hover:underline" href={MARKETPLACE} target="_blank" rel="noreferrer">
              VS Code Marketplace
            </a>{' '}
            or{' '}
            <a className="text-cyan underline-offset-4 hover:underline" href={OPEN_VSX} target="_blank" rel="noreferrer">
              Open VSX
            </a>{' '}
            if it is listed.
          </p>
          <Cmd code="npx pyramid-sort src/App.tsx src/pages/home.tsx" />
          <p>
            Tell the agent to run that after it edits matching files. Categories come from the nearest{' '}
            <Mono>.pyramidsort</Mono>. <Mono>.pyramidsortignore</Mono> uses gitignore syntax for folders you want left
            alone.
          </p>
        </Editor>
      </div>

      <Reveal>
        <p className="mt-8 rounded-xl border-l-2 border-cyan bg-card/50 px-5 py-4 text-mute">
          A directory is not a file list. <Mono>npx pyramid-sort .</Mono> needs <Mono>--scan</Mono> or{' '}
          <Mono>--sort-all</Mono>. <Mono>--sort-all</Mono> rewrites the tree with the same on-save toggles.{' '}
          <Mono>--all-categories</Mono> ignores those toggles and sorts everything.
        </p>
      </Reveal>
    </div>
  );
}
