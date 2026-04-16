/**
 * Find index of matching `}` for `{` at `openIdx` in `text`, respecting strings.
 */
export function findMatchingBrace(text: string, openIdx: number): number {
  let depth = 0;
  let inStr: '"' | "'" | '`' | null = null;

  for (let i = openIdx; i < text.length; i++) {
    const c = text[i];
    const prev = i > 0 ? text[i - 1] : '';

    if (inStr) {
      if (c === inStr && prev !== '\\') inStr = null;
      continue;
    }

    if (c === '"' || c === "'" || c === '`') {
      inStr = c as '"' | "'" | '`';
      continue;
    }

    if (c === '{') {
      depth++;
    } else if (c === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * Find first `{` column on or after line `startLine` in `lines`.
 */
export function findOpenBraceLine(lines: string[], startLine: number): { line: number; col: number } | null {
  for (let li = startLine; li < lines.length; li++) {
    const line = lines[li];
    const idx = line.indexOf('{');
    if (idx !== -1) return { line: li, col: idx };
  }
  return null;
}
