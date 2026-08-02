import { describe, expect, test } from 'bun:test'
import {
  loadAiUsagePanels,
  runZappyBackfillBatches,
  zappyBackfillNotice,
} from '../src/lib/ai-usage-panels'

describe('loadAiUsagePanels', () => {
  test('preserva painéis bem-sucedidos quando métricas do Zappy falham', async () => {
    const usage = {
      month: '2026-08',
      monthUsed: 12,
      todayUsed: 2,
      accounts: 3,
      byFeature: [],
      days: [],
      topAccounts: [],
    }
    const knowledge = {
      publishedKidsLessons: 4,
      readySources: 3,
      errorSources: 0,
      pendingSources: 1,
      lessonsWithVideoWithoutTranscript: [],
      coursesWithoutStudentNotebook: [],
      failedSources: [],
    }

    const result = await loadAiUsagePanels('2026-08', {
      usage: async () => usage,
      metrics: async () => {
        throw new Error('500 metrics')
      },
      knowledge: async () => knowledge,
    })

    expect(result.usage).toEqual({ status: 'fulfilled', value: usage })
    expect(result.metrics.status).toBe('rejected')
    expect(result.knowledge).toEqual({ status: 'fulfilled', value: knowledge })
  })
})

describe('zappyBackfillNotice', () => {
  test('só comunica sucesso quando nenhuma fonte falhou', () => {
    expect(zappyBackfillNotice({ indexed: 2, deleted: 1, extracted: 3, failed: 0 })).toEqual({
      kind: 'success',
      message: 'Base do Zappy sincronizada.',
    })
  })

  test('com falhas comunica resultado parcial e quantidade', () => {
    expect(zappyBackfillNotice({ indexed: 2, deleted: 1, extracted: 1, failed: 4 })).toEqual({
      kind: 'warning',
      message: 'Base sincronizada parcialmente: 4 fontes precisam de correção.',
    })
  })
})

describe('runZappyBackfillBatches', () => {
  test('retoma do cursor salvo, agrega progresso e limpa o checkpoint ao concluir', async () => {
    const calls: Array<string | undefined> = []
    const checkpoints: Array<{ cursor: string | null; processed: number }> = []
    const result = await runZappyBackfillBatches({
      initialCursor: 'cursor-salvo',
      step: async (cursor) => {
        calls.push(cursor)
        return calls.length === 1
          ? {
              indexed: 1,
              deleted: 0,
              extracted: 1,
              failed: 0,
              nextCursor: 'cursor-2',
              done: false,
            }
          : {
              indexed: 2,
              deleted: 3,
              extracted: 0,
              failed: 1,
              nextCursor: null,
              done: true,
            }
      },
      checkpoint: (cursor, processed) => checkpoints.push({ cursor, processed }),
    })

    expect(calls).toEqual(['cursor-salvo', 'cursor-2'])
    expect(checkpoints).toEqual([
      { cursor: 'cursor-2', processed: 2 },
      { cursor: null, processed: 5 },
    ])
    expect(result).toMatchObject({ indexed: 3, deleted: 3, extracted: 1, failed: 1, done: true })
  })
})
