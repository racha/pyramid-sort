import * as fs from 'fs';
import * as path from 'path';

import { collectAliasPatternsFromFileToFsRoot } from './core/aliasDetector';
import { listWorkspaceFiles } from './core/fileWalker';
import {
  buildScanReportMarkdown,
  buildSortReportMarkdown,
  ScanReportFileRow,
  SortReportFileRow,
} from './core/reportBuilder';
import { PIPELINE_CSS_LANGS, sortFileSource, SortModeFlags } from './core/sortPipeline';
import { resolvePrintWidth } from './core/printWidth';
import {
  DEFAULT_CONFIG,
  PipelineSorterOptions,
  PyramidSortConfig,
  SortDirection,
} from './core/types';
import { bucketFindingsForReport, collectFindingsLikeProblemsTab } from './diagnostics';

const SUPPORTED_EXTENSIONS: Record<string, string> = {
  '.js': 'javascript',
  '.jsx': 'javascriptreact',
  '.ts': 'typescript',
  '.tsx': 'typescriptreact',
  '.vue': 'vue',
  '.svelte': 'svelte',
  '.astro': 'astro',
  '.mdx': 'mdx',
  '.html': 'html',
  '.css': 'css',
  '.scss': 'scss',
  '.less': 'less',
};

function loadConfig(startDir: string): PyramidSortConfig {
  let dir = startDir;
  while (true) {
    const configPath = path.join(dir, '.pyramidsortrc.json');
    if (fs.existsSync(configPath)) {
      try {
        const raw = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        return {
          imports: { ...DEFAULT_CONFIG.imports, ...raw.imports },
          attributes: { ...DEFAULT_CONFIG.attributes, ...raw.attributes },
          types: { ...DEFAULT_CONFIG.types, ...raw.types },
          objects: { ...DEFAULT_CONFIG.objects, ...raw.objects },
          css: { ...DEFAULT_CONFIG.css, ...raw.css },
          forceSort: { ...DEFAULT_CONFIG.forceSort, ...raw.forceSort },
          extensions: raw.extensions ?? DEFAULT_CONFIG.extensions,
          showDiagnostics: raw.showDiagnostics ?? DEFAULT_CONFIG.showDiagnostics,
          diagnostics: {
            ...DEFAULT_CONFIG.diagnostics,
            ...raw.diagnostics,
          },
          sortImportsOnSave: raw.sortImportsOnSave ?? DEFAULT_CONFIG.sortImportsOnSave,
          sortAttributesOnSave:
            raw.sortAttributesOnSave ?? DEFAULT_CONFIG.sortAttributesOnSave,
          sortTypesOnSave: raw.sortTypesOnSave ?? DEFAULT_CONFIG.sortTypesOnSave,
          sortObjectsOnSave: raw.sortObjectsOnSave ?? DEFAULT_CONFIG.sortObjectsOnSave,
          sortCssOnSave: raw.sortCssOnSave ?? DEFAULT_CONFIG.sortCssOnSave,
        };
      } catch {
        break;
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return DEFAULT_CONFIG;
}

function isDirectory(p: string): boolean {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function printUsage() {
  console.log(`Usage: pyramid-sort <file-or-dir> [options]

Options:
  --ascending       Force ascending sort direction
  --descending      Force descending sort direction
  --imports-only    Sort only imports
  --attributes-only Sort only attributes
  --types-only      Sort only types/interfaces/enums
  --objects-only    Sort only object literals
  --css-only        Sort only CSS rule blocks
  --scan            Scan files for sort issues (Markdown report to stdout)
  --sort-all        Sort every matching file under a directory (or one file)
  --all-categories  With --sort-all: sort all categories (ignore sort*OnSave in rc)
  --check           With --sort-all: do not write; exit 1 if any file would change
  --out=<path>      Write report or summary to a file (optional)
  --help            Show this help message`);
}

function normExt(e: string): string {
  return (e.startsWith('.') ? e : `.${e}`).toLowerCase();
}

/** Mirrors extension `isLanguageSupported` / `getSupportedLanguageIds`. */
function supportedLanguageIdsFromExtensions(extensions: string[]): Set<string> {
  const ids = new Set<string>();
  for (const e of extensions) {
    const id = SUPPORTED_EXTENSIONS[normExt(e)];
    if (id) ids.add(id);
  }
  return ids;
}

function cfgToPipelineOpts(
  config: PyramidSortConfig,
  filePath: string,
  directionOverride: SortDirection | undefined
): PipelineSorterOptions {
  const fileDir = path.dirname(filePath);
  const aliasPatterns = collectAliasPatternsFromFileToFsRoot(filePath);
  const maxLineWidth = resolvePrintWidth({
    override: config.imports.maxLineWidth,
    searchFromDir: fileDir,
  });
  const dir = directionOverride;
  return {
    importOpts: {
      direction: dir ?? config.imports.direction,
      consolidateMultilineImports: config.imports.consolidateMultilineImports,
      maxLineWidth,
      localAliasPatterns: aliasPatterns,
      groupByEmptyRows: config.imports.groupByEmptyRows,
      groupExternalLocal: config.imports.groupExternalLocal,
    },
    attributeOpts: {
      direction: dir ?? config.attributes.direction,
      groupByEmptyRows: config.attributes.groupByEmptyRows,
    },
    typeOpts: {
      direction: dir ?? config.types.direction,
      groupByEmptyRows: config.types.groupByEmptyRows,
    },
    objectOpts: {
      direction: dir ?? config.objects.direction,
      groupByEmptyRows: config.objects.groupByEmptyRows,
      sortNestedObjects: config.objects.sortNestedObjects,
    },
    cssOpts: {
      direction: dir ?? config.css.direction,
      groupByEmptyRows: config.css.groupByEmptyRows,
    },
  };
}

function resolveCliSortMode(
  config: PyramidSortConfig,
  allCategories: boolean,
  anyOnly: boolean,
  importsOnly: boolean,
  attributesOnly: boolean,
  typesOnly: boolean,
  objectsOnly: boolean,
  cssOnly: boolean
): SortModeFlags {
  if (anyOnly) {
    return {
      imports: importsOnly,
      attributes: attributesOnly,
      types: typesOnly,
      objects: objectsOnly,
      css: cssOnly,
    };
  }
  if (allCategories) {
    return {
      imports: true,
      attributes: true,
      types: true,
      objects: true,
      css: true,
    };
  }
  return {
    imports: config.sortImportsOnSave,
    attributes: config.sortAttributesOnSave,
    types: config.sortTypesOnSave,
    objects: config.sortObjectsOnSave,
    css: config.sortCssOnSave,
  };
}

function collectBatchFiles(resolved: string, listExtensions: string[]): string[] {
  if (isDirectory(resolved)) {
    return listWorkspaceFiles(resolved, listExtensions);
  }
  return [resolved];
}

function reportRootForRelative(resolved: string): string {
  return isDirectory(resolved) ? resolved : path.dirname(resolved);
}

function maybeWriteOut(outPath: string | undefined, content: string) {
  if (outPath) {
    fs.writeFileSync(path.resolve(outPath), content, 'utf-8');
  }
}

function runSingleFileSort(
  resolvedPath: string,
  config: PyramidSortConfig,
  directionOverride: SortDirection | undefined,
  anyOnly: boolean,
  importsOnly: boolean,
  attributesOnly: boolean,
  typesOnly: boolean,
  objectsOnly: boolean,
  cssOnly: boolean
) {
  const ext = path.extname(resolvedPath).toLowerCase();
  const languageId = SUPPORTED_EXTENSIONS[ext];
  if (!languageId) {
    process.exit(0);
  }

  const allowed = config.extensions.map(normExt);
  const stylesheet = ['.css', '.scss', '.less'].includes(ext);
  if (!allowed.includes(ext) && !stylesheet) {
    process.exit(0);
  }

  const source = fs.readFileSync(resolvedPath, 'utf-8');
  const opts = cfgToPipelineOpts(config, resolvedPath, directionOverride);
  const mode: SortModeFlags = anyOnly
    ? {
        imports: importsOnly,
        attributes: attributesOnly,
        types: typesOnly,
        objects: objectsOnly,
        css: cssOnly,
      }
    : {
        imports: true,
        attributes: true,
        types: true,
        objects: true,
        css: true,
      };

  const { result } = sortFileSource(source, languageId, mode, opts);
  fs.writeFileSync(resolvedPath, result, 'utf-8');
}

function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.length === 0) {
    printUsage();
    process.exit(0);
  }

  const outArg = args.find((a) => a.startsWith('--out='));
  const outPath = outArg ? outArg.slice('--out='.length) : undefined;

  const scan = args.includes('--scan');
  const sortAll = args.includes('--sort-all');
  const check = args.includes('--check');
  const allCategories = args.includes('--all-categories');

  const directionOverride: SortDirection | undefined = args.includes('--ascending')
    ? 'ascending'
    : args.includes('--descending')
      ? 'descending'
      : undefined;

  const importsOnly = args.includes('--imports-only');
  const attributesOnly = args.includes('--attributes-only');
  const typesOnly = args.includes('--types-only');
  const objectsOnly = args.includes('--objects-only');
  const cssOnly = args.includes('--css-only');
  const anyOnly =
    importsOnly || attributesOnly || typesOnly || objectsOnly || cssOnly;

  const filePath = args.find((a) => !a.startsWith('--'));
  if (!filePath) {
    console.error('Error: No file or directory path provided.');
    printUsage();
    process.exit(1);
  }

  const resolvedPath = path.resolve(filePath);
  if (!fs.existsSync(resolvedPath)) {
    console.error(`Error: Path not found: ${resolvedPath}`);
    process.exit(1);
  }

  const batch = scan || sortAll || isDirectory(resolvedPath);

  if (isDirectory(resolvedPath) && !scan && !sortAll) {
    console.error('Error: Directory requires --scan or --sort-all.');
    printUsage();
    process.exit(1);
  }

  if (!batch) {
    const config = loadConfig(path.dirname(resolvedPath));
    runSingleFileSort(
      resolvedPath,
      config,
      directionOverride,
      anyOnly,
      importsOnly,
      attributesOnly,
      typesOnly,
      objectsOnly,
      cssOnly
    );
    return;
  }

  const listConfig = loadConfig(isDirectory(resolvedPath) ? resolvedPath : path.dirname(resolvedPath));
  const files = collectBatchFiles(resolvedPath, listConfig.extensions);
  const relRoot = reportRootForRelative(resolvedPath);

  if (scan) {
    const scanRows: ScanReportFileRow[] = [];

    for (const fp of files) {
      const cfg = loadConfig(path.dirname(fp));
      const ext = path.extname(fp).toLowerCase();
      const languageId = SUPPORTED_EXTENSIONS[ext];
      if (!languageId) continue;
      const allowed = cfg.extensions.map(normExt);
      const stylesheet = ['.css', '.scss', '.less'].includes(ext);
      if (!allowed.includes(ext) && !stylesheet) continue;

      let source: string;
      try {
        source = fs.readFileSync(fp, 'utf-8');
      } catch {
        continue;
      }

      const cfgSupportedIds = supportedLanguageIdsFromExtensions(cfg.extensions);
      const opts = cfgToPipelineOpts(cfg, fp, directionOverride);
      const runnable =
        PIPELINE_CSS_LANGS.has(languageId) || cfgSupportedIds.has(languageId);
      const findings = collectFindingsLikeProblemsTab({
        source,
        showDiagnostics: cfg.showDiagnostics,
        runnable,
        isCssLanguage: PIPELINE_CSS_LANGS.has(languageId),
        jsRulesSupported: cfgSupportedIds.has(languageId),
        toggles: cfg.diagnostics,
        opts,
      });
      const scanResult = bucketFindingsForReport(findings);
      scanRows.push({
        relativePath: path.relative(relRoot, fp),
        absolutePath: fp,
        scan: scanResult,
      });
    }

    const { markdown, totalIssues } = buildScanReportMarkdown(relRoot, scanRows, files.length);
    console.log(markdown);
    maybeWriteOut(outPath, markdown);
    process.exit(totalIssues > 0 ? 1 : 0);
  }

  if (sortAll) {
    if (anyOnly && allCategories) {
      console.warn('Warning: --all-categories ignored when --*-only flags are set.');
    }

    const probeMode = resolveCliSortMode(
      listConfig,
      allCategories,
      anyOnly,
      importsOnly,
      attributesOnly,
      typesOnly,
      objectsOnly,
      cssOnly
    );
    if (
      !probeMode.imports &&
      !probeMode.attributes &&
      !probeMode.types &&
      !probeMode.objects &&
      !probeMode.css
    ) {
      console.error(
        'Error: No sort categories enabled. Use --all-categories or set sortImportsOnSave / sortAttributesOnSave / … in .pyramidsortrc.json.'
      );
      process.exit(1);
    }

    const sortRows: SortReportFileRow[] = [];
    let wouldChange = 0;

    for (const fp of files) {
      const cfg = loadConfig(path.dirname(fp));
      const ext = path.extname(fp).toLowerCase();
      const languageId = SUPPORTED_EXTENSIONS[ext];
      if (!languageId) continue;
      const allowed = cfg.extensions.map(normExt);
      const stylesheet = ['.css', '.scss', '.less'].includes(ext);
      if (!allowed.includes(ext) && !stylesheet) continue;

      let source: string;
      try {
        source = fs.readFileSync(fp, 'utf-8');
      } catch {
        continue;
      }

      const mode = resolveCliSortMode(
        cfg,
        allCategories,
        anyOnly,
        importsOnly,
        attributesOnly,
        typesOnly,
        objectsOnly,
        cssOnly
      );
      const opts = cfgToPipelineOpts(cfg, fp, directionOverride);
      const { result, changed } = sortFileSource(source, languageId, mode, opts);
      sortRows.push({
        relativePath: path.relative(relRoot, fp),
        absolutePath: fp,
        changed,
      });

      const touched =
        changed.imports || changed.attributes || changed.types || changed.objects || changed.css;
      if (touched) wouldChange++;
      if (!check && result !== source) {
        fs.writeFileSync(fp, result, 'utf-8');
      }
    }

    const { markdown } = buildSortReportMarkdown(relRoot, files.length, sortRows);
    console.log(markdown);
    maybeWriteOut(outPath, markdown);
    process.exit(check && wouldChange > 0 ? 1 : 0);
  }
}

main();
