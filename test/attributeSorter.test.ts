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
const skipSpreadGroups: AttributeSorterOptions = {
  direction: 'ascending',
  groupByEmptyRows: true,
  skipGroupsWithSpread: true,
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

  it('preserves nested JSX inside a multi-line attribute', () => {
    const source = [
      '<ConfirmDialog',
      '  description={',
      '    <span>',
      '      <span className="font-semibold">{name}</span> will be deleted permanently. It won&apos;t be available to use for',
      '      future cases.',
      '    </span>',
      '  }',
      '  title="Delete"',
      '  onConfirm={handleDelete}',
      '/>',
    ].join('\n');

    expect(sortAllAttributes(source, ascending)).toBe([
      '<ConfirmDialog',
      '  title="Delete"',
      '  onConfirm={handleDelete}',
      '  description={',
      '    <span>',
      '      <span className="font-semibold">{name}</span> will be deleted permanently. It won&apos;t be available to use for',
      '      future cases.',
      '    </span>',
      '  }',
      '/>',
    ].join('\n'));
  });

  it('leaves mixed inline and multi-line attributes unchanged', () => {
    const source = [
      '<Button className="ml-auto w-45 pl-2" leftIcon={<Plus className="size-4" />} onClick={() => {',
      '  // replace so back button skips this and goes straight to the table',
      "  setSearchParams({ mode: 'new' }, { replace: true });",
      '}}>',
      '  New task',
      '</Button>',
    ].join('\n');

    expect(sortAllAttributes(source, ascending)).toBe(source);
  });

  it('skips an inline callback opener without hiding later sortable tags', () => {
    const source = [
      '<DropdownSelect type="single" value={status} onValueChange={(val) => {',
      '  if (updating || !val) return;',
      '  onValueChange(val as CaseTaskStatus);',
      '}}>',
      '</DropdownSelect>',
      '<Input',
      '  placeholder="Search tasks"',
      '  id="search"',
      '/>',
    ].join('\n');

    expect(sortAllAttributes(source, ascending)).toBe([
      '<DropdownSelect type="single" value={status} onValueChange={(val) => {',
      '  if (updating || !val) return;',
      '  onValueChange(val as CaseTaskStatus);',
      '}}>',
      '</DropdownSelect>',
      '<Input',
      '  id="search"',
      '  placeholder="Search tasks"',
      '/>',
    ].join('\n'));
  });

  it.each([
    ['comparison operator', ['  const shouldRun = count > limit;', '  run();']],
    ['nested arrow', ['  const runLater = () => run();', '  runLater();']],
    ['returned JSX', ['  return <span>value</span>;']],
  ])('fails closed for inline callbacks containing a %s', (_name, body) => {
    const unsafeBlock = [
      '<Button className="wide" onClick={() => {',
      ...body,
      '}}>',
      '  Save',
      '  <TrailingChild />',
      '</Button>',
    ];
    const source = [
      '<Before',
      '  placeholder="Before value"',
      '  id="before"',
      '/>',
      ...unsafeBlock,
      '<After',
      '  placeholder="After value"',
      '  id="after"',
      '/>',
    ].join('\n');
    const expected = [
      '<Before',
      '  id="before"',
      '  placeholder="Before value"',
      '/>',
      ...unsafeBlock,
      '<After',
      '  id="after"',
      '  placeholder="After value"',
      '/>',
    ].join('\n');

    const result = sortAllAttributes(source, ascending);
    expect(result).toBe(expected);
    expect(sortAllAttributes(result, ascending)).toBe(result);
  });

  it('fails closed when nested JSX starts on an inline attribute opener', () => {
    const unsafeBlock = [
      '<Button leftIcon={<Plus',
      '  className="size-4"',
      '  stroke={2}',
      '/>} disabled',
      '  id="button"',
      '/>',
    ];
    const source = [
      ...unsafeBlock,
      '<Input',
      '  placeholder="Search tasks"',
      '  id="search"',
      '/>',
    ].join('\n');
    const expected = [
      ...unsafeBlock,
      '<Input',
      '  id="search"',
      '  placeholder="Search tasks"',
      '/>',
    ].join('\n');

    const result = sortAllAttributes(source, ascending);
    expect(result).toBe(expected);
    expect(sortAllAttributes(result, ascending)).toBe(result);
  });

  it('fails closed for an unsafe nested opener inside a valid attribute', () => {
    const source = [
      '<Modal',
      '  content={',
      '    <Panel title="A" onClick={() => {',
      '      return count > limit;',
      '    }} />',
      '  }',
      '  open',
      '/>',
    ].join('\n');
    const expected = [
      '<Modal',
      '  open',
      '  content={',
      '    <Panel title="A" onClick={() => {',
      '      return count > limit;',
      '    }} />',
      '  }',
      '/>',
    ].join('\n');

    const result = sortAllAttributes(source, ascending);
    expect(result).toBe(expected);
    expect(sortAllAttributes(result, ascending)).toBe(result);
  });

  it('preserves trailing children after nested self-closing JSX', () => {
    const source = [
      '<Wrapper',
      '  icon={',
      '    <Icon',
      '      className="very-long-icon-class"',
      '      id="icon"',
      '    />{" "}<strong>tail</strong>',
      '  }',
      '  title="x"',
      '  onClose={close}',
      '/>',
    ].join('\n');
    const expected = [
      '<Wrapper',
      '  title="x"',
      '  onClose={close}',
      '  icon={',
      '    <Icon',
      '      id="icon"',
      '      className="very-long-icon-class"',
      '    />{" "}<strong>tail</strong>',
      '  }',
      '/>',
    ].join('\n');

    const result = sortAllAttributes(source, ascending);
    expect(result).toBe(expected);
    expect(sortAllAttributes(result, ascending)).toBe(result);
  });

  it.each([
    '<Button className="wide" disabled',
    '<Button {...props} disabled',
  ])('fails closed for multiple attributes sharing the opener: %s', (opener) => {
    const unsafeBlock = [
      opener,
      '  id="button"',
      '  type="button"',
      '>',
      '  Save',
      '</Button>',
    ];
    const source = [
      ...unsafeBlock,
      '<Input',
      '  placeholder="Search tasks"',
      '  id="search"',
      '/>',
    ].join('\n');
    const expected = [
      ...unsafeBlock,
      '<Input',
      '  id="search"',
      '  placeholder="Search tasks"',
      '/>',
    ].join('\n');

    const result = sortAllAttributes(source, ascending);
    expect(result).toBe(expected);
    expect(sortAllAttributes(result, ascending)).toBe(result);
  });

  it('still supports one complete attribute on the opener', () => {
    const source = [
      '<Button onClick={() => save()}',
      '  className="wide"',
      '  id="button"',
      '>',
      '  Save',
      '</Button>',
    ].join('\n');

    expect(sortAllAttributes(source, ascending)).toBe([
      '<Button',
      '  id="button"',
      '  className="wide"',
      '  onClick={() => save()}',
      '>',
      '  Save',
      '</Button>',
    ].join('\n'));
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

  it('keeps spread attributes in place and sorts only on each side', () => {
    const source = [
      '<Button',
      '  veryLongBefore="value"',
      '  id="x"',
      '  {...props}',
      '  onClick={handleClick}',
      '  className="primary"',
      '/>',
    ].join('\n');

    expect(sortAllAttributes(source, ascending)).toBe([
      '<Button',
      '  id="x"',
      '  veryLongBefore="value"',
      '  {...props}',
      '  className="primary"',
      '  onClick={handleClick}',
      '/>',
    ].join('\n'));
  });

  it('keeps multiple spread boundaries intact', () => {
    const source = [
      '<Component',
      '  longerBefore="value"',
      '  id="x"',
      '  {...defaults}',
      '  longerMiddle="value"',
      '  key="x"',
      '  {...overrides}',
      '  longestAfter="value"',
      '  ref={ref}',
      '/>',
    ].join('\n');

    expect(sortAllAttributes(source, ascending)).toBe([
      '<Component',
      '  id="x"',
      '  longerBefore="value"',
      '  {...defaults}',
      '  key="x"',
      '  longerMiddle="value"',
      '  {...overrides}',
      '  ref={ref}',
      '  longestAfter="value"',
      '/>',
    ].join('\n'));
  });

  it('can skip only attribute groups that contain a spread', () => {
    const source = [
      '<Button',
      '  onClick={handleClick}',
      '  {...props}',
      '  id="x"',
      '',
      '  className="primary"',
      '  type="button"',
      '/>',
    ].join('\n');

    expect(sortAllAttributes(source, skipSpreadGroups)).toBe([
      '<Button',
      '  onClick={handleClick}',
      '  {...props}',
      '  id="x"',
      '',
      '  type="button"',
      '  className="primary"',
      '/>',
    ].join('\n'));
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
