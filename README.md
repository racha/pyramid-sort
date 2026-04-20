# Pyramid Sort

**Pyramid Sort** is a VS Code extension (and CLI) that sorts code by **trimmed line length** so short lines sit at the top and long lines at the bottom — a readable “pyramid” layout.

It covers **imports**, **JSX/HTML attributes**, **type / interface / enum** bodies, **object literals**, and **CSS / SCSS / Less** declarations inside rule blocks. Optional **force sort** reorders any selection by line length with no parsing. **Blank lines** can separate independent sort groups everywhere that applies.

---

## Features at a glance

### Sorting

| Area                      | What it does                                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Imports**               | Sort by line length; optional **external vs local** grouping (blank line between groups)                                                   |
| **JSX / HTML attributes** | Sort attributes inside multiline tags by line length                                                                                       |
| **Types**                 | `type` / `interface` / `enum` bodies (including `export …`)                                                                                |
| **Objects**               | `const` / `let` / `var` `= {` and `return {`; optional **`sortNestedObjects`** adds `foo({ … })` and `key: { … }` with block-aware sorting |
| **CSS**                   | Declarations inside `{ … }` rule blocks; nested rules stay put; `@keyframes` steps are not reordered as blocks                             |
| **Force sort**            | Selected lines only, any language — raw length sort; optional **group by empty rows** (same idea as elsewhere)                             |

### Auto direction (`"auto"`)

For **imports**, **attributes**, **types**, **objects**, and **CSS**, you can set `direction` to **`"auto"`**. The extension compares the **opening line** (the line with `{`, the `<Tag`, the selector + `{`, or the line above the import block) to the **median** trimmed length of the body lines: **shorter opener → ascending**, **longer or equal opener → descending**, so the sorted block visually follows the boundary line.

### Grouping and imports

- **Empty-row grouping** — For imports, attributes, types, objects, CSS, and force sort: **blank lines split groups**; each group is sorted on its own and separators stay in place.
- **Multi-line import consolidation** — Only imports that already span multiple lines are reflowed to fit `maxLineWidth`; single-line imports are never split or merged for width.
- **Path aliases** — Reads `tsconfig.json` / `jsconfig.json` / Vite config so paths like `@/` classify as local.

### Editor integration

- **Commands** — Full file, selection, or category-only (imports, attributes, types, objects, CSS, force ascending / descending); **Scan All Files** (Markdown report) and **Sort All Files** (workspace-wide sort + report).
- **Sort on save** — Separate toggles: imports, attributes, types, objects, CSS (types / objects / CSS are opt-in).
- **Diagnostics** — Per-category **information** entries in the Problems tab when sort order is off. Imports and attributes report by default; types, objects, and CSS are opt-in; **quick-fix: “Sort with Pyramid Sort”** runs the matching command.
- **Selection sort** — Heuristic: imports, JSX, type declarations, object patterns, or CSS depending on what the selection looks like.

### CLI and AI workflows

- **`npx pyramid-sort <file>`** — Same sorting pipeline with flags (`--imports-only`, `--attributes-only`, `--types-only`, `--objects-only`, `--css-only`, `--ascending`, `--descending`).
- **Agent hook** — Command **Pyramid Sort: Setup AI Hook** writes a Cursor / VS Code hook config that runs the CLI after tool use.

---

## Before / after

### Imports

**Before:**

```typescript
import { c } from "vendor-long-name";
import { a } from "v";
import { bb } from "vm";
import { ddd } from "vnode";
import { eeee } from "vend";

import { x } from "@/a";
import { yy } from "@/bb";
import { zzz } from "@/ccc";
import { wwww } from "@/long";
```

**After (ascending):**

```typescript
import { a } from "v";
import { bb } from "vm";
import { ddd } from "vnode";
import { eeee } from "vend";
import { c } from "vendor-long-name";

import { x } from "@/a";
import { yy } from "@/bb";
import { zzz } from "@/ccc";
import { wwww } from "@/long";
```

### Attributes

**Before:**

