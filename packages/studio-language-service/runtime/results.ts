import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type {
  PythonLanguageMethod,
  PythonLanguageSnapshot,
} from '@sistemazero/core/studio/python-language'
import type {
  PythonLanguageEdit,
  PythonLanguageResults,
} from '@sistemazero/core/studio/python-language-results'
import type {
  CompletionItem,
  CompletionList,
  Diagnostic,
  DocumentSymbol,
  Hover,
  Location,
  LocationLink,
  MarkedString,
  MarkupContent,
  SignatureHelp,
  SymbolInformation,
  WorkspaceEdit,
} from 'vscode-languageserver-types'
import { sourcePositions } from './positions'

const kinds: Readonly<Record<number, string>> = {
  5: 'class',
  6: 'method',
  7: 'property',
  9: 'constructor',
  12: 'function',
  13: 'variable',
  14: 'constant',
  23: 'struct',
}
const completionKinds: Readonly<Record<number, string>> = {
  2: 'method',
  3: 'function',
  4: 'constructor',
  5: 'property',
  6: 'variable',
  7: 'class',
  9: 'module',
  10: 'property',
  14: 'keyword',
  21: 'constant',
}
const text = (value: string | MarkupContent | MarkedString | undefined): string =>
  typeof value === 'string' ? value : (value?.value ?? '')

/** Only paths from this exact snapshot can be navigated to or edited. Stubs stay in the server. */
export function languageResultMapper(root: string, snapshot: PythonLanguageSnapshot, path: string) {
  const key = (file: string) => (process.platform === 'win32' ? file.toLowerCase() : file)
  const byPath = new Map(
    Object.keys(snapshot.files).map((file) => [key(resolve(root, file)), file]),
  )
  const indexes = new Map<string, ReturnType<typeof sourcePositions>>()
  const index = (file: string) => {
    const source = snapshot.files[file]
    if (!source) throw new Error('LSP returned an unknown file')
    let result = indexes.get(file)
    if (!result) {
      result = sourcePositions(source.source)
      indexes.set(file, result)
    }
    return result
  }
  function local(uri: string) {
    const url = new URL(uri)
    if (url.protocol !== 'file:' || url.search || url.hash) return undefined
    return byPath.get(key(resolve(fileURLToPath(url))))
  }
  function edits(raw: WorkspaceEdit): PythonLanguageEdit[] {
    const result: PythonLanguageEdit[] = []
    const append = (
      uri: string,
      changes: { range: import('vscode-languageserver-types').Range; newText: string }[],
    ) => {
      const file = local(uri)
      if (!file) throw new Error('Rename attempted to edit outside the project')
      for (const item of changes)
        result.push({ path: file, ...index(file).span(item.range), text: item.newText })
    }
    if (raw.changes) for (const [uri, changes] of Object.entries(raw.changes)) append(uri, changes)
    for (const change of raw.documentChanges ?? []) {
      if (!('textDocument' in change)) throw new Error('Resource operations are not permitted')
      const file = local(change.textDocument.uri)
      if (
        !file ||
        (change.textDocument.version !== null &&
          snapshot.files[file]!.version !== change.textDocument.version)
      )
        throw new Error('Rename returned a different document version')
      append(change.textDocument.uri, change.edits)
    }
    const ordered = [...result].sort((a, b) => a.path.localeCompare(b.path) || a.start - b.start)
    for (let i = 1; i < ordered.length; i++) {
      const previous = ordered[i - 1]!,
        current = ordered[i]!
      if (previous.path === current.path && previous.start + previous.length > current.start)
        throw new Error('Overlapping rename edits')
    }
    return result
  }
  const mappers: { [K in PythonLanguageMethod]: (value: unknown) => PythonLanguageResults[K] } = {
    projectDiagnostics() {
      throw new Error('Project diagnostics must be mapped against each owned source')
    },
    symbols(value) {
      const result: PythonLanguageResults['symbols'] = []
      const visit = (items: (DocumentSymbol | SymbolInformation)[], depth: number) => {
        if (depth > 100) throw new Error('Symbol nesting exceeds limit')
        for (const item of items) {
          if (result.length >= 300) return
          const range = 'selectionRange' in item ? item.selectionRange : item.location.range
          if ('location' in item && local(item.location.uri) !== path) continue
          result.push({
            name: item.name,
            kind: kinds[item.kind] ?? 'variable',
            depth,
            ...index(path).span(range),
            ...('range' in item ? { bodySpan: index(path).span(item.range) } : {}),
          })
          if ('children' in item && item.children) visit(item.children, depth + 1)
        }
      }
      visit((value ?? []) as (DocumentSymbol | SymbolInformation)[], 0)
      return result
    },
    definitions(value) {
      const items = value ? (Array.isArray(value) ? value : [value]) : []
      return (items as (Location | LocationLink)[]).flatMap((item) => {
        const file = local('uri' in item ? item.uri : item.targetUri)
        return file
          ? [
              {
                path: file,
                span: index(file).span('range' in item ? item.range : item.targetSelectionRange),
              },
            ]
          : []
      })
    },
    references(value) {
      return mappers.definitions(value)
    },
    renameSymbol(value) {
      return value ? edits(value as WorkspaceEdit) : []
    },
    diagnostics(value) {
      const report = value as { kind: string; items?: Diagnostic[] }
      if (report.kind !== 'full') throw new Error('Expected current full diagnostics')
      return (report.items ?? []).map((item) => ({
        path,
        ...index(path).span(item.range),
        code: item.code ?? 'python',
        source: 'Pyright',
        message: item.message,
        severity: item.severity === 1 ? 'error' : item.severity === 2 ? 'warning' : 'info',
      }))
    },
    completions(value) {
      const items = (
        Array.isArray(value) ? value : ((value as CompletionList | null)?.items ?? [])
      ) as CompletionItem[]
      return items
        .slice(0, 1000)
        .filter((item) => item.insertTextFormat !== 2)
        .map((item) => ({
          name: item.label,
          kind: completionKinds[item.kind ?? 6] ?? 'variable',
          sortText: item.sortText ?? item.label,
          insertText: item.textEdit?.newText ?? item.insertText ?? item.label,
          ...(item.textEdit
            ? {
                replacementSpan: index(path).span(
                  'range' in item.textEdit ? item.textEdit.range : item.textEdit.replace,
                ),
              }
            : {}),
          additionalEdits: (item.additionalTextEdits ?? []).map((edit) => ({
            path,
            ...index(path).span(edit.range),
            text: edit.newText,
          })),
        }))
    },
    hover(value) {
      if (!value) return null
      const item = value as Hover
      return {
        text: Array.isArray(item.contents)
          ? item.contents.map(text).join('\n\n')
          : text(item.contents),
        ...(item.range ? { span: index(path).span(item.range) } : {}),
      }
    },
    signatureHelp(value) {
      if (!value) return null
      const item = value as SignatureHelp
      return {
        activeParameter: item.activeParameter ?? 0,
        activeSignature: item.activeSignature ?? 0,
        signatures: item.signatures.map((signature) => ({
          label: signature.label,
          documentation: text(signature.documentation),
          ...(signature.activeParameter === undefined
            ? {}
            : { activeParameter: signature.activeParameter }),
          parameters: (signature.parameters ?? []).map((parameter) => ({
            label: parameter.label,
            documentation: text(parameter.documentation),
          })),
        })),
      }
    },
  }
  return <K extends PythonLanguageMethod>(method: K, result: unknown) => mappers[method](result)
}
