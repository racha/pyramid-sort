import { describe, it, expect } from 'vitest';
import { sortTypeProperties } from '../src/core/typeSorter';
import { TypeSorterOptions } from '../src/core/types';

const opts: TypeSorterOptions = {
  direction: 'ascending',
  groupByEmptyRows: true,
};

describe('sortTypeProperties', () => {
  it('sorts interface members by length with groups', () => {
    const src = [
      'interface P {',
      '  longNameHere: boolean;',
      '  a: boolean;',
      '',
      '  secondGroup: string;',
      '  z: number;',
      '}',
    ].join('\n');
    const out = sortTypeProperties(src, opts);
    expect(out).toContain('  a: boolean;');
    expect(out).toContain('  longNameHere: boolean;');
    expect(out).toContain('  z: number;');
    expect(out).toContain('  secondGroup: string;');
  });

  it('sorts type alias block', () => {
    const src = [
      'type Stats = {',
      '  complexityOk: boolean;',
      '  hasLower: boolean;',
      '};',
    ].join('\n');
    const out = sortTypeProperties(src, opts);
    expect(out.indexOf('hasLower')).toBeLessThan(out.indexOf('complexityOk'));
  });

  it('auto direction sorts descending when the declaration line is long vs members', () => {
    const src = [
      'export interface Request<T> {',
      '  a: A;',
      '  bb: BB;',
      '}',
    ].join('\n');
    const autoOut = sortTypeProperties(src, { ...opts, direction: 'auto' });
    const ascOut = sortTypeProperties(src, { ...opts, direction: 'ascending' });
    expect(autoOut).not.toBe(ascOut);
    expect(autoOut.indexOf('bb:')).toBeLessThan(autoOut.indexOf('a:'));
  });
});
