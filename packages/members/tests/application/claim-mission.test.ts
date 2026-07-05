import { describe, expect, test } from 'bun:test'
import type { AccessCheckService } from '../../src/application/access-check/access-check.service'
import { ClaimMissionService } from '../../src/application/gamification/claim-mission.service'
import { MissionNotFoundError } from '../../src/domain/gamification/gamification.errors'
import {
  assignDailyMissions,
  assignMonthlyMissions,
  assignWeeklyMissions,
  CLUBE_ACCESS_REF,
  DAILY_MISSIONS,
  monthlyPeriodKey,
  WEEKLY_MISSIONS,
  weeklyPeriodKey,
} from '../../src/domain/gamification/missions'
import type {
  ClaimMissionInput,
  ClaimMissionResult,
  GamificationRepository,
} from '../../src/domain/ports/gamification-repository.port'

const NOW = new Date('2026-06-02T12:00:00.000Z') // dia civil SP = 2026-06-02
const TODAY = '2026-06-02'
const USER = 'profile-claim-guard'
const ACCOUNT = 'account-claim-guard'

/** Predicado de posse: com Clube, `hasClube(ref) === true` habilita as missões gated. */
const withClube = (u: string) => assignDailyMissions(u, TODAY, (ref) => ref === CLUBE_ACCESS_REF)

/**
 * Stub com o ALVO SEMPRE batido (count alto) + claim que concede. O foco é o GUARD de
 * atribuição: sem ele, qualquer missão do catálogo cujo alvo o aluno tenha cumprido seria
 * resgatável por POST direto, mesmo NÃO estando no set atribuído (ou sendo gated de um
 * produto que o aluno não tem). `hasClube` controla a posse resolvida pelo accessCheck.
 */
function makeService(hasClube = false) {
  const claims: ClaimMissionInput[] = []
  const repo = {
    async countEventsInPeriod() {
      return 999
    },
    async claimMission(input: ClaimMissionInput): Promise<ClaimMissionResult> {
      claims.push(input)
      return {
        claimed: true,
        xpAwarded: input.rewardXp,
        coinsAwarded: input.rewardCoins,
        coinBalance: 0,
      }
    },
  } as unknown as GamificationRepository
  const accessCheck = {
    async execute() {
      return {
        grants: hasClube ? [CLUBE_ACCESS_REF] : [],
        communities: [],
        hasMaster: false,
        hasMasterKids: false,
      }
    },
  } as unknown as AccessCheckService
  return { service: new ClaimMissionService(repo, accessCheck, () => NOW), claims }
}

describe('ClaimMissionService — só resgata missões ATRIBUÍDAS ao perfil', () => {
  test('missão diária NÃO atribuída (mesmo com alvo batido) → MissionNotFoundError, sem resgatar', async () => {
    const assigned = new Set(assignDailyMissions(USER, TODAY).map((m) => m.slug))
    const unassigned = DAILY_MISSIONS.find((m) => !m.requiresAccess && !assigned.has(m.slug))
    if (!unassigned) throw new Error('esperava ≥1 missão diária NÃO atribuída a este perfil')

    const { service, claims } = makeService()
    await expect(service.execute(USER, ACCOUNT, 'kids', unassigned.slug)).rejects.toBeInstanceOf(
      MissionNotFoundError,
    )
    expect(claims.length).toBe(0) // o guard barra ANTES de chegar ao resgate
  })

  test('missão semanal NÃO atribuída → MissionNotFoundError', async () => {
    const assigned = new Set(assignWeeklyMissions(USER, weeklyPeriodKey(TODAY)).map((m) => m.slug))
    const unassigned = WEEKLY_MISSIONS.find((m) => !m.requiresAccess && !assigned.has(m.slug))
    if (!unassigned) throw new Error('esperava ≥1 missão semanal NÃO atribuída a este perfil')

    const { service } = makeService()
    await expect(service.execute(USER, ACCOUNT, 'kids', unassigned.slug)).rejects.toBeInstanceOf(
      MissionNotFoundError,
    )
  })

  test('missão diária ATRIBUÍDA com alvo batido → resgata normalmente', async () => {
    const first = assignDailyMissions(USER, TODAY)[0]
    if (!first) throw new Error('esperava ≥1 missão diária atribuída a este perfil')
    const { service, claims } = makeService()
    const res = await service.execute(USER, ACCOUNT, 'kids', first.slug)
    expect(res.claimed).toBe(true)
    expect(claims[0]?.missionSlug).toBe(first.slug)
  })

  test('missão MENSAL atribuída → resgata (periodKey mensal)', async () => {
    const first = assignMonthlyMissions(USER, monthlyPeriodKey(TODAY))[0]
    if (!first) throw new Error('esperava ≥1 missão mensal atribuída a este perfil')
    const { service, claims } = makeService()
    const res = await service.execute(USER, ACCOUNT, 'kids', first.slug)
    expect(res.claimed).toBe(true)
    expect(claims[0]?.periodKey).toBe(monthlyPeriodKey(TODAY)) // m:2026-06
  })

  test('missão de CLUBE (gated) sem posse do produto → MissionNotFoundError', async () => {
    const clubeMission = DAILY_MISSIONS.find((m) => m.requiresAccess === CLUBE_ACCESS_REF)
    if (!clubeMission) throw new Error('esperava ≥1 missão diária de Clube no catálogo')
    // Sem Clube, a missão nunca entra no pool → não é atribuída → guard barra.
    const { service, claims } = makeService(false)
    await expect(service.execute(USER, ACCOUNT, 'kids', clubeMission.slug)).rejects.toBeInstanceOf(
      MissionNotFoundError,
    )
    expect(claims.length).toBe(0)
  })

  test('com posse do Clube, a missão gated é resgatável (se sorteada para o perfil)', async () => {
    // Acha um perfil cujo sorteio COM Clube inclua a missão gated (varre poucos ids).
    const clubeMission = DAILY_MISSIONS.find((m) => m.requiresAccess === CLUBE_ACCESS_REF)
    if (!clubeMission) throw new Error('esperava missão de Clube')
    let luckyUser: string | null = null
    for (let i = 0; i < 200; i++) {
      const u = `clube-user-${i}`
      if (withClube(u).some((m) => m.slug === clubeMission.slug)) {
        luckyUser = u
        break
      }
    }
    if (!luckyUser) throw new Error('nenhum perfil sorteou a missão de Clube em 200 tentativas')
    const { service, claims } = makeService(true)
    const res = await service.execute(luckyUser, ACCOUNT, 'kids', clubeMission.slug)
    expect(res.claimed).toBe(true)
    expect(claims[0]?.missionSlug).toBe(clubeMission.slug)
  })

  test('slug fora do catálogo → MissionNotFoundError', async () => {
    const { service } = makeService()
    await expect(service.execute(USER, ACCOUNT, 'kids', 'missao-fantasma')).rejects.toBeInstanceOf(
      MissionNotFoundError,
    )
  })
})
