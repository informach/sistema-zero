import type { PythonLanguageMethod } from '@sistemazero/core/studio/python-language'
import type { PythonLanguageResults } from '@sistemazero/core/studio/python-language-results'
import type * as Monaco from 'monaco-editor'
import { isModelInPathPrefix } from '../../monaco/modelPaths'

type Model = Monaco.editor.ITextModel
export interface PythonEditorProjection {
  definitionModel(path: string): Model | null
  range(model: Model, start: number, length: number): Monaco.IRange
}
export interface PythonEditorAnswer<K extends PythonLanguageMethod> {
  result: PythonLanguageResults[K]
  projection: PythonEditorProjection
}
export interface PythonEditorLanguage {
  query<K extends PythonLanguageMethod>(
    method: K,
    model: Model,
    offset: number | undefined,
    token: Monaco.CancellationToken,
  ): Promise<PythonEditorAnswer<K> | undefined>
}
const scopes = new Map<string, PythonEditorLanguage>()
let registrations: Monaco.IDisposable[] = []
const owner = (model: Model) =>
  [...scopes].find(([prefix]) => isModelInPathPrefix(model, prefix))?.[1]

async function answer<K extends PythonLanguageMethod>(
  method: K,
  model: Model,
  offset: number | undefined,
  token: Monaco.CancellationToken,
) {
  const session = owner(model),
    version = model.getVersionId()
  if (!session || model.isDisposed() || token.isCancellationRequested) return
  const response = await session.query(method, model, offset, token)
  if (
    response === undefined ||
    model.isDisposed() ||
    token.isCancellationRequested ||
    model.getVersionId() !== version ||
    owner(model) !== session
  )
    return
  return { session: response.projection, result: response.result }
}
// LSP documentation is untrusted project text, not Markdown or executable command links.
const plaintext = (value: string): Monaco.IMarkdownString => ({
  value: value.replace(/[\\`*_{}[\]()#+.!<>|~-]/g, '\\$&'),
  isTrusted: false,
  supportHtml: false,
})

export function registerPythonEditorProviders(
  monaco: typeof Monaco,
  prefix: string,
  session: PythonEditorLanguage,
) {
  if (scopes.has(prefix)) throw new Error('Este editor Python já possui uma sessão de análise.')
  scopes.set(prefix, session)
  if (!registrations.length) {
    const languages = monaco.languages
    registrations = [
      languages.registerCompletionItemProvider('python', {
        triggerCharacters: ['.'],
        async provideCompletionItems(model, position, _context, token) {
          const response = await answer('completions', model, model.getOffsetAt(position), token)
          if (!response) return { suggestions: [] }
          const { result, session } = response
          const word = model.getWordUntilPosition(position)
          return {
            suggestions: result.map((item) => ({
              label: item.name,
              insertText: item.insertText,
              sortText: item.sortText,
              kind: /function|method/.test(item.kind)
                ? languages.CompletionItemKind.Function
                : item.kind === 'class'
                  ? languages.CompletionItemKind.Class
                  : item.kind === 'module'
                    ? languages.CompletionItemKind.Module
                    : item.kind === 'keyword'
                      ? languages.CompletionItemKind.Keyword
                      : item.kind === 'property'
                        ? languages.CompletionItemKind.Property
                        : languages.CompletionItemKind.Variable,
              range: item.replacementSpan
                ? session.range(model, item.replacementSpan.start, item.replacementSpan.length)
                : {
                    startLineNumber: position.lineNumber,
                    endLineNumber: position.lineNumber,
                    startColumn: word.startColumn,
                    endColumn: word.endColumn,
                  },
              additionalTextEdits: item.additionalEdits.map((edit) => ({
                range: session.range(model, edit.start, edit.length),
                text: edit.text,
              })),
            })),
          }
        },
      }),
      languages.registerHoverProvider('python', {
        async provideHover(model, position, token) {
          const response = await answer('hover', model, model.getOffsetAt(position), token)
          if (!response?.result) return null
          const { result, session } = response
          return {
            contents: [plaintext(result.text)],
            ...(result.span
              ? { range: session.range(model, result.span.start, result.span.length) }
              : {}),
          }
        },
      }),
      languages.registerDefinitionProvider('python', {
        async provideDefinition(model, position, token) {
          const response = await answer('definitions', model, model.getOffsetAt(position), token)
          if (!response) return []
          const { result, session } = response
          return result.flatMap((item) => {
            const target = session.definitionModel(item.path)
            return target
              ? [
                  {
                    uri: target.uri,
                    range: session.range(target, item.span.start, item.span.length),
                  },
                ]
              : []
          })
        },
      }),
      languages.registerReferenceProvider('python', {
        async provideReferences(model, position, _context, token) {
          const response = await answer('references', model, model.getOffsetAt(position), token)
          if (!response) return []
          const { result, session } = response
          return result.flatMap((item) => {
            const target = session.definitionModel(item.path)
            return target
              ? [
                  {
                    uri: target.uri,
                    range: session.range(target, item.span.start, item.span.length),
                  },
                ]
              : []
          })
        },
      }),
      languages.registerDocumentSymbolProvider('python', {
        async provideDocumentSymbols(model, token) {
          const response = await answer('symbols', model, undefined, token)
          if (!response) return []
          const { result, session } = response
          const roots: Monaco.languages.DocumentSymbol[] = [],
            parents: Monaco.languages.DocumentSymbol[] = []
          for (const item of result) {
            const selectionRange = session.range(model, item.start, item.length)
            const range = item.bodySpan
              ? session.range(model, item.bodySpan.start, item.bodySpan.length)
              : selectionRange
            const symbol: Monaco.languages.DocumentSymbol = {
              name: item.name,
              detail: '',
              kind:
                item.kind === 'class'
                  ? languages.SymbolKind.Class
                  : /function|method/.test(item.kind)
                    ? languages.SymbolKind.Function
                    : languages.SymbolKind.Variable,
              tags: [],
              range,
              selectionRange,
              children: [],
            }
            const parent = item.depth > 0 ? parents[item.depth - 1] : undefined
            ;(parent?.children ?? roots).push(symbol)
            parents.length = item.depth
            parents.push(symbol)
          }
          return roots
        },
      }),
      languages.registerSignatureHelpProvider('python', {
        signatureHelpTriggerCharacters: ['(', ','],
        signatureHelpRetriggerCharacters: [')'],
        async provideSignatureHelp(model, position, token) {
          const response = await answer('signatureHelp', model, model.getOffsetAt(position), token)
          if (!response?.result) return null
          const { result } = response
          return {
            value: {
              ...result,
              signatures: result.signatures.map((signature) => ({
                ...signature,
                documentation: plaintext(signature.documentation),
                parameters: signature.parameters.map((parameter) => ({
                  ...parameter,
                  documentation: plaintext(parameter.documentation),
                })),
              })),
            },
            dispose() {},
          }
        },
      }),
    ]
  }
  return {
    dispose() {
      if (scopes.get(prefix) !== session) return
      scopes.delete(prefix)
      if (!scopes.size) {
        for (const registration of registrations) registration.dispose()
        registrations = []
      }
    },
  }
}
