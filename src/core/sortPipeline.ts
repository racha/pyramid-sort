import { sortAttributesInRange } from './attributeSorter';
import { sortCssProperties } from './cssSorter';
import { sortImports } from './importSorter';
import { sortObjectProperties } from './objectSorter';
import { getAttributeRegions, getImportRegion, getLanguageKind } from './scopeDetector';
import { sortTypeProperties } from './typeSorter';
import {
  AttributeSorterOptions,
  CssSorterOptions,
  ImportSorterOptions,
  ObjectSorterOptions,
  TypeSorterOptions,
} from './types';
import {
  checkAttributes,
  checkCss,
  checkImports,
  checkObjects,
  checkTypes,
  DiagnosticFinding,
} from '../diagnostics';

export const PIPELINE_CSS_LANGS = new Set(['css', 'scss', 'less', 'sass']);

export interface SortModeFlags {
  imports: boolean;
  attributes: boolean;
  types: boolean;
  objects: boolean;
  css: boolean;
}

export interface PipelineSorterOptions {
  importOpts: ImportSorterOptions;
  attributeOpts: AttributeSorterOptions;
  typeOpts: TypeSorterOptions;
  objectOpts: ObjectSorterOptions;
  cssOpts: CssSorterOptions;
}

export interface CategoryChanged {
  imports: boolean;
  attributes: boolean;
  types: boolean;
  objects: boolean;
  css: boolean;
}

export interface ScanToggles {
  showDiagnostics: boolean;
  diagnostics: {
    imports: boolean;
    attributes: boolean;
    types: boolean;
    objects: boolean;
    css: boolean;
  };
}

export interface ScanFileResult {
  imports: DiagnosticFinding[];
  attributes: DiagnosticFinding[];
  types: DiagnosticFinding[];
  objects: DiagnosticFinding[];
  css: DiagnosticFinding[];
}

const EMPTY_SCAN: ScanFileResult = {
  imports: [],
  attributes: [],
  types: [],
  objects: [],
  css: [],
};

function emptyChanged(): CategoryChanged {
  return {
    imports: false,
    attributes: false,
    types: false,
    objects: false,
    css: false,
  };
}

/**
 * Read-only checks for one file; honors the same toggles as the extension Problems tab.
 */
export function scanFile(
  source: string,
  languageId: string,
  toggles: ScanToggles,
  opts: PipelineSorterOptions
): ScanFileResult {
  if (!toggles.showDiagnostics) {
    return { ...EMPTY_SCAN };
  }

  if (PIPELINE_CSS_LANGS.has(languageId)) {
    if (!toggles.diagnostics.css) {
      return { ...EMPTY_SCAN };
    }
    return {
      ...EMPTY_SCAN,
      css: checkCss(source, opts.cssOpts),
    };
  }

  const languageKind = getLanguageKind(languageId);

  const out: ScanFileResult = { ...EMPTY_SCAN };

  if (toggles.diagnostics.imports) {
    const imp = checkImports(source, opts.importOpts);
    if (imp) out.imports.push(imp);
  }
  if (toggles.diagnostics.attributes) {
    out.attributes.push(...checkAttributes(source, opts.attributeOpts));
  }
  if (toggles.diagnostics.types) {
    out.types.push(...checkTypes(source, opts.typeOpts));
  }
  if (toggles.diagnostics.objects) {
    out.objects.push(...checkObjects(source, opts.objectOpts));
  }

  return out;
}

/**
 * Full-file sort pipeline (same steps as on-save / CLI); reports which categories changed text.
 */
export function sortFileSource(
  source: string,
  languageId: string,
  mode: SortModeFlags,
  opts: PipelineSorterOptions
): { result: string; changed: CategoryChanged } {
  const changed = emptyChanged();
  let result = source;
  const languageKind = getLanguageKind(languageId);

  if (PIPELINE_CSS_LANGS.has(languageId)) {
    if (mode.css) {
      const next = sortCssProperties(result, opts.cssOpts);
      if (next !== result) changed.css = true;
      result = next;
    }
    return { result, changed };
  }

  let lines = result.split('\n');

  if (mode.imports) {
    const importRegion = getImportRegion(lines, languageKind);
    if (importRegion) {
      const regionLines = lines.slice(importRegion.startLine, importRegion.endLine + 1);
      const regionText = regionLines.join('\n');
      const sorted = sortImports(regionText, opts.importOpts);
      if (sorted !== regionText) {
        changed.imports = true;
        result =
          lines.slice(0, importRegion.startLine).join('\n') +
          (importRegion.startLine > 0 ? '\n' : '') +
          sorted +
          (importRegion.endLine < lines.length - 1 ? '\n' : '') +
          lines.slice(importRegion.endLine + 1).join('\n');
        lines = result.split('\n');
      }
    }
  }

  if (mode.attributes) {
    const attrRegions = getAttributeRegions(result.split('\n'), languageKind);
    for (let i = attrRegions.length - 1; i >= 0; i--) {
      const region = attrRegions[i];
      const before = result;
      result = sortAttributesInRange(
        result,
        region.startLine,
        region.endLine,
        opts.attributeOpts
      );
      if (result !== before) changed.attributes = true;
    }
  }

  if (mode.types) {
    const before = result;
    result = sortTypeProperties(result, opts.typeOpts);
    if (result !== before) changed.types = true;
  }

  if (mode.objects) {
    const before = result;
    result = sortObjectProperties(result, opts.objectOpts);
    if (result !== before) changed.objects = true;
  }

  return { result, changed };
}
