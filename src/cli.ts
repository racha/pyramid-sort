import * as fs from 'fs';
import * as path from 'path';

import { detectAliasPatterns } from './core/aliasDetector';
import { sortAllAttributes } from './core/attributeSorter';
import { sortCssProperties } from './core/cssSorter';
import { sortImports } from './core/importSorter';
import { sortObjectProperties } from './core/objectSorter';
import { getLanguageKind, getImportRegion, getAttributeRegions } from './core/scopeDetector';
import { sortTypeProperties } from './core/typeSorter';
import { resolvePrintWidth } from './core/printWidth';
import { PyramidSortConfig, DEFAULT_CONFIG, SortDirection } from './core/types';

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

function printUsage() {
  console.log(`Usage: pyramid-sort <file> [options]

Options:
  --ascending       Force ascending sort direction
  --descending      Force descending sort direction
  --imports-only    Sort only imports
  --attributes-only Sort only attributes
  --types-only      Sort only types/interfaces/enums
  --objects-only    Sort only object literals
  --css-only        Sort only CSS rule blocks
  --help            Show this help message`);
}

function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.length === 0) {
    printUsage();
    process.exit(0);
  }

  const filePath = args.find((a) => !a.startsWith('--'));
  if (!filePath) {
    console.error('Error: No file path provided.');
    printUsage();
    process.exit(1);
  }

  const resolvedPath = path.resolve(filePath);
  if (!fs.existsSync(resolvedPath)) {
    console.error(`Error: File not found: ${resolvedPath}`);
    process.exit(1);
  }

  const ext = path.extname(resolvedPath).toLowerCase();
  const languageId = SUPPORTED_EXTENSIONS[ext];
  if (!languageId) {
    process.exit(0);
  }

  const projectRoot = path.dirname(resolvedPath);
  const config = loadConfig(projectRoot);

  const norm = (e: string) => (e.startsWith('.') ? e : `.${e}`).toLowerCase();
  const allowed = config.extensions.map(norm);
  const stylesheet = ['.css', '.scss', '.less'].includes(ext);
  if (!allowed.includes(ext) && !stylesheet) {
    process.exit(0);
  }

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

  let source = fs.readFileSync(resolvedPath, 'utf-8');
  const languageKind = getLanguageKind(languageId);
  const lines = source.split('\n');

  const aliasPatterns = detectAliasPatterns(projectRoot);

  const dir = directionOverride;

  const fileDir = path.dirname(resolvedPath);
  const maxLineWidth = resolvePrintWidth({
    override: config.imports.maxLineWidth,
    searchFromDir: fileDir,
  });

  const impOpts = {
    direction: dir || config.imports.direction,
    consolidateMultilineImports: config.imports.consolidateMultilineImports,
    maxLineWidth,
    localAliasPatterns: aliasPatterns,
    groupByEmptyRows: config.imports.groupByEmptyRows,
  };

  const attrOpts = {
    direction: dir || config.attributes.direction,
    groupByEmptyRows: config.attributes.groupByEmptyRows,
  };

  const typeOpts = {
    direction: dir || config.types.direction,
    groupByEmptyRows: config.types.groupByEmptyRows,
  };

  const objectOpts = {
    direction: dir || config.objects.direction,
    groupByEmptyRows: config.objects.groupByEmptyRows,
    sortNestedObjects: config.objects.sortNestedObjects,
  };

  const cssOpts = {
    direction: dir || config.css.direction,
    groupByEmptyRows: config.css.groupByEmptyRows,
  };

  const runImports = !anyOnly || importsOnly;
  const runAttrs = !anyOnly || attributesOnly;
  const runTypes = !anyOnly || typesOnly;
  const runObjects = !anyOnly || objectsOnly;
  const runCss = !anyOnly || cssOnly;

  if (['css', 'scss', 'less'].includes(languageId)) {
    if (runCss) {
      source = sortCssProperties(source, cssOpts);
    }
    fs.writeFileSync(resolvedPath, source, 'utf-8');
    return;
  }

  if (runImports) {
    const importRegion = getImportRegion(lines, languageKind);
    if (importRegion) {
      const regionLines = lines.slice(importRegion.startLine, importRegion.endLine + 1);
      const regionText = regionLines.join('\n');
      const sorted = sortImports(regionText, impOpts);

      if (sorted !== regionText) {
        const resultLines = source.split('\n');
        const sortedLines = sorted.split('\n');
        resultLines.splice(
          importRegion.startLine,
          importRegion.endLine - importRegion.startLine + 1,
          ...sortedLines
        );
        source = resultLines.join('\n');
      }
    }
  }

  if (runAttrs) {
    const attrRegions = getAttributeRegions(source.split('\n'), languageKind);
    for (let i = attrRegions.length - 1; i >= 0; i--) {
      const region = attrRegions[i];
      const regionLines = source.split('\n').slice(region.startLine, region.endLine + 1);
      const regionText = regionLines.join('\n');
      const sorted = sortAllAttributes(regionText, attrOpts);
      if (sorted !== regionText) {
        const resultLines = source.split('\n');
        const sortedLines = sorted.split('\n');
        resultLines.splice(
          region.startLine,
          region.endLine - region.startLine + 1,
          ...sortedLines
        );
        source = resultLines.join('\n');
      }
    }
  }

  if (runTypes) {
    source = sortTypeProperties(source, typeOpts);
  }

  if (runObjects) {
    source = sortObjectProperties(source, objectOpts);
  }

  fs.writeFileSync(resolvedPath, source, 'utf-8');
}

main();
