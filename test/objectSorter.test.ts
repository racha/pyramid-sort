import { describe, it, expect } from 'vitest';
import { sortObjectProperties } from '../src/core/objectSorter';
import { ObjectSorterOptions } from '../src/core/types';

const opts: ObjectSorterOptions = {
  direction: 'ascending',
  groupByEmptyRows: true,
  sortNestedObjects: false,
};

describe('sortObjectProperties', () => {
  it('sorts const object literal properties', () => {
    const src = [
      'const x = {',
      '  timeout: 5000,',
      '  a: 1,',
      '};',
    ].join('\n');
    const out = sortObjectProperties(src, opts);
    expect(out.indexOf('a: 1')).toBeLessThan(out.indexOf('timeout'));
  });

  it('skips call-argument objects when sortNestedObjects is false', () => {
    const src = ['loginWithRedirect({', '  b: 1,', '  a: 2,', '});'].join('\n');
    expect(sortObjectProperties(src, opts)).toBe(src);
  });

  it('sorts call-argument objects when sortNestedObjects is true', () => {
    const src = ['loginWithRedirect({', '  longKey: 1,', '  a: 2,', '});'].join('\n');
    const out = sortObjectProperties(src, {
      ...opts,
      sortNestedObjects: true,
      direction: 'ascending',
    });
    expect(out.indexOf('a: 2')).toBeLessThan(out.indexOf('longKey'));
  });
});
