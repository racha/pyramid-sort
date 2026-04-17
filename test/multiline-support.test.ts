import { describe, it, expect } from 'vitest';
import { sortImports } from '../src/core/importSorter';
import { sortAllAttributes } from '../src/core/attributeSorter';
import { sortObjectProperties } from '../src/core/objectSorter';
import { sortTypeProperties } from '../src/core/typeSorter';
import { sortCssProperties } from '../src/core/cssSorter';
import {
  ImportSorterOptions,
  ObjectSorterOptions,
  TypeSorterOptions,
  CssSorterOptions,
  AttributeSorterOptions,
} from '../src/core/types';

/**
 * Comprehensive multi-line support tests.
 *
 * Each sorter must treat a "logical entry" (attribute, property, declaration,
 * type member) as an atomic block even when it spans multiple source lines.
 * This covers: arrow-function bodies, template literals, multi-line strings,
 * multi-line object/array values, function calls with newlines, multi-line
 * CSS values like `grid-template-areas` / `linear-gradient()` / `calc()`,
 * multi-line union & function types, multi-line JSX expression attributes.
 */

const importOpts: ImportSorterOptions = {
  direction: 'ascending',
  consolidateMultilineImports: true,
  maxLineWidth: 80,
  localAliasPatterns: ['@/', '~/'],
  groupByEmptyRows: true,
  groupExternalLocal: true,
};

const objOpts: ObjectSorterOptions = {
  direction: 'ascending',
  groupByEmptyRows: true,
  sortNestedObjects: true,
};

const typeOpts: TypeSorterOptions = {
  direction: 'ascending',
  groupByEmptyRows: true,
};

const cssOpts: CssSorterOptions = {
  direction: 'ascending',
  groupByEmptyRows: true,
};

const attrOpts: AttributeSorterOptions = {
  direction: 'ascending',
  groupByEmptyRows: true,
};

/**
 * Assert that a contiguous sequence of lines appears in `out`, in order, with
 * the expected count. Used to verify that a multi-line atomic block stays
 * contiguous after sorting.
 */
function expectContiguousBlock(out: string, block: string[]) {
  const outLines = out.split('\n');
  const startIdx = outLines.findIndex((l, i) =>
    block.every((b, k) => outLines[i + k] !== undefined && outLines[i + k].includes(b))
  );
  expect(startIdx).toBeGreaterThanOrEqual(0);
}

describe('multi-line OBJECTS', () => {
  it('property value is a multi-line arrow function body', () => {
    const src = [
      'const handlers = {',
      '  onSubmit: (data) => {',
      '    validate(data);',
      '    save(data);',
      '  },',
      '  id: 1,',
      '  label: "x",',
      '};',
    ].join('\n');

    const out = sortObjectProperties(src, objOpts);
    expectContiguousBlock(out, [
      'onSubmit: (data) => {',
      'validate(data);',
      'save(data);',
      '},',
    ]);
    expect(out).toContain('id: 1,');
    expect(out).toContain('label: "x",');
  });

  it('property value is a multi-line template literal', () => {
    const src = [
      'const x = {',
      '  message: `hello',
      '    world`,',
      '  id: 1,',
      '};',
    ].join('\n');

    const out = sortObjectProperties(src, objOpts);
    expectContiguousBlock(out, ['message: `hello', 'world`,']);
    expect(out).toContain('id: 1,');
  });

  it('property value is a multi-line string concatenation', () => {
    const src = [
      'const x = {',
      '  description: "first part " +',
      '    "second part " +',
      '    "third part",',
      '  id: 1,',
      '};',
    ].join('\n');

    const out = sortObjectProperties(src, objOpts);
    expectContiguousBlock(out, [
      'description: "first part " +',
      '"second part " +',
      '"third part",',
    ]);
    expect(out).toContain('id: 1,');
  });

  it('property value is a multi-line array literal', () => {
    const src = [
      'const x = {',
      '  colors: [',
      '    "red",',
      '    "green",',
      '    "blue",',
      '  ],',
      '  id: 1,',
      '};',
    ].join('\n');

    const out = sortObjectProperties(src, objOpts);
    expectContiguousBlock(out, ['colors: [', '"red",', '"green",', '"blue",', '],']);
    expect(out).toContain('id: 1,');
  });

  it('property value is a multi-line function call', () => {
    const src = [
      'const x = {',
      '  computed: format(',
      '    input,',
      '    options,',
      '  ),',
      '  id: 1,',
      '};',
    ].join('\n');

    const out = sortObjectProperties(src, objOpts);
    expectContiguousBlock(out, ['computed: format(', 'input,', 'options,', '),']);
    expect(out).toContain('id: 1,');
  });

  it('property value is a multi-line inline object literal', () => {
    const src = [
      'const config = {',
      '  theme: {',
      '    primary: "#000",',
      '    secondary: "#fff",',
      '  },',
      '  id: 1,',
      '};',
    ].join('\n');

    const out = sortObjectProperties(src, objOpts);
    expectContiguousBlock(out, [
      'theme: {',
      'primary: "#000",',
      'secondary: "#fff",',
      '},',
    ]);
    expect(out).toContain('id: 1,');
  });
});

