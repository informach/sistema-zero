import { createAnalysisControllerProbe } from '../../packages/studio/e2e-runtime/fixtures/analysisController'
import { createBlocklyEditorProbe } from '../../packages/studio/e2e-runtime/fixtures/blocklyEditorHost'
import {
  disposePythonBlocks,
  mountPythonBlocks,
  renderedPythonBlockState,
  roundtripPythonBlockly,
  undoRenderedPythonBlock,
} from '../../packages/studio/e2e-runtime/fixtures/pythonBlocks'
import { provePythonVisualEdits } from '../../packages/studio/e2e-runtime/fixtures/pythonVisualEdits'
import {
  type PythonAnalysisSession,
  preparePythonAnalysisSession,
} from '../../packages/studio/src/python/language/session'
import type {
  PythonNode,
  PythonParsedDocument,
} from '../../packages/studio/src/python/language/types'
import { PYTHON_BLOCK_FIXTURES } from '../studio-python-turtle/blockFixtures'
import { TURTLE_BLOCK_FIXTURES } from '../studio-python-turtle/turtleBlockFixtures'

const config = await (await fetch('/configuration')).json()
let session: PythonAnalysisSession | undefined
let frame: HTMLIFrameElement | undefined
let operation: AbortController | undefined
let generation = 0
let last: PythonParsedDocument | undefined
const api = {
  async start() {
    session?.dispose()
    frame?.remove()
    frame = document.createElement('iframe')
    document.body.append(frame)
    const url = new URL('analysis.html', config.providerFrameURL)
    session = await preparePythonAnalysisSession({
      frame,
      url: url.href,
      allowedOrigins: [url.origin],
      runtimeManifestSha256: config.runtime.manifestSha256,
      signal: new AbortController().signal,
    })
  },
  async parse(source: string) {
    operation = new AbortController()
    last = await session!.parse(
      {
        projectId: 'syntax-probe',
        instanceId: 'editor-1',
        path: 'main.py',
        revision: 'a'.repeat(64),
        generation: ++generation,
      },
      source,
      operation.signal,
    )
    return last
  },
  async render(node?: PythonNode) {
    return session!.render(node ?? last!.tree!)
  },
  async blocks() {
    const results: { id: string; blocks: number; opaque: number; elapsedMs: number }[] = []
    for (const fixture of PYTHON_BLOCK_FIXTURES) {
      const start = performance.now()
      const parsed = await api.parse(fixture.source)
      if (!parsed.tree) throw new Error('Fixture inválida.')
      const converted = roundtripPythonBlockly(parsed.tree)
      const generated = await session!.render(converted.tree)
      const reparsed = await api.parse(generated)
      if (!reparsed.tree || reparsed.diagnostics.length)
        throw new Error('Blockly produziu Python inválido.')
      results.push({
        id: fixture.id,
        blocks: converted.blocks,
        opaque: converted.opaque,
        elapsedMs: performance.now() - start,
      })
    }
    return results
  },
  async editBlocks() {
    return provePythonVisualEdits(session!)
  },
  async turtleBlocks() {
    const results: { id: string; types: string[]; expected: string[]; excluded: string[] }[] = []
    for (const fixture of TURTLE_BLOCK_FIXTURES) {
      const parsed = await api.parse(fixture.source)
      if (!parsed.tree) throw new Error('Fixture Turtle inválida.')
      const converted = roundtripPythonBlockly(parsed.tree, true)
      const generated = await session!.render(converted.tree)
      const reparsed = await api.parse(generated)
      if (!reparsed.tree || reparsed.diagnostics.length)
        throw new Error('Blocos Turtle produziram Python inválido.')
      results.push({
        id: fixture.id,
        types: converted.types,
        expected: fixture.expected,
        excluded: fixture.excluded ?? [],
      })
    }
    return results
  },
  async showBlocks() {
    const document = await api.parse('print("Olá, turma!")\n')
    mountPythonBlocks(document.tree!)
    if (frame) frame.hidden = true
  },
  blockState: renderedPythonBlockState,
  undoBlocks: undoRenderedPythonBlock,
  async corpus() {
    const measurements: { fixture: string; path: string; elapsedMs: number; tokens: number }[] = []
    for (const fixture of ['pacmanOriginal', 'spaceArenaOriginal']) {
      const project = await (await fetch(`/project/${fixture}`)).json()
      for (const [path, file] of Object.entries(project.tree) as [
        string,
        { kind: string; content?: string },
      ][]) {
        if (file.kind !== 'file' || !path.endsWith('.py')) continue
        const start = performance.now()
        const parsed = await session!.parse(
          {
            projectId: fixture,
            instanceId: 'corpus',
            path,
            revision: 'b'.repeat(64),
            generation: ++generation,
          },
          file.content!,
        )
        if (!parsed.tree || parsed.diagnostics.length || parsed.source !== file.content)
          throw new Error(`Analysis changed or rejected ${fixture}/${path}`)
        measurements.push({
          fixture,
          path,
          elapsedMs: performance.now() - start,
          tokens: parsed.tokens.length,
        })
      }
    }
    return measurements
  },
  cancel() {
    operation?.abort()
  },
  dispose() {
    disposePythonBlocks()
    session?.dispose()
    frame?.remove()
  },
}
declare global {
  var analysisProbe: typeof api
}
globalThis.analysisProbe = api
globalThis.pythonAnalysisControllerProbe = await createAnalysisControllerProbe()
globalThis.pythonBlocklyEditorProbe = await createBlocklyEditorProbe()
