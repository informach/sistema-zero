import { expect, it, mock } from 'bun:test'
import { resolve } from 'node:path'
import {
  StudioPythonAnalysisAuthorizationSchema,
  studioPythonAnalysisBinding,
} from '@sistemazero/core/studio/python-language-authorization'
import { studioRuntimeSubject } from '@sistemazero/core/studio/runtime-subject'
import { NextResponse } from 'next/server'
import { AuthorizeAuthoringRuntimeService } from '../../members/src/application/studio/authorize-authoring-runtime.service'
import { AuthorizePythonAnalysisService } from '../../members/src/application/studio/authorize-python-analysis.service'
import { createStudioRuntimeHosts } from '../../members/src/domain/studio/runtime-hosts'
import { createStudioRuntimePolicy } from '../../members/src/domain/studio/runtime-policy'
import { authoringFixture } from '../../members/tests/fakes/studio-authoring-policy'
import type { SessionUser } from '../src/lib/types'

mock.module('server-only', () => ({}))
const { createStudioPythonLanguageRoutes, pythonLanguageOwner } = await import(
  '../src/routes/studio-python-language'
)
const learner: SessionUser = {
  id: crypto.randomUUID(),
  email: '',
  firstName: 'Bia',
  lastName: '',
  role: 'staff',
  status: 'active',
  activeProfile: { accountId: crypto.randomUUID() },
}
const session = 'a'.repeat(32)
const env = {
  NODE_ENV: 'test' as const,
  STUDIO_PYTHON_LANGUAGE_URL: 'https://analysis.internal',
  STUDIO_PYTHON_LANGUAGE_TOKEN: 'private-token-for-language-service-only',
}
const request = (body: unknown) =>
  new Request('https://kids.test/api/studio/python-language', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
const params = { params: Promise.resolve({ id: session }) }

async function fixture() {
  const f = await authoringFixture('python', 'pro')
  const draftRevision = crypto.randomUUID()
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
  const state = { allowed: true, checks: 0, mutate: (value: unknown): unknown => value }
  const service = new AuthorizePythonAnalysisService({
    authoring: new AuthorizeAuthoringRuntimeService(
      { readStudioRuntimeContext: async () => ({ revision: draftRevision, block: null }) },
      policy,
    ),
  })
  const calls: { url: string; init?: RequestInit }[] = []
  const options = {
    environment: () => env,
    members: {
      async authorizePythonAnalysis(input: typeof authorization) {
        state.checks++
        if (!state.allowed) return { status: 403, body: { error: { code: 'ACCESS_DENIED' } } }
        const body = await service.execute(
          {
            userId: learner.id,
            accountId: learner.activeProfile!.accountId,
            name: 'Bia',
            privileged: true,
            readOnly: false,
          },
          input,
        )
        return { status: 200, body: state.mutate(body) }
      },
    },
    request: async (url: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(url), init })
      return Response.json(
        String(url).endsWith('/open')
          ? { version: 1, sessionId: session, projectId: f.project.id }
          : { ready: true },
      )
    },
  }
  const routes = createStudioPythonLanguageRoutes(
    { requireUploadSession: async () => learner },
    options,
  )
  return { ...f, authorization, state, calls, options, routes }
}

it('authenticates every operation before credentials or policy', async () => {
  let checks = 0
  const routes = createStudioPythonLanguageRoutes(
    {
      requireUploadSession: async () => {
        checks++
        return NextResponse.json({ error: 'blocked' }, { status: 403 })
      },
    },
    {
      environment() {
        throw new Error('Authentication first')
      },
    },
  )
  expect((await routes.studioPythonLanguage.POST(request({}))).status).toBe(403)
  expect((await routes.studioPythonLanguageStart.POST(request({}), params)).status).toBe(403)
  expect((await routes.studioPythonLanguageSession.POST(request({}), params)).status).toBe(403)
  expect(
    (
      await routes.studioPythonLanguageSession.DELETE(
        new Request('https://kids.test', { method: 'DELETE' }),
        params,
      )
    ).status,
  ).toBe(403)
  expect(checks).toBe(4)
})

