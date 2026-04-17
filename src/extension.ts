import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

import { detectAliasPatterns } from './core/aliasDetector';
import { resolvePrintWidth } from './core/printWidth';
import { sortAllAttributes, sortAttributesInRange } from './core/attributeSorter';
import { sortCssProperties } from './core/cssSorter';
import { sortLinesWithGrouping } from './core/groupSort';
import { sortImports } from './core/importSorter';
import { sortObjectProperties } from './core/objectSorter';
import { getAttributeRegions, getImportRegion, getLanguageKind } from './core/scopeDetector';
import { sortTypeProperties } from './core/typeSorter';
import {
  checkAttributes,
  checkCss,
  checkImports,
  checkObjects,
  checkTypes,
  DiagnosticFinding,
} from './diagnostics';
import {
  AttributeSorterOptions,
  CssSorterOptions,
  ImportSorterOptions,
  ObjectSorterOptions,
  ResolvedDirection,
  SortDirection,
  TypeSorterOptions,
} from './core/types';

let cachedAliasPatterns: string[] | null = null;
let aliasWatcher: vscode.FileSystemWatcher | null = null;
let diagnosticCollection: vscode.DiagnosticCollection | null = null;
let diagnosticDebounce: NodeJS.Timeout | undefined;
let skipNextSave = false;

const CSS_LANGS = new Set(['css', 'scss', 'less', 'sass']);

/** Map `.tsx` etc. to VS Code `document.languageId`. */
const EXT_TO_LANG_ID: Record<string, string> = {
  '.js': 'javascript',
  '.jsx': 'javascriptreact',
  '.ts': 'typescript',
  '.tsx': 'typescriptreact',
  '.css': 'css',
  '.scss': 'scss',
  '.vue': 'vue',
  '.svelte': 'svelte',
  '.astro': 'astro',
  '.mdx': 'mdx',
  '.html': 'html',
};

function getConfig() {
  return vscode.workspace.getConfiguration('pyramidSort');
}

function getImportOptions(
  directionOverride?: SortDirection,
  resource?: vscode.Uri
): ImportSorterOptions {
  const config = getConfig();
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';

  if (!cachedAliasPatterns) {
    cachedAliasPatterns = workspaceRoot ? detectAliasPatterns(workspaceRoot) : ['@/', '~/'];
  }

  const override = config.get<number>('imports.maxLineWidth', 0);
  const searchDir = resource?.fsPath
    ? path.dirname(resource.fsPath)
    : workspaceRoot || '';

  const prettierCfg = resource
    ? vscode.workspace.getConfiguration('prettier', resource)
    : vscode.workspace.getConfiguration('prettier');
  const vscodePw = prettierCfg.get<number>('printWidth');

  const editorCfg = vscode.workspace.getConfiguration('editor', resource);
  const rulers = editorCfg.get<number[]>('rulers') ?? [];
  const ruler = rulers.length > 0 ? rulers[0] : undefined;

  const maxLineWidth = resolvePrintWidth({
    override,
    searchFromDir: searchDir || workspaceRoot || process.cwd(),
    workspaceRoot: workspaceRoot || undefined,
    vscodePrettierPrintWidth:
      vscodePw !== undefined && vscodePw > 0 ? vscodePw : undefined,
    editorRuler: ruler !== undefined && ruler > 0 ? ruler : undefined,
  });

  return {
    direction: directionOverride || config.get<SortDirection>('imports.direction', 'ascending'),
    consolidateMultilineImports: config.get<boolean>('imports.consolidateMultilineImports', true),
    maxLineWidth,
    localAliasPatterns: cachedAliasPatterns,
    groupByEmptyRows: config.get<boolean>('imports.groupByEmptyRows', true),
    groupExternalLocal: config.get<boolean>('imports.groupExternalLocal', true),
  };
}

function getAttributeOptions(directionOverride?: SortDirection): AttributeSorterOptions {
  const config = getConfig();
  return {
    direction: directionOverride || config.get<SortDirection>('attributes.direction', 'ascending'),
    groupByEmptyRows: config.get<boolean>('attributes.groupByEmptyRows', true),
  };
}

