import { describe, it, expect } from 'vitest';
import { sortCssProperties } from '../src/core/cssSorter';
import { sortImports } from '../src/core/importSorter';
import { sortObjectProperties } from '../src/core/objectSorter';
import { sortTypeProperties } from '../src/core/typeSorter';
import { sortAllAttributes } from '../src/core/attributeSorter';
import {
  CssSorterOptions,
  ImportSorterOptions,
  ObjectSorterOptions,
  TypeSorterOptions,
  AttributeSorterOptions,
} from '../src/core/types';

/**
 * Integration-style tests covering tricky, real-world code. These go beyond the
 * focused unit tests and exercise combinations of features: nested blocks, mixed
 * specifiers, side-effect imports, multi-line imports with type imports, JSX with
 * spread/event handlers, union/intersection types, nested media queries, arrays
 * of objects, etc.
 *
 * The assertions are intentionally structural (relative order, preserved tokens,
 * no data loss) rather than exact string matches — that way they survive small
 * formatting tweaks but catch real regressions.
 */

const importDefaults: ImportSorterOptions = {
  direction: 'ascending',
  consolidateMultilineImports: true,
  maxLineWidth: 80,
  localAliasPatterns: ['@/', '~/'],
  groupByEmptyRows: true,
  groupExternalLocal: true,
};

const objectDefaults: ObjectSorterOptions = {
  direction: 'ascending',
  groupByEmptyRows: true,
  sortNestedObjects: true,
};

const typeDefaults: TypeSorterOptions = {
  direction: 'ascending',
  groupByEmptyRows: true,
};

const cssDefaults: CssSorterOptions = {
  direction: 'ascending',
  groupByEmptyRows: true,
};

const attrDefaults: AttributeSorterOptions = {
  direction: 'ascending',
  groupByEmptyRows: true,
};

function lineIndexOf(haystack: string, needle: string): number {
  return haystack.split('\n').findIndex((l) => l.includes(needle));
}

