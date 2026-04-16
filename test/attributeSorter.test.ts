import { describe, it, expect } from 'vitest';
import { sortAllAttributes, findMultilineTagOpenings } from '../src/core/attributeSorter';
import { AttributeSorterOptions } from '../src/core/types';

const ascending: AttributeSorterOptions = {
  direction: 'ascending',
  groupByEmptyRows: true,
};
const descending: AttributeSorterOptions = {
  direction: 'descending',
  groupByEmptyRows: true,
};

const auto: AttributeSorterOptions = {
  direction: 'auto',
  groupByEmptyRows: true,
};

describe('findMultilineTagOpenings', () => {
  it('detects a multi-line JSX element', () => {
    const lines = [
      '            <input',
      '               ref={ref}',
      '               type="text"',
      '               name="message"',
      '               value={message}',
      '            />',
    ];
    const tags = findMultilineTagOpenings(lines);
    expect(tags).toHaveLength(1);
    expect(tags[0].attributes).toHaveLength(4);
    expect(tags[0].tagOpen).toBe('<input');
    expect(tags[0].tagClose).toBe('/>');
  });

  it('ignores single-line elements', () => {
    const lines = ['<input type="text" name="foo" />'];
    const tags = findMultilineTagOpenings(lines);
    expect(tags).toHaveLength(0);
  });

  it('ignores closing tags', () => {
    const lines = ['</div>'];
    const tags = findMultilineTagOpenings(lines);
    expect(tags).toHaveLength(0);
  });

  it('handles elements with only one attribute (no sort needed)', () => {
    const lines = [
      '<input',
      '  type="text"',
      '/>',
    ];
    const tags = findMultilineTagOpenings(lines);
    expect(tags).toHaveLength(0);
  });
});

describe('sortAllAttributes', () => {
  it('sorts attributes ascending by length', () => {
    const source = [
      '            <input',
      '               value={message}',
      '               ref={ref}',
      '               type="text"',
      '               name="message"',
      '            />',
    ].join('\n');

    const result = sortAllAttributes(source, ascending);
    const lines = result.split('\n');

    const attrLines = lines.filter((l) => l.trim() && !l.trim().startsWith('<') && l.trim() !== '/>');
    const lengths = attrLines.map((l) => l.trim().length);

    for (let i = 1; i < lengths.length; i++) {
      expect(lengths[i]).toBeGreaterThanOrEqual(lengths[i - 1]);
    }
  });

  it('sorts attributes descending by length', () => {
    const source = [
      '<input',
      '  ref={ref}',
      '  type="text"',
      '  name="message"',
      '  value={message}',
      '/>',
    ].join('\n');

    const result = sortAllAttributes(source, descending);
    const lines = result.split('\n');

    const attrLines = lines.filter((l) => l.trim() && !l.trim().startsWith('<') && l.trim() !== '/>');
    const lengths = attrLines.map((l) => l.trim().length);

    for (let i = 1; i < lengths.length; i++) {
      expect(lengths[i]).toBeLessThanOrEqual(lengths[i - 1]);
    }
  });

  it('preserves surrounding code', () => {
    const source = [
      'function App() {',
      '  return (',
      '    <div',
      '      id="app"',
      '      className="container"',
      '    >',
      '      <span>Hello</span>',
      '    </div>',
      '  );',
      '}',
    ].join('\n');

    const result = sortAllAttributes(source, ascending);
    expect(result).toContain('function App()');
    expect(result).toContain('<span>Hello</span>');
  });

  it('handles complex callback attributes', () => {
    const source = [
      '<input',
      '  ref={ref}',
      '  type="text"',
      '  onChange={(e) => onMessageChange(e.target.value)}',
      '/>',
    ].join('\n');

    const result = sortAllAttributes(source, ascending);
    const lines = result.split('\n');
    const attrLines = lines.filter((l) => l.trim() && !l.trim().startsWith('<') && l.trim() !== '/>');

    expect(attrLines[attrLines.length - 1].trim()).toContain('onChange');
  });

  it('handles the full input example from the plan', () => {
    const source = [
      '               <input',
      '                  ref={ref}',
      '                  type="text"',
      '                  name="message"',
      '                  value={message}',
      '                  onKeyDown={handleKeyDown}',
      '                  placeholder="Ask anything..."',
      '                  onChange={(e) => onMessageChange(e.target.value)}',
      '                  className="block w-full grow px-2 text-[15px] text-white/96 outline-none placeholder:text-white/36 placeholder:transition-colors focus:placeholder:text-white/64"',
      '               />',
    ].join('\n');

    const result = sortAllAttributes(source, ascending);
    const lines = result.split('\n');
    const attrLines = lines.filter(
      (l) => l.trim() && !l.trim().startsWith('<') && l.trim() !== '/>'
    );
    const lengths = attrLines.map((l) => l.trim().length);

    for (let i = 1; i < lengths.length; i++) {
      expect(lengths[i]).toBeGreaterThanOrEqual(lengths[i - 1]);
    }
  });

  it('returns source unchanged if no multi-line elements', () => {
    const source = '<div className="foo">Hello</div>';
    expect(sortAllAttributes(source, ascending)).toBe(source);
  });

  it('handles multiple elements in the same source', () => {
    const source = [
      '<div',
      '  id="first"',
      '  className="container"',
      '>',
      '  <input',
      '    value={val}',
      '    type="text"',
      '    placeholder="Enter..."',
      '  />',
      '</div>',
    ].join('\n');

    const result = sortAllAttributes(source, ascending);
    expect(result).toContain('<div');
    expect(result).toContain('<input');
  });

  it('auto direction matches ascending for a short tag opener', () => {
    const source = [
      '            <Button',
      '                     type="button"',
      '                     variant="secondary"',
      "                     text={t('common.back')}",
      '                  />',
    ].join('\n');
    expect(sortAllAttributes(source, auto)).toBe(sortAllAttributes(source, ascending));
  });
});
