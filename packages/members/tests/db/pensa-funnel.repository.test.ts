import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import type { PensaJourney, PensaJourneyActor } from '@sistemazero/core/pensa'
import postgres from 'postgres'
import { GetPensaFunnelService } from '../../src/application/pensa/pensa-funnel.service'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import {
  DrizzlePensaFunnelRepository,
  PENSA_ANY_ANSWER,
} from '../../src/infrastructure/persistence/drizzle/pensa-funnel.repository'
import { DrizzlePensaJourneyRepository } from '../../src/infrastructure/persistence/drizzle/pensa-journey.repository'
import { applyPensaV2Schema } from './pensa-v2-schema'

// O mesmo banco próprio da jornada (os fixtures legados não têm os FKs novos).
const base =
  process.env.TEST_DATABASE_URL ??
  process.env.DATABASE_URL ??
  'postgres://postgres:postgres@localhost:5433/sistemazero'
const target = new URL(base)
target.pathname = '/sistemazero_pensa_v2_test'
const admin = postgres(base, { max: 1, connect_timeout: 2, onnotice: () => {} })
let available = false
try {
  await admin`select 1`
  try {
    await admin.unsafe('create database sistemazero_pensa_v2_test')
  } catch (cause) {
    if ((cause as { code?: string }).code !== '42P04') throw cause
  }
  available = true
} catch (cause) {
  if (process.env.TEST_DATABASE_URL) throw cause
} finally {
  await admin.end({ timeout: 1 })
}

/**
 * O funil do Pensa v2 (15/10/2026) só existe em SQL: o fake não o alcança. Os jogos nascem num
 * instante bem à frente dos outros arquivos (o banco é compartilhado), e a janela só os vê.
 */