```tsx
<input
  className="root layout wide text dense stroke muted"
  ref={ref}
  type="text"
  onChange={(e) => onChange(e.target.value)}
  name="field-one"
  value={value}
  placeholder="Type here..."
/>
```

**After (ascending):**

```tsx
<input
  ref={ref}
  type="text"
  value={value}
  name="field-one"
  placeholder="Type here..."
  onChange={(e) => onChange(e.target.value)}
  className="root layout wide text dense stroke muted"
/>
```

### Types (empty rows = groups)

**Before:**

```typescript
type Flags = {
  veryLongPropertyName: boolean;
  short: boolean;
  mediumName: boolean;

  longPropName: boolean;
  tiny: boolean;
  midProp: boolean;
};
```

**After (ascending, groups preserved):**

```typescript
type Flags = {
  short: boolean;
  mediumName: boolean;
  veryLongPropertyName: boolean;

  tiny: boolean;
  midProp: boolean;
  longPropName: boolean;
};
```

### Object literals

**Before:**

```typescript
const item = {
  longKeyName: 5000,
  a: 1,
  midKey: 2,
  url: "https://example.test",

  obj: { k: "v" },
  done: true,
};
```

**After (ascending, groups preserved):**

```typescript
const item = {
  a: 1,
  midKey: 2,
  longKeyName: 5000,
  url: "https://example.test",

  done: true,
  obj: { k: "v" },
};
```

### CSS

**Before:**

```css
.widget {
  background-color: #fff;
  padding: 16px;
  border-radius: 8px;

  font-size: 14px;
  color: #ccc;
}
```

**After (ascending):**

```css
.widget {
  padding: 16px;
  border-radius: 8px;
  background-color: #fff;

  color: #ccc;
  font-size: 14px;
}
```

---

## Commands

| Command                             | Description                                  |
| ----------------------------------- | -------------------------------------------- |
| Pyramid Sort                        | Sort entire file using configured directions |
| Pyramid Sort: Sort Ascending        | Selection or whole file, ascending           |
| Pyramid Sort: Sort Descending       | Selection or whole file, descending          |
| Pyramid Sort: Sort Imports          | Imports only                                 |
| Pyramid Sort: Sort Attributes       | JSX/HTML attributes only                     |
| Pyramid Sort: Sort Types            | Type / interface / enum bodies               |
| Pyramid Sort: Sort Objects          | Object literal properties                    |
| Pyramid Sort: Sort CSS              | CSS / SCSS / Less declarations in rules      |
| Pyramid Sort: Force Sort Ascending  | Selection: by line length (any file type)    |
| Pyramid Sort: Force Sort Descending | Same, descending                             |
| Pyramid Sort: Save Without Sorting  | Save the file once without on-save sorting   |
| Pyramid Sort: Setup AI Hook         | Create hook JSON for the CLI                 |
| Pyramid Sort: Scan All Files (Report) | Workspace scan; opens Markdown issue report |
| Pyramid Sort: Sort All Files       | Workspace sort + Markdown summary of changes |

---

## Settings

In the VS Code Settings editor, options are grouped into sections: **Pyramid Sort** (extensions, diagnostics), **Pyramid Sort: Imports**, **Attributes**, **Types**, **Objects**, **CSS**, and **Force Sort**.

