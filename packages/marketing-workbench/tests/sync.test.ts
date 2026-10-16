import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import {
  createPieceBatch,
  type EditorialDocument,
  type EditorialItem,
  type EditorialOperation,
  operationSchema,
  type ProjectView,
} from '@sistemazero/marketing-contracts'
import { BrowserWorkspaceAdapter, WorkspaceHttpError } from '../src/browser-adapter'
import type { JournalEntry, MutationJournal } from '../src/browser-journal'
import { projectEntries } from '../src/projection'

class Journal implements MutationJournal {
  rows = new Map<string, JournalEntry>()
  async entries() {
    return structuredClone([...this.rows.values()])
  }
  async add(entry: JournalEntry) {
    const existing = this.rows.get(entry.id)
    if (existing && JSON.stringify(existing.input) !== JSON.stringify(entry.input))
      throw new Error('Outra operação')
    if (!existing) this.rows.set(entry.id, structuredClone(entry))
  }
  async resolve(ids: string[], replacement: JournalEntry | null) {
    for (const id of ids) {
      const entry = this.rows.get(id)
      if (!entry || !['conflict', 'blocked'].includes(entry.state) || entry.resolvedAt)
        throw new Error('Rascunho mudou')
    }
    for (const id of ids) {
      const entry = this.rows.get(id)
      if (entry)
        this.rows.set(id, {
          ...entry,
          resolvedAt: new Date().toISOString(),
          replacementId: replacement?.id ?? null,
        })
    }
    if (replacement) this.rows.set(replacement.id, replacement)
  }
  async settle(id: string, state: JournalEntry['state'], result: unknown, error: string | null) {
    const entry = this.rows.get(id)
    if (!entry) throw new Error('Ausente')
    if (!['confirmed', 'conflict'].includes(entry.state))
      this.rows.set(id, { ...entry, state, result, error })
  }
}
const document: EditorialDocument = {
  schemaVersion: 1,
  kind: 'direction',
  title: 'Direção',
  body: 'Texto original',
  objective: 'Aprender criando',
  audience: 'Famílias',
  voice: 'Direta',
  protectedTerms: [],
  referenceIds: [],
}
function fixture() {
  const projectId = randomUUID(),
    id = randomUUID(),
    operation: EditorialOperation = {
      schemaVersion: 1,
      operationId: randomUUID(),
      projectId,
      entityId: id,
      baseRevisionId: null,
      action: 'save',
      document,
    },
    item: EditorialItem = {
      id,
      projectId,
      kind: 'direction',
      revisionId: randomUUID(),
      document,
      archived: false,
      updatedAt: new Date().toISOString(),
    }
  return { operation, item }
}
describe('bancada e confirmação', () => {
  test('pauta local tem grafo completo, sem revisão confirmada inventada', () => {
    const batch = createPieceBatch({
      projectId: randomUUID(),
      title: 'P01',
      brief: 'Abertura',
      format: 'story',
      medium: 'image',
    })
    const view: ProjectView = {
      items: [],
      pending: [],
      pendingBatches: [
        {
          operation: batch,
          state: 'local',
          result: null,
          error: null,
          createdAt: new Date().toISOString(),
        },
      ],
      report: { phase: 'offline', message: 'Sem rede', pending: 1, confirmedAt: null },
    }
    const entries = projectEntries(view)
    expect(entries).toHaveLength(3)
    expect(
      entries.every((item) => item.confirmed === null && item.pending[0] === batch.operationId),
    ).toBe(true)
  })
  test('conflito mantém a revisão remota separada do rascunho', () => {
    const { operation, item } = fixture()
    const view: ProjectView = {
      items: [item],
      pending: [
        {
          operation: {
            ...operation,
            baseRevisionId: item.revisionId,
            document: { ...document, body: 'Meu rascunho' },
          },
          state: 'conflict',
          result: null,
          error: 'Revisão mudou',
          dependsOnOperationId: null,
          createdAt: new Date().toISOString(),
        },
      ],
      pendingBatches: [],
      report: { phase: 'blocked', message: 'Conflito', pending: 1, confirmedAt: null },
    }
    const entry = projectEntries(view)[0]
    expect(entry?.confirmed?.document).toEqual(document)
    expect(entry?.document).toMatchObject({ body: 'Meu rascunho' })
    expect(entry?.conflict).toBe(true)
  })
  test('resposta perdida após commit preserva identidade em nova instância e só confirma uma revisão', async () => {
    const journal = new Journal(),
      { operation, item } = fixture(),
      seen: string[] = []
    let lose = true
    const transport = async (_path: string, _method?: string, body?: unknown) => {
      expect(body).toEqual(operation)
      seen.push(operation.operationId)
      if (lose) {
        lose = false
        throw new WorkspaceHttpError(503, 'NETWORK', 'Resposta perdida')
      }
      return {
        status: 'applied',
        operationId: operation.operationId,
        entityId: item.id,
        revisionId: item.revisionId,
        sequence: 2,
        item,
      }
    }
    await new BrowserWorkspaceAdapter('pessoa', transport, journal).save(operation, null)
    expect((await journal.entries())[0]?.state).toBe('local')
    await new BrowserWorkspaceAdapter('pessoa', transport, journal).synchronize()
    expect(new Set(seen).size).toBe(1)
    expect((await journal.entries())[0]?.state).toBe('confirmed')
  })
  test('recibo novo não faz o cursor ignorar alterações de outra pessoa', async () => {
    const journal = new Journal(),
      { operation, item } = fixture(),
      other = {
        ...item,
        id: randomUUID(),
        revisionId: randomUUID(),
        document: { ...document, title: 'Outra pessoa' },
      }
    const cursors: number[] = []
    const adapter = new BrowserWorkspaceAdapter(
      'pessoa',
      async (path) => {
        if (path === '/operations')
          return {
            status: 'applied',
            operationId: operation.operationId,
            entityId: item.id,
            revisionId: item.revisionId,
            sequence: 2,
            item,
          }
        const cursor = Number(new URL(`http://local${path}`).searchParams.get('cursor'))
        cursors.push(cursor)
        const sequence = cursor + 1
        return {
          events: [
            {
              schemaVersion: 1,
              projectId: item.projectId,
              sequence,
              type: 'revision',
              entityId: cursor === 0 ? other.id : item.id,
              revisionId: cursor === 0 ? other.revisionId : item.revisionId,
              actorId: randomUUID(),
              createdAt: item.updatedAt,
            },
          ],
          items: [{ ...(cursor === 0 ? other : item), sequence }],
          cursor: sequence,
          hasMore: cursor === 0,
          resetRequired: false,
          permissions: ['read', 'edit'],
        }
      },
      journal,
    )
    await adapter.save(operation, null)
    const view = await adapter.view(item.projectId)
    expect(cursors).toEqual([0, 1])
    expect(view.items.map((value) => value.id).sort()).toEqual([item.id, other.id].sort())
  })
  test('falha ao guardar localmente impede qualquer envio', async () => {
    const journal = new Journal(),
      { operation } = fixture()
    let sent = 0
    journal.add = async () => {
      throw new Error('Disco cheio')
    }
    const adapter = new BrowserWorkspaceAdapter(
      'pessoa',
      async () => {
        sent++
        return null
      },
      journal,
    )
    await expect(adapter.save(operation, null)).rejects.toThrow('Disco cheio')
    expect(sent).toBe(0)
  })
  test('resolução preserva rascunho anterior e envia uma substituição com a base conferida', async () => {
    const journal = new Journal(),
      { operation, item } = fixture(),
      base = randomUUID()
    await journal.add({
      id: operation.operationId,
      scope: 'pessoa',
      createdAt: new Date().toISOString(),
      kind: 'operation',
      input: operation,
      state: 'conflict',
      error: 'Conflito',
    })
    const replacement = {
      schemaVersion: 1 as const,
      projectId: item.projectId,
      operationId: randomUUID(),
      changes: [{ entityId: item.id, baseRevisionId: base, action: 'save' as const, document }],
    }
    let sent = 0
    const adapter = new BrowserWorkspaceAdapter(
      'pessoa',
      async (_path, _method, body) => {
        sent++
        expect(body).toEqual(replacement)
        return { status: 'applied', operationId: replacement.operationId, items: [item], cursor: 2 }
      },
      journal,
    )
    await adapter.resolveDrafts({
      projectId: item.projectId,
      operationIds: [operation.operationId],
      replacement,
    })
    expect(sent).toBe(1)
    expect(
      (await journal.entries()).find((entry) => entry.id === operation.operationId)?.resolvedAt,
    ).toBeDefined()
    expect(
      (await journal.entries()).find((entry) => entry.id === replacement.operationId)?.state,
    ).toBe('confirmed')
  })
  test('rascunho continua visível durante falha de rede sem inventar confirmação', async () => {
    const journal = new Journal(),
      { operation, item } = fixture()
    const adapter = new BrowserWorkspaceAdapter(
      'pessoa',
      async () => {
        throw new WorkspaceHttpError(503, 'NETWORK', 'Sem rede')
      },
      journal,
    )
    await adapter.save(operation, null)
    const view = await adapter.view(item.projectId)
    expect(view.report.phase).toBe('offline')
    expect(projectEntries(view)[0]?.document).toEqual(document)
    expect(projectEntries(view)[0]?.confirmed).toBeNull()
  })
  test('gravação recebida durante envio entra no mesmo ciclo de confirmação', async () => {
    const journal = new Journal(),
      first = fixture(),
      second = fixture()
    let release: (() => void) | undefined, started: (() => void) | undefined
    const waiting = new Promise<void>((resolve) => {
      release = resolve
    })
    const active = new Promise<void>((resolve) => {
      started = resolve
    })
    let sent = 0
    const adapter = new BrowserWorkspaceAdapter(
      'pessoa',
      async (_path, _method, body) => {
        const input = operationSchema.parse(body)
        const current = [first, second].find(
          (value) => value.operation.operationId === input.operationId,
        )
        if (!current) throw new Error('Pedido desconhecido')
        if (++sent === 1) {
          started?.()
          await waiting
        }
        return {
          status: 'applied',
          operationId: current.operation.operationId,
          entityId: current.item.id,
          revisionId: current.item.revisionId,
          sequence: sent,
          item: current.item,
        }
      },
      journal,
    )
    const firstSave = adapter.save(first.operation, null)
    await active
    const secondSave = adapter.save(second.operation, null)
    // Journal.add completes before the HTTP response is released; no timing assumption.
    await journal.entries()
    release?.()
    await Promise.all([firstSave, secondSave])
    expect(sent).toBe(2)
    expect((await journal.entries()).every((entry) => entry.state === 'confirmed')).toBe(true)
  })
})