describe('complex imports', () => {
  it('handles a realistic file with side-effects, types, default, named, namespace, multi-line, and mixed aliases', () => {
    const src = [
      "import './polyfills';",
      "import 'dotenv/config';",
      "import * as path from 'node:path';",
      "import React, { useState, useMemo, useEffect, useCallback } from 'react';",
      "import type { FC, ReactNode, PropsWithChildren } from 'react';",
      "import { z } from 'zod';",
      'import {',
      '  QueryClient,',
      '  QueryClientProvider,',
      '  useMutation,',
      '  useQuery,',
      "} from '@tanstack/react-query';",
      "import type { AxiosResponse } from 'axios';",
      "import axios from 'axios';",
      "import { Button } from '@/components/ui/button';",
      "import { Dialog } from '@/components/ui/dialog';",
      "import type { User } from '@/types/user';",
      "import { api } from '~/lib/api';",
      "import { useStore } from '../hooks/useStore';",
      "import { formatDate } from './utils';",
    ].join('\n');

    const out = sortImports(src, importDefaults);
    const lines = out.split('\n');

    const blankIdx = lines.findIndex((l) => l.trim() === '');
    expect(blankIdx).toBeGreaterThan(0);
    const externals = lines.slice(0, blankIdx);
    const locals = lines.slice(blankIdx + 1);

    for (const ext of ['dotenv/config', 'node:path', 'react', 'zod', '@tanstack/react-query', 'axios']) {
      expect(externals.some((l) => l.includes(ext))).toBe(true);
    }

    for (const loc of [
      './polyfills',
      '@/components/ui/button',
      '@/components/ui/dialog',
      '@/types/user',
      '~/lib/api',
      '../hooks/useStore',
      './utils',
    ]) {
      expect(locals.some((l) => l.includes(loc))).toBe(true);
    }

    const extLens = externals.map((l) => l.length);
    for (let i = 1; i < extLens.length; i++) {
      expect(extLens[i]).toBeGreaterThanOrEqual(extLens[i - 1]);
    }
    const locLens = locals.map((l) => l.length);
    for (let i = 1; i < locLens.length; i++) {
      expect(locLens[i]).toBeGreaterThanOrEqual(locLens[i - 1]);
    }

    for (const line of out.split('\n')) {
      expect(line.length).toBeLessThanOrEqual(90);
    }

    const tanstack = out.split('\n').filter((l) => l.includes("from '@tanstack/react-query'"));
    expect(tanstack.length).toBeGreaterThanOrEqual(1);
    const tanstackTokens = tanstack.join(' ');
    for (const sym of ['QueryClient', 'QueryClientProvider', 'useMutation', 'useQuery']) {
      expect(tanstackTokens).toContain(sym);
    }
  });

  it('preserves "use client" directive and comments above imports', () => {
    const src = [
      "'use client';",
      '',
      '// app router page',
      "import { cookies } from 'next/headers';",
      "import { redirect } from 'next/navigation';",
      "import { z } from 'zod';",
      '',
      'export default function Page() {}',
    ].join('\n');

    const out = sortImports(src, importDefaults);
    expect(out.split('\n')[0]).toBe("'use client';");
    expect(out).toContain('// app router page');
    expect(out).toContain('export default function Page() {}');
  });

  it('does not misclassify @-prefixed npm packages as local', () => {
    const src = [
      "import { Prisma } from '@prisma/client';",
      "import { useQuery } from '@tanstack/react-query';",
      "import { zodResolver } from '@hookform/resolvers/zod';",
      "import { db } from '@/db';",
    ].join('\n');

    const out = sortImports(src, importDefaults);
    const lines = out.split('\n');
    const blankIdx = lines.findIndex((l) => l.trim() === '');
    const externals = lines.slice(0, blankIdx);
    const locals = lines.slice(blankIdx + 1);

    expect(externals.some((l) => l.includes('@prisma/client'))).toBe(true);
    expect(externals.some((l) => l.includes('@tanstack/react-query'))).toBe(true);
    expect(externals.some((l) => l.includes('@hookform/resolvers/zod'))).toBe(true);
    expect(locals.some((l) => l.includes('@/db'))).toBe(true);
  });

  it('treats a user-defined @prisma alias as local when configured', () => {
    const src = [
      "import { PrismaClient } from '@prisma/client';",
      "import { db } from '@/db';",
    ].join('\n');

    const out = sortImports(src, {
      ...importDefaults,
      localAliasPatterns: ['@/', '~/', '@prisma/'],
    });
    const lines = out.split('\n');
    const allInOneBlock = !lines.some((l) => l.trim() === '');
    expect(allInOneBlock).toBe(true);
    expect(lines.some((l) => l.includes('@prisma/client'))).toBe(true);
    expect(lines.some((l) => l.includes('@/db'))).toBe(true);
  });

  it('does not consume non-import code that looks like a continuation', () => {
    const src = [
      "import { useState } from 'react';",
      '',
      'const config = {',
      '  enabled: true,',
      '};',
      '',
      'export default config;',
    ].join('\n');

    const out = sortImports(src, importDefaults);
    expect(out).toContain('const config = {');
    expect(out).toContain('  enabled: true,');
    expect(out).toContain('};');
    expect(out).toContain('export default config;');
  });

  it('sorts without external/local grouping when groupExternalLocal is false', () => {
    const src = [
      "import { useQuery } from '@tanstack/react-query';",
      "import { db } from '@/db';",
      "import { z } from 'zod';",
      "import { utils } from './utils';",
    ].join('\n');

    const out = sortImports(src, { ...importDefaults, groupExternalLocal: false });
    const lines = out.split('\n').filter((l) => l.trim().length > 0);
    expect(lines.length).toBe(4);
    expect(out).not.toContain('\n\n');

    const lengths = lines.map((l) => l.trim().length);
    for (let i = 1; i < lengths.length; i++) {
      expect(lengths[i]).toBeGreaterThanOrEqual(lengths[i - 1]);
    }
  });
});

