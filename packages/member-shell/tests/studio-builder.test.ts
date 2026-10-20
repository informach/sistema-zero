import { afterEach, describe, expect, mock, spyOn, test } from 'bun:test'
import type { StudioAiActor, StudioAiUsageAction } from '@sistemazero/core/ai-credits'
import {
  createStudioProRevision,
  type StudioProBuilderCommand,
  type StudioProBuilderJob,
  studioProDigest,
} from '@sistemazero/core/studio'

mock.module('server-only', () => ({}))
process.env.JWT_HS256_SECRET ??= 'builder-test-secret-at-least-32-characters'
const { advanceStudioBuilder, refreshStudioBuilderPreview } = await import(
  '../src/server/studio-builder'
)
type Members = Parameters<typeof advanceStudioBuilder>[0]['members']
type Answer = import('../src/server/studio-builder-tools').StudioBuilderAnswer
afterEach(() => mock.restore())
const actor: StudioAiActor = {
  accountId: crypto.randomUUID(),
  userId: crypto.randomUUID(),
  privileged: false,
}
const proposal = (before: string, find = 'goal = 10', content = 'goal = 12'): Answer => ({
  action: 'propose',
  summary: 'Ajustar a meta',
  plan: ['Ajustar a meta e conferir a partida.'],
  inspections: [],
  edits: [{ operation: 'replace', path: 'src/main.ts', before, find, content }],
})
const provider = (answer: Answer) =>
  Response.json({
    id: 'gen-builder-test',
    usage: { cost: 0.000003 },
    choices: [{ message: { content: JSON.stringify(answer) } }],
  })
const validated = () => {
  const id = 'a'.repeat(64),
    url = `https://runtime.test/v1/artifacts/${id}/index.html`
  return Response.json({
    ok: true,
    artifact: { id, url, sha256: 'b'.repeat(64), expiresAt: Date.now() + 60000 },
    validation: { profileVersion: 1, runtimeFingerprint: 'c'.repeat(64) },
    evidence: ['types', 'build', 'playtest', 'capture'].map((kind) => ({
      kind,
      status: 'passed',
      detail: 'Verificado',
      ...(kind === 'capture' ? { artifactUrl: new URL('__studio-proof.png', url).href } : {}),
    })),
  })
}
function network(fn: (url: string, init?: RequestInit) => Promise<Response>) {
  return spyOn(globalThis, 'fetch').mockImplementation(
    Object.assign((url: RequestInfo | URL, init?: RequestInit) => fn(String(url), init), {
      preconnect: globalThis.fetch.preconnect,
    }),
  )
}
async function fixture() {
  const base = await createStudioProRevision({
    projectId: 'game',
    templateId: 'canvas-puzzle',
    devScript: 'dev',
    assets: '{}',
    assetFiles: {},
    directories: ['src'],
    files: {
      'index.html': '<main>Game</main>',
      'src/main.ts': 'export const goal = 10;\nexport const speed = 2;',
    },
  })
  let job: StudioProBuilderJob = {
    id: crypto.randomUUID(),
    projectId: base.projectId,
    base,
    objective: 'Melhorar o objetivo',
    model: 'provider/model',
    phase: 'queued',
    version: 0,
    modelCalls: 0,
    validationCalls: 0,
    createdAt: new Date().toISOString(),
    deadlineAt: new Date(Date.now() + 300000).toISOString(),
    expiresAt: new Date(Date.now() + 600000).toISOString(),
    leaseUntil: null,
    result: null,
    error: null,
    cost: null,
    notes: [],
  }
  let token: string | null = null
  const usage: (StudioAiUsageAction | { operation: 'costs' })[] = []
  const commands: StudioProBuilderCommand[] = []
  const members: Members = {
    async studioBuilder(_actor, command) {
      commands.push(command)
      if (command.operation === 'claim') {
        if (!token && ['queued', 'validating'].includes(job.phase)) {
          token = crypto.randomUUID()
          const generating = job.phase === 'queued'
          job = {
            ...job,
            phase: generating ? 'generating' : 'validating',
            modelCalls: job.modelCalls + Number(generating),
            validationCalls: job.validationCalls + Number(!generating),
            version: job.version + 1,
            leaseUntil: new Date(Date.now() + 150000).toISOString(),
          }
          return {
            status: 200,
            body: { state: { job, token, ...(generating ? {} : { binaries: {} }) } },
          }
        }
      } else if (command.operation === 'preview-claim') {
        if (job.phase === 'review' && !token) {
          token = crypto.randomUUID()
          job = {
            ...job,
            version: job.version + 1,
            leaseUntil: new Date(Date.now() + 150000).toISOString(),
          }
          return { status: 200, body: { state: { job, token, binaries: {} } } }
        }
      } else if (command.operation === 'preview-checkpoint') {
        if (command.token !== token || command.version !== job.version || !job.result)
          return { status: 409, body: { state: null } }
        job = {
          ...job,
          result: { ...job.result, preview: command.preview, evidence: command.evidence },
          version: job.version + 1,
          leaseUntil: null,
        }
        token = null
      } else if (command.operation === 'preview-release') {
        if (command.token !== token || command.version !== job.version)
          return { status: 409, body: { state: null } }
        job = { ...job, version: job.version + 1, leaseUntil: null }
        token = null
      } else if (command.operation === 'checkpoint') {
        if (command.token !== token || command.version !== job.version)
          return { status: 409, body: { state: null } }
        job = {
          ...job,
          phase: command.phase,
          result: command.result,
          notes: command.notes,
          error: command.error,
          leaseUntil: null,
          version: job.version + 1,
        }
        token = null
      } else if (command.operation === 'cancel') {
        job = { ...job, phase: 'cancelled', version: job.version + 1, leaseUntil: null }
        token = null
      }
      return { status: 200, body: { state: { job, token: null } } }
    },
    async studioAiUsage(_actor, action) {
      usage.push(action)
      if (action.operation === 'reserve')
        return {
          status: 200,
          body: {
            reservation: {
              allowed: true,
              source: 'openrouter',
              priceCaps: { prompt: 1, completion: 4, request: 0 },
              expiresAt: job.deadlineAt,
              credits: {
                dayLimit: 10,
                dayRemaining: 9,
                monthLimit: 100,
                monthRemaining: 99,
                monthRenewsOn: '2026-11-01',
              },
            },
          },
        }
      if (action.operation === 'dispatch')
        return {
          status: 200,
          body: { dispatch: { source: 'openrouter', apiKey: 'adult-test-key' } },
        }
      return { status: 200, body: { ok: true } }
    },
  }
  const input = {
    members,
    actor,
    id: job.id,
    projectId: job.projectId,
    parentOrigin: 'https://kids.test',
    runtimeUrl: 'https://runtime.test',
    runtimeToken: 'runtime-test-key',
  }
  return {
    input,
    usage,
    commands,
    job: () => job,
    advance: () => advanceStudioBuilder(input),
    hash: await studioProDigest(base.files['src/main.ts']!),
  }
}

