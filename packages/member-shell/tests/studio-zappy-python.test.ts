import { expect, mock, spyOn, test } from 'bun:test'
import { describePythonCatalog } from '../../studio/src/python/blocks/selection'

mock.module('server-only', () => ({}))
process.env.JWT_HS256_SECRET ??= 'test-jwt-secret-with-32-characters'
process.env.OPENROUTER_API_KEY ??= 'test-openrouter-key'
const { buildStudioZappyPrompt } = await import('../src/server/zappy-ai')
const { resolveStudioTier } = await import('./fixtures/legacy-studio-tier')

import { pythonZappyFixture } from './fixtures/zappy-python'

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
