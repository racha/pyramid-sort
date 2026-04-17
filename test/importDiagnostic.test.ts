import { describe, it, expect } from 'vitest';
import { checkImports } from '../src/diagnostics';
import { ImportSorterOptions } from '../src/core/types';

/**
 * The import diagnostic must validate the LOGICAL order of imports, not the
 * textual output of re-running the sorter. A file that is already in valid
 * pyramid order must never produce a diagnostic, even if the sorter's output
 * would differ by blank-line normalization or stable-sort tie handling.
 */

const baseOpts: ImportSorterOptions = {
  direction: 'ascending',
  consolidateMultilineImports: true,
  maxLineWidth: 80,
  localAliasPatterns: ['@/', '~/'],
  groupByEmptyRows: true,
  groupExternalLocal: true,
};

describe('import diagnostic — no false positives', () => {
  it('returns null when imports are in valid ascending order with external+local groups', () => {
    const src = [
      "import bodyParser from 'body-parser';",
      "import { InviteStatus } from '@prisma/client';",
      "import { Router, Request, Response } from 'express';",
      "import { Webhook, WebhookRequiredHeaders } from 'svix';",
      "import { OK, BAD_REQUEST, INTERNAL_SERVER_ERROR } from 'http-status';",
      '',
      "import { db } from '@/db';",
      "import { logger } from '@/services/logger';",
      "import { updateClerkExternalId } from './utils';",
      "import { AppType } from '@/middlewares/auth.middleware';",
      "import { createCaseForClient } from '@/services/case.service';",
      "import { CLERK_CLIENT_WEBHOOK_SECRET, CLERK_DASHBOARD_WEBHOOK_SECRET } from '@/env';",
      '',
      'const router = Router();',
      'export default router;',
    ].join('\n');

    expect(checkImports(src, baseOpts)).toBeNull();
  });

  it('returns null when imports are ascending without a blank separator between ext/local', () => {
    const src = [
      "import a from 'a';",
      "import bb from 'bbbb';",
      "import { c } from '@/c';",
      "import { ddddd } from '@/ddddd';",
    ].join('\n');

    expect(checkImports(src, baseOpts)).toBeNull();
  });

  it('returns null for equal-length ties (stable-sort ambiguity is not a violation)', () => {
    const src = [
      "import { a } from 'aa';",
      "import { b } from 'bb';",
      "import { c } from 'cc';",
    ].join('\n');

    expect(checkImports(src, baseOpts)).toBeNull();
  });

  it('returns null when direction is auto and group is descending', () => {
    const src = [
      "import { CLERK_CLIENT_WEBHOOK_SECRET, CLERK_DASHBOARD_WEBHOOK_SECRET } from '@/env';",
      "import { createCaseForClient } from '@/services/case.service';",
      "import { AppType } from '@/middlewares/auth.middleware';",
      "import { db } from '@/db';",
    ].join('\n');

    expect(checkImports(src, { ...baseOpts, direction: 'auto' })).toBeNull();
  });

  it('returns null when direction is auto and group is ascending', () => {
    const src = [
      "import { db } from '@/db';",
      "import { AppType } from '@/middlewares/auth.middleware';",
      "import { createCaseForClient } from '@/services/case.service';",
    ].join('\n');

    expect(checkImports(src, { ...baseOpts, direction: 'auto' })).toBeNull();
  });
});

describe('import diagnostic — real violations with specific messages', () => {
  it('flags an out-of-order pair and names both lines + lengths', () => {
    const src = [
      "import a from 'a';",
      "import loooong from 'looooooooooong';",
      "import bb from 'bb';",
    ].join('\n');

    const finding = checkImports(src, baseOpts);
    expect(finding).not.toBeNull();
    expect(finding!.startLine).toBe(2);
    expect(finding!.message).toMatch(/line 3/i);
    expect(finding!.message).toMatch(/line 2/i);
    expect(finding!.message).toMatch(/ascending/);
    expect(finding!.message).toContain("import bb from 'bb';");
    expect(finding!.message).toContain("import loooong from 'looooooooooong';");
  });

  it('flags external import that appears AFTER a local import', () => {
    const src = [
      "import { db } from '@/db';",
      "import axios from 'axios';",
    ].join('\n');

    const finding = checkImports(src, baseOpts);
    expect(finding).not.toBeNull();
    expect(finding!.startLine).toBe(1);
    expect(finding!.message).toMatch(/external/);
    expect(finding!.message).toMatch(/after local/);
    expect(finding!.message).toContain("import axios from 'axios';");
  });

  it('flags descending violation when direction is descending', () => {
    const src = [
      "import a from 'a';",
      "import looooong from 'loooooooooong';",
    ].join('\n');

    const finding = checkImports(src, { ...baseOpts, direction: 'descending' });
    expect(finding).not.toBeNull();
    expect(finding!.message).toMatch(/descending/);
    expect(finding!.message).toMatch(/longer/);
  });

  it('flags a group that is neither ascending nor descending under auto direction', () => {
    const src = [
      "import aa from 'aa';",
      "import loooooong from 'looooooooooong';",
      "import bbbb from 'bbbb';",
    ].join('\n');

    const finding = checkImports(src, { ...baseOpts, direction: 'auto' });
    expect(finding).not.toBeNull();
    expect(finding!.message).toMatch(/neither ascending nor descending/);
  });

  it('does not flag different directions in different blank-line groups', () => {
    const src = [
      "import a from 'a';",
      "import bbb from 'bbb';",
      "import ccccc from 'ccccc';",
      '',
      "import { longOne } from '@/long-path-one';",
      "import { short } from '@/x';",
    ].join('\n');

    expect(checkImports(src, { ...baseOpts, direction: 'auto' })).toBeNull();
  });

  it('returns null when there are no imports at all', () => {
    const src = 'const x = 1;\nexport default x;\n';
    expect(checkImports(src, baseOpts)).toBeNull();
  });

  it('returns null with fewer than 2 imports (nothing to compare)', () => {
    const src = "import react from 'react';\nconst x = 1;\n";
    expect(checkImports(src, baseOpts)).toBeNull();
  });
});
