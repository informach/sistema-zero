import { expect, mock, spyOn, test } from 'bun:test'
import { SZ_AUDIO_MODULE_DESCRIPTOR } from '@sistemazero/core/studio/python-provided-modules-sz-audio'
import { providedPythonRelease } from '../../core/tests/fixtures/python-provided-release'
import { describePythonCatalog } from '../../studio/src/python/blocks/selection'

mock.module('server-only', () => ({}))
process.env.JWT_HS256_SECRET ??= 'test-jwt-secret-with-32-characters'
process.env.OPENROUTER_API_KEY ??= 'test-openrouter-key'
const { buildStudioZappyPrompt } = await import('../src/server/zappy-ai')
const { resolveStudioTier } = await import('./fixtures/legacy-studio-tier')

import { pythonZappyFixture } from './fixtures/zappy-python'

test('HTTP assistance uses the approved exact-release audio descriptor and ignores client availability claims', async () => {
  const originalFetch = globalThis.fetch
  const prompts: Array<{ providedModules: Array<{ importName: string; reference: string }> }> = []
  globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body))
    prompts.push(JSON.parse(body.messages[1].content))
    return Response.json({
      choices: [
        {
          message: {
            content: JSON.stringify({
              text: 'Confira os comandos e o caminho do som no seu projeto.',
              scope: 'concept',
              blockReferences: [],
              fileReferences: [],
              lessonReferences: [],
              helpReferences: [],
              suggestions: [],
            }),
          },
        },
      ],
    })
  }) as typeof fetch
  try {
    const current = await pythonZappyFixture('pro', 'kids', {
      runtimeRelease: await providedPythonRelease(),
    })
    const historical = await pythonZappyFixture('pro')
    for (const fixture of [current, historical]) {
      const response = await fixture.request({
        ...fixture.input,
        // This field is not part of the HTTP availability contract.
        pythonProvidedModules: [{ ...SZ_AUDIO_MODULE_DESCRIPTOR, version: '9.9.9' }],
      })
      const envelope = await response.json()
      expect(envelope.status, JSON.stringify(envelope)).toBe(200)
      expect(fixture.state.policies).toBe(1)
      expect(fixture.state.reservations).toBe(1)
    }
    expect(prompts).toHaveLength(2)
    expect(prompts[0]!.providedModules).toHaveLength(1)
    expect(prompts[0]!.providedModules[0]!.importName).toBe('sz_audio')
    expect(prompts[0]!.providedModules[0]!.reference).toContain('sz_audio.play(path: str')
    expect(JSON.stringify(prompts[0])).not.toContain('9.9.9')
    expect(prompts[1]!.providedModules).toEqual([])

    const mismatched = await pythonZappyFixture('pro', 'kids', {
      runtimeRelease: await providedPythonRelease(),
    })
    mismatched.state.mutate = (value) => ({
      ...(value as object),
      catalog: { profiles: [], releases: [] },
    })
    expect((await mismatched.request()).status).toBe(503)
    expect(mismatched.state.reservations).toBe(0)
    expect(prompts).toHaveLength(2)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Python assistance receives provided audio APIs only from server-curated release metadata', async () => {
  const f = await pythonZappyFixture('pro')
  const input = {
    context: f.input.context,
    tier: resolveStudioTier('hacker', 'user'),
    question: 'Como tocar meu WAV com sz_audio?',
    pythonCatalog: describePythonCatalog(),
  }
  const historical = buildStudioZappyPrompt(input)
  expect(JSON.parse(historical.user).providedModules).toEqual([])
  expect(historical.user).not.toContain('miniaudio==1.71')
  const current = buildStudioZappyPrompt({
    ...input,
    pythonProvidedModules: [SZ_AUDIO_MODULE_DESCRIPTOR],
  })
  const modules = JSON.parse(current.user).providedModules
  expect(modules).toHaveLength(1)
  expect(modules[0].importName).toBe('sz_audio')
  expect(modules[0].reference).toContain(
    'sz_audio.play(path: str, *, loop: bool = False, volume: float = 1.0) -> int',
  )
  expect(modules[0].reference).toContain('play não bloqueia nem mantém o processo Python aberto')
  expect(current.system).toContain('um módulo não cria blocos novos')
  expect(current.allowed).toEqual([])
  expect(Buffer.byteLength(current.user)).toBeLessThanOrEqual(20_000)
  if (input.context.environment?.programmingLanguage !== 'python') throw new Error('Python fixture')
  input.context.environment.shadowedModules = ['sz_audio']
  const local = buildStudioZappyPrompt({
    ...input,
    pythonProvidedModules: [SZ_AUDIO_MODULE_DESCRIPTOR],
  })
  expect(JSON.parse(local.user).providedModules).toEqual([])
  expect(local.user).not.toContain('miniaudio==1.71')
})

