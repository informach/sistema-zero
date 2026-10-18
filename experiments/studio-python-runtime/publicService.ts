import { mock } from 'bun:test'
import { StudioAuthoringCatalogSchema } from '../../packages/core/src/studio/authoring-catalog'
import type {
  StudioFreeRuntimeRequest,
  StudioPublicRuntimeRequest,
} from '../../packages/core/src/studio/runtime-authorization'
import type { StudioRuntimeRelease } from '../../packages/core/src/studio/runtime-catalog'
import { AuthorizePublicRuntimeService } from '../../packages/members/src/application/studio/authorize-public-runtime.service'
import { createStudioRuntimeHosts } from '../../packages/members/src/domain/studio/runtime-hosts'
import { createStudioRuntimePolicy } from '../../packages/members/src/domain/studio/runtime-policy'
import type { PythonProjectDocument } from '../../packages/studio/src/core/editableProject'
import { createEditableStudioProject } from '../../packages/studio/src/core/projectFactory'
import { TURTLE_EXTENSION } from '../../packages/studio/src/runtime/python/turtle/contract'
import { refinePythonProjectDocument } from '../../packages/studio/src/state/pythonProjectValidation'
import {
  currentPublishedPublication,
  currentPublishedSource,
  PublicationError,
  publicationCommand,
} from '../../packages/studio-runtime/src/publications'
import { memoryArtifactBucket } from '../../packages/studio-runtime/tests/artifact-bucket'
import { createFreeRuntimeProbe } from './freeService'

/** Local qualification: actual BFF/retention/policy; controlled session, Hub and R2 ports.
 * No production credentials, authentication/SQL claim or catalog activation. */
