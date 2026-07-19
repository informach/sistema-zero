import type { GeneratedFiles, SourceMap } from '#generators'
import { generateProjectFilesWithMap } from '#generators'
import type { HTMLNode, HTMLShell, SZIRInput } from '#ir'
import { assignStableIdsToIR } from '#ir'
import type { ParseProjectDiagnostic } from '#parsers'
import { parseProjectFilesFromParts } from '#parsers'

export const BRIDGE_JS_HEADER = '// Gerado pelo Sistema Zero Studio'

export interface BridgeReverseParseInput {
  files: GeneratedFiles
  /**
   * HTML de `index.html` já parseado na main thread (onde o `DOMParser` nativo
   * existe). O worker não pode parsear HTML — `DOMParser` não existe em
   * `WorkerGlobalScope`. `cssSource`/`jsSource` são as fontes JÁ RESOLVIDAS
   * (de arquivo externo ou de `<style>`/`<script>` inline extraído), e
   * `htmlShell` já carrega o `placement` correspondente.
   */
  html: HTMLNode[]
  htmlShell?: HTMLShell
  cssSource: string
  jsSource: string
  ir: SZIRInput | null
  projectName: string
  installedExtensionIds: string[]
}

export type BridgeReverseParseResult =
  | {
      kind: 'generated-match'
      diagnostics: ParseProjectDiagnostic[]
      sourceMap: SourceMap
    }
  | {
      kind: 'parsed'
      diagnostics: ParseProjectDiagnostic[]
      ir: SZIRInput | null
      sourceMap: SourceMap | null
    }

export interface BridgeReverseParseWorkerRequest extends BridgeReverseParseInput {
  requestId: number
}

export type BridgeReverseParseWorkerResponse =
  | {
      requestId: number
      result: BridgeReverseParseResult
    }
  | {
      requestId: number
      error: string
    }

export function runBridgeReverseParse(input: BridgeReverseParseInput): BridgeReverseParseResult {
  if (input.ir) {
    const generated = generateProjectFilesWithMap({
      ir: input.ir,
      projectName: input.projectName,
      jsHeader: BRIDGE_JS_HEADER,
    })
    if (filesEqual(generated.files, input.files)) {
      return { kind: 'generated-match', diagnostics: [], sourceMap: generated.sourceMap }
    }
  }

  const result = parseProjectFilesFromParts({
    html: input.html,
    htmlShell: input.htmlShell,
    cssSource: input.cssSource,
    jsSource: input.jsSource,
  })
  if (result.diagnostics.some((diagnostic) => diagnostic.kind === 'syntaxError')) {
    return {
      kind: 'parsed',
      diagnostics: result.diagnostics,
      ir: null,
      sourceMap: null,
    }
  }

  const newIR = assignStableIdsToIR(result.ir, 'bridge')
  newIR.extensions = uniqueExtensionIds(input.installedExtensionIds).map((extensionId) => ({
    extensionId,
  }))
  const generated = generateProjectFilesWithMap({
    ir: newIR,
    projectName: input.projectName,
    jsHeader: BRIDGE_JS_HEADER,
  })

  return {
    kind: 'parsed',
    diagnostics: result.diagnostics,
    ir: newIR,
    sourceMap: generated.sourceMap,
  }
}

function filesEqual(a: GeneratedFiles, b: GeneratedFiles): boolean {
  return (
    a['index.html'] === b['index.html'] &&
    a['style.css'] === b['style.css'] &&
    a['script.js'] === b['script.js']
  )
}

function uniqueExtensionIds(ids: string[]): string[] {
  return [...new Set(ids.filter(Boolean))]
}