function getTypeOptions(directionOverride?: SortDirection): TypeSorterOptions {
  const config = getConfig();
  return {
    direction: directionOverride || config.get<SortDirection>('types.direction', 'ascending'),
    groupByEmptyRows: config.get<boolean>('types.groupByEmptyRows', true),
  };
}

function getObjectOptions(directionOverride?: SortDirection): ObjectSorterOptions {
  const config = getConfig();
  return {
    direction: directionOverride || config.get<SortDirection>('objects.direction', 'ascending'),
    groupByEmptyRows: config.get<boolean>('objects.groupByEmptyRows', true),
    sortNestedObjects: config.get<boolean>('objects.sortNestedObjects', false),
  };
}

function getCssOptions(directionOverride?: SortDirection): CssSorterOptions {
  const config = getConfig();
  return {
    direction: directionOverride || config.get<SortDirection>('css.direction', 'ascending'),
    groupByEmptyRows: config.get<boolean>('css.groupByEmptyRows', true),
  };
}

function getForceSortOptions(direction: ResolvedDirection) {
  const config = getConfig();
  return {
    direction,
    groupByEmptyRows: config.get<boolean>('forceSort.groupByEmptyRows', true),
  };
}

interface SortMode {
  imports?: boolean;
  attributes?: boolean;
  types?: boolean;
  objects?: boolean;
  css?: boolean;
}

function getSupportedLanguageIds(): string[] {
  const exts = getConfig().get<string[]>('extensions', [
    '.js',
    '.jsx',
    '.ts',
    '.tsx',
    '.css',
    '.scss',
  ]);
  const ids = new Set<string>();
  for (const e of exts) {
    const norm = e.startsWith('.') ? e : `.${e}`;
    const id = EXT_TO_LANG_ID[norm.toLowerCase()];
    if (id) ids.add(id);
  }
  return [...ids];
}

function isLanguageSupported(languageId: string): boolean {
  return getSupportedLanguageIds().includes(languageId);
}

function canRunSort(languageId: string): boolean {
  if (CSS_LANGS.has(languageId)) return true;
  return isLanguageSupported(languageId);
}

function findingToDiagnostic(
  doc: vscode.TextDocument,
  f: DiagnosticFinding
): vscode.Diagnostic {
  const start = new vscode.Position(f.startLine, 0);
  const endLine = Math.min(f.endLine, doc.lineCount - 1);
  const endChar = doc.lineAt(endLine).text.length;
  const range = new vscode.Range(start, new vscode.Position(endLine, endChar));
  const d = new vscode.Diagnostic(range, f.message, vscode.DiagnosticSeverity.Information);
  d.source = 'Pyramid Sort';
  d.code = f.code;
  return d;
}

function refreshDiagnostics(doc: vscode.TextDocument) {
  const config = getConfig();
  if (!config.get<boolean>('showDiagnostics', true)) {
    diagnosticCollection?.delete(doc.uri);
    return;
  }
  if (!canRunSort(doc.languageId)) {
    diagnosticCollection?.delete(doc.uri);
    return;
  }

  const source = doc.getText();
  const diags: vscode.Diagnostic[] = [];

  if (CSS_LANGS.has(doc.languageId)) {
    if (config.get<boolean>('sortCssOnSave', false)) {
      diags.push(...checkCss(source, getCssOptions()).map((f) => findingToDiagnostic(doc, f)));
    }
    diagnosticCollection?.set(doc.uri, diags);
    return;
  }

  if (!isLanguageSupported(doc.languageId)) {
    diagnosticCollection?.delete(doc.uri);
    return;
  }

  if (config.get<boolean>('sortImportsOnSave', true)) {
    const imp = checkImports(source, getImportOptions(undefined, doc.uri));
    if (imp) diags.push(findingToDiagnostic(doc, imp));
  }
  if (config.get<boolean>('sortAttributesOnSave', true)) {
    diags.push(...checkAttributes(source, getAttributeOptions()).map((f) => findingToDiagnostic(doc, f)));
  }
  if (config.get<boolean>('sortTypesOnSave', false)) {
    diags.push(...checkTypes(source, getTypeOptions()).map((f) => findingToDiagnostic(doc, f)));
  }
  if (config.get<boolean>('sortObjectsOnSave', false)) {
    diags.push(...checkObjects(source, getObjectOptions()).map((f) => findingToDiagnostic(doc, f)));
  }

  diagnosticCollection?.set(doc.uri, diags);
}

