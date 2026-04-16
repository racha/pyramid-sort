import { describe, it, expect } from 'vitest';
import { sortImports, parseImports } from '../src/core/importSorter';
import { sortAllAttributes } from '../src/core/attributeSorter';
import { sortObjectProperties } from '../src/core/objectSorter';
import { sortTypeProperties } from '../src/core/typeSorter';
import { sortCssProperties } from '../src/core/cssSorter';
import { ImportSorterOptions, ObjectSorterOptions, TypeSorterOptions, CssSorterOptions } from '../src/core/types';

const importDefaults: ImportSorterOptions = {
  direction: 'ascending',
  consolidateMultilineImports: true,
  maxLineWidth: 80,
  localAliasPatterns: ['@/', '~/'],
  groupByEmptyRows: false,
};

// ─── Bug #1: Import with trailing comment was mishandled ──────────────────────
describe('Bug #1: import with trailing comment', () => {
  it('parseImports handles trailing comments without merging lines', () => {
    const lines = [
      "import Foo from 'foo'; // comment",
      "import Bar from 'bar';",
    ];
    const result = parseImports(lines);
    expect(result).toHaveLength(2);
    expect(result[0].source).toBe('foo');
    expect(result[1].source).toBe('bar');
  });

  it('sortImports preserves both imports when one has a trailing comment', () => {
    const source = "import Foo from 'foo'; // comment\nimport Bar from 'bar';";
    const result = sortImports(source, importDefaults);
    expect(result).toContain("'foo'");
    expect(result).toContain("'bar'");
    expect(result.split('\n').filter(l => l.trim().startsWith('import')).length).toBe(2);
  });

  it('multi-line fallback does not consume non-import code', () => {
    const source =
      "import Foo from 'foo'; // has comment\nimport Bar from 'bar';\n\nconst x = 1;";
    const result = sortImports(source, importDefaults);
    expect(result).toContain('const x = 1');
  });
});

// ─── Bug #2: Attribute on same line as tag/bracket was dropped ────────────────
describe('Bug #2: inline attributes dropped', () => {
  it('preserves attribute on the closing bracket line', () => {
    const source = '<div\n  a="1"\n  b="2">\n</div>';
    const result = sortAllAttributes(source, { direction: 'ascending', groupByEmptyRows: false });
    expect(result).toContain('a="1"');
    expect(result).toContain('b="2"');
  });

  it('preserves attribute on the opening tag line', () => {
    const source = '<div a="1"\n  b="2"\n>\n</div>';
    const result = sortAllAttributes(source, { direction: 'ascending', groupByEmptyRows: false });
    expect(result).toContain('a="1"');
    expect(result).toContain('b="2"');
  });

  it('sorts inline attributes correctly by length', () => {
    const source = '<Component longPropName="value"\n  x="1"\n  medium="ok"\n>';
    const result = sortAllAttributes(source, { direction: 'ascending', groupByEmptyRows: false });
    const lines = result.split('\n');
    const attrLines = lines.filter(
      l => l.trim() && !l.trim().startsWith('<') && l.trim() !== '>' && l.trim() !== '/>'
    );
    const lengths = attrLines.map(l => l.trim().length);
    for (let i = 1; i < lengths.length; i++) {
      expect(lengths[i]).toBeGreaterThanOrEqual(lengths[i - 1]);
    }
  });
});

// ─── Bug #3: Object sorter scrambled nested blocks ────────────────────────────
describe('Bug #3: object nested block scrambling', () => {
  const opts: ObjectSorterOptions = {
    direction: 'ascending',
    groupByEmptyRows: true,
    sortNestedObjects: false,
  };

  it('keeps nested object block together when sorting parent', () => {
    const src = [
      'const obj = {',
      '  a: 1,',
      '  b: {',
      '    c: 2,',
      '    d: 3,',
      '  },',
      '  e: 4,',
      '};',
    ].join('\n');
    const out = sortObjectProperties(src, opts);
    const bIdx = out.indexOf('b: {');
    const cIdx = out.indexOf('c: 2');
    const dIdx = out.indexOf('d: 3');
    const closingIdx = out.indexOf('},', bIdx);
    expect(bIdx).toBeGreaterThan(-1);
    expect(cIdx).toBeGreaterThan(bIdx);
    expect(dIdx).toBeGreaterThan(cIdx);
    expect(closingIdx).toBeGreaterThan(dIdx);
  });

  it('keeps array block together when sorting parent', () => {
    const src = [
      'const obj = {',
      '  arr: [',
      '    1,',
      '    2,',
      '    3,',
      '  ],',
      '  e: 4,',
      '};',
    ].join('\n');
    const out = sortObjectProperties(src, { ...opts, sortNestedObjects: true });
    const arrIdx = out.indexOf('arr: [');
    const oneIdx = out.indexOf('1,');
    const threeIdx = out.indexOf('3,');
    const closingIdx = out.indexOf('],', arrIdx);
    expect(arrIdx).toBeGreaterThan(-1);
    expect(oneIdx).toBeGreaterThan(arrIdx);
    expect(threeIdx).toBeGreaterThan(oneIdx);
    expect(closingIdx).toBeGreaterThan(threeIdx);
  });
});

// ─── Bug #4: Type sorter scrambled nested blocks ──────────────────────────────
describe('Bug #4: type nested block scrambling', () => {
  const opts: TypeSorterOptions = {
    direction: 'ascending',
    groupByEmptyRows: true,
  };

  it('keeps nested type block together', () => {
    const src = [
      'type T = {',
      '  a: string;',
      '  b: {',
      '    c: number;',
      '    d: boolean;',
      '  };',
      '  e: number;',
      '};',
    ].join('\n');
    const out = sortTypeProperties(src, opts);
    const bIdx = out.indexOf('b: {');
    const cIdx = out.indexOf('c: number');
    const dIdx = out.indexOf('d: boolean');
    expect(bIdx).toBeGreaterThan(-1);
    expect(cIdx).toBeGreaterThan(bIdx);
    expect(dIdx).toBeGreaterThan(cIdx);
  });
});

// ─── Bug #5: CSS sorter scrambled nested rules ────────────────────────────────
describe('Bug #5: CSS nested rule scrambling', () => {
  const opts: CssSorterOptions = {
    direction: 'ascending',
    groupByEmptyRows: true,
  };

  it('keeps nested SCSS rule together', () => {
    const src = [
      '.outer {',
      '  color: red;',
      '  .inner {',
      '    color: blue;',
      '  }',
      '}',
    ].join('\n');
    const out = sortCssProperties(src, opts);
    const innerIdx = out.indexOf('.inner {');
    const blueIdx = out.indexOf('color: blue');
    const closingIdx = out.indexOf('}', innerIdx + 1);
    expect(innerIdx).toBeGreaterThan(-1);
    expect(blueIdx).toBeGreaterThan(innerIdx);
    expect(closingIdx).toBeGreaterThan(blueIdx);
  });
});
