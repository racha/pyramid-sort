export type SortDirection = 'ascending' | 'descending' | 'auto';

/** Concrete direction after resolving `'auto'` (never pass `'auto'` to comparators). */
export type ResolvedDirection = 'ascending' | 'descending';

export interface ImportSorterOptions {
  direction: SortDirection;
  consolidateMultilineImports: boolean;
  /**
   * Max characters per consolidated import line.
   * **0** means “resolve from Prettier / editor” (extension + CLI); **&gt; 0** is a fixed override.
   */
  maxLineWidth: number;
  localAliasPatterns: string[];
  groupByEmptyRows: boolean;
}

export interface AttributeSorterOptions {
  direction: SortDirection;
  groupByEmptyRows: boolean;
}

export interface TypeSorterOptions {
  direction: SortDirection;
  groupByEmptyRows: boolean;
}

export interface ObjectSorterOptions {
  direction: SortDirection;
  groupByEmptyRows: boolean;
  /** When true, also sort object literals in call args and nested `key: { }`, using block-aware sorting. */
  sortNestedObjects: boolean;
}

export interface CssSorterOptions {
  direction: SortDirection;
  groupByEmptyRows: boolean;
}

export interface ForceSortOptions {
  direction: ResolvedDirection;
  groupByEmptyRows: boolean;
}

export interface PyramidSortConfig {
  imports: ImportSorterOptions;
  attributes: AttributeSorterOptions;
  types: TypeSorterOptions;
  objects: ObjectSorterOptions;
  css: CssSorterOptions;
  forceSort: ForceSortOptions;
  /** File extensions (e.g. `.ts`, `.tsx`) the CLI/extension should act on. */
  extensions: string[];
}

export interface ParsedImport {
  /** The full original text of the import (may span multiple lines) */
  originalText: string;
  /** The module specifier (e.g. 'react', '@/utils/foo', './Bar') */
  source: string;
  /** Named specifiers: ['useState', 'useEffect'] */
  namedSpecifiers: string[];
  /** Default import name, if present */
  defaultImport: string | null;
  /** Whether this is `import type` */
  isTypeImport: boolean;
  /** Side-effect only import with no bindings */
  isSideEffect: boolean;
  /** Start line index in the source file (0-based) */
  startLine: number;
  /** End line index in the source file (0-based, inclusive) */
  endLine: number;
}

export interface ParsedAttribute {
  /** The full text of the attribute (trimmed) */
  text: string;
  /** Length used for sorting (trimmed, concatenated if multi-line) */
  sortLength: number;
}

export interface TagWithAttributes {
  /** Line index of the opening `<Tag` (0-based) */
  startLine: number;
  /** Line index of the closing `>` or `/>` (0-based) */
  endLine: number;
  /** The tag opening portion, e.g. `<input` */
  tagOpen: string;
  /** The closing portion, e.g. `/>` or `>` */
  tagClose: string;
  /** Indentation of the tag opening line */
  tagIndent: string;
  /** Indentation of the first attribute */
  attrIndent: string;
  /** Parsed attributes */
  attributes: ParsedAttribute[];
}

export interface ScopeRegion {
  /** Start line index (0-based, inclusive) */
  startLine: number;
  /** End line index (0-based, inclusive) */
  endLine: number;
}

export const DEFAULT_CONFIG: PyramidSortConfig = {
  imports: {
    direction: 'ascending',
    consolidateMultilineImports: true,
    maxLineWidth: 0,
    localAliasPatterns: ['@/', '~/'],
    groupByEmptyRows: true,
  },
  attributes: {
    direction: 'ascending',
    groupByEmptyRows: true,
  },
  types: {
    direction: 'ascending',
    groupByEmptyRows: true,
  },
  objects: {
    direction: 'ascending',
    groupByEmptyRows: true,
    sortNestedObjects: false,
  },
  css: {
    direction: 'ascending',
    groupByEmptyRows: true,
  },
  forceSort: {
    direction: 'ascending',
    groupByEmptyRows: true,
  },
  extensions: ['.js', '.jsx', '.ts', '.tsx', '.css', '.scss'],
};