function scheduleDiagnostics(doc: vscode.TextDocument) {
  if (diagnosticDebounce) clearTimeout(diagnosticDebounce);
  diagnosticDebounce = setTimeout(() => refreshDiagnostics(doc), 400);
}

function resolveSortMode(forSave: boolean, mode?: SortMode): SortMode {
  const config = getConfig();
  if (mode) return mode;
  if (!forSave) {
    return {
      imports: true,
      attributes: true,
      types: true,
      objects: true,
      css: true,
    };
  }
  return {
    imports: config.get<boolean>('sortImportsOnSave', true),
    attributes: config.get<boolean>('sortAttributesOnSave', true),
    types: config.get<boolean>('sortTypesOnSave', false),
    objects: config.get<boolean>('sortObjectsOnSave', false),
    css: config.get<boolean>('sortCssOnSave', false),
  };
}

function applyPipeline(
  source: string,
  languageId: string,
  languageKind: ReturnType<typeof getLanguageKind>,
  directionOverride: SortDirection | undefined,
  forSave: boolean,
  mode?: SortMode,
  resource?: vscode.Uri
): string {
  const m = resolveSortMode(forSave, mode);
  let result = source;

  if (CSS_LANGS.has(languageId)) {
    if (m.css) {
      result = sortCssProperties(result, getCssOptions(directionOverride));
    }
    return result;
  }

  const lines = result.split('\n');

  if (m.imports) {
    const importRegion = getImportRegion(lines, languageKind);
    if (importRegion) {
      const regionLines = lines.slice(importRegion.startLine, importRegion.endLine + 1);
      const regionText = regionLines.join('\n');
      const sorted = sortImports(regionText, getImportOptions(directionOverride, resource));
      if (sorted !== regionText) {
        result =
          lines.slice(0, importRegion.startLine).join('\n') +
          (importRegion.startLine > 0 ? '\n' : '') +
          sorted +
          (importRegion.endLine < lines.length - 1 ? '\n' : '') +
          lines.slice(importRegion.endLine + 1).join('\n');
      }
    }
  }

  if (m.attributes) {
    const attrRegions = getAttributeRegions(result.split('\n'), languageKind);
    for (let i = attrRegions.length - 1; i >= 0; i--) {
      const region = attrRegions[i];
      result = sortAttributesInRange(
        result,
        region.startLine,
        region.endLine,
        getAttributeOptions(directionOverride)
      );
    }
  }

  if (m.types) {
    result = sortTypeProperties(result, getTypeOptions(directionOverride));
  }

  if (m.objects) {
    result = sortObjectProperties(result, getObjectOptions(directionOverride));
  }

  return result;
}

function applyFullSort(
  document: vscode.TextDocument,
  directionOverride?: SortDirection,
  forSave = false,
  mode?: SortMode
): vscode.TextEdit[] {
  const source = document.getText();
  const languageKind = getLanguageKind(document.languageId);
  const result = applyPipeline(
    source,
    document.languageId,
    languageKind,
    directionOverride,
    forSave,
    mode,
    document.uri
  );

  if (result === source) return [];

  const fullRange = new vscode.Range(
    new vscode.Position(0, 0),
    document.lineAt(document.lineCount - 1).range.end
  );
  return [vscode.TextEdit.replace(fullRange, result)];
}

