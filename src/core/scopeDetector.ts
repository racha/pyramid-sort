import { ScopeRegion } from './types';

/**
 * Locate the <script> block in Vue/Svelte files.
 * Returns the region inside the script tags (not including the tags themselves).
 */
export function findScriptRegion(lines: string[]): ScopeRegion | null {
  let startLine = -1;
  let endLine = -1;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    if (startLine === -1 && /^<script[\s>]/.test(trimmed)) {
      startLine = i + 1;
      continue;
    }

    if (startLine !== -1 && trimmed === '</script>') {
      endLine = i - 1;
      break;
    }
  }

  if (startLine === -1 || endLine === -1 || endLine < startLine) return null;
  return { startLine, endLine };
}

/**
 * Locate the template/HTML region in Vue files (inside <template>).
 * For Svelte, the template is everything outside <script> and <style> blocks.
 */
export function findTemplateRegion(lines: string[]): ScopeRegion | null {
  let startLine = -1;
  let endLine = -1;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    if (startLine === -1 && /^<template[\s>]/.test(trimmed)) {
      startLine = i + 1;
      continue;
    }

    if (startLine !== -1 && trimmed === '</template>') {
      endLine = i - 1;
      break;
    }
  }

  if (startLine === -1 || endLine === -1 || endLine < startLine) return null;
  return { startLine, endLine };
}

/**
 * Locate the frontmatter block in Astro files (between `---` delimiters).
 */
export function findFrontmatterRegion(lines: string[]): ScopeRegion | null {
  let firstDelim = -1;
  let secondDelim = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      if (firstDelim === -1) {
        firstDelim = i;
      } else {
        secondDelim = i;
        break;
      }
    }
  }

  if (firstDelim === -1 || secondDelim === -1) return null;
  const startLine = firstDelim + 1;
  const endLine = secondDelim - 1;
  if (endLine < startLine) return null;
  return { startLine, endLine };
}

/**
 * For Svelte, the template region is everything not inside <script> or <style>.
 * Returns all non-script, non-style regions as a list.
 */
export function findSvelteTemplateRegions(lines: string[]): ScopeRegion[] {
  const excluded: ScopeRegion[] = [];

  let blockStart = -1;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (/^<(script|style)[\s>]/.test(trimmed)) {
      blockStart = i;
    }
    if (blockStart !== -1 && /^<\/(script|style)>/.test(trimmed)) {
      excluded.push({ startLine: blockStart, endLine: i });
      blockStart = -1;
    }
  }

  const regions: ScopeRegion[] = [];
  let cursor = 0;
  for (const ex of excluded) {
    if (cursor < ex.startLine) {
      regions.push({ startLine: cursor, endLine: ex.startLine - 1 });
    }
    cursor = ex.endLine + 1;
  }
  if (cursor < lines.length) {
    regions.push({ startLine: cursor, endLine: lines.length - 1 });
  }

  return regions;
}

/**
 * For Astro, the template region is everything after the frontmatter.
 */
export function findAstroTemplateRegion(lines: string[]): ScopeRegion | null {
  const fm = findFrontmatterRegion(lines);
  if (!fm) return { startLine: 0, endLine: lines.length - 1 };

  const startLine = fm.endLine + 2; // line after closing `---`
  if (startLine >= lines.length) return null;
  return { startLine, endLine: lines.length - 1 };
}

export type LanguageKind = 'standard' | 'vue' | 'svelte' | 'astro' | 'html' | 'mdx';

export function getLanguageKind(languageId: string): LanguageKind {
  switch (languageId) {
    case 'vue':
      return 'vue';
    case 'svelte':
      return 'svelte';
    case 'astro':
      return 'astro';
    case 'html':
      return 'html';
    case 'mdx':
      return 'mdx';
    default:
      return 'standard';
  }
}

/**
 * Get the region where imports live for the given language.
 * For standard JS/TS, this is the whole file.
 */
export function getImportRegion(lines: string[], kind: LanguageKind): ScopeRegion | null {
  switch (kind) {
    case 'vue':
    case 'svelte':
      return findScriptRegion(lines);
    case 'astro':
      return findFrontmatterRegion(lines);
    case 'html':
      return null;
    case 'standard':
    case 'mdx':
    default:
      return { startLine: 0, endLine: lines.length - 1 };
  }
}

/**
 * Get the region(s) where attributes can be sorted.
 */
export function getAttributeRegions(lines: string[], kind: LanguageKind): ScopeRegion[] {
  switch (kind) {
    case 'vue':
      const tmpl = findTemplateRegion(lines);
      return tmpl ? [tmpl] : [];
    case 'svelte':
      return findSvelteTemplateRegions(lines);
    case 'astro':
      const astroTmpl = findAstroTemplateRegion(lines);
      return astroTmpl ? [astroTmpl] : [];
    case 'html':
      return [{ startLine: 0, endLine: lines.length - 1 }];
    case 'standard':
    case 'mdx':
    default:
      return [{ startLine: 0, endLine: lines.length - 1 }];
  }
}
