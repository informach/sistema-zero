import { describe, expect, test } from 'bun:test'
import { loadAiUsagePanels } from '../src/lib/ai-usage-panels'

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
