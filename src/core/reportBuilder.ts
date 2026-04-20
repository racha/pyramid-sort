import * as path from 'path';
import { pathToFileURL } from 'url';

import { CategoryChanged } from './sortPipeline';
import { DiagnosticFinding, PyramidScanBuckets } from '../diagnostics';

export interface CategoryCountTotals {
  imports: number;
  attributes: number;
  types: number;
  objects: number;
  css: number;
}

export interface ScanReportFileRow {
  relativePath: string;
  /** Absolute path for `file://` links (VS Code / Cursor open-on-click). */
  absolutePath: string;
  scan: PyramidScanBuckets;
}

export interface SortReportFileRow {
  relativePath: string;
  absolutePath: string;
  changed: CategoryChanged;
}

function mdFileHref(absolutePath: string, line1Based?: number): string {
  const base = pathToFileURL(absolutePath).href;
  return line1Based !== undefined ? `${base}#L${line1Based}` : base;
}

function formatTimestamp(d = new Date()): string {
  return d.toISOString().replace('T', ' ').slice(0, 19);
}

function findingLineLabel(f: DiagnosticFinding): string {
  if (f.startLine === f.endLine) {
    return `line ${f.startLine + 1}`;
  }
  return `lines ${f.startLine + 1}–${f.endLine + 1}`;
}

function categoryTitle(code: string): string {
  const map: Record<string, string> = {
    'pyramidSort.imports': 'Imports',
    'pyramidSort.attributes': 'Attributes',
    'pyramidSort.types': 'Types',
    'pyramidSort.objects': 'Objects',
    'pyramidSort.css': 'CSS',
  };
  return map[code] ?? code;
}

function countScanIssues(scan: PyramidScanBuckets): number {
  return (
    scan.imports.length +
    scan.attributes.length +
    scan.types.length +
    scan.objects.length +
    scan.css.length
  );
}

function renderFileFindings(scan: PyramidScanBuckets, absolutePath: string): string[] {
  const lines: string[] = [];

  const pushList = (items: DiagnosticFinding[]) => {
    for (const f of items) {
      const title = categoryTitle(f.code);
      const lineStart = f.startLine + 1;
      const lineHref = mdFileHref(absolutePath, lineStart);
      const lineLink =
        f.startLine === f.endLine
          ? `[line ${lineStart}](${lineHref})`
          : `[lines ${f.startLine + 1}–${f.endLine + 1}](${lineHref})`;
      lines.push(
        `- **${title}** · ${lineLink} — ${f.message.replace(/\n/g, ' ')}`
      );
    }
  };

  pushList(scan.imports);
  pushList(scan.attributes);
  pushList(scan.types);
  pushList(scan.objects);
  pushList(scan.css);

  return lines;
}

export function buildScanReportMarkdown(
  root: string,
  files: ScanReportFileRow[],
  totalFilesWalked: number
): { markdown: string; filesWithIssues: number; totalIssues: number } {
  let totalIssues = 0;
  let filesWithIssues = 0;
  const sections: string[] = [];

  for (const row of files) {
    const n = countScanIssues(row.scan);
    if (n === 0) continue;
    filesWithIssues++;
    totalIssues += n;
    const fileHref = mdFileHref(row.absolutePath);
    sections.push(`## [${row.relativePath}](${fileHref})`);
    sections.push('');
    sections.push(...renderFileFindings(row.scan, row.absolutePath));
    sections.push('');
  }

  const header = [
    '# Pyramid Sort — Scan Report',
    '',
    `_Root: ${root} • ${formatTimestamp()} • ${totalFilesWalked} files scanned, ${filesWithIssues} with issues (${totalIssues} findings)_`,
    '',
  ];

  if (sections.length === 0) {
    return {
      markdown: [...header, '_No issues found._', ''].join('\n'),
      filesWithIssues: 0,
      totalIssues: 0,
    };
  }

  return {
    markdown: [...header, ...sections].join('\n'),
    filesWithIssues,
    totalIssues,
  };
}

function changedCategories(c: CategoryChanged): string[] {
  const out: string[] = [];
  if (c.imports) out.push('imports');
  if (c.attributes) out.push('attributes');
  if (c.types) out.push('types');
  if (c.objects) out.push('objects');
  if (c.css) out.push('css');
  return out;
}

export function buildSortReportMarkdown(
  root: string,
  totalFiles: number,
  rows: SortReportFileRow[]
): { markdown: string; changedCount: number; categoryCounts: CategoryCountTotals } {
  const changedRows = rows.filter((r) => {
    const ch = r.changed;
    return ch.imports || ch.attributes || ch.types || ch.objects || ch.css;
  });

  const categoryCounts: CategoryCountTotals = {
    imports: 0,
    attributes: 0,
    types: 0,
    objects: 0,
    css: 0,
  };

  for (const r of changedRows) {
    const c = r.changed;
    if (c.imports) categoryCounts.imports++;
    if (c.attributes) categoryCounts.attributes++;
    if (c.types) categoryCounts.types++;
    if (c.objects) categoryCounts.objects++;
    if (c.css) categoryCounts.css++;
  }

  const summary = `_Root: ${path.normalize(root)} • ${formatTimestamp()} • ${totalFiles} files • **${changedRows.length} changed** • imports: ${categoryCounts.imports} • attributes: ${categoryCounts.attributes} • types: ${categoryCounts.types} • objects: ${categoryCounts.objects} • css: ${categoryCounts.css}_`;

  const lines = [
    '# Pyramid Sort — Sort Report',
    '',
    summary,
    '',
  ];

  if (changedRows.length === 0) {
    lines.push('_No files were modified._', '');
    return { markdown: lines.join('\n'), changedCount: 0, categoryCounts };
  }

  lines.push('## Changed', '');

  for (const r of changedRows) {
    const cats = changedCategories(r.changed).join(', ');
    const href = mdFileHref(r.absolutePath);
    lines.push(`- **[${r.relativePath}](${href})** — ${cats}`);
  }

  lines.push('');
  return { markdown: lines.join('\n'), changedCount: changedRows.length, categoryCounts };
}