export async function createPublicRuntimeProbe(
  release: StudioRuntimeRelease,
  runtimeOrigin: string,
  hostOrigin: string,
) {
  mock.module('server-only', () => ({}))
  process.env.JWT_HS256_SECRET ??= 'local-public-probe-secret-with-32-characters'
  process.env.STUDIO_PRO_RUNTIME_URL = hostOrigin
  process.env.STUDIO_PRO_RUNTIME_TOKEN = 'local-public-probe-internal-token'
  const originalR2 = { ...(await import('../../packages/member-shell/src/server/r2')) }
  const privateObjects = new Map<string, Uint8Array<ArrayBuffer>>()
  mock.module('../../packages/member-shell/src/server/r2', () => ({
    ...originalR2,
    r2PutObjectPrivate: async (input: { key: string; body: Uint8Array }) => {
      privateObjects.set(input.key, new Uint8Array(input.body))
    },
    r2GetObjectPrivate: async (key: string) => {
      const bytes = privateObjects.get(key)
      if (!bytes) throw new Error('Missing probe game')
      return {
        body: new Blob([bytes]).stream(),
        contentType: 'application/json',
        contentLength: bytes.length,
      }
    },
  }))
  const { createStudioRoutes } = await import('../../packages/member-shell/src/routes/studio')
  const free = await createFreeRuntimeProbe(release, runtimeOrigin)
  const freeOptionsResponse = await free.fetch(new Request(`${hostOrigin}/api/studio/free-options`))
  if (!freeOptionsResponse?.ok) throw new Error('Probe free options unavailable')
  const options = await freeOptionsResponse.json()
  const configuration = StudioAuthoringCatalogSchema.parse(options.catalog)
  const actor = {
    userId: '55555555-5555-4555-8555-555555555555',
    accountId: '66666666-6666-4666-8666-666666666666',
  }
  const storage = memoryArtifactBucket()
  const visible = new Map<string, boolean>()
  let status: 'active' | 'revoked' = 'active'
  let policy = await runtimePolicy()
  let publicRuntime = new AuthorizePublicRuntimeService(policy)
  const requests: { operation: string; bytes: number; actor: null }[] = []
  async function runtimePolicy() {
    const current = structuredClone(configuration)
    current.releases[0]!.status = status
    return createStudioRuntimePolicy(
      current,
      createStudioRuntimeHosts(current.catalog, [
        { runtime: configuration.releases[0]!.runtime, origin: runtimeOrigin },
      ]),
    )
  }
  const routes = createStudioRoutes({
    media: {
      requireUploadSession: async () => ({
        id: actor.userId,
        role: 'student',
        activeProfile: { accountId: actor.accountId },
      }),
    },
    members: {
      getGamification: async () => ({ status: 200, body: { level: { slug: 'god' } } }),
      checkStudioAccess: async () => ({
        status: 200,
        body: { access: { 'estudio-completo': true } },
      }),
      authorizeFreeRuntime: async (input: StudioFreeRuntimeRequest) => {
        const response = await free.fetch(
          new Request(`${hostOrigin}/api/studio/free-runtime`, {
            method: 'POST',
            body: JSON.stringify(input),
          }),
        )
        if (!response) throw new Error('Missing free response')
        return { status: response.status, body: await response.json() }
      },
      authorizePublicRuntime: async (input: StudioPublicRuntimeRequest) => {
        requests.push({
          operation: input.operation,
          bytes: new TextEncoder().encode(JSON.stringify(input)).length,
          actor: null,
        })
        try {
          return { status: 200, body: await publicRuntime.execute(input) }
        } catch {
          return { status: 403, body: { error: { code: 'RUNTIME_DENIED' } } }
        }
      },
    },
    hub: {
      createShowcaseThreadStudioStandalone: async (input: { playId: string }) => {
        visible.set(input.playId, true)
        return {
          status: 200,
          body: { thread: { id: crypto.randomUUID(), playId: input.playId }, deduped: false },
        }
      },
      resolveStudioPlay: async (id: string) => ({
        status: 200,
        body: { visible: visible.get(id) === true, authorDisplayName: 'Bia' },
      }),
    },
  } as never)
  return {
    async fetch(request: Request) {
      const url = new URL(request.url)
      if (url.pathname === '/public-probe/setup') {
        status = 'active'
        policy = await runtimePolicy()
        publicRuntime = new AuthorizePublicRuntimeService(policy)
        requests.length = 0
        const kind = url.searchParams.get('kind') === 'pro' ? 'pro' : 'classic'
        const turtle = url.searchParams.get('turtle') === '1'
        const created = await createEditableStudioProject(
          { id: crypto.randomUUID(), name: 'Meu jogo Python', programmingLanguage: 'python', kind },
          {
            catalog: configuration.catalog,
            runtime: configuration.releases[0]!.runtime,
            releaseStatus: 'active',
          },
        )
        if (created.programmingLanguage !== 'python') throw new Error('Python project required')
        const project: PythonProjectDocument = created
        if (turtle)
          project.installedExtensions = [
            { id: TURTLE_EXTENSION.id, version: TURTLE_EXTENSION.version, installedAt: Date.now() },
          ]
        return Response.json({ project: await refinePythonProjectDocument(project), actor })
      }
      if (url.pathname === '/public-probe/hide') {
        visible.set(url.searchParams.get('playId') ?? '', false)
        return Response.json({ ok: true })
      }
      if (url.pathname === '/public-probe/revoke') {
        status = 'revoked'
        policy = await runtimePolicy()
        publicRuntime = new AuthorizePublicRuntimeService(policy)
        return Response.json({ ok: true })
      }
      if (url.pathname === '/public-probe/requests') return Response.json(requests)
      if (url.pathname === '/v1/publications') {
        if (request.headers.get('authorization') !== 'Bearer local-public-probe-internal-token')
          return new Response(null, { status: 401 })
        const body = await request.json()
        try {
          return Response.json(
            body.operation === 'resolve'
              ? await currentPublishedSource(storage.bucket, body.playId)
              : body.operation === 'resolve-metadata'
                ? await currentPublishedPublication(storage.bucket, body.playId)
                : await publicationCommand(storage.bucket, body),
          )
        } catch (error) {
          if (error instanceof PublicationError)
            return Response.json({ error: { message: error.message } }, { status: error.status })
          throw error
        }
      }
      if (url.pathname === '/api/studio/public-runtime')
        return routes.studioPublicRuntime.POST(request)
      if (url.pathname === '/api/studio/publish-standalone')
        return routes.studioPublishStandalone.POST(request)
      if (url.pathname === '/api/studio/publication') return routes.studioPublication.POST(request)
      if (url.pathname.startsWith('/api/studio/play/'))
        return routes.studioPlay.GET(request, {
          params: Promise.resolve({ id: url.pathname.slice('/api/studio/play/'.length) }),
        })
      return null
    },
  }
}