describe('complex objects', () => {
  it('recursively sorts a deeply nested config object', () => {
    const src = [
      'const config = {',
      '  version: 1,',
      '  name: "app",',
      '  database: {',
      '    host: "localhost",',
      '    port: 5432,',
      '    pool: {',
      '      idle: 10000,',
      '      max: 20,',
      '      min: 2,',
      '    },',
      '  },',
      '  cache: {',
      '    ttl: 60,',
      '    provider: "redis",',
      '  },',
      '};',
    ].join('\n');

    const out = sortObjectProperties(src, objectDefaults);

    expect(lineIndexOf(out, 'version: 1')).toBeLessThan(lineIndexOf(out, 'name: "app"'));
    expect(lineIndexOf(out, 'idle: 10000,')).toBeGreaterThan(lineIndexOf(out, 'max: 20,'));
    expect(lineIndexOf(out, 'min: 2,')).toBeLessThan(lineIndexOf(out, 'max: 20,'));
    expect(lineIndexOf(out, 'ttl: 60,')).toBeLessThan(lineIndexOf(out, 'provider: "redis"'));

    for (const token of ['version', 'name', 'database', 'host', 'port', 'pool', 'idle', 'max', 'min', 'cache', 'ttl', 'provider']) {
      expect(out).toContain(token);
    }
  });

  it('preserves arrays of objects while sorting scalar keys', () => {
    const src = [
      'const routes = {',
      '  prefix: "/api",',
      '  version: "v1",',
      '  handlers: [',
      '    { path: "/users", method: "GET" },',
      '    { path: "/posts", method: "POST" },',
      '  ],',
      '};',
    ].join('\n');

    const out = sortObjectProperties(src, objectDefaults);
    expect(out).toContain('{ path: "/users", method: "GET" }');
    expect(out).toContain('{ path: "/posts", method: "POST" }');

    for (const token of ['prefix:', 'version:', 'handlers:']) {
      expect(lineIndexOf(out, token)).toBeGreaterThanOrEqual(0);
    }
    expect(lineIndexOf(out, 'version:')).toBeLessThan(lineIndexOf(out, 'prefix:'));
  });

  it('leaves objects with spread operators intact (no key reordering across spreads)', () => {
    const src = [
      'const merged = {',
      '  ...base,',
      '  name: "override",',
      '  id: 1,',
      '};',
    ].join('\n');

    const out = sortObjectProperties(src, objectDefaults);
    expect(out).toContain('...base,');
    expect(out).toContain('name: "override"');
    expect(out).toContain('id: 1,');
  });

  it('sorts within groups separated by blank lines', () => {
    const src = [
      'const state = {',
      '  isLoadingData: false,',
      '  isOpen: true,',
      '',
      '  firstName: "",',
      '  email: "",',
      '};',
    ].join('\n');

    const out = sortObjectProperties(src, objectDefaults);
    const lines = out.split('\n');
    const firstGroup = lines.slice(0, lines.indexOf('')).filter((l) => l.includes(':'));
    expect(firstGroup.length).toBeGreaterThan(0);

    expect(lineIndexOf(out, 'isOpen: true,')).toBeLessThan(lineIndexOf(out, 'isLoadingData: false,'));
    expect(lineIndexOf(out, 'email: "",')).toBeLessThan(lineIndexOf(out, 'firstName: "",'));
  });

  it('sorts object properties whose values are arrow functions without scrambling bodies', () => {
    const src = [
      'const handlers = {',
      '  onSubmit: (data) => processData(data),',
      '  onClick: () => log("click"),',
      '  onChange: (e) => setValue(e.target.value),',
      '};',
    ].join('\n');

    const out = sortObjectProperties(src, objectDefaults);

    expect(out).toContain('onSubmit: (data) => processData(data),');
    expect(out).toContain('onClick: () => log("click"),');
    expect(out).toContain('onChange: (e) => setValue(e.target.value),');

    expect(lineIndexOf(out, 'onClick:')).toBeLessThan(lineIndexOf(out, 'onSubmit:'));
    expect(lineIndexOf(out, 'onSubmit:')).toBeLessThan(lineIndexOf(out, 'onChange:'));
  });
});

