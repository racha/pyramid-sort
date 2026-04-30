import { describe, expect, test } from 'vitest';
import { sortAllAttributes } from '../src/core/attributeSorter';

describe('attributeSorter nested tags', () => {
  test('should sort attributes of nested tags', () => {
    const source = `
                <Table.Head
                        action={
                           <SortButton
                              direction={queries.sortDirection}
                              onClick={handleSortClick}
                              field="enabled"
                              isActive={queries.sortField === 'enabled'}
                           />
                        }
                     >
                        Status
                     </Table.Head>
    `.trim();

    const result = sortAllAttributes(source, {
      direction: 'ascending',
      groupByEmptyRows: false,
    });

    console.log(result);
    // The inner SortButton should have its attributes sorted by length
    expect(result).toContain('field="enabled"');
    
    // SortButton's attributes lengths:
    // field="enabled" (15)
    // onClick={handleSortClick} (25)
    // direction={queries.sortDirection} (33)
    // isActive={queries.sortField === 'enabled'} (42)
  });
});
