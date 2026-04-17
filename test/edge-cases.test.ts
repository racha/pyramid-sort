import { describe, it, expect } from 'vitest';
import { sortObjectProperties } from '../src/core/objectSorter';
import { sortTypeProperties } from '../src/core/typeSorter';
import { sortCssProperties } from '../src/core/cssSorter';
import { sortAllAttributes } from '../src/core/attributeSorter';
import { sortImports } from '../src/core/importSorter';
import {
  ObjectSorterOptions,
  TypeSorterOptions,
  CssSorterOptions,
  AttributeSorterOptions,
  ImportSorterOptions,
} from '../src/core/types';

const objOpts: ObjectSorterOptions = {
  direction: 'ascending',
  groupByEmptyRows: true,
  sortNestedObjects: true,
};
const typeOpts: TypeSorterOptions = { direction: 'ascending', groupByEmptyRows: true };
const cssOpts: CssSorterOptions = { direction: 'ascending', groupByEmptyRows: true };
const attrOpts: AttributeSorterOptions = { direction: 'ascending', groupByEmptyRows: true };
const importOpts: ImportSorterOptions = {
  direction: 'ascending',
  consolidateMultilineImports: true,
  maxLineWidth: 80,
  localAliasPatterns: ['@/', '~/'],
  groupByEmptyRows: true,
  groupExternalLocal: true,
};

/**
 * Assert that `block` appears in `out` as a contiguous sequence of non-empty
 * lines (each line of `block` is matched against the corresponding output line
 * by `.includes()`), i.e. the multi-line value was kept intact.
 */
function expectContiguous(out: string, block: string[]) {
  const outLines = out.split('\n');
  const idx = outLines.findIndex((_, i) =>
    block.every((b, k) => outLines[i + k] !== undefined && outLines[i + k].includes(b))
  );
  expect(idx).toBeGreaterThanOrEqual(0);
}

describe('edge case: comments inside multi-line values', () => {
  it('keeps leading block comments attached to the same property', () => {
    const src = [
      'const x = {',
      '  /** docstring for a very long property */',
      '  myDocumentedProperty: computeThing(),',
      '  id: 1,',
      '};',
    ].join('\n');

    const out = sortObjectProperties(src, objOpts);
    const lines = out.split('\n');
    const docIdx = lines.findIndex((l) => l.includes('/** docstring'));
    expect(docIdx).toBeGreaterThan(0);
    expect(lines[docIdx + 1]).toContain('myDocumentedProperty: computeThing()');
  });

  it('keeps trailing line comments with their owning property', () => {
    const src = [
      'const x = {',
      '  id: 1, // primary key',
      "  label: 'hello', // user-visible label",
      '};',
    ].join('\n');

    const out = sortObjectProperties(src, objOpts);
    expect(out).toContain('id: 1, // primary key');
    expect(out).toContain("label: 'hello', // user-visible label");
  });
});

describe('edge case: template literals with interpolation spanning lines', () => {
  it('template literal with ${...} containing newlines stays intact', () => {
    const src = [
      'const x = {',
      '  message: `count=${',
      '    getTotal()',
      '  } items`,',
      '  id: 1,',
      '};',
    ].join('\n');

    const out = sortObjectProperties(src, objOpts);
    expectContiguous(out, ['message: `count=${', 'getTotal()', '} items`,']);
    expect(out).toContain('id: 1,');
  });

  it('tagged template literal with multi-line content stays intact', () => {
    const src = [
      'const components = {',
      '  Button: styled.button`',
      '    color: red;',
      '    padding: 8px;',
      '  `,',
      '  id: 1,',
      '};',
    ].join('\n');

    const out = sortObjectProperties(src, objOpts);
    expectContiguous(out, ['Button: styled.button`', 'color: red;', 'padding: 8px;', '`,']);
    expect(out).toContain('id: 1,');
  });
});

describe('edge case: regex literals as values', () => {
  it('object property whose value is a regex literal', () => {
    const src = [
      'const x = {',
      "  pattern: /foo\\/bar\\//g,",
      '  id: 1,',
      '};',
    ].join('\n');

    const out = sortObjectProperties(src, objOpts);
    expect(out).toContain('pattern: /foo\\/bar\\//g,');
    expect(out).toContain('id: 1,');
  });
});