describe('multi-line TYPES / INTERFACES', () => {
  it('member is a multi-line function signature', () => {
    const src = [
      'interface API {',
      '  request: (',
      '    url: string,',
      '    options?: RequestInit,',
      '  ) => Promise<Response>;',
      '  id: string;',
      '}',
    ].join('\n');

    const out = sortTypeProperties(src, typeOpts);
    expectContiguousBlock(out, [
      'request: (',
      'url: string,',
      'options?: RequestInit,',
      ') => Promise<Response>;',
    ]);
    expect(out).toContain('id: string;');
  });

  it('member is a multi-line inline object type', () => {
    const src = [
      'interface Props {',
      '  user: {',
      '    name: string;',
      '    email: string;',
      '  };',
      '  id: string;',
      '}',
    ].join('\n');

    const out = sortTypeProperties(src, typeOpts);
    expectContiguousBlock(out, ['user: {', 'name: string;', 'email: string;', '};']);
    expect(out).toContain('id: string;');
  });

  it('member is a multi-line union type', () => {
    const src = [
      'type Config = {',
      '  status:',
      '    | "idle"',
      '    | "loading"',
      '    | "success"',
      '    | "error";',
      '  id: string;',
      '};',
    ].join('\n');

    const out = sortTypeProperties(src, typeOpts);
    expectContiguousBlock(out, [
      'status:',
      '| "idle"',
      '| "loading"',
      '| "success"',
      '| "error";',
    ]);
    expect(out).toContain('id: string;');
  });

  it('member has multi-line generic constraints', () => {
    const src = [
      'interface Store<',
      '  TState extends Record<string, unknown>,',
      '  TAction extends { type: string }',
      '> {',
      '  dispatch: (action: TAction) => void;',
      '  state: TState;',
      '  subscribe: (fn: () => void) => () => void;',
      '  id: string;',
      '}',
    ].join('\n');

    const out = sortTypeProperties(src, typeOpts);
    expect(out).toContain('id: string;');
    expect(out).toContain('state: TState;');
    expect(out).toContain('dispatch: (action: TAction) => void;');
    expect(out).toContain('subscribe: (fn: () => void) => () => void;');
  });
});

describe('multi-line CSS / SCSS', () => {
  it('declaration has a multi-line linear-gradient value', () => {
    const src = [
      '.card {',
      '  background: linear-gradient(',
      '    red,',
      '    blue',
      '  );',
      '  color: #111;',
      '  padding: 8px;',
      '}',
    ].join('\n');

    const out = sortCssProperties(src, cssOpts);
    expectContiguousBlock(out, [
      'background: linear-gradient(',
      'red,',
      'blue',
      ');',
    ]);
    expect(out).toContain('color: #111;');
    expect(out).toContain('padding: 8px;');
  });

  it('declaration has a multi-line calc value', () => {
    const src = [
      '.card {',
      '  width: calc(',
      '    100% -',
      '    var(--sidebar-width)',
      '  );',
      '  padding: 8px;',
      '}',
    ].join('\n');

    const out = sortCssProperties(src, cssOpts);
    expectContiguousBlock(out, [
      'width: calc(',
      '100% -',
      'var(--sidebar-width)',
      ');',
    ]);
    expect(out).toContain('padding: 8px;');
  });

  it('declaration is grid-template-areas with multi-line string values', () => {
    const src = [
      '.layout {',
      '  grid-template-areas:',
      '    "header header"',
      '    "nav    main"',
      '    "footer footer";',
      '  gap: 8px;',
      '  padding: 16px;',
      '}',
    ].join('\n');

    const out = sortCssProperties(src, cssOpts);
    expectContiguousBlock(out, [
      'grid-template-areas:',
      '"header header"',
      '"nav    main"',
      '"footer footer";',
    ]);
    expect(out).toContain('gap: 8px;');
    expect(out).toContain('padding: 16px;');
  });

  it('declaration has a multi-line box-shadow list', () => {
    const src = [
      '.card {',
      '  box-shadow:',
      '    0 1px 2px rgba(0, 0, 0, 0.1),',
      '    0 4px 8px rgba(0, 0, 0, 0.2);',
      '  padding: 8px;',
      '}',
    ].join('\n');

    const out = sortCssProperties(src, cssOpts);
    expectContiguousBlock(out, [
      'box-shadow:',
      '0 1px 2px rgba(0, 0, 0, 0.1),',
      '0 4px 8px rgba(0, 0, 0, 0.2);',
    ]);
    expect(out).toContain('padding: 8px;');
  });

  it('declaration has a multi-line transition list', () => {
    const src = [
      '.button {',
      '  transition:',
      '    background-color 200ms ease,',
      '    color 200ms ease,',
      '    transform 150ms ease;',
      '  padding: 8px;',
      '  cursor: pointer;',
      '}',
    ].join('\n');

    const out = sortCssProperties(src, cssOpts);
    expectContiguousBlock(out, [
      'transition:',
      'background-color 200ms ease,',
      'color 200ms ease,',
      'transform 150ms ease;',
    ]);
    expect(out).toContain('padding: 8px;');
    expect(out).toContain('cursor: pointer;');
  });
});

