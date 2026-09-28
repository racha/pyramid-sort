import { Mono, PageHero } from '../ui';
import changelog from '../../../CHANGELOG.md?raw';

type Group = { kind: string; items: string[] };
type Release = { version: string; date: string; groups: Group[] };

function parse(md: string): Release[] {
  const releases: Release[] = [];
  let current: Release | null = null;
  let group: Group | null = null;
  for (const line of md.split('\n')) {
    const head = /^## \[([^\]]+)\] - (\d{4}-\d{2}-\d{2})/.exec(line);
    if (head) {
      current = { version: head[1], date: head[2], groups: [] };
      releases.push(current);
      group = null;
      continue;
    }
    const kind = /^### (.+)/.exec(line);
    if (kind && current) {
      group = { kind: kind[1].trim(), items: [] };
      current.groups.push(group);
      continue;
    }
    const item = /^- (.*)/.exec(line);
    if (item && group) group.items.push(item[1]);
  }
  return releases;
}

const RELEASES = parse(changelog);

function Rich({ text }: { text: string }) {
  return text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g).map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`')) return <Mono key={i}>{part.slice(1, -1)}</Mono>;
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-medium text-ink">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*')) return <em key={i}>{part.slice(1, -1)}</em>;
    return part;
  });
}

export default function Changelog() {
  return (
    <div className="mx-auto max-w-[88rem] px-5">
      <PageHero kicker="Changelog" title="What shipped.">
        Same list as the repository changelog, newest first.
      </PageHero>
      <ol className="grid gap-12 pb-4">
        {RELEASES.map((release) => (
          <li key={release.version}>
            <div className="flex items-baseline gap-3">
              <h2 className="font-mono text-2xl text-cyan">{release.version}</h2>
              <time className="font-mono text-sm text-mute" dateTime={release.date}>
                {release.date}
              </time>
            </div>
            <div className="mt-4 grid gap-5">
              {release.groups.map((group) => (
                <section key={group.kind}>
                  <h3 className={`font-mono text-xs uppercase tracking-[0.14em] ${group.kind === 'BREAKING' ? 'text-ink' : 'text-mute'}`}>
                    {group.kind}
                  </h3>
                  <ul className="mt-2 grid gap-2 text-mute">
                    {group.items.map((item) => (
                      <li key={item} className="text-pretty">
                        <Rich text={item} />
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
