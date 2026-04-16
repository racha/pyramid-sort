import { describe, it, expect } from 'vitest';
import { isLocalImport } from '../src/core/aliasDetector';

describe('isLocalImport', () => {
  const patterns = ['@/', '~/'];

  it('classifies relative imports as local', () => {
    expect(isLocalImport('./foo', patterns)).toBe(true);
    expect(isLocalImport('../bar', patterns)).toBe(true);
    expect(isLocalImport('./components/Button', patterns)).toBe(true);
  });

  it('classifies alias imports as local', () => {
    expect(isLocalImport('@/utils/helper', patterns)).toBe(true);
    expect(isLocalImport('~/lib/auth', patterns)).toBe(true);
  });

  it('classifies bare specifiers as external', () => {
    expect(isLocalImport('react', patterns)).toBe(false);
    expect(isLocalImport('lodash', patterns)).toBe(false);
    expect(isLocalImport('zod', patterns)).toBe(false);
  });

  it('classifies scoped npm packages as external', () => {
    expect(isLocalImport('@tanstack/react-query', patterns)).toBe(false);
    expect(isLocalImport('@hookform/resolvers/zod', patterns)).toBe(false);
    expect(isLocalImport('@types/node', patterns)).toBe(false);
  });

  it('distinguishes @/ alias from @scope/ package', () => {
    expect(isLocalImport('@/components/Button', patterns)).toBe(true);
    expect(isLocalImport('@radix-ui/react-dialog', patterns)).toBe(false);
  });
});