| Setting                                           | Type     | Default     | Description                                                                                                                                 |
| ------------------------------------------------- | -------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `pyramidSort.sortImportsOnSave`                   | boolean  | `true`      | Sort imports on save                                                                                                                        |
| `pyramidSort.sortAttributesOnSave`                | boolean  | `true`      | Sort attributes on save                                                                                                                     |
| `pyramidSort.sortTypesOnSave`                     | boolean  | `false`     | Sort type / interface / enum bodies on save                                                                                                 |
| `pyramidSort.sortObjectsOnSave`                   | boolean  | `false`     | Sort object literals on save                                                                                                                |
| `pyramidSort.sortCssOnSave`                       | boolean  | `false`     | Sort CSS declarations on save                                                                                                               |
| `pyramidSort.imports.direction`                   | enum     | `ascending` | `ascending` \| `descending` \| `auto`                                                                                                       |
| `pyramidSort.attributes.direction`                | enum     | `ascending` | `ascending` \| `descending` \| `auto`                                                                                                       |
| `pyramidSort.types.direction`                     | enum     | `ascending` | `ascending` \| `descending` \| `auto`                                                                                                       |
| `pyramidSort.objects.direction`                   | enum     | `ascending` | `ascending` \| `descending` \| `auto`                                                                                                       |
| `pyramidSort.css.direction`                       | enum     | `ascending` | `ascending` \| `descending` \| `auto`                                                                                                       |
| `pyramidSort.imports.groupByEmptyRows`            | boolean  | `true`      | Blank lines separate import groups                                                                                                          |
| `pyramidSort.imports.groupExternalLocal`          | boolean  | `true`      | Auto-group imports into external (npm) vs local (relative / alias) with a blank line between them; **false** = pure length sort, one block |
| `pyramidSort.attributes.groupByEmptyRows`         | boolean  | `true`      | Blank lines separate attribute groups in a tag                                                                                              |
| `pyramidSort.types.groupByEmptyRows`              | boolean  | `true`      | Blank lines separate groups inside type bodies                                                                                              |
| `pyramidSort.objects.groupByEmptyRows`            | boolean  | `true`      | Blank lines separate groups inside object literals                                                                                          |
| `pyramidSort.objects.sortNestedObjects`           | boolean  | `false`     | Also sort `name({ … })` and nested `prop: { … }`; keeps multi-line nested objects intact                                                    |
| `pyramidSort.css.groupByEmptyRows`                | boolean  | `true`      | Blank lines separate declaration groups in a rule                                                                                           |
| `pyramidSort.forceSort.groupByEmptyRows`          | boolean  | `true`      | Blank lines separate groups for force sort                                                                                                  |
| `pyramidSort.imports.consolidateMultilineImports` | boolean  | `true`      | Reflow **multi-line** imports only; single-line imports are left as-is                                                                      |
| `pyramidSort.imports.maxLineWidth`                | number   | `0` (auto)  | **0** = detect from `.prettierrc` / `package.json` → Prettier extension `printWidth` → `editor.rulers[0]` → 80; **&gt; 0** = fixed override |
| `pyramidSort.showDiagnostics`                     | boolean  | `true`      | Master on/off for Problems-tab diagnostics                                                                                                  |
| `pyramidSort.diagnostics.imports`                 | boolean  | `true`      | Report import-order problems                                                                                                                |
| `pyramidSort.diagnostics.attributes`              | boolean  | `true`      | Report JSX/HTML attribute-order problems                                                                                                    |
| `pyramidSort.diagnostics.types`                   | boolean  | `false`     | Report type/interface/enum-member order problems                                                                                            |
| `pyramidSort.diagnostics.objects`                 | boolean  | `false`     | Report object-literal property-order problems                                                                                               |
| `pyramidSort.diagnostics.css`                     | boolean  | `false`     | Report CSS/SCSS declaration-order problems                                                                                                  |
| `pyramidSort.extensions`                          | string[] | see below   | File extensions the extension runs on (includes `.css` / `.scss` by default); add `.vue`, `.html`, etc. as needed                           |

**Less:** `.less` is not in the default list but is still supported when you open those files (language activation). Add `.less` to `extensions` if you want it listed explicitly with the rest.

---

## Diagnostics

Diagnostics are controlled per category. `pyramidSort.showDiagnostics` is the master switch (default **on**); each `pyramidSort.diagnostics.<category>` toggle decides whether that specific category reports problems. Defaults: **imports and attributes on**; types, objects, and CSS off. Mismatches show as **information** entries in the Problems tab; use the lightbulb **Sort with Pyramid Sort** quick-fix to apply the right command.

Diagnostics and on-save sorting are independent — you can turn on the `types` diagnostic without enabling `sortTypesOnSave`, and vice versa.