it('freshly authorizes reservation/start/commands; revocation blocks work but keeps cleanup available', async () => {
  const f = await fixture()
  const response = await f.routes.studioPythonLanguage.POST(
    request({ authorization: f.authorization }),
  )
  expect(response.status).toBe(200)
  expect(response.headers.get('cache-control')).toBe('private, no-store, no-transform')
  expect(await response.text()).not.toContain(env.STUDIO_PYTHON_LANGUAGE_TOKEN)
  expect(
    (
      await f.routes.studioPythonLanguageStart.POST(
        request({ authorization: f.authorization }),
        params,
      )
    ).status,
  ).toBe(200)
  const command = {
    version: 1,
    id: 'sync',
    kind: 'sync',
    entrypoint: 'main.py',
    baseRevision: 0,
    revision: 1,
    changes: [{ path: 'main.py', version: 1, source: 'x = 1' }],
  }
  expect(
    (
      await f.routes.studioPythonLanguageSession.POST(
        request({ authorization: f.authorization, command }),
        params,
      )
    ).status,
  ).toBe(200)
  expect(f.state.checks).toBe(3)
  const binding = await studioPythonAnalysisBinding(pythonLanguageOwner(learner), f.authorization)
  expect(JSON.parse(String(f.calls[0]!.init!.body))).toEqual({ projectId: f.project.id, binding })
  expect(JSON.parse(String(f.calls[1]!.init!.body))).toEqual({ binding })
  expect(JSON.parse(String(f.calls[2]!.init!.body))).toEqual(command)
  expect(new Headers(f.calls[2]!.init?.headers).get('x-studio-python-operation')).toBe('sync')
  for (const call of f.calls) {
    expect(call.url).toContain(`/v1/python-language/${pythonLanguageOwner(learner)}/`)
    expect(new Headers(call.init?.headers).get('x-studio-python-binding')).toBe(binding)
    expect(new Headers(call.init?.headers).get('authorization')).toBe(
      `Bearer ${env.STUDIO_PYTHON_LANGUAGE_TOKEN}`,
    )
  }
  f.state.allowed = false
  expect(
    (
      await f.routes.studioPythonLanguageStart.POST(
        request({ authorization: f.authorization }),
        params,
      )
    ).status,
  ).toBe(403)
  expect(
    (
      await f.routes.studioPythonLanguageSession.POST(
        request({ authorization: f.authorization, command }),
        params,
      )
    ).status,
  ).toBe(403)
  expect(f.calls).toHaveLength(3)
  expect(
    (
      await f.routes.studioPythonLanguageSession.POST(
        request({
          authorization: f.authorization,
          command: { version: 1, id: 'cancel', kind: 'cancel', requestId: 'sync' },
        }),
        params,
      )
    ).status,
  ).toBe(200)
  expect(
    (
      await f.routes.studioPythonLanguageSession.DELETE(
        new Request('https://kids.test', { method: 'DELETE' }),
        params,
      )
    ).status,
  ).toBe(200)
  expect(f.state.checks).toBe(5)
  expect(new Headers(f.calls.at(-2)?.init?.headers).get('x-studio-python-operation')).toBe('cancel')
  expect(new Headers(f.calls.at(-1)?.init?.headers).has('x-studio-python-binding')).toBe(false)
})

it('rejects stale, forged, wrong-actor and wrong-subject decisions before the service', async () => {
  const f = await fixture()
  for (const change of [
    { actor: { userId: crypto.randomUUID(), accountId: learner.activeProfile!.accountId } },
    { actor: { userId: learner.id, accountId: crypto.randomUUID() } },
    { operation: 'execute' },
    { revision: 'f'.repeat(64) },
    { subjectSha256: 'f'.repeat(64) },
    { projectId: 'another-project' },
    { runtime: { ...f.project.runtime, releaseId: 'other' } },
    { releaseStatus: 'revoked' },
    { expiresAt: 1 },
    { issuedAt: Date.now() + 100_000 },
    { context: { ...f.authorization.context, lessonId: crypto.randomUUID() } },
  ]) {
    f.state.mutate = (value) => ({ ...Object(value), ...change })
    expect(
      (await f.routes.studioPythonLanguage.POST(request({ authorization: f.authorization })))
        .status,
    ).toBe(503)
  }
  expect(f.calls).toHaveLength(0)
})