describe('edge case: degenerate bodies', () => {
  it('empty object body is untouched', () => {
    const src = ['const x = {', '};'].join('\n');
    const out = sortObjectProperties(src, objOpts);
    expect(out).toBe(src);
  });

  it('single-property object body is untouched (no spurious reordering)', () => {
    const src = ['const x = {', '  onlyProp: 1,', '};'].join('\n');
    const out = sortObjectProperties(src, objOpts);
    expect(out).toBe(src);
  });

  it('object body containing only comments is untouched', () => {
    const src = ['const x = {', '  // note: intentionally empty', '};'].join('\n');
    const out = sortObjectProperties(src, objOpts);
    expect(out).toBe(src);
  });

  it('empty interface body is untouched', () => {
    const src = ['interface X {', '}'].join('\n');
    const out = sortTypeProperties(src, typeOpts);
    expect(out).toBe(src);
  });

  it('empty CSS rule body is untouched', () => {
    const src = ['.x {', '}'].join('\n');
    const out = sortCssProperties(src, cssOpts);
    expect(out).toBe(src);
  });
});

describe('edge case: SCSS at-rules and mixins', () => {
  it('multi-line @include call stays intact', () => {
    const src = [
      '.card {',
      '  @include respond-to(',
      '    small,',
      '    medium',
      '  );',
      '  padding: 8px;',
      '  color: red;',
      '}',
    ].join('\n');

    const out = sortCssProperties(src, cssOpts);
    expectContiguous(out, ['@include respond-to(', 'small,', 'medium', ');']);
    expect(out).toContain('padding: 8px;');
    expect(out).toContain('color: red;');
  });

  it('CSS value with url() containing special chars stays intact', () => {
    const src = [
      '.hero {',
      '  background-image: url("data:image/png;base64,abc==");',
      '  color: #111;',
      '  padding: 8px;',
      '}',
    ].join('\n');

    const out = sortCssProperties(src, cssOpts);
    expect(out).toContain('background-image: url("data:image/png;base64,abc==");');
    expect(out).toContain('color: #111;');
    expect(out).toContain('padding: 8px;');
  });
});

describe('edge case: JSX peculiarities', () => {
  it('JSX self-closing tag with no attributes is untouched', () => {
    const src = ['<Foo', '/>'].join('\n');
    const out = sortAllAttributes(src, attrOpts);
    expect(out).toBe(src);
  });

  it('JSX with a spread attribute and named attributes sorts correctly', () => {
    const src = [
      '<Button',
      '  {...rest}',
      '  id="x"',
      '  className="primary"',
      '  onClick={handleClick}',
      '/>',
    ].join('\n');

    const out = sortAllAttributes(src, attrOpts);
    expect(out).toContain('{...rest}');
    expect(out).toContain('id="x"');
    expect(out).toContain('className="primary"');
    expect(out).toContain('onClick={handleClick}');
  });

  it('JSX attribute whose value is nested JSX stays intact', () => {
    const src = [
      '<Tooltip',
      '  content={<span>hello</span>}',
      '  id="t1"',
      '/>',
    ].join('\n');

    const out = sortAllAttributes(src, attrOpts);
    expect(out).toContain('content={<span>hello</span>}');
    expect(out).toContain('id="t1"');
  });

  it('JSX attribute with multi-line tagged template literal as value', () => {
    const src = [
      '<Box',
      '  css={css`',
      '    padding: 8px;',
      '    color: red;',
      '  `}',
      '  id="b"',
      '/>',
    ].join('\n');

    const out = sortAllAttributes(src, attrOpts);
    const outLines = out.split('\n');
    const cssIdx = outLines.findIndex((l) => l.trim().startsWith('css={css`'));
    expect(cssIdx).toBeGreaterThanOrEqual(0);
    expect(outLines[cssIdx + 1]).toContain('padding: 8px;');
    expect(outLines[cssIdx + 2]).toContain('color: red;');
    expect(outLines[cssIdx + 3]).toContain('`}');
    expect(out).toContain('id="b"');
  });
});

describe('edge case: TypeScript conditional and mapped types', () => {
  it('multi-line conditional type as member value', () => {
    const src = [
      'interface X {',
      '  result:',
      '    T extends string',
      '      ? "str"',
      '      : "other";',
      '  id: string;',
      '}',
    ].join('\n');

    const out = sortTypeProperties(src, typeOpts);
    expectContiguous(out, [
      'result:',
      'T extends string',
      '? "str"',
      ': "other";',
    ]);
    expect(out).toContain('id: string;');
  });

  it('multi-line mapped type member stays intact', () => {
    const src = [
      'type M = {',
      '  [K in keyof T]:',
      '    T[K] extends Function',
      '      ? never',
      '      : T[K];',
      '  id: string;',
      '};',
    ].join('\n');

    const out = sortTypeProperties(src, typeOpts);
    expectContiguous(out, [
      '[K in keyof T]:',
      'T[K] extends Function',
      '? never',
      ': T[K];',
    ]);
    expect(out).toContain('id: string;');
  });
});