test('a Python approval that expires during the rank read cannot reserve a question or call AI', async () => {
  const f = await pythonZappyFixture('pro')
  let expiresAt = 0
  f.state.mutate = (value) => {
    if (
      value &&
      typeof value === 'object' &&
      'expiresAt' in value &&
      typeof value.expiresAt === 'number'
    )
      expiresAt = value.expiresAt
    return value
  }
  const clock = spyOn(Date, 'now')
  f.state.onGamification = () => clock.mockReturnValue(expiresAt + 1)
  try {
    const response = await f.request()
    const envelope = await response.json()
    expect(envelope.status).toBe(409)
    expect(envelope.body.error.code).toBe('ZAPPY_CONTEXT_EXPIRED')
    expect(f.state.reservations).toBe(0)
    expect(f.state.knowledge).toBe(0)
  } finally {
    clock.mockRestore()
  }
})

test('Python history, pagination, deletion and feedback use fresh contextual rights independently of free Studio', async () => {
  const f = await pythonZappyFixture('pro')
  const history = {
    operation: 'history',
    projectId: f.project.id,
    authorization: f.input.authorization,
  }
  const deletion = { ...history, operation: 'delete-history' }
  const feedback = {
    ...history,
    operation: 'feedback',
    responseId: crypto.randomUUID(),
    useful: true,
  }
  for (const request of [
    history,
    { ...history, before: crypto.randomUUID() },
    deletion,
    feedback,
  ]) {
    expect((await f.historyRequest(request)).status).toBe(200)
  }
  expect([f.state.history, f.state.deletions, f.state.feedback]).toEqual([2, 1, 1])
  expect(f.state.freeAccess).toBe(0)
  expect(f.state.reservations).toBe(0)
  f.state.allowed = false
  for (const request of [history, deletion, feedback])
    expect((await f.historyRequest(request)).status).toBe(409)
  expect([f.state.history, f.state.deletions, f.state.feedback]).toEqual([2, 1, 1])
  expect((await f.historyRequest({ ...history, projectId: 'foreign-project' })).status).toBe(400)
})

test('Python incomplete/mismatched language and runtime are rejected before policy or credits', async () => {
  const f = await pythonZappyFixture('pro')
  for (const value of [
    { ...f.input, authorization: undefined },
    { ...f.input, transportVersion: undefined },
    {
      ...f.input,
      context: {
        ...f.input.context,
        environment: { ...f.input.context.environment, pythonVersion: '3.13.0' },
      },
    },
    { ...f.input, context: { ...f.input.context, environment: { programmingLanguage: 'python' } } },
    { ...f.input, context: { ...f.input.context, environment: undefined } },
  ])
    expect((await f.request(value)).status).toBe(400)
  expect(f.state.policies).toBe(0)
  expect(f.state.reservations).toBe(0)
})

test('adult Python history operations require adult AI rights independently of Kids rank and still require fresh context', async () => {
  const f = await pythonZappyFixture('classic', 'adult')
  f.state.levelSlug = 'noob'
  const history = {
    operation: 'history',
    projectId: f.project.id,
    authorization: f.input.authorization,
  }
  const operations = [
    history,
    { ...history, operation: 'delete-history' },
    { ...history, operation: 'feedback', responseId: crypto.randomUUID(), useful: true },
  ]
  for (const input of operations) expect((await f.historyRequest(input)).status).toBe(200)
  expect([f.state.history, f.state.deletions, f.state.feedback]).toEqual([1, 1, 1])
  expect(f.state.policies).toBe(3)
  f.state.allowed = false
  for (const input of operations) expect((await f.historyRequest(input)).status).toBe(409)
  expect([f.state.history, f.state.deletions, f.state.feedback]).toEqual([1, 1, 1])
  expect(f.state.policies).toBe(6)
  f.state.allowed = true
  f.state.adultAi = false
  f.state.levelSlug = 'hacker'
  for (const input of operations) expect((await f.historyRequest(input)).status).toBe(403)
  expect(f.state.policies).toBe(6)
  expect([f.state.history, f.state.deletions, f.state.feedback]).toEqual([1, 1, 1])
  expect(f.state.reservations).toBe(0)
  expect(f.state.freeAccess).toBe(0)
})

test('Python fresh lesson revocation and wrong-actor approvals cannot reserve questions', async () => {
  const f = await pythonZappyFixture('classic')
  f.state.allowed = false
  expect((await f.request()).status).toBe(409)
  f.state.allowed = true
  f.state.mutate = (value) => ({
    ...(value as object),
    actor: { userId: crypto.randomUUID(), accountId: crypto.randomUUID() },
  })
  expect((await f.request()).status).toBe(503)
  expect(f.state.reservations).toBe(0)
})