it('rejects grants, invalid commands, unscoped callers, oversize bodies and unsafe destinations before policy/network', async () => {
  const f = await fixture()
  for (const body of [
    { projectId: f.project.id },
    { authorization: { ...f.authorization, capabilities: ['edit'] } },
    { authorization: { ...f.authorization, operation: 'execute' } },
    { authorization: f.authorization, binding: 'a'.repeat(64) },
  ])
    expect((await f.routes.studioPythonLanguage.POST(request(body))).status).toBe(400)
  expect(
    (
      await f.routes.studioPythonLanguageSession.POST(
        request({
          authorization: f.authorization,
          command: {
            version: 1,
            id: 'bad',
            kind: 'sync',
            entrypoint: 'main.py',
            baseRevision: 0,
            revision: 1,
            changes: [{ path: 'pyrightconfig.json', version: 1, source: '{}' }],
          },
        }),
        params,
      )
    ).status,
  ).toBe(400)
  expect(
    (await f.routes.studioPythonLanguage.POST(request({ padding: 'x'.repeat(2_001_100) }))).status,
  ).toBe(413)
  expect(
    (
      await f.routes.studioPythonLanguageSession.DELETE(
        new Request('https://kids.test', { method: 'DELETE' }),
        { params: Promise.resolve({ id: '../another-owner' }) },
      )
    ).status,
  ).toBe(400)
  for (const url of [
    'http://analysis.remote',
    'https://user:pass@analysis.test',
    'https://analysis.test?secret=x',
    'https://analysis.test#fragment',
  ]) {
    const routes = createStudioPythonLanguageRoutes(
      { requireUploadSession: async () => learner },
      { ...f.options, environment: () => ({ ...env, STUDIO_PYTHON_LANGUAGE_URL: url }) },
    )
    expect(
      (await routes.studioPythonLanguage.POST(request({ authorization: f.authorization }))).status,
    ).toBe(503)
  }
  expect(f.state.checks).toBe(0)
  expect(f.calls).toHaveLength(0)
})

it('sanitizes upstream failures and separates profile/account identities', async () => {
  const f = await fixture()
  for (const failure of [429, 410, 500]) {
    const routes = createStudioPythonLanguageRoutes(
      { requireUploadSession: async () => learner },
      {
        ...f.options,
        request: async () => Response.json({ secret: 'internal-stack' }, { status: failure }),
      },
    )
    const response = await routes.studioPythonLanguageStart.POST(
      request({ authorization: f.authorization }),
      params,
    )
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.transportVersion).toBe(1)
    expect(data.status).toBe(failure === 500 ? 503 : failure)
    expect(JSON.stringify(data)).not.toContain('internal-stack')
  }
  expect(pythonLanguageOwner({ ...learner, id: crypto.randomUUID() })).not.toBe(
    pythonLanguageOwner(learner),
  )
  expect(
    pythonLanguageOwner({ ...learner, activeProfile: { accountId: crypto.randomUUID() } }),
  ).not.toBe(pythonLanguageOwner(learner))
})

it('acknowledges fresh authorization over real HTTP before native startup completes, preserving late status', async () => {
  const child = Bun.spawn(
    [process.execPath, resolve(import.meta.dirname, 'fixtures/python-language-http.ts')],
    { stdout: 'pipe', stderr: 'pipe', windowsHide: true },
  )
  const deadline = setTimeout(() => child.kill(), 8000)
  try {
    const [exit, stdout, stderr] = await Promise.all([
      child.exited,
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
    ])
    expect({ exit, stderr: stderr.slice(0, 3000) }).toEqual({ exit: 0, stderr: '' })
    expect(JSON.parse(stdout)).toEqual({ verified: true, assertions: 7 })
  } finally {
    clearTimeout(deadline)
    child.kill()
  }
}, 10_000)

it('cancelling the acknowledged response aborts the native request without a late stream write', async () => {
  const f = await fixture()
  let upstreamSignal: AbortSignal | undefined
  const routes = createStudioPythonLanguageRoutes(
    { requireUploadSession: async () => learner },
    {
      ...f.options,
      request: async (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          upstreamSignal = init?.signal ?? undefined
          upstreamSignal?.addEventListener('abort', () => reject(upstreamSignal?.reason), {
            once: true,
          })
        }),
    },
  )
  const response = await routes.studioPythonLanguageStart.POST(
    request({ authorization: f.authorization }),
    params,
  )
  expect(response.status).toBe(200)
  expect(upstreamSignal?.aborted).toBe(false)
  await response.body?.cancel()
  expect(upstreamSignal?.aborted).toBe(true)
})
