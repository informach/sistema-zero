import { expect, test } from 'bun:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { runViewSchema } from '@sistemazero/marketing-contracts'
import { executionJournalSchema } from '../src/main/execution/journal'
import { clearExecutionCache } from '../src/main/sync/clear-execution-cache'

function fixture() {
  const projectId = randomUUID(),
    runId = randomUUID(),
    actor = randomUUID(),
    sourceId = randomUUID(),
    revisionId = randomUUID()
  const outcome = {
    status: 'succeeded',
    text: 'Resultado confirmado',
    assetIds: [],
    mode: 'fixture',
    durationMs: 1,
    inputTokens: null,
    outputTokens: null,
  }
  const remote = runViewSchema.parse({
    request: {
      schemaVersion: 1,
      operationId: randomUUID(),
      id: runId,
      projectId,
      entityId: sourceId,
      revisionId,
      intent: 'adjust',
      capability: 'copy',
      provider: 'codex',
      instruction: 'Revisar',
      selection: [],
      protectedIds: [],
      contextHash: 'a'.repeat(64),
      limits: {},
    },
    context: {
      schemaVersion: 1,
      source: {
        id: revisionId,
        entityId: sourceId,
        projectId,
        parentRevisionId: null,
        createdBy: actor,
        createdAt: new Date().toISOString(),
        document: {
          schemaVersion: 1,
          kind: 'direction',
          title: 'Voz',
          body: 'Clara',
          objective: 'Informar',
          audience: 'Equipe',
          voice: 'Direta',
          referenceIds: [],
          protectedTerms: [],
        },
      },
      ancestors: [],
      selected: [],
      directions: [],
      evidence: [],
      protectedIds: [],
    },
    state: 'succeeded',
    epoch: 1,
    createdBy: actor,
    createdAt: new Date().toISOString(),
    attempt: null,
    leaseExpired: false,
    outcome,
  })
  const journal = executionJournalSchema.parse({
    schemaVersion: 1,
    runId,
    projectId,
    contextHash: 'a'.repeat(64),
    generationEpoch: 1,
    claim: { operationId: randomUUID(), expectedEpoch: 0 },
    stage: 'confirmed',
    result: outcome,
    previousResults: [],
    finish: null,
    error: null,
  })
  return { projectId, runId, remote, journal }
}
async function temporary(work: (root: string) => Promise<void>) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'marketing-execution-cache-'))
  try {
    await work(root)
  } finally {
    assert.equal(path.dirname(path.resolve(root)), path.resolve(os.tmpdir()))
    await rm(root, { recursive: true, force: true })
  }
}
test('limpeza remove somente intermediários com recibo remoto idêntico e preserva recuperação e originais', async () =>
  temporary(async (root) => {
    const f = fixture(),
      pending = fixture(),
      runtime = path.join(root, 'runtime'),
      original = path.join(root, 'original.txt')
    pending.journal.stage = 'interrupted'
    pending.journal.projectId = f.projectId
    await mkdir(path.join(runtime, f.runId, '1'), { recursive: true })
    await mkdir(path.join(runtime, pending.runId, '1'), { recursive: true })
    await writeFile(path.join(runtime, f.runId, '1', 'checkpoint.json'), 'saved')
    const waiting = path.join(runtime, pending.runId, '1', 'checkpoint.json')
    await writeFile(waiting, 'pending')
    await writeFile(original, 'original')
    const receipts = new Map<string, typeof f.journal>([
      [f.runId, f.journal],
      [pending.runId, pending.journal],
    ])
    let calls = 0
    const input = {
      projectId: f.projectId,
      runtimeDirectory: runtime,
      store: { execution: (id: string) => receipts.get(id) },
      transport: {
        request: async (route: string) => {
          expect(route).toBe(`/projects/${f.projectId}/runs/${f.runId}`)
          calls++
          return f.remote
        },
      },
      signal: new AbortController().signal,
    }
    const result = await clearExecutionCache(input)
    expect(result).toEqual({ removed: 1, freedBytes: 5, preserved: 1, unavailable: 0 })
    await assert.rejects(readFile(path.join(runtime, f.runId, '1', 'checkpoint.json')), {
      code: 'ENOENT',
    })
    expect(await readFile(waiting, 'utf8')).toBe('pending')
    expect(await readFile(original, 'utf8')).toBe('original')
    expect(receipts.get(f.runId)).toBe(f.journal)
    expect((await clearExecutionCache(input)).removed).toBe(0)
    expect(calls).toBe(1)
  }))
test('resultado divergente, servidor indisponível e cancelamento não removem a cópia local', async () =>
  temporary(async (root) => {
    const f = fixture(),
      runtime = path.join(root, 'runtime'),
      directory = path.join(runtime, f.runId)
    await mkdir(directory, { recursive: true })
    const file = path.join(directory, 'checkpoint.json')
    await writeFile(file, 'saved')
    const input = {
      projectId: f.projectId,
      runtimeDirectory: runtime,
      store: { execution: () => f.journal },
      signal: new AbortController().signal,
    }
    for (const remote of [
      { ...f.remote, request: { ...f.remote.request, projectId: randomUUID() } },
      { ...f.remote, request: { ...f.remote.request, contextHash: 'b'.repeat(64) } },
      { ...f.remote, outcome: { ...f.remote.outcome, text: 'Outro resultado' } },
    ]) {
      expect(
        (await clearExecutionCache({ ...input, transport: { request: async () => remote } }))
          .unavailable,
      ).toBe(1)
      expect(await readFile(file, 'utf8')).toBe('saved')
    }
    await assert.rejects(
      () =>
        clearExecutionCache({
          ...input,
          transport: {
            request: async () => {
              throw new Error('Sem conexão')
            },
          },
        }),
      /Sem conexão/,
    )
    await assert.rejects(
      () =>
        clearExecutionCache({
          ...input,
          signal: AbortSignal.abort(new Error('Cancelado')),
          transport: { request: async () => f.remote },
        }),
      /Cancelado/,
    )
    expect(await readFile(file, 'utf8')).toBe('saved')
  }))
test('junction dentro do trabalho impede remoção recursiva e preserva o destino externo', async () =>
  temporary(async (root) => {
    const f = fixture(),
      runtime = path.join(root, 'runtime'),
      directory = path.join(runtime, f.runId),
      outside = path.join(root, 'outside')
    await mkdir(directory, { recursive: true })
    await mkdir(outside)
    await writeFile(path.join(outside, 'original.txt'), 'original')
    await symlink(outside, path.join(directory, 'linked'), 'junction')
    await assert.rejects(
      () =>
        clearExecutionCache({
          projectId: f.projectId,
          runtimeDirectory: runtime,
          store: { execution: () => f.journal },
          transport: { request: async () => f.remote },
          signal: new AbortController().signal,
        }),
      /Vínculo inesperado/,
    )
    expect(await readFile(path.join(outside, 'original.txt'), 'utf8')).toBe('original')
  }))