describe('complex types', () => {
  it('sorts a large interface with nested inline object types', () => {
    const src = [
      'interface Settings {',
      '  autoSaveIntervalMs: number;',
      '  theme: "light" | "dark";',
      '  id: string;',
      '  profile: {',
      '    displayName: string;',
      '    bio: string;',
      '    age: number;',
      '  };',
      '}',
    ].join('\n');

    const out = sortTypeProperties(src, typeDefaults);

    expect(lineIndexOf(out, 'id: string;')).toBeLessThan(lineIndexOf(out, 'theme:'));
    expect(lineIndexOf(out, 'theme:')).toBeLessThan(lineIndexOf(out, 'autoSaveIntervalMs:'));

    for (const token of ['profile:', 'displayName: string;', 'bio: string;', 'age: number;']) {
      expect(out).toContain(token);
    }
  });

  it('handles union and intersection types without breaking generics', () => {
    const src = [
      'type Handler<T> = {',
      '  onSuccess: (value: T) => void;',
      '  onError: (err: Error) => void;',
      '  id: string;',
      '};',
    ].join('\n');

    const out = sortTypeProperties(src, typeDefaults);
    expect(out).toContain('(value: T) => void');
    expect(out).toContain('(err: Error) => void');
    expect(lineIndexOf(out, 'id: string;')).toBeLessThan(lineIndexOf(out, 'onError:'));
  });

  it('sorts enums by line length while preserving values', () => {
    const src = [
      'enum Status {',
      '  NotFound = "not_found",',
      '  Ok = "ok",',
      '  InternalServerError = "internal_server_error",',
      '}',
    ].join('\n');

    const out = sortTypeProperties(src, typeDefaults);
    expect(out).toContain('Ok = "ok",');
    expect(out).toContain('NotFound = "not_found",');
    expect(out).toContain('InternalServerError = "internal_server_error",');
    expect(lineIndexOf(out, 'Ok =')).toBeLessThan(lineIndexOf(out, 'NotFound ='));
    expect(lineIndexOf(out, 'NotFound =')).toBeLessThan(lineIndexOf(out, 'InternalServerError ='));
  });

  it('respects blank-line groups inside interfaces', () => {
    const src = [
      'interface User {',
      '  id: string;',
      '  username: string;',
      '',
      '  deletedAtTimestamp: Date;',
      '  createdAt: Date;',
      '}',
    ].join('\n');

    const out = sortTypeProperties(src, typeDefaults);
    expect(lineIndexOf(out, 'id: string;')).toBeLessThan(lineIndexOf(out, 'username: string;'));
    expect(lineIndexOf(out, 'createdAt: Date;')).toBeLessThan(lineIndexOf(out, 'deletedAtTimestamp: Date;'));
    expect(lineIndexOf(out, 'username: string;')).toBeLessThan(lineIndexOf(out, 'createdAt: Date;'));
  });
});

describe('complex CSS / SCSS', () => {
  it('sorts declarations in a rule with nested pseudo-classes and media queries', () => {
    const src = [
      '.card {',
      '  background-color: #fff;',
      '  color: #111;',
      '  padding: 16px;',
      '',
      '  &:hover {',
      '    border-color: red;',
      '    color: #000;',
      '  }',
      '',
      '  @media (min-width: 768px) {',
      '    padding-inline: 32px;',
      '    padding: 24px;',
      '  }',
      '}',
    ].join('\n');

    const out = sortCssProperties(src, cssDefaults);

    expect(lineIndexOf(out, 'color: #111;')).toBeLessThan(lineIndexOf(out, 'padding: 16px;'));
    expect(lineIndexOf(out, 'padding: 16px;')).toBeLessThan(lineIndexOf(out, 'background-color: #fff;'));

    for (const token of ['&:hover {', 'border-color: red;', 'color: #000;', '@media (min-width: 768px) {', 'padding-inline: 32px;', 'padding: 24px;']) {
      expect(out).toContain(token);
    }
  });

  it('preserves @keyframes and stops inside', () => {
    const src = [
      '@keyframes fade {',
      '  from {',
      '    opacity: 0;',
      '    transform: translateY(10px);',
      '  }',
      '  to {',
      '    opacity: 1;',
      '    transform: translateY(0);',
      '  }',
      '}',
    ].join('\n');

    const out = sortCssProperties(src, cssDefaults);
    expect(out).toContain('@keyframes fade {');
    expect(out).toContain('from {');
    expect(out).toContain('to {');
    expect(out).toContain('opacity: 0;');
    expect(out).toContain('opacity: 1;');

    expect(lineIndexOf(out, 'opacity: 0;')).toBeLessThan(lineIndexOf(out, 'transform: translateY(10px);'));
    expect(lineIndexOf(out, 'opacity: 1;')).toBeLessThan(lineIndexOf(out, 'transform: translateY(0);'));
  });

  it('sorts CSS custom properties alongside regular declarations', () => {
    const src = [
      ':root {',
      '  --color-primary-500: #6366f1;',
      '  --radius: 8px;',
      '  --color-text: #111;',
      '  font-size: 16px;',
      '}',
    ].join('\n');

    const out = sortCssProperties(src, cssDefaults);
    const trimmed = out.split('\n').map((l) => l.trim());

    expect(trimmed.some((l) => l === '--radius: 8px;')).toBe(true);
    expect(trimmed.some((l) => l === 'font-size: 16px;')).toBe(true);
    expect(trimmed.some((l) => l === '--color-text: #111;')).toBe(true);
    expect(trimmed.some((l) => l === '--color-primary-500: #6366f1;')).toBe(true);

    expect(lineIndexOf(out, '--radius: 8px;')).toBeLessThan(lineIndexOf(out, '--color-primary-500:'));
  });
});

