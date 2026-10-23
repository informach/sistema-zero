import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import type { LiveCatalogView, LiveCohort, LiveSessionSummary } from '@sistemazero/core/live'
import { LiveCatalog } from '@sistemazero/member-shell/components/live/live-catalog'
import { cleanup, render, screen, within } from '@testing-library/react'

/**
 * A agenda das oficinas com a jornada do encontro (proposta de 23/10/2026): a linha do tempo no
 * destaque, o selo da última semana para rever, a "Data nova" da reposição e, na área dos pais,
 * os três passos da vaga e o "Adicionar à minha agenda".
 */

const DAY = 86_400_000
const at = (offset: number) => new Date(Date.now() + offset).toISOString()
const cohort: LiveCohort = {
  id: 'turma',
  programId: 'programa',
  title: 'Turma Cometa',
  timeZone: 'America/Sao_Paulo',
  capacity: 8,
  accessDays: 30,
  teacherIds: ['caio'],
  teacherNames: { caio: 'Caio' },
  status: 'open',
  createdAt: at(-60 * DAY),
}
const session = (id: string, start: number, extra: Partial<LiveSessionSummary> = {}) =>
  ({
    id,
    cohortId: 'turma',
    order: 1,
    startsAt: at(start),
    endsAt: at(start + 90 * 60_000),
    accessEndsAt: at(start + 30 * DAY),
    occurrenceId: `${id}-o`,
    title: `Encontro ${id}`,
    ...extra,
  }) as LiveSessionSummary

let catalog: LiveCatalogView
const originalFetch = globalThis.fetch
beforeEach(() => {
  globalThis.fetch = Object.assign(
    async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/api/profiles'))
        return Response.json({ profiles: [{ id: 'davi', name: 'Davi' }] })
      return Response.json(catalog)
    },
    { preconnect: () => {} },
  ) as typeof fetch
})
afterEach(() => {
  cleanup()
  globalThis.fetch = originalFetch
})

describe('a agenda das oficinas', () => {
  test('o destaque tem a linha do tempo; o cartão encerrado diz quantos dias faltam', async () => {
    catalog = {
      cohorts: [cohort],
      programs: [],
      enrollments: [],
      sessions: [
        session('proximo', 3 * DAY),
        // Terminou há 27 dias: o prazo de 30 vence em 3.
        session('antigo', -27 * DAY, { occurrenceState: 'ended' }),
      ],
    }
    render(<LiveCatalog />)
    const timeline = await screen.findByRole('list', { name: 'Linha do tempo do encontro' })
    expect(within(timeline).getByText('Marcado')).toBeDefined()
    expect(timeline.querySelector('[aria-current="step"]')?.textContent).toContain('Marcado')
    expect(screen.getByText(/dias? para rever$/)).toBeDefined()
    expect(screen.getByText(/com Caio/)).toBeDefined()
  })

  test('a reposição ganha o selo "Data nova" com a data já trocada', async () => {
    catalog = {
      cohorts: [cohort],
      programs: [],
      enrollments: [],
      sessions: [
        session('primeiro', 2 * DAY),
        session('remarcado', 5 * DAY, { occurrenceStartsAt: at(6 * DAY) }),
      ],
    }
    render(<LiveCatalog />)
    expect(await screen.findByText('Data nova')).toBeDefined()
  })
})

describe('a área dos pais', () => {
  test('mostra a vaga em três passos, com a escolha da criança em destaque', async () => {
    catalog = {
      cohorts: [cohort],
      programs: [],
      enrollments: [
        {
          id: 'vaga',
          cohortId: 'turma',
          accountId: 'conta',
          learnerId: null,
          learnerName: '',
          status: 'active',
          source: 'purchase',
          createdAt: at(-DAY),
        },
      ],
      sessions: [session('proximo', 3 * DAY)],
    }
    render(<LiveCatalog mode="parent" prepareHref="/pais" />)
    const steps = await screen.findByRole('list', { name: 'O caminho da vaga' })
    const current = steps.querySelector('[aria-current="step"]')
    expect(current?.textContent).toContain('Escolher a criança')
    expect(current?.textContent).toContain('1 vaga esperando')
    // O encontro da família tem o lembrete para a agenda (o pai organiza o tempo da casa).
    expect(screen.getByRole('button', { name: 'Adicionar à minha agenda' })).toBeDefined()
  })
})
