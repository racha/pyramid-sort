import { describe, it, expect } from 'vitest';
import { sortCssProperties } from '../src/core/cssSorter';
import { CssSorterOptions } from '../src/core/types';

const opts: CssSorterOptions = {
  direction: 'ascending',
  groupByEmptyRows: true,
};

describe('sortCssProperties', () => {
  it('sorts declarations inside a rule', () => {
    const src = [
      '.card {',
      '  background-color: #fff;',
      '  padding: 8px;',
      '}',
    ].join('\n');
    const out = sortCssProperties(src, opts);
    expect(out.indexOf('padding')).toBeLessThan(out.indexOf('background-color'));
  });

  it('auto direction differs from ascending when the selector line is long vs declarations', () => {
    const src = [
      '.very-long-selector-name-here {',
      '  a: 1;',
      '  bb: 2;',
      '}',
    ].join('\n');
    const autoOut = sortCssProperties(src, { ...opts, direction: 'auto' });
    const ascOut = sortCssProperties(src, { ...opts, direction: 'ascending' });
    expect(autoOut).not.toBe(ascOut);
    expect(autoOut.indexOf('bb:')).toBeLessThan(autoOut.indexOf('a:'));
  });
});
