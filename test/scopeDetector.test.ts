import { describe, it, expect } from 'vitest';
import {
  findScriptRegion,
  findTemplateRegion,
  findFrontmatterRegion,
  findSvelteTemplateRegions,
  getLanguageKind,
} from '../src/core/scopeDetector';

describe('findScriptRegion', () => {
  it('finds script block in Vue file', () => {
    const lines = [
      '<template>',
      '  <div>Hello</div>',
      '</template>',
      '',
      '<script setup lang="ts">',
      "import { ref } from 'vue';",
      'const msg = ref("Hello");',
      '</script>',
    ];
    const region = findScriptRegion(lines);
    expect(region).toEqual({ startLine: 5, endLine: 6 });
  });

  it('returns null when no script block', () => {
    const lines = ['<template>', '  <div>Hello</div>', '</template>'];
    expect(findScriptRegion(lines)).toBeNull();
  });
});

describe('findTemplateRegion', () => {
  it('finds template block in Vue file', () => {
    const lines = [
      '<template>',
      '  <div>Hello</div>',
      '  <span>World</span>',
      '</template>',
      '',
      '<script>',
      '</script>',
    ];
    const region = findTemplateRegion(lines);
    expect(region).toEqual({ startLine: 1, endLine: 2 });
  });
});

describe('findFrontmatterRegion', () => {
  it('finds Astro frontmatter', () => {
    const lines = [
      '---',
      "import Layout from '../layouts/Layout.astro';",
      'const title = "Hello";',
      '---',
      '<Layout>',
      '  <h1>{title}</h1>',
      '</Layout>',
    ];
    const region = findFrontmatterRegion(lines);
    expect(region).toEqual({ startLine: 1, endLine: 2 });
  });

  it('returns null when no frontmatter', () => {
    const lines = ['<div>Hello</div>'];
    expect(findFrontmatterRegion(lines)).toBeNull();
  });
});

describe('findSvelteTemplateRegions', () => {
  it('excludes script and style blocks', () => {
    const lines = [
      '<script>',
      "  import { onMount } from 'svelte';",
      '</script>',
      '',
      '<h1>Hello</h1>',
      '<p>World</p>',
      '',
      '<style>',
      '  h1 { color: red; }',
      '</style>',
    ];
    const regions = findSvelteTemplateRegions(lines);
    expect(regions.length).toBeGreaterThanOrEqual(1);
    const templateRegion = regions.find((r) => r.startLine === 3);
    expect(templateRegion).toBeDefined();
  });
});

describe('getLanguageKind', () => {
  it('returns standard for JS/TS variants', () => {
    expect(getLanguageKind('javascript')).toBe('standard');
    expect(getLanguageKind('typescript')).toBe('standard');
    expect(getLanguageKind('typescriptreact')).toBe('standard');
    expect(getLanguageKind('javascriptreact')).toBe('standard');
  });

  it('returns correct kind for frameworks', () => {
    expect(getLanguageKind('vue')).toBe('vue');
    expect(getLanguageKind('svelte')).toBe('svelte');
    expect(getLanguageKind('astro')).toBe('astro');
    expect(getLanguageKind('html')).toBe('html');
    expect(getLanguageKind('mdx')).toBe('mdx');
  });
});
