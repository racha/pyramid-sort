import { describe, it, expect } from 'vitest';
import {
  resolveAutoDirection,
  sortBlockChildren,
  sortLinesWithGrouping,
} from '../src/core/groupSort';

describe('sortLinesWithGrouping', () => {
  it('sorts flat when groupByEmptyRows is false', () => {
    const lines = ['ccc', 'a', 'bb', ''];
    const out = sortLinesWithGrouping(lines, 'ascending', false);
    expect(out.map((l) => l.trim().length)).toEqual([0, 1, 2, 3]);
  });

  it('sorts within groups when groupByEmptyRows is true', () => {
    const lines = ['ccc', 'a', '', 'bb', 'd'];
    const out = sortLinesWithGrouping(lines, 'ascending', true);
    expect(out).toEqual(['a', 'ccc', '', 'd', 'bb']);
  });

  it('preserves blank runs between groups', () => {
    const lines = ['bbb', 'a', '', '', 'yy', 'x'];
    const out = sortLinesWithGrouping(lines, 'ascending', true);
    expect(out).toEqual(['a', 'bbb', '', '', 'x', 'yy']);
  });
});

describe('resolveAutoDirection', () => {
  it('uses ascending when opener is shorter than median body', () => {
    expect(
      resolveAutoDirection('<X', [
        '  veryLongPropertyNameHere: true,',
        '  anotherLongOne: false,',
      ])
    ).toBe('ascending');
  });

  it('uses descending when opener is long vs body', () => {
    expect(
      resolveAutoDirection('export interface Request<T> {', [
        '  error: Error | null;',
        '  loading: boolean;',
      ])
    ).toBe('descending');
  });
});

describe('sortBlockChildren', () => {
  it('keeps multi-line nested objects as one unit', () => {
    const lines = [
      '  z: 1,',
      '  a: {',
      '    nested: true,',
      '  },',
      '  m: 2,',
    ];
    const out = sortBlockChildren(lines, 'ascending', true);
    expect(out.join('\n')).toContain('a: {\n    nested:');
  });
});