function applySelectionSort(
  editor: vscode.TextEditor,
  direction: SortDirection
): vscode.TextEdit[] {
  const selection = editor.selection;
  if (selection.isEmpty) {
    return applyFullSort(editor.document, direction, false);
  }

  const document = editor.document;
  const startLine = selection.start.line;
  const endLine = selection.end.line;
  const selectedLines: string[] = [];
  for (let i = startLine; i <= endLine; i++) {
    selectedLines.push(document.lineAt(i).text);
  }
  const selectedText = selectedLines.join('\n');

  const hasImports = /^import\s/m.test(selectedText);
  const hasJsx = /<[A-Za-z]/.test(selectedText);
  const hasTypeDecl = /^\s*(?:export\s+)?(?:type|interface|enum)\b/m.test(selectedText);
  const nestedObj = getConfig().get<boolean>('objects.sortNestedObjects', false);
  const hasObj = nestedObj
    ? /(?:const|let|var)\s+\w+\s*=\s*\{|^\s*return\s*\{|\w+\(\s*\{/m.test(selectedText)
    : /(?:const|let|var)\s+\w+\s*=\s*\{|^\s*return\s*\{/m.test(selectedText);

  let result = selectedText;

  if (hasImports) {
    result = sortImports(result, {
      ...getImportOptions(direction, document.uri),
      direction,
    });
  }
  if (hasJsx) {
    result = sortAllAttributes(result, { ...getAttributeOptions(direction), direction });
  }
  if (hasTypeDecl) {
    result = sortTypeProperties(result, { ...getTypeOptions(direction), direction });
  }
  if (hasObj) {
    result = sortObjectProperties(result, { ...getObjectOptions(direction), direction });
  }
  if (CSS_LANGS.has(document.languageId)) {
    result = sortCssProperties(result, { ...getCssOptions(direction), direction });
  }

  if (result !== selectedText) {
    const range = new vscode.Range(
      new vscode.Position(startLine, 0),
      new vscode.Position(endLine, document.lineAt(endLine).text.length)
    );
    return [vscode.TextEdit.replace(range, result)];
  }

  return [];
}

function applyForceSort(editor: vscode.TextEditor, direction: ResolvedDirection): vscode.TextEdit[] {
  const selection = editor.selection;
  if (selection.isEmpty) {
    void vscode.window.showInformationMessage('Select lines to force sort.');
    return [];
  }

  const document = editor.document;
  const startLine = selection.start.line;
  const endLine = selection.end.line;
  const lines: string[] = [];
  for (let i = startLine; i <= endLine; i++) {
    lines.push(document.lineAt(i).text);
  }

  const opts = getForceSortOptions(direction);
  const sorted = sortLinesWithGrouping(lines, opts.direction, opts.groupByEmptyRows);
  const newText = sorted.join('\n');
  const oldText = lines.join('\n');
  if (newText === oldText) return [];

  const range = new vscode.Range(
    new vscode.Position(startLine, 0),
    new vscode.Position(endLine, document.lineAt(endLine).text.length)
  );
  return [vscode.TextEdit.replace(range, newText)];
}

/**
 * Run a single-category sort. If the editor has a non-empty selection, sort only
 * that selection; otherwise sort the whole document.
 */
function applyCategorySort(
  editor: vscode.TextEditor,
  sort: (source: string) => string
): vscode.TextEdit[] {
  const document = editor.document;
  const selection = editor.selection;

  if (!selection.isEmpty) {
    const startLine = selection.start.line;
    const endLine = selection.end.line;
    const lines: string[] = [];
    for (let i = startLine; i <= endLine; i++) {
      lines.push(document.lineAt(i).text);
    }
    const oldText = lines.join('\n');
    const newText = sort(oldText);
    if (newText === oldText) return [];
    const range = new vscode.Range(
      new vscode.Position(startLine, 0),
      new vscode.Position(endLine, document.lineAt(endLine).text.length)
    );
    return [vscode.TextEdit.replace(range, newText)];
  }

  const source = document.getText();
  const next = sort(source);
  if (next === source) return [];
  const fullRange = new vscode.Range(
    new vscode.Position(0, 0),
    document.lineAt(document.lineCount - 1).range.end
  );
  return [vscode.TextEdit.replace(fullRange, next)];
}

async function applyEdits(editor: vscode.TextEditor, edits: vscode.TextEdit[]) {
  if (edits.length === 0) return;

  const wsEdit = new vscode.WorkspaceEdit();
  for (const edit of edits) {
    wsEdit.replace(editor.document.uri, edit.range, edit.newText);
  }
  await vscode.workspace.applyEdit(wsEdit);
}

const AI_HOOK_CONFIG = `{
  "hooks": {
    "PostToolUse": [
      {
        "type": "command",
        "command": "npx pyramid-sort \\"$TOOL_INPUT_FILE_PATH\\""
      }
    ]
  }
}
`;

/** Maps diagnostic `code` from diagnostics.ts to the command that fixes it. */
const DIAG_CODE_TO_SORT_COMMAND: Record<string, string> = {
  'pyramidSort.imports': 'pyramidSort.sortImports',
  'pyramidSort.attributes': 'pyramidSort.sortAttributes',
  'pyramidSort.types': 'pyramidSort.sortTypes',
  'pyramidSort.objects': 'pyramidSort.sortObjects',
  'pyramidSort.css': 'pyramidSort.sortCss',
};

class PyramidSortCodeActionProvider implements vscode.CodeActionProvider {
  provideCodeActions(
    _document: vscode.TextDocument,
    _range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext
  ): vscode.ProviderResult<(vscode.Command | vscode.CodeAction)[]> {
    const out: vscode.CodeAction[] = [];
    for (const diag of context.diagnostics) {
      if (diag.source !== 'Pyramid Sort' || diag.code === undefined) continue;
      const cmd = DIAG_CODE_TO_SORT_COMMAND[String(diag.code)];
      if (!cmd) continue;
      const action = new vscode.CodeAction('Sort with Pyramid Sort', vscode.CodeActionKind.QuickFix);
      action.command = { title: 'Sort with Pyramid Sort', command: cmd };
      action.diagnostics = [diag];
      action.isPreferred = true;
      out.push(action);
    }
    return out;
  }
}

export function activate(context: vscode.ExtensionContext) {
  diagnosticCollection = vscode.languages.createDiagnosticCollection('pyramidSort');
  context.subscriptions.push(diagnosticCollection);

  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (workspaceRoot) {
    aliasWatcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(workspaceRoot, '{tsconfig,jsconfig}.json')
    );
    const invalidateCache = () => {
      cachedAliasPatterns = null;
    };
    aliasWatcher.onDidChange(invalidateCache);
    aliasWatcher.onDidCreate(invalidateCache);
    aliasWatcher.onDidDelete(invalidateCache);
    context.subscriptions.push(aliasWatcher);
  }

  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document === vscode.window.activeTextEditor?.document) {
        scheduleDiagnostics(e.document);
      }
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument((doc) => {
      void refreshDiagnostics(doc);
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidCloseTextDocument((doc) => {
      diagnosticCollection?.delete(doc.uri);
    })
  );

  if (vscode.window.activeTextEditor) {
    void refreshDiagnostics(vscode.window.activeTextEditor.document);
  }

  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      { scheme: 'file' },
      new PyramidSortCodeActionProvider(),
      { providedCodeActionKinds: [vscode.CodeActionKind.QuickFix] }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('pyramidSort.sort', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || !canRunSort(editor.document.languageId)) return;
      const edits = applyFullSort(editor.document, undefined, false);
      await applyEdits(editor, edits);
      scheduleDiagnostics(editor.document);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('pyramidSort.sortAscending', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || !canRunSort(editor.document.languageId)) return;
      const edits = applySelectionSort(editor, 'ascending');
      await applyEdits(editor, edits);
      scheduleDiagnostics(editor.document);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('pyramidSort.sortDescending', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || !canRunSort(editor.document.languageId)) return;
      const edits = applySelectionSort(editor, 'descending');
      await applyEdits(editor, edits);
      scheduleDiagnostics(editor.document);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('pyramidSort.sortImports', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || !isLanguageSupported(editor.document.languageId)) return;
      const opts = getImportOptions(undefined, editor.document.uri);
      const edits = applyCategorySort(editor, (src) => sortImports(src, opts));
      await applyEdits(editor, edits);
      scheduleDiagnostics(editor.document);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('pyramidSort.sortAttributes', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || !isLanguageSupported(editor.document.languageId)) return;
      const opts = getAttributeOptions();
      const edits = applyCategorySort(editor, (src) => sortAllAttributes(src, opts));
      await applyEdits(editor, edits);
      scheduleDiagnostics(editor.document);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('pyramidSort.sortTypes', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || !isLanguageSupported(editor.document.languageId)) return;
      const opts = getTypeOptions();
      const edits = applyCategorySort(editor, (src) => sortTypeProperties(src, opts));
      await applyEdits(editor, edits);
      scheduleDiagnostics(editor.document);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('pyramidSort.sortObjects', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || !isLanguageSupported(editor.document.languageId)) return;
      const opts = getObjectOptions();
      const edits = applyCategorySort(editor, (src) => sortObjectProperties(src, opts));
      await applyEdits(editor, edits);
      scheduleDiagnostics(editor.document);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('pyramidSort.sortCss', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || !CSS_LANGS.has(editor.document.languageId)) return;
      const opts = getCssOptions();
      const edits = applyCategorySort(editor, (src) => sortCssProperties(src, opts));
      await applyEdits(editor, edits);
      scheduleDiagnostics(editor.document);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('pyramidSort.forceSortAscending', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;
      const edits = applyForceSort(editor, 'ascending');
      await applyEdits(editor, edits);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('pyramidSort.forceSortDescending', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;
      const edits = applyForceSort(editor, 'descending');
      await applyEdits(editor, edits);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('pyramidSort.setupAIHook', async () => {
      const wsRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!wsRoot) {
        vscode.window.showErrorMessage('No workspace folder open.');
        return;
      }

      const hooksDir = path.join(wsRoot, '.github', 'hooks');
      const hookFile = path.join(hooksDir, 'pyramid-sort.json');

      if (fs.existsSync(hookFile)) {
        const overwrite = await vscode.window.showWarningMessage(
          'AI hook config already exists. Overwrite?',
          'Yes',
          'No'
        );
        if (overwrite !== 'Yes') return;
      }

      fs.mkdirSync(hooksDir, { recursive: true });
      fs.writeFileSync(hookFile, AI_HOOK_CONFIG, 'utf-8');
      vscode.window.showInformationMessage('Created .github/hooks/pyramid-sort.json');

      const doc = await vscode.workspace.openTextDocument(hookFile);
      await vscode.window.showTextDocument(doc);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('pyramidSort.saveWithoutSorting', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;
      skipNextSave = true;
      await editor.document.save();
    })
  );

  context.subscriptions.push(
    vscode.workspace.onWillSaveTextDocument((event) => {
      if (skipNextSave) {
        skipNextSave = false;
        return;
      }
      const { document } = event;
      if (!canRunSort(document.languageId)) return;

      const config = getConfig();
      const sortImportsOnSave = config.get<boolean>('sortImportsOnSave', true);
      const sortAttrsOnSave = config.get<boolean>('sortAttributesOnSave', true);
      const sortTypesOnSave = config.get<boolean>('sortTypesOnSave', false);
      const sortObjectsOnSave = config.get<boolean>('sortObjectsOnSave', false);
      const sortCssOnSave = config.get<boolean>('sortCssOnSave', false);

      if (
        !sortImportsOnSave &&
        !sortAttrsOnSave &&
        !sortTypesOnSave &&
        !sortObjectsOnSave &&
        !sortCssOnSave
      ) {
        return;
      }

      event.waitUntil(Promise.resolve(applyFullSort(document, undefined, true)));
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument((doc) => {
      scheduleDiagnostics(doc);
    })
  );
}

export function deactivate() {
  cachedAliasPatterns = null;
  if (aliasWatcher) {
    aliasWatcher.dispose();
    aliasWatcher = null;
  }
  diagnosticCollection = null;
}
