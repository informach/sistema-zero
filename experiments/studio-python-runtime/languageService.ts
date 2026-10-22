import { mkdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { readJsonBodyWithLimit } from '../../packages/core/src/http'
import {
  PYTHON_LANGUAGE_LIMITS,
  parsePythonLanguageCommand,
} from '../../packages/core/src/studio/python-language'
import { StudioPythonAnalysisAuthorizationSchema } from '../../packages/core/src/studio/python-language-authorization'
import { PythonLanguageSession } from '../../packages/studio-language-service/runtime/pyright'

/** Loopback-only browser qualification. Authentication is tested separately at the real BFF. */
export function createEditorLanguageProbe() {
  const sessions = new Map<string, { projectId: string; language?: PythonLanguageSession }>()
  let opened = 0,
    closed = 0
  const methods: Record<string, number> = {}
  return {
    async fetch(request: Request): Promise<Response> {
      const response = await this.handle(request)
      if (request.method === 'GET') return response
      return Response.json({
        transportVersion: 1,
        status: response.status,
        body: await response.json(),
      })
    },
    async handle(request: Request): Promise<Response> {
      const path = new URL(request.url).pathname.replace('/api/studio/python-language', '')
      if (path === '/metrics')
        return Response.json({
          opened,
          closed,
          alive: sessions.size,
          methods,
          sessions: [...sessions].map(([id, session]) => ({
            id,
            projectId: session.projectId,
            started: Boolean(session.language),
          })),
        })
      if (path === '' && request.method === 'POST') {
        const authorization = StudioPythonAnalysisAuthorizationSchema.parse(
          (await request.json()).authorization,
        )
        const projectId = authorization.subject.id
        const id = crypto.randomUUID().replaceAll('-', '')
        sessions.set(id, { projectId })
        opened++
        return Response.json({ version: 1, sessionId: id, projectId })
      }
      const match = /^\/([a-f0-9]{32})(\/start)?$/.exec(path)
      const id = match?.[1],
        session = id ? sessions.get(id) : undefined
      if (!session || !id) return Response.json({ error: 'expired' }, { status: 410 })
      if (request.method === 'DELETE') {
        session.language?.dispose()
        sessions.delete(id)
        closed++
        return Response.json({ closed: true })
      }
      if (match?.[2]) {
        StudioPythonAnalysisAuthorizationSchema.parse((await request.json()).authorization)
        const root = resolve(
          import.meta.dirname,
          '../../.cache/studio-python-l0/editor-language',
          id,
        )
        await mkdir(root, { recursive: true })
        if (sessions.get(id) !== session)
          return Response.json({ error: 'expired' }, { status: 410 })
        session.language ??= new PythonLanguageSession({
          providedModules: [],
          root,
          serverPath: createRequire(
            resolve(import.meta.dirname, '../../packages/studio-language-service/package.json'),
          ).resolve('pyright/dist/pyright-langserver.js'),
          nodePath: Bun.which('node')!,
        })
        return Response.json({ ready: true })
      }
      if (!session.language) return Response.json({ error: 'not-ready' }, { status: 410 })
      const command = parsePythonLanguageCommand(
        (
          (await readJsonBodyWithLimit(
            request,
            PYTHON_LANGUAGE_LIMITS.maxRequestBytes + 2_001_024,
          )) as { command: unknown }
        ).command,
      )
      const method = command.kind === 'query' ? command.method : command.kind
      methods[method] = (methods[method] ?? 0) + 1
      return Response.json(await session.language.handle(command, request.signal))
    },
    dispose() {
      for (const session of sessions.values()) session.language?.dispose()
      sessions.clear()
    },
  }
}