test('Python Classic and contextual Pro answer through their language prompt without free Studio rights or JavaScript knowledge', async () => {
  const originalFetch = globalThis.fetch
  const sent: Array<{ system: string; project: Record<string, unknown> }> = []
  globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body))
    sent.push({
      system: body.messages[0].content,
      project: JSON.parse(body.messages[1].content).project,
    })
    return Response.json({
      choices: [
        {
          message: {
            content: JSON.stringify({
              text: 'Observe a ordem dos comandos e confira o nome usado.',
              scope: 'concept',
              blockReferences: [],
              fileReferences: [],
              lessonReferences: [],
              helpReferences: [],
              suggestions: [],
            }),
          },
        },
      ],
    })
  }) as typeof fetch
  try {
    for (const kind of ['classic', 'pro'] as const) {
      const f = await pythonZappyFixture(kind)
      const response = await f.request()
      expect(response.status).toBe(200)
      const envelope = await response.json()
      expect(envelope.transportVersion).toBe(1)
      expect(envelope.status).toBe(200)
      expect(envelope.body.response.kind).toBe(kind)
      expect(envelope.body.response.text).toContain('ordem dos comandos')
      expect(f.state.freeAccess).toBe(0)
      expect(f.state.knowledge).toBe(0)
      expect(f.state.policies).toBe(1)
      expect(f.state.reservations).toBe(1)
    }
    expect(sent).toHaveLength(2)
    expect(sent.every((item) => item.system.includes('tutor de programação Python'))).toBe(true)
    expect(sent[1]?.project).toMatchObject({
      pro: { diagnostics: [{ code: 'reportUndefinedVariable', source: 'pyright' }] },
    })
    expect(JSON.stringify(sent)).not.toContain('Bibliotecas no Pro são dependências npm')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Python prompt budgets sanitize source, preserve approved catalog only and cannot silently use the JS catalog', async () => {
  const f = await pythonZappyFixture('pro')
  const context = {
    ...f.input.context,
    pro: {
      ...f.input.context.pro!,
      diagnostics: Array.from({ length: 20 }, () => ({
        path: 'src/file0.py',
        code: 'reportGeneralTypeIssues',
        source: 'pyright' as const,
        line: 1,
        message: '😀'.repeat(290),
      })),
    },
    code: Array.from({ length: 8 }, (_, index) => ({
      path: `src/file${index}.py`,
      content: `password = "private-secret"\n${'print("😀")\n'.repeat(1000)}`,
    })),
  }
  const tier = resolveStudioTier('hacker', 'user')
  expect(() => buildStudioZappyPrompt({ context, tier, question: 'Como imprimir?' })).toThrow(
    'catálogo Python',
  )
  const prompt = buildStudioZappyPrompt({
    context,
    tier,
    question: 'Como imprimir?',
    pythonCatalog: describePythonCatalog(),
  })
  expect(Buffer.byteLength(prompt.user)).toBeLessThanOrEqual(20000)
  expect(prompt.user).not.toContain('private-secret')
  expect(prompt.allowed).toEqual([])
  expect(prompt.system).toContain('Pyright')
})

test('Python BFF masks complete credential expressions using Python syntax before model serialization', async () => {
  for (const kind of ['classic', 'pro'] as const) {
    const f = await pythonZappyFixture(kind)
    const path = f.project.python.entrypoint
    const content =
      'password = (\n "family-private-marker"\n)\napi_key = 123 // int("other-private-marker")\nauth_token = "prefix", "tuple-private-marker"\nprint("public value")'
    const source = [{ path, content }]
    const context = {
      ...f.input.context,
      ...(kind === 'pro'
        ? { code: source }
        : { python: { activeFile: path, workspace: 'ready' as const, source } }),
    }
    const prompt = buildStudioZappyPrompt({
      context,
      tier: resolveStudioTier('hacker', 'user'),
      question: 'Me explique a ordem',
      pythonCatalog: describePythonCatalog(),
    })
    expect(prompt.user).not.toContain('family-private-marker')
    expect(prompt.user).not.toContain('other-private-marker')
    expect(prompt.user).not.toContain('tuple-private-marker')
    expect(prompt.user).toContain('public value')
    expect(source[0]!.content).toBe(content)
  }
})

test('Python memory accepts its own language and cannot reuse JavaScript or ambiguous legacy advice', async () => {
  const f = await pythonZappyFixture('pro')
  const prompt = buildStudioZappyPrompt({
    context: f.input.context,
    tier: resolveStudioTier('hacker', 'user'),
    question: 'Como continuo?',
    pythonCatalog: describePythonCatalog(),
    recentTurns: [
      { role: 'user', text: 'PYTHON_QUESTION', programmingLanguage: 'python' },
      { role: 'assistant', text: 'PYTHON_ANSWER', programmingLanguage: 'python', kind: 'pro' },
      {
        role: 'assistant',
        text: 'JAVASCRIPT_ONLY',
        programmingLanguage: 'javascript',
        kind: 'pro',
      },
      { role: 'assistant', text: 'LEGACY_AMBIGUOUS', kind: 'pro' },
      { role: 'assistant', text: 'WRONG_PEDAGOGY', programmingLanguage: 'python', kind: 'classic' },
    ],
  })
  expect(
    JSON.parse(prompt.user).conversaRecente.map((turn: { text: string }) => turn.text),
  ).toEqual(['PYTHON_QUESTION', 'PYTHON_ANSWER'])
  expect(prompt.user).not.toContain('JAVASCRIPT_ONLY')
  expect(prompt.user).not.toContain('LEGACY_AMBIGUOUS')
  expect(prompt.user).not.toContain('WRONG_PEDAGOGY')
})
