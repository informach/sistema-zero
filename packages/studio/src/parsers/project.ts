import type { HTMLNode, HTMLShell, SZIR } from '#ir'
import { countAdvancedCSS, countAdvancedHTML, countAdvancedJS } from '#ir'
import { parseCSS } from './css'
import { extractInlineAssets } from './html'
import { parseJSWithDiagnostics } from './js'

export interface ParseProjectInput {
  'index.html': string
  'style.css': string
  'script.js': string
}

/**
 * Como {@link ParseProjectInput}, mas com o HTML JÁ parseado (`html` + `htmlShell`)
 * e as fontes de CSS/JS JÁ RESOLVIDAS (de arquivo externo ou inline, via
 * {@link extractInlineAssets}). Usado quando o parse de HTML precisa rodar fora
 * deste módulo — ex.: na main thread do Studio, onde o `DOMParser` nativo existe,
 * antes de enviar ao Web Worker que faz o trabalho pesado (Babel/JS). Todos os
 * campos são planos e serializáveis via `postMessage`.
 */
export interface ParseProjectParts {
  html: HTMLNode[]
  htmlShell?: HTMLShell
  /** Fonte de CSS a parsear (já resolvida: `style.css` ou `<style>` inline). */
  cssSource: string
  /** Fonte de JS a parsear (já resolvida: `script.js` ou `<script>` inline). */
  jsSource: string
}

export type ParsedFileName = keyof ParseProjectInput

export interface ParseProjectDiagnostic {
  kind: 'advanced' | 'syntaxError'
  file: ParsedFileName
  message: string
  count?: number
}

export interface ParseProjectResult {
  ir: SZIR
  diagnostics: ParseProjectDiagnostic[]
}

export function parseProjectFiles(input: ParseProjectInput): SZIR {
  return parseProjectFilesWithDiagnostics(input).ir
}

export function parseProjectFilesWithDiagnostics(input: ParseProjectInput): ParseProjectResult {
  const assets = extractInlineAssets(input['index.html'], input['style.css'], input['script.js'])
  return buildParseResult(assets.html, assets.htmlShell, assets.cssSource, assets.jsSource)
}

/**
 * Como {@link parseProjectFilesWithDiagnostics}, mas recebe o HTML já parseado e
 * as fontes de CSS/JS já resolvidas. É livre de DOM (CSS via scanner leve, JS via
 * Babel), então roda em qualquer contexto — inclusive Web Workers.
 */
export function parseProjectFilesFromParts(parts: ParseProjectParts): ParseProjectResult {
  return buildParseResult(parts.html, parts.htmlShell, parts.cssSource, parts.jsSource)
}

function buildParseResult(
  html: HTMLNode[],
  htmlShell: HTMLShell | undefined,
  cssSource: string,
  jsSource: string,
): ParseProjectResult {
  const css = parseCSS(cssSource)
  const jsResult = parseJSWithDiagnostics(jsSource)
  const ir: SZIR = {
    html,
    css,
    js: jsResult.statements,
    extensions: [],
    ...(htmlShell ? { htmlShell } : {}),
  }
  const diagnostics: ParseProjectDiagnostic[] = []

  pushAdvancedDiagnostic(diagnostics, 'index.html', countAdvancedHTML(html))
  pushAdvancedDiagnostic(diagnostics, 'style.css', countAdvancedCSS(css))
  pushAdvancedDiagnostic(diagnostics, 'script.js', countAdvancedJS(jsResult.statements))

  for (const diagnostic of jsResult.diagnostics) {
    diagnostics.push({
      kind: diagnostic.kind,
      file: 'script.js',
      message: diagnostic.message,
    })
  }

  return { ir, diagnostics }
}

function pushAdvancedDiagnostic(
  diagnostics: ParseProjectDiagnostic[],
  file: ParsedFileName,
  count: number,
): void {
  if (count === 0) return
  diagnostics.push({
    kind: 'advanced',
    file,
    count,
    message: `${count} trecho(s) em ${file} ficaram como Código avançado.`,
  })
}