describe('durable builder orchestration', () => {
  test('JavaScript generation keeps the exact prompt and never requests Python authorization', async () => {
    const f = await fixture()
    const { STUDIO_BUILDER_SYSTEM } = await import('../src/server/studio-builder-tools')
    network(async (_url, init) => {
      const body = JSON.parse(String(init?.body))
      expect(body.messages[0].content).toBe(STUDIO_BUILDER_SYSTEM)
      expect(body.messages[1].content).not.toContain('providedModules')
      return provider(proposal(f.hash))
    })
    expect((await f.advance())?.phase).toBe('validating')
    expect(f.commands.some((command) => command.operation === 'authorize-generation')).toBe(false)
  })
  test('refreshes the retained candidate with new proof without calling the model or ledger', async () => {
    const f = await fixture()
    let modelCalls = 0,
      builds = 0
    network(async (url, init) => {
      if (url.includes('openrouter')) {
        modelCalls++
        return provider(proposal(f.hash))
      }
      builds++
      const input = JSON.parse(String(init?.body))
      expect(input.files['src/main.ts']).toContain('goal = 12')
      expect(input.validate).toBe(true)
      return validated()
    })
    await f.advance()
    await f.advance()
    const settled = f.usage.length
    const result = await refreshStudioBuilderPreview(f.input)
    expect(result?.phase).toBe('review')
    expect(result?.result?.preview?.revisionHash).toBe(f.job().result?.revisionHash)
    expect(result?.result?.preview).toMatchObject({
      validation: { runtimeFingerprint: 'c'.repeat(64) },
    })
    expect(modelCalls).toBe(1)
    expect(builds).toBe(2)
    expect(f.usage).toHaveLength(settled)
    expect(f.commands.at(-1)?.operation).toBe('preview-checkpoint')
  })
  test('does not replace the previous candidate proof when a preview rebuild fails', async () => {
    const f = await fixture()
    let builds = 0
    network(async (url) => {
      if (url.includes('openrouter')) return provider(proposal(f.hash))
      if (++builds > 1) throw new Error('runtime unavailable')
      return validated()
    })
    await f.advance()
    await f.advance()
    const previous = f.job().result?.preview
    await expect(refreshStudioBuilderPreview(f.input)).rejects.toThrow()
    expect(f.job().result?.preview).toEqual(previous)
    expect(f.job().phase).toBe('review')
    expect(f.commands.at(-1)?.operation).toBe('preview-release')
    expect(f.usage.filter((item) => item.operation === 'dispatch')).toHaveLength(1)
  })
  test('inspection resumes at attempt 2; validation uses the working revision and never sends binaries to the model', async () => {
    const f = await fixture(),
      bodies: Record<string, unknown>[] = []
    let modelCalls = 0
    network(async (url, init) => {
      const body = JSON.parse(String(init?.body))
      bodies.push(body)
      if (url.includes('openrouter')) {
        modelCalls++
        return provider(
          modelCalls === 1
            ? {
                ...proposal(f.hash),
                action: 'inspect',
                edits: [],
                inspections: [{ tool: 'read', path: 'src/main.ts', query: null, startLine: 1 }],
              }
            : proposal(f.hash),
        )
      }
      expect(body.validate).toBe(true)
      expect(body.files['src/main.ts']).toContain('goal = 12')
      return validated()
    })
    expect((await f.advance())?.phase).toBe('queued')
    expect((await f.advance())?.phase).toBe('validating')
    expect((await f.advance())?.phase).toBe('review')
    expect(f.job().result?.preview?.revisionHash).toBe(f.job().result?.revisionHash)
    expect(f.job().result?.preview).toMatchObject({
      validation: { runtimeFingerprint: 'c'.repeat(64) },
    })
    expect(
      f.usage.filter((action) => action.operation === 'dispatch').map((action) => action.attempt),
    ).toEqual([1, 2])
    expect(JSON.stringify(bodies.slice(0, 2))).not.toContain('base64')
    expect(f.job().base.files['src/main.ts']).toContain('goal = 10')
    expect(f.job().result?.evidence).toHaveLength(4)
    expect((await f.advance())?.phase).toBe('review')
    expect(modelCalls).toBe(2)
  })
  test('ambiguous inference fails without another dispatch and records uncertain usage', async () => {
    const f = await fixture(),
      fetched = network(async () => {
        throw new Error('connection lost')
      })
    expect((await f.advance())?.phase).toBe('failed')
    await f.advance()
    expect(fetched).toHaveBeenCalledTimes(1)
    expect(f.usage.filter((action) => action.operation === 'settle')).toMatchObject([
      { settlement: { attempt: 1, status: 'uncertain' } },
    ])
  })
  test('a real validation failure keeps the candidate for one bounded repair against its current hash', async () => {
    const f = await fixture()
    let modelCalls = 0,
      checks = 0
    network(async (url) => {
      if (url.includes('openrouter')) {
        modelCalls++
        return provider(
          modelCalls === 1
            ? proposal(f.hash)
            : proposal(
                await studioProDigest(f.job().result!.change.patches[0]!.content!),
                'speed = 2',
                'speed = 3',
              ),
        )
      }
      return ++checks === 1
        ? Response.json(
            {
              ok: false,
              code: 'TYPECHECK_FAILED',
              message: 'Erro de tipo',
              output: 'src/main.ts TS2322',
            },
            { status: 422 },
          )
        : validated()
    })
    await f.advance()
    expect((await f.advance())?.phase).toBe('queued')
    expect(f.job().notes.at(-1)).toContain('TS2322')
    await f.advance()
    expect((await f.advance())?.phase).toBe('review')
    expect(f.job().result?.change.patches[0]?.before).toBe(f.hash)
    expect(f.job().result?.change.patches[0]?.content).toContain(
      'goal = 12;\nexport const speed = 3',
    )
    expect(modelCalls).toBe(2)
    expect(checks).toBe(2)
  })
  test('concurrent advance does not infer twice; cancellation rejects the late checkpoint', async () => {
    const f = await fixture()
    const gate = Promise.withResolvers<Response>(),
      entered = Promise.withResolvers<void>()
    const fetched = network(async () => {
      entered.resolve()
      return gate.promise
    })
    const first = f.advance()
    await entered.promise
    expect((await f.advance())?.phase).toBe('generating')
    await f.input.members.studioBuilder(actor, {
      operation: 'cancel',
      id: f.input.id,
      projectId: f.input.projectId,
    })
    gate.resolve(provider(proposal(f.hash)))
    await expect(first).rejects.toThrow('mudou')
    expect(f.job().phase).toBe('cancelled')
    expect(f.job().result).toBeNull()
    expect(fetched).toHaveBeenCalledTimes(1)
  })
  test('missing or mismatched capture evidence cannot reach review', async () => {
    const f = await fixture()
    network(async (url) => {
      if (url.includes('openrouter')) return provider(proposal(f.hash))
      const body = await validated().json()
      body.evidence[3].artifactUrl = 'https://external.test/image.png'
      return Response.json(body)
    })
    await f.advance()
    expect((await f.advance())?.phase).toBe('failed')
    expect(f.job().error).toContain('captura')
  })
})