describe.skipIf(!available)('Pensa v2: o funil do painel no Postgres', () => {
  let conn: DbConnection
  let repo: DrizzlePensaJourneyRepository
  const created = new Date('2031-01-10T12:00:00Z')
  const actors: PensaJourneyActor[] = []
  const actor = () => {
    const who = { profileId: randomUUID(), accountId: randomUUID(), privileged: false }
    actors.push(who)
    return who
  }
  const question = {
    about: 'action',
    options: [
      { label: 'Voa desviando', description: 'Não bater em nada.' },
      { label: 'Pega ovos', description: 'Cada ovo vale um ponto.' },
    ],
  }
  const msg = (role: 'user' | 'assistant', text: string, choices?: unknown) => ({
    id: randomUUID(),
    role,
    text,
    at: created.toISOString(),
    revision: 1,
    final: true,
    ...(choices ? { choices } : {}),
  })

  /** Um jogo novo com a primeira versão no estado pedido. */
  async function game(patch: Partial<PensaJourney>, missionDone = false, at = created) {
    const who = actor()
    const view = await repo.create(who, randomUUID(), at)
    // Com o cliente do `createDbConnection`, o JSON vai como texto + `::jsonb`.
    const data = { ...view.journey, ...patch }
    await conn.sql`update members.pensa_journeys set data = ${JSON.stringify(data)}::jsonb
      where cycle_id = ${view.journey.cycleId}`
    if (missionDone)
      await conn.sql`insert into members.pensa_tasks
        (id, cycle_id, title, destination, category, estimated_minutes, position, guide, context,
         progress_status, created_at, updated_at)
        values (${randomUUID()}, ${view.journey.cycleId}, 'Mover', 'studio', 'gameplay', 10, 0,
          ${JSON.stringify({ contractVersion: 2, steps: [], criteria: [] })}::jsonb,
          ${JSON.stringify({ kind: 'studio' })}::jsonb, 'completed', ${created.toISOString()}, ${created.toISOString()})`
  }

  beforeAll(async () => {
    conn = createDbConnection(target.toString(), { max: 4 })
    repo = new DrizzlePensaJourneyRepository(conn.db, { dailyLimit: 2, monthlyLimit: 20 })
    await applyPensaV2Schema(conn.sql)
  }, 30000)
  afterAll(async () => {
    for (const who of actors)
      await conn.sql`delete from members.pensa_projects where user_id = ${who.profileId}`
    await conn?.close()
  })

  test('conta onde param, sem tirar o texto da criança do banco', async () => {
    // 1: perguntou, ela tocou numa resposta, escolheu o começo, fez missão, testou e guardou.
    await game(
      {
        intent: 'Quero um dragão',
        messages: [
          msg('user', 'Quero um dragão'),
          msg('assistant', 'O que ele faz?', question),
          msg('user', 'Pega ovos'),
          msg('assistant', 'Separei um começo.'),
        ] as never,
        proposal: { id: 'p' } as never,
        acceptedProposalId: 'p',
        missionIds: ['m'],
        tests: [{ id: 't' }] as never,
        stage: 'closed',
        closedReason: 'met',
      },
      true,
    )
    // 2: "Tanto faz" e uma proposta ainda não escolhida.
    await game({
      intent: 'Um jogo',
      messages: [
        msg('user', 'Um jogo'),
        msg('assistant', 'O que você faz?', question),
        msg('user', PENSA_ANY_ANSWER),
      ] as never,
      proposal: { id: 'q' } as never,
    })
    // 3: respondeu do jeito dela e parou na segunda pergunta.
    await game({
      intent: 'Gato',
      messages: [
        msg('user', 'Gato'),
        msg('assistant', 'O que o gato faz?', question),
        msg('user', 'Ele cospe fogo'),
        msg('assistant', 'Como você ganha?', { ...question, about: 'goal' }),
      ] as never,
    })
    // 4: abriu o jogo e não contou nada.
    await game({})

    const funnel = await new GetPensaFunnelService(
      new DrizzlePensaFunnelRepository(conn.db),
      () => new Date('2031-01-20T12:00:00Z'),
    ).execute(30)
    expect(funnel).toMatchObject({
      days: 30,
      games: 4,
      told: 3,
      asked: 3,
      questions: 4,
      answeredByChoice: 1,
      answeredAny: 1,
      answeredTyped: 1,
      waitingOnQuestion: 1,
      proposal: 2,
      accepted: 1,
      firstMission: 1,
      tested: 1,
      versionDone: 1,
    })
    // A janela conta pela criação do jogo: no último dia, esses jogos (de dez dias antes) saem.
    const lastDay = await new GetPensaFunnelService(
      new DrizzlePensaFunnelRepository(conn.db),
      () => new Date('2031-01-20T12:00:00Z'),
    ).execute(1)
    expect(lastDay.games).toBe(0)
  })

  test('as etapas ficam encaixadas: quem testou sem concluir missão conta nas duas', async () => {
    // Um ano depois dos jogos do caso de cima (a janela termina no "agora" do relógio, então um
    // não entra na conta do outro).
    const later = new Date('2032-03-10T12:00:00Z')
    // 1: escolheu o começo e testou ("Já quero experimentar") sem concluir missão.
    await game(
      {
        intent: 'Nave',
        proposal: { id: 'p' } as never,
        acceptedProposalId: 'p',
        missionIds: ['m'],
        tests: [{ id: 't' }] as never,
      },
      false,
      later,
    )
    // 2: guardou a versão pronta sem teste nem missão concluída.
    await game(
      {
        intent: 'Gato',
        proposal: { id: 'q' } as never,
        acceptedProposalId: 'q',
        missionIds: ['n'],
        stage: 'closed',
        closedReason: 'met',
      },
      false,
      later,
    )
    // 3: concluiu missão e parou ali.
    await game(
      {
        intent: 'Peixe',
        proposal: { id: 'r' } as never,
        acceptedProposalId: 'r',
        missionIds: ['o'],
      },
      true,
      later,
    )
    const funnel = await new GetPensaFunnelService(
      new DrizzlePensaFunnelRepository(conn.db),
      () => new Date('2032-03-20T12:00:00Z'),
    ).execute(30)
    expect(funnel).toMatchObject({
      games: 3,
      told: 3,
      proposal: 3,
      accepted: 3,
      firstMission: 3,
      tested: 2,
      versionDone: 1,
    })
    // Cada etapa cabe na anterior.
    const order = [
      funnel.games,
      funnel.told,
      funnel.proposal,
      funnel.accepted,
      funnel.firstMission,
      funnel.tested,
      funnel.versionDone,
    ]
    for (let i = 1; i < order.length; i++)
      expect(order[i] ?? 0).toBeLessThanOrEqual(order[i - 1] ?? 0)
  })
})
