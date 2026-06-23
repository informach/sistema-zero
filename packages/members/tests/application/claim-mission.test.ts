import { describe, expect, test } from 'bun:test'
import { ClaimMissionService } from '../../src/application/gamification/claim-mission.service'
import { MissionNotFoundError } from '../../src/domain/gamification/gamification.errors'
import {
  assignDailyMissions,
  assignWeeklyMissions,
  DAILY_MISSIONS,
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

/**
 * Stub com o ALVO SEMPRE batido (count alto) + claim que concede. O foco é o GUARD de
 * atribuição: sem ele, qualquer missão do catálogo (8) cujo alvo o aluno tenha cumprido
 * seria resgatável por POST direto, mesmo NÃO estando no set atribuído (3 diárias / 2 semanais).
 */
function makeService() {
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
  return { service: new ClaimMissionService(repo, () => NOW), claims }
}

describe('ClaimMissionService — só resgata missões ATRIBUÍDAS ao perfil', () => {
  test('missão diária NÃO atribuída (mesmo com alvo batido) → MissionNotFoundError, sem resgatar', async () => {
    const assigned = new Set(assignDailyMissions(USER, TODAY).map((m) => m.slug))
    const unassigned = DAILY_MISSIONS.find((m) => !assigned.has(m.slug)) // 3-de-5 sempre deixa 2 fora
    if (!unassigned) throw new Error('esperava ≥1 missão diária NÃO atribuída a este perfil')

    const { service, claims } = makeService()
    await expect(service.execute(USER, 'kids', unassigned.slug)).rejects.toBeInstanceOf(
      MissionNotFoundError,
    )
    expect(claims.length).toBe(0) // o guard barra ANTES de chegar ao resgate
  })

  test('missão semanal NÃO atribuída → MissionNotFoundError', async () => {
    const assigned = new Set(assignWeeklyMissions(USER, weeklyPeriodKey(TODAY)).map((m) => m.slug))
    const unassigned = WEEKLY_MISSIONS.find((m) => !assigned.has(m.slug)) // 2-de-3 deixa 1 fora
    if (!unassigned) throw new Error('esperava ≥1 missão semanal NÃO atribuída a este perfil')

    const { service } = makeService()
    await expect(service.execute(USER, 'kids', unassigned.slug)).rejects.toBeInstanceOf(
      MissionNotFoundError,
    )
  })

  test('missão ATRIBUÍDA com alvo batido → resgata normalmente', async () => {
    const first = assignDailyMissions(USER, TODAY)[0]
    if (!first) throw new Error('esperava ≥1 missão diária atribuída a este perfil')
    const { service, claims } = makeService()
    const res = await service.execute(USER, 'kids', first.slug)
    expect(res.claimed).toBe(true)
    expect(claims[0]?.missionSlug).toBe(first.slug)
  })

  test('slug fora do catálogo → MissionNotFoundError', async () => {
    const { service } = makeService()
    await expect(service.execute(USER, 'kids', 'missao-fantasma')).rejects.toBeInstanceOf(
      MissionNotFoundError,
    )
  })
})
