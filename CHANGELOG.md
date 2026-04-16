# Changelog

## [0.2.0] - 2026-04-16

### Added

- **Save Without Sorting** command — one-shot save that skips all on-save sorting.
- **Auto `maxLineWidth` for imports** when `pyramidSort.imports.maxLineWidth` is **0** (default): resolves from Prettier config files, then Prettier extension `printWidth`, then `editor.rulers`, then 80. Any **positive** value overrides.
- **`auto` sort direction** for imports, attributes, types, objects, and CSS — compares the opening/context line to the median body line length to pick ascending or descending.
- **`pyramidSort.objects.sortNestedObjects`** — optional sorting for `fn({ … })` and `prop: { … }` with block-aware ordering (multi-line nested objects stay intact).
- **`pyramidSort.extensions`** — file extensions (e.g. `.ts`, `.vue`) replace the old `pyramidSort.languages` language-ID list. Defaults include `.css` and `.scss`.

### Fixed

- **Import parser data loss** — imports with trailing comments (`// …`) no longer fall through to the multi-line parser, which previously consumed subsequent non-import code lines.
- **Attribute sorter data loss** — attributes sharing a line with the opening tag (`<div a="1"`) or closing bracket (`b="2">`) are no longer silently dropped.
- **Object/type/CSS block scrambling** — nested `{ }`, `[ ]`, and `( )` blocks are now kept intact instead of being sorted line-by-line; all three sorters use block-aware sorting.
- **Alias detection** — `tsconfig.json` / `jsconfig.json` with trailing commas no longer silently fails `JSON.parse`.

### Changed

- **Breaking:** `pyramidSort.languages` renamed to **`pyramidSort.extensions`**; values are now extensions such as `.tsx` instead of VS Code language IDs.

## [0.1.0] - 2026-04-16

### Added

- Import sorting by line length with automatic external/local grouping
- JSX/HTML attribute sorting by line length on multi-line elements
- Multi-line import consolidation (packs specifiers to fit within max line width)
- Auto-detection of path aliases from tsconfig.json / jsconfig.json / vite config
- Sort on save with independent toggles for imports and attributes
- Commands: Pyramid Sort, Sort Ascending, Sort Descending, Sort Imports, Sort Attributes
- Selection-aware sorting (sort selected code only)
- Configurable sort direction (ascending/descending) per feature
- Support for JS, JSX, TS, TSX out of the box
- Opt-in support for Vue, Svelte, Astro, MDX, HTML
- CLI tool (`npx pyramid-sort`) for CI and AI Agent Hook integration
- "Setup AI Hook" command to scaffold `.github/hooks/pyramid-sort.json`
