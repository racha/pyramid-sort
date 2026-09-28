import { motion } from 'motion/react';

import { GITHUB, Mono, NPM, PageHero, Reveal } from '../ui';

const LINKS = [
  { label: 'stefan@inveon.dev', href: 'mailto:stefan@inveon.dev' },
  { label: 'github.com/racha', href: 'https://github.com/racha' },
  { label: 'racha/pyramid-sort', href: GITHUB },
  { label: 'npm', href: NPM },
];

export default function Developer() {
  return (
    <div className="mx-auto max-w-4xl px-5">
      <PageHero kicker="Developer" title="Stefan Račić">
        Pyramid Sort is made at INVEON Development. The extension, the CLI, and this site live in one repository.
      </PageHero>

      <Reveal>
        <div className="flex flex-wrap gap-3">
          {LINKS.map((l) => (
            <motion.a
              key={l.href}
              href={l.href}
              whileHover={{ y: -2 }}
              className="rounded-full border border-white/15 px-4 py-2 font-mono text-sm text-mute transition hover:border-cyan/60 hover:text-ink"
            >
              {l.label}
            </motion.a>
          ))}
        </div>
      </Reveal>

      <Reveal delay={0.1}>
        <section className="mt-14 grid gap-4 text-mute">
          <h2 className="text-3xl font-semibold tracking-tight text-ink">The project</h2>
          <p>
            Source and issues live on GitHub. Releases publish the npm package <Mono>pyramid-sort</Mono> and the VS Code
            extension <Mono>INVEON-Development.pyramid-sort</Mono>. The license is MIT.
          </p>
          <p>
            A repo’s config is <Mono>.pyramidsort</Mono>. Files to skip go in <Mono>.pyramidsortignore</Mono>. Both are
            documented in the README, which wins if this site and the tool ever disagree.
          </p>
        </section>
      </Reveal>
    </div>
  );
}