describe('multi-line JSX ATTRIBUTES', () => {
  it('attribute value is a multi-line object literal', () => {
    const src = [
      '<Animated',
      '  style={{',
      '    transform: [{ translateY: offset }],',
      '    opacity: fade,',
      '  }}',
      '  id="x"',
      '/>',
    ].join('\n');

    const out = sortAllAttributes(src, attrOpts);

    const outLines = out.split('\n');
    const styleIdx = outLines.findIndex((l) => l.trim().startsWith('style={{'));
    expect(styleIdx).toBeGreaterThanOrEqual(0);
    expect(outLines[styleIdx + 1]).toContain('transform: [{ translateY: offset }]');
    expect(outLines[styleIdx + 2]).toContain('opacity: fade');
    expect(outLines[styleIdx + 3].trim()).toBe('}}');
    expect(out).toContain('id="x"');
  });

  it('attribute value is a multi-line template literal', () => {
    const src = [
      '<Button',
      '  className={`btn',
      '    ${isActive ? "active" : ""}',
      '    ${size}`}',
      '  id="btn-1"',
      '/>',
    ].join('\n');

    const out = sortAllAttributes(src, attrOpts);
    const outLines = out.split('\n');
    const classIdx = outLines.findIndex((l) => l.trim().startsWith('className={`'));
    expect(classIdx).toBeGreaterThanOrEqual(0);
    expect(outLines[classIdx + 1]).toContain('${isActive ? "active" : ""}');
    expect(outLines[classIdx + 2]).toContain('${size}`}');
    expect(out).toContain('id="btn-1"');
  });

  it('attribute value is a multi-line array of objects', () => {
    const src = [
      '<DataTable',
      '  columns={[',
      '    { key: "id", label: "ID" },',
      '    { key: "name", label: "Name" },',
      '  ]}',
      '  rowKey="id"',
      '/>',
    ].join('\n');

    const out = sortAllAttributes(src, attrOpts);
    const outLines = out.split('\n');
    const colsIdx = outLines.findIndex((l) => l.trim().startsWith('columns={['));
    expect(colsIdx).toBeGreaterThanOrEqual(0);
    expect(outLines[colsIdx + 1]).toContain('{ key: "id", label: "ID" }');
    expect(outLines[colsIdx + 2]).toContain('{ key: "name", label: "Name" }');
    expect(outLines[colsIdx + 3].trim()).toBe(']}');
    expect(out).toContain('rowKey="id"');
  });

  it('attribute value is a multi-line conditional expression', () => {
    const src = [
      '<Message',
      '  text={',
      '    isError',
      '      ? "Something went wrong"',
      '      : "All good"',
      '  }',
      '  id="msg"',
      '/>',
    ].join('\n');

    const out = sortAllAttributes(src, attrOpts);
    const outLines = out.split('\n');
    const textIdx = outLines.findIndex((l) => l.trim().startsWith('text={'));
    expect(textIdx).toBeGreaterThanOrEqual(0);
    expect(outLines[textIdx + 1]).toContain('isError');
    expect(outLines[textIdx + 2]).toContain('? "Something went wrong"');
    expect(outLines[textIdx + 3]).toContain(': "All good"');
    expect(outLines[textIdx + 4].trim()).toBe('}');
    expect(out).toContain('id="msg"');
  });
});

