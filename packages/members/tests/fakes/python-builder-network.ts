import { expect } from 'bun:test'
import { createHash } from 'node:crypto'

import {
  type StudioPythonExecutionMetadata,
  verifyStudioPythonExecutionMetadata,
} from '@sistemazero/core/studio/python-execution-content'
import {
  StudioPythonInputOpenSchema,
  StudioPythonValidationRequestSchema,
} from '@sistemazero/core/studio/python-validation-input'
import { capturePythonProRevisionPayload } from '../../../studio/src/state/pythonProRevision'
import { PNG } from './gallery-python-source'
import { controlledPythonBuilderReport } from './python-builder-report'
import { authoringFixture } from './studio-authoring-policy'

type Mode =
  | 'passed'
  | 'types-failed'
  | 'types-incomplete'
  | 'compile-failed'
  | 'playtest-failed'
  | 'bad-origin'
export async function pythonBuilderNetworkFixture(mode: Mode) {
  const { project } = await authoringFixture('python', 'pro')
  if (project.programmingLanguage !== 'python' || project.kind !== 'pro')
    throw new Error('Python Pro expected')
  project.tree['src/main.py'] = {
    kind: 'file',
    content: 'from helper import n\nprint("ação", n)\n',
  }
  project.assets = [
    {
      id: 'drawing',
      name: 'sprite',
      kind: 'image',
      source: 'upload',
      proPath: 'assets/sprite.png',
      dataUrl: PNG,
    },
  ]
  const { base, binaries } = await capturePythonProRevisionPayload(project)
  const requests: string[] = [],
    uploaded = new Map<string, Uint8Array>(),
    operations: string[] = []
  let snapshot: StudioPythonExecutionMetadata | undefined
  const server = Bun.serve({
    port: 0,
    hostname: '127.0.0.1',
    async fetch(req): Promise<Response> {
      const path = new URL(req.url).pathname
      requests.push(`${req.method} ${path}`)
      if (path.startsWith('/v1/python-language/')) {
        if (req.method === 'DELETE') return Response.json({ closed: true })
        if (path.endsWith('/open'))
          return Response.json({ version: 1, projectId: base.projectId, sessionId: 'c'.repeat(32) })
        if (path.endsWith('/start')) return Response.json({ ready: true })
        if (req.headers.get('x-studio-python-operation') === 'sync')
          return Response.json({ version: 1, id: 'builder_sync', kind: 'synced', revision: 1 })
        const diagnostic = {
          path: 'src/main.py',
          start: 0,
          length: 4,
          source: 'Pyright',
          code: 'controlled',
          message: 'controlled type diagnostic',
          severity: mode === 'types-failed' ? 'error' : 'warning',
        }
        return Response.json({
          version: 1,
          id: 'builder_types',
          kind: 'result',
          method: 'projectDiagnostics',
          revision: 1,
          path: 'src/main.py',
          documentVersion: 1,
          result:
            mode === 'types-failed'
              ? [diagnostic]
              : mode === 'types-incomplete'
                ? Array.from({ length: 100 }, () => diagnostic)
                : [],
        })
      }
      if (path === '/v1/python/inputs') {
        const input = StudioPythonInputOpenSchema.parse(await req.json())
        snapshot = await verifyStudioPythonExecutionMetadata(input.snapshot)
        return Response.json({
          ok: true,
          input: {
            version: 1,
            inputId: 'd'.repeat(32),
            generation: crypto.randomUUID(),
            projectId: snapshot.projectId,
            revision: snapshot.revision,
            owner: input.owner,
            executionId: input.executionId,
            requestId: input.requestId,
            expiresAt: Date.now() + 60000,
          },
        })
      }
      if (path.startsWith('/v1/python/files/')) {
        const bytes = new Uint8Array(await req.arrayBuffer()),
          sha256 = path.split('/').at(-1)
        if (!sha256) throw new Error('Expected upload hash')
        expect(createHash('sha256').update(bytes).digest('hex')).toBe(sha256)
        uploaded.set(sha256, bytes)
        return Response.json({ ok: true, file: { sha256, bytes: bytes.byteLength } })
      }
      if (path === '/v1/python/validate') {
        if (!snapshot) throw new Error('Expected admitted snapshot')
        const input = StudioPythonValidationRequestSchema.parse(await req.json())
        expect(
          snapshot.files.every((file) => uploaded.get(file.sha256)?.byteLength === file.byteLength),
        ).toBe(true)
        const report = controlledPythonBuilderReport(
          snapshot,
          input.recipe,
          mode === 'compile-failed' || mode === 'playtest-failed' ? mode : 'passed',
        )
        const previewId = createHash('sha256').update(crypto.randomUUID()).digest('hex')
        return Response.json({
          ok: true,
          report,
          ...(report.status !== 'passed'
            ? {}
            : {
                preview: {
                  kind: 'python-preview',
                  version: 1,
                  id: previewId,
                  projectId: snapshot.projectId,
                  revision: snapshot.revision,
                  runtimeManifestSha256: snapshot.configuration.runtime.manifestSha256,
                  url: `${mode === 'bad-origin' ? 'https://attacker.test' : server.url.origin}/v1/python-previews/${previewId}/index.html`,
                  sha256: 'f'.repeat(64),
                  expiresAt: Date.now() + 60000,
                },
              }),
        })
      }
      if (path === '/v1/python/inputs/remove' || path === '/v1/python/previews/remove')
        return Response.json({ ok: true })
      return new Response('unexpected route', { status: 404 })
    },
  })
  const cleanup: string[] = []
  const options = {
    revision: base,
    binaries,
    owner: 'a'.repeat(64),
    binding: 'b'.repeat(64),
    serviceUrl: server.url.href,
    serviceToken: 'private-analysis-token',
    allowLocalHttp: true,
    signal: new AbortController().signal,
    runtime: {
      url: server.url.href,
      token: 'private-execution-token',
      executionId: 'builder-local-test',
      requestId: crypto.randomUUID(),
      parentOrigin: 'https://kids.test',
      recipe: { version: 1 },
    },
    async authorize(
      candidate: { hash: string },
      metadata: { revision: string },
      operation: 'analyze' | 'execute',
    ) {
      expect(candidate.hash).toBe(base.hash)
      expect(metadata.revision).not.toBe(base.hash)
      operations.push(operation)
    },
    cleanupFailed() {
      cleanup.push('analysis')
    },
    runtimeCleanupFailed() {
      cleanup.push('execution')
    },
  }
  return { options, requests, uploaded, operations, cleanup, stop: () => server.stop(true) }
}
