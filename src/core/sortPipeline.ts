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
  PipelineSorterOptions,
  TypeSorterOptions,
} from './types';

export const PIPELINE_CSS_LANGS = new Set(['css', 'scss', 'less', 'sass']);

export type { PipelineSorterOptions };

export interface SortModeFlags {
  imports: boolean;
  attributes: boolean;
  types: boolean;
  objects: boolean;
  css: boolean;
}

export interface CategoryChanged {
  imports: boolean;
  attributes: boolean;
  types: boolean;
  objects: boolean;
  css: boolean;
}

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