---

## Supported languages

**Default extensions:** `.js`, `.jsx`, `.ts`, `.tsx`, `.css`, `.scss`.

**Add more** via `pyramidSort.extensions` (e.g. `.vue`, `.svelte`, `.astro`, `.mdx`, `.html`). Values are **file extensions** (with a leading dot). The extension maps them to VS Code language IDs internally.

**Stylesheets:** Defaults include **`.css`** and **`.scss`**. **Less** works via language activation; add **`.less`** to `extensions` to align with the same list.

---

## CLI and AI hook

### Hook setup

Run **Pyramid Sort: Setup AI Hook**. It creates `.github/hooks/pyramid-sort.json` similar to:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "type": "command",
        "command": "npx pyramid-sort \"$TOOL_INPUT_FILE_PATH\""
      }
    ]
  }
}
```

### CLI

```bash
npx pyramid-sort <file>
npx pyramid-sort <file> --ascending
npx pyramid-sort <file> --descending
npx pyramid-sort <file> --imports-only
npx pyramid-sort <file> --attributes-only
npx pyramid-sort <file> --types-only
npx pyramid-sort <file> --objects-only
npx pyramid-sort <file> --css-only
```

### Workspace-wide scan and sort

From a project root (or any folder), matching files are collected using **`.pyramidsortrc.json` `extensions`**, the workspace **`.gitignore`**, and the same default skips as the extension (`node_modules`, `.git`, `dist`, `build`, `out`, `coverage`, `.next`, `.turbo`).

```bash
npx pyramid-sort . --scan
npx pyramid-sort . --scan --out=pyramid-sort-report.md
npx pyramid-sort . --sort-all
npx pyramid-sort . --sort-all --all-categories
npx pyramid-sort . --sort-all --check
```

- **`--scan`** — Markdown report on stdout; exit code **1** if any issue is found (handy in CI).
- **`--sort-all`** — rewrites files in place; respects **`sort*OnSave`** in `.pyramidsortrc.json` unless **`--all-categories`** is set. **`--check`** does not write; exits **1** if any file would change.
- Per-file settings still come from the nearest `.pyramidsortrc.json` when you use monorepo layouts.

### `.pyramidsortrc.json`

Example:

```json
{
  "imports": {
    "direction": "ascending",
    "consolidateMultilineImports": true,
    "maxLineWidth": 0,
    "groupByEmptyRows": true
  },
  "attributes": {
    "direction": "ascending",
    "groupByEmptyRows": true
  },
  "types": {
    "direction": "ascending",
    "groupByEmptyRows": true
  },
  "objects": {
    "direction": "ascending",
    "groupByEmptyRows": true,
    "sortNestedObjects": false
  },
  "css": {
    "direction": "ascending",
    "groupByEmptyRows": true
  },
  "extensions": [".js", ".jsx", ".ts", ".tsx", ".css", ".scss"],
  "showDiagnostics": true,
  "diagnostics": {
    "imports": true,
    "attributes": true,
    "types": false,
    "objects": false,
    "css": false
  },
  "sortImportsOnSave": true,
  "sortAttributesOnSave": true,
  "sortTypesOnSave": false,
  "sortObjectsOnSave": false,
  "sortCssOnSave": false
}
```

Optional **`showDiagnostics`**, **`diagnostics`**, and **`sort*OnSave`** mirror VS Code settings and control **CLI** `--scan` / `--sort-all` batch behavior. `.css` / `.scss` / `.less` files are still processed when the run includes CSS sorting, independent of `extensions`.

---

## Installation

### Marketplace

Search for **Pyramid Sort** in the Extensions view, or:

```bash
code --install-extension INVEON-Development.pyramid-sort
```

### VSIX

```bash
code --install-extension pyramid-sort-0.4.2.vsix
```

---

## Credits

**INVEON Development**

- Stefan Račić — [stefan@inveon.dev](mailto:stefan@inveon.dev)

---

## License

MIT