describe('complex JSX attributes', () => {
  it('sorts a big multi-line JSX element without losing spread / events / expressions', () => {
    const src = [
      '<Input',
      '  {...register("email")}',
      '  type="email"',
      '  placeholder="you@example.com"',
      '  onChange={(e) => setEmail(e.target.value)}',
      '  onBlur={() => trim()}',
      '  disabled={isSubmitting}',
      '  aria-label="Email"',
      '/>',
    ].join('\n');

    const out = sortAllAttributes(src, attrDefaults);

    for (const token of [
      '{...register("email")}',
      'type="email"',
      'placeholder="you@example.com"',
      'onChange={(e) => setEmail(e.target.value)}',
      'onBlur={() => trim()}',
      'disabled={isSubmitting}',
      'aria-label="Email"',
    ]) {
      expect(out).toContain(token);
    }

    const lines = out.split('\n');
    const attrLines = lines.filter((l) => /^\s{2,}\S/.test(l) && !l.trim().startsWith('/>'));
    const lengths = attrLines.map((l) => l.trimEnd().length);
    for (let i = 1; i < lengths.length; i++) {
      expect(lengths[i]).toBeGreaterThanOrEqual(lengths[i - 1]);
    }
  });

  it('handles attributes with nested braces and ternaries in values', () => {
    const src = [
      '<Button',
      '  variant={isPrimary ? "primary" : "secondary"}',
      '  size="lg"',
      '  className={cn("btn", isActive && "btn-active")}',
      '  onClick={handleClick}',
      '/>',
    ].join('\n');

    const out = sortAllAttributes(src, attrDefaults);
    expect(out).toContain('variant={isPrimary ? "primary" : "secondary"}');
    expect(out).toContain('className={cn("btn", isActive && "btn-active")}');
    expect(out).toContain('size="lg"');
    expect(out).toContain('onClick={handleClick}');

    expect(lineIndexOf(out, 'size="lg"')).toBeLessThan(
      lineIndexOf(out, 'className={cn("btn", isActive && "btn-active")}')
    );
  });
});

describe('cross-sorter: imports + types + objects + css in one TSX file', () => {
  it('applies each sorter to a realistic TSX component source without clobbering others', () => {
    const src = [
      "import React, { useState } from 'react';",
      "import { z } from 'zod';",
      "import { Button } from '@/components/ui/button';",
      '',
      'interface Props {',
      '  isDisabled: boolean;',
      '  label: string;',
      '  id: string;',
      '}',
      '',
      'const defaultProps = {',
      '  variant: "primary",',
      '  size: "md",',
      '  id: "",',
      '};',
      '',
      'export function MyComponent(props: Props) {',
      '  const [open, setOpen] = useState(false);',
      '  return <Button>{props.label}</Button>;',
      '}',
    ].join('\n');

    const afterImports = sortImports(src, importDefaults);
    const afterTypes = sortTypeProperties(afterImports, typeDefaults);
    const afterObjects = sortObjectProperties(afterTypes, objectDefaults);

    expect(afterObjects).toContain('interface Props {');
    expect(afterObjects).toContain('const defaultProps = {');
    expect(afterObjects).toContain('export function MyComponent(props: Props) {');
    expect(afterObjects).toContain('return <Button>{props.label}</Button>;');

    expect(lineIndexOf(afterObjects, 'id: string;')).toBeLessThan(lineIndexOf(afterObjects, 'label: string;'));
    expect(lineIndexOf(afterObjects, 'label: string;')).toBeLessThan(lineIndexOf(afterObjects, 'isDisabled: boolean;'));

    expect(lineIndexOf(afterObjects, 'id: ""')).toBeLessThan(lineIndexOf(afterObjects, 'size: "md"'));
    expect(lineIndexOf(afterObjects, 'size: "md"')).toBeLessThan(lineIndexOf(afterObjects, 'variant: "primary"'));

    const importsSlice = afterObjects.split('\n').slice(0, lineIndexOf(afterObjects, 'interface Props {'));
    const externals = importsSlice.slice(0, importsSlice.findIndex((l) => l.trim() === ''));
    expect(externals.some((l) => l.includes('react'))).toBe(true);
    expect(externals.some((l) => l.includes('zod'))).toBe(true);
  });
});
