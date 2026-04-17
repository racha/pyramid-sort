import { describe, it, expect } from 'vitest';
import { sortImports, parseImports, findImportBlockRange } from '../src/core/importSorter';
import { ImportSorterOptions } from '../src/core/types';

const defaults: ImportSorterOptions = {
  direction: 'ascending',
  consolidateMultilineImports: true,
  maxLineWidth: 80,
  localAliasPatterns: ['@/', '~/'],
  groupByEmptyRows: true,
  groupExternalLocal: true,
};

describe('findImportBlockRange', () => {
  it('finds import block at top of file', () => {
    const lines = [
      "import { useState } from 'react';",
      "import { foo } from './foo';",
      '',
      'const x = 1;',
    ];
    expect(findImportBlockRange(lines)).toEqual({ start: 0, end: 1 });
  });

  it('handles "use client" directive before imports', () => {
    const lines = [
      "'use client';",
      '',
      "import { useState } from 'react';",
      "import { foo } from './foo';",
    ];
    expect(findImportBlockRange(lines)).toEqual({ start: 2, end: 3 });
  });

  it('returns null for no imports', () => {
    const lines = ['const x = 1;', 'console.log(x);'];
    expect(findImportBlockRange(lines)).toBeNull();
  });
});

describe('parseImports', () => {
  it('parses single-line named imports', () => {
    const lines = ["import { useState, useEffect } from 'react';"];
    const result = parseImports(lines);
    expect(result).toHaveLength(1);
    expect(result[0].source).toBe('react');
    expect(result[0].namedSpecifiers).toEqual(['useState', 'useEffect']);
    expect(result[0].isTypeImport).toBe(false);
  });

  it('parses default imports', () => {
    const lines = ["import React from 'react';"];
    const result = parseImports(lines);
    expect(result).toHaveLength(1);
    expect(result[0].defaultImport).toBe('React');
    expect(result[0].namedSpecifiers).toEqual([]);
  });

  it('parses mixed default + named imports', () => {
    const lines = ["import React, { useState } from 'react';"];
    const result = parseImports(lines);
    expect(result).toHaveLength(1);
    expect(result[0].defaultImport).toBe('React');
    expect(result[0].namedSpecifiers).toEqual(['useState']);
  });

  it('parses import type', () => {
    const lines = ["import type { FC } from 'react';"];
    const result = parseImports(lines);
    expect(result).toHaveLength(1);
    expect(result[0].isTypeImport).toBe(true);
    expect(result[0].namedSpecifiers).toEqual(['FC']);
  });

  it('parses side-effect imports', () => {
    const lines = ["import './styles.css';"];
    const result = parseImports(lines);
    expect(result).toHaveLength(1);
    expect(result[0].isSideEffect).toBe(true);
    expect(result[0].source).toBe('./styles.css');
  });

  it('parses multi-line imports', () => {
    const lines = [
      'import {',
      '  Action,',
      '  useActionTypes,',
      '  useCustomActions',
      "} from '@/api/action';",
    ];
    const result = parseImports(lines);
    expect(result).toHaveLength(1);
    expect(result[0].source).toBe('@/api/action');
    expect(result[0].namedSpecifiers).toEqual(['Action', 'useActionTypes', 'useCustomActions']);
  });

  it('parses namespace imports', () => {
    const lines = ["import * as path from 'path';"];
    const result = parseImports(lines);
    expect(result).toHaveLength(1);
    expect(result[0].source).toBe('path');
  });
});

