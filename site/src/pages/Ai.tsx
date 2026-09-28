import type { ReactNode } from 'react';

import { Cmd } from '../code';
import { Mono, PageHero, Reveal } from '../ui';

const ONE_CALL = 'npx pyramid-sort src/components/form/fields/InputField.tsx src/pages/dashboard/test.tsx';

const CONFIG = `{
  "sortImportsOnSave": true,
  "sortAttributesOnSave": true,
  "sortTypesOnSave": false,
  "sortObjectsOnSave": false,
  "sortCssOnSave": false
}`;

const HOOKS = `{
  "version": 1,
  "hooks": {
    "afterFileEdit": [{ "command": ".cursor/hooks/record-js-edit.sh" }],
    "afterTabFileEdit": [{ "command": ".cursor/hooks/record-js-edit.sh" }],
    "stop": [{ "command": ".cursor/hooks/pyramid-sort-on-stop.sh", "timeout": 120 }]
  }
}`;

const STOP = `#!/usr/bin/env bash
set -euo pipefail
root="\${CURSOR_PROJECT_DIR:-$PWD}"
pending_dir="\${TMPDIR:-/tmp}/cursor-pyramid-sort"
pending="$pending_dir/$(printf '%s' "$root" | shasum | awk '{print $1}').txt"
if [[ -s "$pending" ]]; then
  files=()
  while IFS= read -r file; do
    [[ -f "$file" ]] || continue
    case "$file" in
      *.js|*.jsx|*.ts|*.tsx) files+=("$file") ;;
    esac
  done < <(sort -u "$pending")
  rm -f "$pending"
  if [[ \${#files[@]} -gt 0 ]]; then
    npx --yes pyramid-sort "\${files[@]}" >&2
  fi
fi
printf '%s\\n' '{}'
sleep 0.05`;

function Step({ n, title, children }: { n: number; title: ReactNode; children: ReactNode }) {
  return (
    <Reveal>
      <section className="grid gap-6 border-t border-white/10 py-12 md:grid-cols-[3rem_1fr]">
        <span className="flex size-9 items-center justify-center rounded-full bg-cyan/10 font-mono text-sm text-cyan">
          {n}
        </span>
        <div className="grid min-w-0 gap-4 text-mute">
          <h2 className="text-3xl font-semibold tracking-tight text-ink">{title}</h2>
          {children}
        </div>
      </section>
    </Reveal>
  );
}

export default function Ai() {
  return (
    <div className="mx-auto max-w-4xl px-5">
      <PageHero kicker="AI workflow" title="The agent edits. The CLI finishes the shape.">
        Do not ask the model to sort by length. It will improvise. Point it at <Mono>npx pyramid-sort</Mono> and let{' '}
        <Mono>.pyramidsort</Mono> decide which categories run.
      </PageHero>

      <Step n={1} title="One command, every path">
        <p>
          Pass every path from the turn in a single call. The CLI sorts them in order, reads the config next to each file,
          and prints the paths that changed when there is more than one.
        </p>
        <Cmd code={ONE_CALL} />
        <p>
          No <Mono>--imports-only</Mono>, and no second call for attributes. Those flags override the config, so use them
          only for a single category. <Mono>--all-categories</Mono> sorts everything and ignores the on-save toggles. A
          missing path exits non-zero, names the path, and writes nothing.
        </p>
      </Step>

      <Step n={2} title={<>What <Mono>.pyramidsort</Mono> turns on</>}>
        <p>
          Generate it with <strong className="text-ink">Pyramid Sort: Generate Config File</strong>. For the CLI, the keys
          that matter are the on-save flags:
        </p>
        <Cmd lang="json" title=".pyramidsort" code={CONFIG} />
        <p>
          <Mono>diagnostics.*</Mono> only affects the Problems tab and does not enable sorting. Direction, grouping, and
          extensions live in the same file.
        </p>
      </Step>

      <Step n={3} title="Cursor stop hook">
        <p>
          On-save does not see every tool edit. Record paths during the turn, then sort them once when the agent stops.
          The stop hook’s stdout must stay <Mono>{'{}'}</Mono>, so the CLI output goes to stderr.
        </p>
        <Cmd lang="json" title=".cursor/hooks.json" code={HOOKS} />
        <Cmd title=".cursor/hooks/pyramid-sort-on-stop.sh" code={STOP} />
        <p>
          <Mono>record-js-edit.sh</Mono> appends each edited <Mono>.js</Mono>, <Mono>.jsx</Mono>, <Mono>.ts</Mono>, or{' '}
          <Mono>.tsx</Mono> path to the pending file. The list is removed before <Mono>npx</Mono> runs, so a failed run
          drops those paths. If you already have the two-call version, change only the <Mono>npx</Mono> line.
        </p>
      </Step>

      <Step n={4} title="The rule, for shell edits">
        <p>
          <Mono>afterFileEdit</Mono> does not see shell edits. The Cursor rule covers those.{' '}
          <strong className="text-ink">Pyramid Sort: Setup AI Hook &amp; Cursor Rules</strong> writes{' '}
          <Mono>.cursor/rules/pyramid-sort.mdc</Mono> only when it is missing. Edit an existing rule so it runs one call:
        </p>
        <Cmd code={ONE_CALL} />
      </Step>

      <Step n={5} title="VS Code agents and Antigravity">
        <p>
          Copilot, Antigravity, and other agents get the same instruction: after editing files, run one{' '}
          <Mono>npx pyramid-sort</Mono> with those paths. Do not loop one file at a time, and do not reimplement the sort
          in the model.
        </p>
        <Cmd title="whole tree" code={'npx pyramid-sort . --sort-all\nnpx pyramid-sort . --scan'} />
        <p>
          <Mono>--scan</Mono> prints a Markdown report and exits 1 when it finds unsorted blocks. It does not write.
        </p>
      </Step>
    </div>
  );
}