describe('multi-line CROSS-CUTTING edge cases', () => {
  it('blank-line groups work around multi-line object values', () => {
    const src = [
      'const state = {',
      '  isOpen: false,',
      '  id: "s1",',
      '',
      '  items: [',
      '    "a",',
      '    "b",',
      '  ],',
      '  count: 0,',
      '};',
    ].join('\n');

    const out = sortObjectProperties(src, objOpts);
    const outLines = out.split('\n');
    const blankIdx = outLines.findIndex(
      (l, i) => l.trim() === '' && i > 0 && i < outLines.length - 1
    );
    expect(blankIdx).toBeGreaterThan(0);

    const firstGroup = outLines.slice(1, blankIdx).join('\n');
    const secondGroup = outLines.slice(blankIdx + 1, outLines.length - 1).join('\n');

    expect(firstGroup).toContain('isOpen: false,');
    expect(firstGroup).toContain('id: "s1",');
    expect(secondGroup).toContain('items: [');
    expect(secondGroup).toContain('    "a",');
    expect(secondGroup).toContain('    "b",');
    expect(secondGroup).toContain('  ],');
    expect(secondGroup).toContain('count: 0,');
  });

  it('preserves exact whitespace/indentation inside multi-line values', () => {
    const src = [
      'const x = {',
      '  areas: `',
      '      header',
      '      main',
      '  `,',
      '  id: 1,',
      '};',
    ].join('\n');

    const out = sortObjectProperties(src, objOpts);
    expect(out).toContain('      header');
    expect(out).toContain('      main');
  });

  it('multi-line value containing nested function calls', () => {
    const src = [
      'const x = {',
      '  result: compose(',
      '    filter((n) => n > 0),',
      '    map((n) => n * 2),',
      '  )(input),',
      '  id: 1,',
      '};',
    ].join('\n');

    const out = sortObjectProperties(src, objOpts);
    expectContiguousBlock(out, [
      'result: compose(',
      'filter((n) => n > 0),',
      'map((n) => n * 2),',
      ')(input),',
    ]);
    expect(out).toContain('id: 1,');
  });

  it('enum with multi-line assignment expression values', () => {
    const src = [
      'enum Codes {',
      '  OK = "ok",',
      '  ERR =',
      '    "some very long error code that spans",',
      '  PENDING = "pending",',
      '}',
    ].join('\n');

    const out = sortTypeProperties(src, typeOpts);
    expectContiguousBlock(out, ['ERR =', '"some very long error code that spans",']);
    expect(out).toContain('OK = "ok",');
    expect(out).toContain('PENDING = "pending",');
  });

  it('CSS rule with multiple multi-line values mixed with single-line', () => {
    const src = [
      '.panel {',
      '  box-shadow:',
      '    0 1px 2px rgba(0, 0, 0, 0.1),',
      '    0 4px 8px rgba(0, 0, 0, 0.2);',
      '  color: #111;',
      '  grid-template-areas:',
      '    "a b"',
      '    "c d";',
      '  padding: 8px;',
      '}',
    ].join('\n');

    const out = sortCssProperties(src, cssOpts);

    expectContiguousBlock(out, [
      'box-shadow:',
      '0 1px 2px rgba(0, 0, 0, 0.1),',
      '0 4px 8px rgba(0, 0, 0, 0.2);',
    ]);
    expectContiguousBlock(out, ['grid-template-areas:', '"a b"', '"c d";']);

    expect(out).toContain('color: #111;');
    expect(out).toContain('padding: 8px;');
  });
});

describe('multi-line IMPORTS', () => {
  it('multi-line named imports are consolidated and sorted', () => {
    const src = [
      'import {',
      '  useEffect,',
      '  useMemo,',
      '  useState,',
      '  useCallback,',
      "} from 'react';",
      'import {',
      '  z,',
      "} from 'zod';",
    ].join('\n');

    const out = sortImports(src, importOpts);

    expect(out).toContain('useEffect');
    expect(out).toContain('useMemo');
    expect(out).toContain('useState');
    expect(out).toContain('useCallback');
    expect(out).toContain('z');
    expect(out).toContain("from 'react'");
    expect(out).toContain("from 'zod'");
  });

  it('mixed default + multi-line named import preserved', () => {
    const src = [
      'import React, {',
      '  useEffect,',
      '  useState,',
      "} from 'react';",
      "import axios from 'axios';",
    ].join('\n');

    const out = sortImports(src, importOpts);

    expect(out).toContain('React');
    expect(out).toContain('useEffect');
    expect(out).toContain('useState');
    expect(out).toContain("from 'react'");
    expect(out).toContain("import axios from 'axios';");
  });
});
