# Changelog

## [0.2.4] - 2026-04-17

### Changed

- **Selection-aware category commands** — *Sort Imports*, *Sort Attributes*, *Sort Types*, *Sort Objects*, and *Sort CSS* now sort **only the selected lines** when there is a non-empty selection, and fall back to sorting the whole file when nothing is selected. Matches the existing behavior of the force-ascending / force-descending commands.

### Added

- **21 new integration tests** in `test/complex-scenarios.test.ts` covering realistic, hard-to-parse inputs: kitchen-sink import files with `'use client'` + side-effects + `node:` specifiers + multi-line type imports, deeply nested config objects with spreads and arrays-of-objects, interfaces with nested inline object types, enums, CSS with `&:hover` / `@media` / `@keyframes` / custom properties, and JSX with spread props, ternaries, and handler bodies.

## [0.2.3] - 2026-04-16

### Added

- **`pyramidSort.imports.groupExternalLocal`** (default `true`) — opt out of auto-grouping external (npm) vs local (relative / alias) imports. When `false`, imports are sorted purely by length in one block, no blank-line separator inserted.

### Changed

- **Clearer import diagnostic message** — now reads *“Imports are not in Pyramid Sort order (by length, with external/local groups)”* when grouping is on, so users aren’t misled when their imports are already sorted by length but the tool still wants to insert a group separator.

## [0.2.2] - 2026-04-16

### Fixed

- **Default path aliases always apply** — `@/` and `~/` are now merged with aliases read from `tsconfig` / `jsconfig` / Vite. Previously, if the project defined *any* `paths` entry, the defaults were dropped, so imports like `@/env` could be misclassified as external npm packages, wrong sort order, and false “not sorted by length” diagnostics.

## [0.2.1] - 2026-04-16

### Changed

- **Marketplace description** — shorter, more casual blurb in `package.json`.
- **README** — before/after examples use generic names only (no Tailwind, product paths, or app-specific identifiers).

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
