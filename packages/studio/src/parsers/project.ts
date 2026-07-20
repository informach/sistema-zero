import type { BehaviorIR, HTMLNode, HTMLShell, JSStatement, SZIRV2 } from '#ir'
import {
  BEHAVIOR_SECTION_MARKERS,
  behaviorStatements,
  countAdvancedCSS,
  countAdvancedHTML,
  countAdvancedJS,
  splitLegacyBehavior,
} from '#ir'
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
  ir: SZIRV2
  diagnostics: ParseProjectDiagnostic[]
}

export function parseProjectFiles(input: ParseProjectInput): SZIRV2 {
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
  const jsResult = parseBehaviorSource(jsSource)
  const ir: SZIRV2 = {
    version: 2,
    html,
    css,
    behavior: jsResult.behavior,
    extensions: [],
    ...(htmlShell ? { htmlShell } : {}),
  }
  const diagnostics: ParseProjectDiagnostic[] = []

  pushAdvancedDiagnostic(diagnostics, 'index.html', countAdvancedHTML(html))
  pushAdvancedDiagnostic(diagnostics, 'style.css', countAdvancedCSS(css))
  pushAdvancedDiagnostic(diagnostics, 'script.js', countAdvancedJS(behaviorStatements(ir)))

  for (const diagnostic of jsResult.diagnostics) {
    diagnostics.push({
      kind: diagnostic.kind,
      file: 'script.js',
      message: diagnostic.message,
    })
  }

  return { ir, diagnostics }
}

function parseBehaviorSource(source: string): {
  behavior: BehaviorIR
  diagnostics: ReturnType<typeof parseJSWithDiagnostics>['diagnostics']
} {
  const lines = stripGeneratedLifecycleEnvelope(source.split(/\r?\n/))
  const startIndex = lines.findIndex((line) => line.trim() === BEHAVIOR_SECTION_MARKERS.start)
  const eventsIndex = lines.findIndex((line) => line.trim() === BEHAVIOR_SECTION_MARKERS.events)
  const loopsIndex = lines.findIndex((line) => line.trim() === BEHAVIOR_SECTION_MARKERS.loops)
  if (!(startIndex >= 0 && eventsIndex > startIndex && loopsIndex > eventsIndex)) {
    const legacy = parseJSWithDiagnostics(source)
    return { behavior: splitLegacyBehavior(legacy.statements), diagnostics: legacy.diagnostics }
  }

  const start = parseJSWithDiagnostics(
    [...lines.slice(0, startIndex), ...lines.slice(startIndex + 1, eventsIndex)].join('\n'),
  )
  const events = parseJSWithDiagnostics(lines.slice(eventsIndex + 1, loopsIndex).join('\n'))
  const loops = parseJSWithDiagnostics(lines.slice(loopsIndex + 1).join('\n'))
  return {
    behavior: {
      start: start.statements,
      events: events.statements,
      loops: unwrapGeneratedPeriodicLoops(loops.statements),
    },
    diagnostics: [...start.diagnostics, ...events.diagnostics, ...loops.diagnostics],
  }
}

/** Desfaz apenas o adaptador automático emitido para raízes “A cada N”. */
function unwrapGeneratedPeriodicLoops(statements: JSStatement[]): JSStatement[] {
  return statements.flatMap((statement) => {
    if (
      statement.type === 'g2d:updateEachFrame' &&
      statement.body.length === 1 &&
      (statement.body[0]?.type === 'g2d:everyFrames' ||
        statement.body[0]?.type === 'g2d:everySeconds')
    ) {
      return [statement.body[0]]
    }
    if (
      statement.type === 'gk:onUpdate' &&
      statement.body.length === 1 &&
      statement.body[0]?.type === 'gk:everySeconds'
    ) {
      return [statement.body[0]]
    }
    return [statement]
  })
}

const GENERATED_LIFECYCLE_OPENERS = new Set([
  '(function __szProjectRun() {',
  'SZGame2D.onStart(function __szProjectRun() {',
  'SZGameKit.runProject(function __szProjectRun() {',
  'SZGame3D.runProject(function __szProjectRun() {',
  'SZGameKit3D.runProject(function __szProjectRun() {',
  'SZWorld3D.runProject(function __szProjectRun() {',
])

const GENERATED_ENGINE_BOOTS = new Set([
  'SZGameKit.start();',
  'SZGameKit3D.start();',
  'SZWorld3D.start();',
])

const GENERATED_PROJECT_RUN_CONTEXT =
  /^const __szProjectRunContext(?:_\d+)? = window\.__SZProjectLifecycle\.begin\((?:\(\) => (?:SZGame2D\.restart|SZGameKit\.restartGame)\(\))?\);$/

/** Remove somente a casca exata emitida pelo gerador; código do aluno fica intacto. */
function stripGeneratedLifecycleEnvelope(sourceLines: string[]): string[] {
  const lines = [...sourceLines]
  const startMarker = lines.findIndex((line) => line.trim() === BEHAVIOR_SECTION_MARKERS.start)
  if (startMarker < 1) return lines
  const hasManagedRun = GENERATED_PROJECT_RUN_CONTEXT.test(lines[startMarker - 1]?.trim() ?? '')
  const openerIndex = startMarker - (hasManagedRun ? 2 : 1)
  if (openerIndex < 0) return lines
  const opener = lines[openerIndex]?.trim() ?? ''
  if (!GENERATED_LIFECYCLE_OPENERS.has(opener)) return lines

  lines.splice(openerIndex, hasManagedRun ? 2 : 1)
  while (lines.length > 0 && lines.at(-1)?.trim() === '') lines.pop()
  if (GENERATED_ENGINE_BOOTS.has(lines.at(-1)?.trim() ?? '')) lines.pop()
  while (lines.length > 0 && lines.at(-1)?.trim() === '') lines.pop()

  const expectedClose = opener.startsWith('SZGame2D.')
    ? '}, "__sz-project");'
    : opener.startsWith('(function')
      ? '})();'
      : '});'
  if (lines.at(-1)?.trim() === expectedClose) lines.pop()
  return lines
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
