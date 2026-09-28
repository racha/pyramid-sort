import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { runCli } from '../src/cli';

const tempDirs: string[] = [];

function makeDir(prefix: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

const UNSORTED_IMPORTS = [
  "import { somethingVeryLongName } from './something-very-long-name';",
  "import { a } from './a';",
  '',
  'export const x = 1;',
  '',
].join('\n');

const UNSORTED_ATTRS = [
  'export function Field() {',
  '  return (',
  '    <input',
  '      value={message}',
  '      ref={ref}',
  '      type="text"',
  '      name="message"',
  '    />',
  '  );',
  '}',
  '',
].join('\n');

function writeFile(dir: string, name: string, body: string): string {
  const full = path.join(dir, name);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, body, 'utf-8');
  return full;
}

function run(argv: string[]): { code: number; out: string[]; err: string } {
  const out: string[] = [];
  const err: string[] = [];
  const log = vi.spyOn(console, 'log').mockImplementation((...args) => {
    out.push(args.map(String).join(' '));
  });
  const error = vi.spyOn(console, 'error').mockImplementation((...args) => {
    err.push(args.map(String).join(' '));
  });
  try {
    return { code: runCli(argv), out, err: err.join('\n') };
  } finally {
    log.mockRestore();
    error.mockRestore();
  }
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('runCli multiple files', () => {
  it('rewrites every file with --imports-only and fails when a later path is missing', () => {
    const dir = makeDir('ps-cli-imp-');
    const files = ['a.tsx', 'b.tsx', 'c.tsx'].map((name) => writeFile(dir, name, UNSORTED_IMPORTS));
    const missing = path.join(dir, 'missing.tsx');

    const ok = run(['--imports-only', ...files]);
    expect(ok.code).toBe(0);
    expect(ok.out).toEqual(files);
    for (const file of files) {
      const next = fs.readFileSync(file, 'utf-8');
      expect(next).not.toBe(UNSORTED_IMPORTS);
      expect(next.indexOf("from './a'")).toBeLessThan(
        next.indexOf("from './something-very-long-name'")
      );
    }

    const first = writeFile(dir, 'keep.tsx', UNSORTED_IMPORTS);
    const bad = run(['--imports-only', first, missing]);
    expect(bad.code).not.toBe(0);
    expect(bad.err).toContain(missing);
    expect(fs.readFileSync(first, 'utf-8')).toBe(UNSORTED_IMPORTS);
  });

  it('rewrites two tsx files with --attributes-only', () => {
    const dir = makeDir('ps-cli-attr-');
    const files = ['one.tsx', 'two.tsx'].map((name) => writeFile(dir, name, UNSORTED_ATTRS));

    const result = run(['--attributes-only', ...files]);
    expect(result.code).toBe(0);
    expect(result.out).toEqual(files);
    for (const file of files) {
      const next = fs.readFileSync(file, 'utf-8');
      expect(next).not.toBe(UNSORTED_ATTRS);
      expect(next.indexOf('ref={ref}')).toBeLessThan(next.indexOf('value={message}'));
    }
  });

  it('follows .pyramidsort sort*OnSave when no --*-only flag is set', () => {
    const dir = makeDir('ps-cli-rc-');
    writeFile(
      dir,
      '.pyramidsort',
      JSON.stringify({
        sortImportsOnSave: false,
        sortAttributesOnSave: true,
        sortTypesOnSave: false,
        sortObjectsOnSave: false,
        sortCssOnSave: false,
      })
    );
    const file = writeFile(dir, 'both.tsx', `${UNSORTED_IMPORTS}${UNSORTED_ATTRS}`);
    const before = fs.readFileSync(file, 'utf-8');

    expect(run([file]).code).toBe(0);

    const next = fs.readFileSync(file, 'utf-8');
    expect(next.indexOf("from './something-very-long-name'")).toBeLessThan(next.indexOf("from './a'"));
    expect(next.indexOf('ref={ref}')).toBeLessThan(next.indexOf('value={message}'));
    expect(next).not.toBe(before);
  });
});
