import { mock } from 'bun:test'
import assert from 'node:assert/strict'
import { StudioPythonAnalysisAuthorizationSchema } from '@sistemazero/core/studio/python-language-authorization'
import { studioRuntimeSubject } from '@sistemazero/core/studio/runtime-subject'
import { AuthorizeAuthoringRuntimeService } from '../../../members/src/application/studio/authorize-authoring-runtime.service'
import { AuthorizePythonAnalysisService } from '../../../members/src/application/studio/authorize-python-analysis.service'
import { createStudioRuntimeHosts } from '../../../members/src/domain/studio/runtime-hosts'
import { createStudioRuntimePolicy } from '../../../members/src/domain/studio/runtime-policy'
import { authoringFixture } from '../../../members/tests/fakes/studio-authoring-policy'

// A real HTTP server needs its native Fetch realm, independent of UI test preloads.
mock.module('server-only', () => ({}))
const { createStudioPythonLanguageRoutes } = await import('../../src/routes/studio-python-language')
const f = await authoringFixture('python', 'pro')
const draftRevision = crypto.randomUUID(),
  userId = crypto.randomUUID(),
  accountId = crypto.randomUUID()
const authorization = StudioPythonAnalysisAuthorizationSchema.parse({
  operation: 'analyze',
  revision: 'a'.repeat(64),
  subject: studioRuntimeSubject(f.project),
  context: {
    kind: 'authoring',
    purpose: 'authoring',
    lessonId: crypto.randomUUID(),
    draftRevision,
    blockId: null,
  },
})
const policy = await createStudioRuntimePolicy(
  f.configuration,
  createStudioRuntimeHosts(f.configuration.catalog, [
    { runtime: f.project.runtime, origin: 'https://runtime.test' },
  ]),
)
const service = new AuthorizePythonAnalysisService({
  authoring: new AuthorizeAuthoringRuntimeService(
    { readStudioRuntimeContext: async () => ({ revision: draftRevision, block: null }) },
    policy,
  ),
})
const gate = Promise.withResolvers<void>()
let checks = 0,
  completed = false
const routes = createStudioPythonLanguageRoutes(
  {
    requireUploadSession: async () => ({
      id: userId,
      activeProfile: { accountId },
      email: '',
      firstName: 'Bia',
      lastName: '',
      role: 'staff',
      status: 'active',
    }),
  },
  {
    environment: () => ({
      NODE_ENV: 'test',
      STUDIO_PYTHON_LANGUAGE_URL: 'https://analysis.internal',
      STUDIO_PYTHON_LANGUAGE_TOKEN: 'local-private-token',
    }),
    members: {
      async authorizePythonAnalysis(input) {
        checks++
        return {
          status: 200,
          body: await service.execute(
            { userId, accountId, name: 'Bia', privileged: true, readOnly: false },
            input,
          ),
        }
      },
    },
    request: async () => {
      await gate.promise
      return Response.json({ secret: 'native-stack' }, { status: 429 })
    },
  },
)
const server = Bun.serve({
  hostname: '127.0.0.1',
  port: 0,
  fetch: (request) =>
    routes.studioPythonLanguageStart.POST(request, {
      params: Promise.resolve({ id: 'a'.repeat(32) }),
    }),
})
try {
  const response = await fetch(`http://127.0.0.1:${server.port}/`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ authorization }),
    signal: AbortSignal.timeout(3000),
  })
  assert.equal(response.status, 200)
  assert.equal(checks, 1)
  const result = response.json().then((value) => {
    completed = true
    return value
  })
  await Promise.resolve()
  assert.equal(completed, false)
  gate.resolve()
  const data = await result
  assert.equal(data.transportVersion, 1)
  assert.equal(data.status, 429)
  assert.equal(data.body.error.code, 'RATE_LIMITED')
  assert.equal(JSON.stringify(data).includes('native-stack'), false)
  console.log(JSON.stringify({ verified: true, assertions: 7 }))
} finally {
  gate.resolve()
  await server.stop(true)
}
