import { DEFAULT_CONFIG } from '../../src/core/types';
import { sortFileSource } from '../../src/core/sortPipeline';
import type { SortDirection } from '../../src/core/types';

export type Lang = 'typescriptreact' | 'typescript' | 'css';

const ALL = { imports: true, attributes: true, types: true, objects: true, css: true };

export function sortSource(source: string, lang: Lang, direction: SortDirection = 'ascending') {
  const c = DEFAULT_CONFIG;
  return sortFileSource(source, lang, ALL, {
    importOpts: { ...c.imports, direction, maxLineWidth: 80 },
    attributeOpts: { ...c.attributes, direction },
    typeOpts: { ...c.types, direction },
    objectOpts: { ...c.objects, direction },
    cssOpts: { ...c.css, direction },
  });
}
