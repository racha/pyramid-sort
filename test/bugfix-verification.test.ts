import { describe, expect, test } from 'vitest';
import { sortAllAttributes } from '../src/core/attributeSorter';

describe('attributeSorter bugfix', () => {
  test('should not swallow trailing characters after tag close (ascending)', () => {
    const source = `
    <div className="flex items-center gap-2">
                              <ActionTypeIcon
                                 className="size-4 shrink-0 [&_svg]:size-4"
                                 svg={actionTypes.find((t) => t.id === actionTypeId)?.icon}
                              />{' '}
                              {name}
                           </div>
    `.trim();

    const result = sortAllAttributes(source, {
      direction: 'ascending',
      groupByEmptyRows: false,
    });

    // The ActionTypeIcon tag should be properly closed on its own line
    // and not absorb the </div>
    expect(result).toContain('/>{\' \'}');
    expect(result).toContain('</div>');
    
    // We shouldn't see </div on its own line as an attribute
    expect(result).not.toContain('</div\\n');
  });

  test('should not swallow trailing characters after tag close (auto)', () => {
    const source = `
    <div className="flex items-center gap-2">
                              <ActionTypeIcon
                                 className="size-4 shrink-0 [&_svg]:size-4"
                                 svg={actionTypes.find((t) => t.id === actionTypeId)?.icon}
                              />{' '}
                              {name}
                           </div>
    `.trim();

    const result = sortAllAttributes(source, {
      direction: 'auto',
      groupByEmptyRows: false,
    });

    expect(result).toContain('/>{\' \'}');
    expect(result).toContain('</div>');
    expect(result).not.toContain('</div\\n');
  });

  test('should not swallow trailing characters after tag close (descending)', () => {
    const source = `
    <div className="flex items-center gap-2">
                              <ActionTypeIcon
                                 className="size-4 shrink-0 [&_svg]:size-4"
                                 svg={actionTypes.find((t) => t.id === actionTypeId)?.icon}
                              />{' '}
                              {name}
                           </div>
    `.trim();

    const result = sortAllAttributes(source, {
      direction: 'descending',
      groupByEmptyRows: false,
    });

    expect(result).toContain('/>{\' \'}');
    expect(result).toContain('</div>');
    expect(result).not.toContain('</div\\n');
  });
});