describe('sortImports', () => {
  it('sorts imports ascending by line length', () => {
    const source = [
      "import { useNavigate } from 'react-router';",
      "import { toast } from 'react-toastify';",
      "import { useEffect } from 'react';",
    ].join('\n');

    const result = sortImports(source, defaults);
    const lines = result.split('\n');

    expect(lines[0]).toBe("import { useEffect } from 'react';");
    expect(lines[1]).toBe("import { toast } from 'react-toastify';");
    expect(lines[2]).toBe("import { useNavigate } from 'react-router';");
  });

  it('sorts imports descending by line length', () => {
    const source = [
      "import { useEffect } from 'react';",
      "import { useNavigate } from 'react-router';",
      "import { toast } from 'react-toastify';",
    ].join('\n');

    const result = sortImports(source, { ...defaults, direction: 'descending' });
    const lines = result.split('\n');

    expect(lines[0]).toBe("import { useNavigate } from 'react-router';");
    expect(lines[1]).toBe("import { toast } from 'react-toastify';");
    expect(lines[2]).toBe("import { useEffect } from 'react';");
  });

  it('groups external and local imports with blank line separator', () => {
    const source = [
      "import { useState } from 'react';",
      "import { foo } from '@/utils/foo';",
      "import { bar } from './bar';",
      "import { toast } from 'react-toastify';",
    ].join('\n');

    const result = sortImports(source, defaults);
    const lines = result.split('\n');

    expect(lines[0]).toBe("import { useState } from 'react';");
    expect(lines[1]).toBe("import { toast } from 'react-toastify';");
    expect(lines[2]).toBe('');
    expect(lines[3]).toBe("import { bar } from './bar';");
    expect(lines[4]).toBe("import { foo } from '@/utils/foo';");
  });

  it('consolidates multi-line imports into width-fitting lines', () => {
    const source = [
      'import {',
      '  Action,',
      '  useActionTypes,',
      '  useCustomActions',
      "} from '@/api/action';",
    ].join('\n');

    const result = sortImports(source, { ...defaults, maxLineWidth: 80 });
    const lines = result.split('\n').filter((l) => l.trim().length > 0);

    expect(lines.length).toBeGreaterThanOrEqual(1);
    for (const line of lines) {
      expect(line.length).toBeLessThanOrEqual(80);
      expect(line).toContain("from '@/api/action'");
    }
  });

  it('preserves non-import code after imports', () => {
    const source = [
      "import { useState } from 'react';",
      '',
      'const App = () => {};',
      'export default App;',
    ].join('\n');

    const result = sortImports(source, defaults);
    expect(result).toContain('const App = () => {};');
    expect(result).toContain('export default App;');
  });

  it('handles empty file', () => {
    expect(sortImports('', defaults)).toBe('');
  });

  it('handles file with no imports', () => {
    const source = 'const x = 1;\nconsole.log(x);';
    expect(sortImports(source, defaults)).toBe(source);
  });

  it('classifies scoped npm packages as external', () => {
    const source = [
      "import { zodResolver } from '@hookform/resolvers/zod';",
      "import { useForm } from 'react-hook-form';",
      "import { myUtil } from '@/utils/helper';",
    ].join('\n');

    const result = sortImports(source, defaults);
    const lines = result.split('\n');

    const blankIndex = lines.indexOf('');
    expect(blankIndex).toBeGreaterThan(0);

    const externalGroup = lines.slice(0, blankIndex);
    const localGroup = lines.slice(blankIndex + 1);

    expect(externalGroup.some((l) => l.includes('@hookform'))).toBe(true);
    expect(externalGroup.some((l) => l.includes('react-hook-form'))).toBe(true);
    expect(localGroup.some((l) => l.includes('@/utils'))).toBe(true);
  });

  it('splits default + named multi-line import correctly', () => {
    const source = [
      'import React, {',
      '  useState,',
      '  useEffect',
      "} from 'react';",
    ].join('\n');

    const result = sortImports(source, defaults);
    const lines = result.split('\n').filter((l) => l.trim().length > 0);
    expect(lines.some((l) => l.includes('React'))).toBe(true);
  });

  it('groupExternalLocal: false sorts all imports by length in one block', () => {
    const source = [
      "import { db } from '@/db';",
      "import { logger } from '@/services/logger';",
      "import { Prisma } from '@prisma/client';",
      "import { utils } from '@/utils';",
    ].join('\n');

    const result = sortImports(source, { ...defaults, groupExternalLocal: false });
    const lines = result.split('\n');
    const importLines = lines.filter(l => l.trim().startsWith('import'));
    const blanks = lines.filter(l => l.trim() === '');

    expect(importLines.length).toBe(4);
    expect(blanks.length).toBe(0);

    const lengths = importLines.map(l => l.trim().length);
    for (let i = 1; i < lengths.length; i++) {
      expect(lengths[i]).toBeGreaterThanOrEqual(lengths[i - 1]);
    }
  });

  it('does not split single-line imports to fit maxLineWidth — only multi-line imports are consolidated', () => {
    const longSingle =
      "import { alpha, beta, gamma, delta, epsilon, zeta, eta, theta } from 'some-package-name';";
    expect(longSingle.length).toBeGreaterThan(50);
    const source = [longSingle, "import { x } from 'a';"].join('\n');

    const result = sortImports(source, { ...defaults, maxLineWidth: 50 });
    const fromPkg = result
      .split('\n')
      .filter((l) => l.includes("from 'some-package-name'") && l.trim().startsWith('import'));
    expect(fromPkg).toHaveLength(1);
    expect(fromPkg[0]).toBe(longSingle);
  });
});