describe('edge case: object methods and getters/setters', () => {
  it('multi-line method shorthand stays intact', () => {
    const src = [
      'const api = {',
      '  fetchThing() {',
      '    return 1;',
      '  },',
      '  id: 1,',
      '  label: "x",',
      '};',
    ].join('\n');

    const out = sortObjectProperties(src, objOpts);
    expectContiguous(out, ['fetchThing() {', 'return 1;', '},']);
    expect(out).toContain('id: 1,');
    expect(out).toContain('label: "x",');
  });

  it('getter with multi-line body stays intact', () => {
    const src = [
      'const api = {',
      '  get computed() {',
      '    return this.a + this.b;',
      '  },',
      '  id: 1,',
      '};',
    ].join('\n');

    const out = sortObjectProperties(src, objOpts);
    expectContiguous(out, ['get computed() {', 'return this.a + this.b;', '},']);
    expect(out).toContain('id: 1,');
  });
});

describe('edge case: comments that contain brackets or quote-like chars', () => {
  it('line comment containing a stray `{` does not confuse bracket tracking', () => {
    const src = [
      'const x = {',
      '  id: 1, // has a { in the comment',
      '  label: "x",',
      '  count: 42,',
      '};',
    ].join('\n');

    const out = sortObjectProperties(src, objOpts);

    expect(out).toContain('id: 1, // has a { in the comment');
    expect(out).toContain('label: "x",');
    expect(out).toContain('count: 42,');

    const outLines = out.split('\n');
    const idIdx = outLines.findIndex((l) => l.includes('id: 1,'));
    const labelIdx = outLines.findIndex((l) => l.includes('label: "x",'));
    const countIdx = outLines.findIndex((l) => l.includes('count: 42,'));
    expect(countIdx).toBeLessThan(labelIdx);
    expect(labelIdx).toBeLessThan(idIdx);
  });

  it('line comment containing a stray `"` does not open a phantom string', () => {
    const src = [
      'const x = {',
      "  id: 1, // don't worry",
      '  longer: "value",',
      '  shortest: 0,',
      '};',
    ].join('\n');

    const out = sortObjectProperties(src, objOpts);

    const outLines = out.split('\n');
    const shortestIdx = outLines.findIndex((l) => l.includes('shortest: 0,'));
    const idIdx = outLines.findIndex((l) => l.includes('id: 1,'));
    const longerIdx = outLines.findIndex((l) => l.includes('longer: "value",'));

    expect(shortestIdx).toBeLessThan(longerIdx);
    expect(longerIdx).toBeLessThan(idIdx);
  });

  it('block comment spanning multiple lines between properties is preserved', () => {
    const src = [
      'const x = {',
      '  id: 1,',
      '  /*',
      '   * Notes about the next property',
      '   */',
      '  label: "x",',
      '  count: 42,',
      '};',
    ].join('\n');

    const out = sortObjectProperties(src, objOpts);
    expect(out).toContain('id: 1,');
    expect(out).toContain('/*');
    expect(out).toContain(' * Notes about the next property');
    expect(out).toContain(' */');
    expect(out).toContain('label: "x",');
    expect(out).toContain('count: 42,');
  });

  it('inline block comment on a property line is preserved', () => {
    const src = [
      'const x = {',
      '  id: /* primary */ 1,',
      '  label: "x",',
      '};',
    ].join('\n');

    const out = sortObjectProperties(src, objOpts);
    expect(out).toContain('id: /* primary */ 1,');
    expect(out).toContain('label: "x",');
  });

  it('CSS declaration with an inline /* block comment */ is preserved', () => {
    const src = [
      '.x {',
      '  color: red; /* brand */',
      '  padding: 16px;',
      '  background-color: blue;',
      '}',
    ].join('\n');

    const out = sortCssProperties(src, cssOpts);
    expect(out).toContain('color: red; /* brand */');
    expect(out).toContain('padding: 16px;');
    expect(out).toContain('background-color: blue;');
  });
});

describe('edge case: strings containing tricky chars', () => {
  it('string value containing escaped quotes stays intact', () => {
    const src = [
      'const x = {',
      '  msg: "she said \\"hi\\"",',
      '  id: 1,',
      '};',
    ].join('\n');

    const out = sortObjectProperties(src, objOpts);
    expect(out).toContain('msg: "she said \\"hi\\"",');
    expect(out).toContain('id: 1,');
  });

  it('string value containing braces stays intact', () => {
    const src = [
      'const x = {',
      '  template: "use {name} here",',
      '  id: 1,',
      '};',
    ].join('\n');

    const out = sortObjectProperties(src, objOpts);
    expect(out).toContain('template: "use {name} here",');
    expect(out).toContain('id: 1,');
  });
});

describe('edge case: imports with comments', () => {
  it('inline trailing comments on imports are preserved in place', () => {
    const src = [
      "import a from 'a'; // short note",
      "import { long } from 'long-package'; // explains the long one",
    ].join('\n');

    const out = sortImports(src, importOpts);
    expect(out).toContain('// short note');
    expect(out).toContain('// explains the long one');
  });
});
