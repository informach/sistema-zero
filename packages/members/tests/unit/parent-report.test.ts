import { beforeEach, describe, expect, it } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { GetChildrenStatsService } from '../../src/application/children-stats/get-children-stats.service'
import { AwardGamificationService } from '../../src/application/gamification/award-gamification.service'
import { SendParentReportsService } from '../../src/application/parent-report/send-parent-reports.service'
import type { AccountIdentity, AuthGateway } from '../../src/domain/ports/auth-gateway.port'
import type { HubGateway } from '../../src/domain/ports/hub-gateway.port'
import type {
  MessagingGateway,
  SendEmailInput,
} from '../../src/domain/ports/messaging-gateway.port'
import {
  InMemoryAvatarRepository,
  InMemoryCourseRepository,
  InMemoryEntitlementRepository,
  InMemoryGamificationRepository,
  InMemoryParentReportRepository,
  InMemoryProgressRepository,
  InMemoryRoomRepository,
  InMemoryStudioSubmissionRepository,
  silentLogger,
} from '../fakes/in-memory'

const ACCOUNT = '11111111-1111-1111-1111-111111111111'
const CHILD = '22222222-2222-2222-2222-222222222222'

// 2026-07-03 é SEXTA. SP = UTC-3 fixo → sexta 17h SP = sexta 20:00Z.
const FRIDAY_17H_SP = new Date('2026-07-03T20:00:00.000Z')

function buildSender(now: Date) {
  const clockRef = { now }
  const clock = () => clockRef.now
  const courses = new InMemoryCourseRepository()
  const progress = new InMemoryProgressRepository(courses)
  const studio = new InMemoryStudioSubmissionRepository(courses)
  const gamification = new InMemoryGamificationRepository({
    entitlements: new InMemoryEntitlementRepository(),
    courses,
    avatar: new InMemoryAvatarRepository(),
    room: new InMemoryRoomRepository(),
  })
  const award = new AwardGamificationService(gamification, clock, silentLogger)
  const hub: HubGateway = {
    async notifyAccessChanged() {},
    async listShowcaseByAuthors() {
      return null
    },
  }
  const childrenStats = new GetChildrenStatsService(
    gamification,
    courses,
    progress,
    studio,
    clock,
    hub,
  )
  const reports = new InMemoryParentReportRepository()

  const identities: AccountIdentity[] = [
    { id: ACCOUNT, email: 'pai@example.com', firstName: 'Marcos' },
  ]
  const authCalls = { failAlways: false }
  const auth: AuthGateway = {
    async getAccountIdentities(ids) {
      if (authCalls.failAlways) throw new Error('auth fora')
      return identities.filter((i) => ids.includes(i.id))
    },
    async getProfileNames(ids) {
      if (authCalls.failAlways) throw new Error('auth fora')
      return new Map(ids.filter((id) => id === CHILD).map((id) => [id, 'Lia']))
    },
    async getProfileIdentities(ids) {
      if (authCalls.failAlways) throw new Error('auth fora')
      return new Map(
        ids.filter((id) => id === CHILD).map((id) => [id, { firstName: 'Lia', public: false }]),
      )
    },
  }

  const sentEmails: SendEmailInput[] = []
  const messaging: MessagingGateway = {
    async sendEmail(input) {
      sentEmails.push(input)
    },
  }

  const sender = new SendParentReportsService(
    gamification,
    studio,
    childrenStats,
    reports,
    auth,
    messaging,
    clock,
    silentLogger,
    { dow: 5, hour: 17, kidsUrl: 'https://kids.example.com' },
  )
  return { sender, award, gamification, reports, sentEmails, clockRef, authCalls }
}

/** Semeia atividade da semana (aula concluída na quinta) para a criança da conta. */
async function seedWeekActivity(ctx: ReturnType<typeof buildSender>) {
  const before = ctx.clockRef.now
  ctx.clockRef.now = new Date('2026-07-02T15:00:00.000Z') // quinta da MESMA semana
  await ctx.award.awardLessonCompletion({
    userId: CHILD,
    accountId: ACCOUNT,
    lessonId: randomUUID(),
    moduleId: randomUUID(),
    courseId: randomUUID(),
    audience: 'kids',
    unitCompleted: false,
    courseCompleted: false,
    privileged: false,
  })
  ctx.clockRef.now = before
}

describe('SendParentReportsService.isDue (gatilho sexta 17h SP)', () => {
  const { sender } = buildSender(FRIDAY_17H_SP)

  it('antes do gatilho (quinta / sexta 16h) → false', () => {
    expect(sender.isDue(new Date('2026-07-02T20:00:00.000Z'))).toBe(false) // quinta 17h SP
    expect(sender.isDue(new Date('2026-07-03T19:59:00.000Z'))).toBe(false) // sexta 16:59 SP
  })

  it('sexta 17h SP em diante → true (incl. sábado e DOMINGO — último dia da semana)', () => {
    expect(sender.isDue(new Date('2026-07-03T20:00:00.000Z'))).toBe(true) // sexta 17h SP
    expect(sender.isDue(new Date('2026-07-04T12:00:00.000Z'))).toBe(true) // sábado (catch-up)
    expect(sender.isDue(new Date('2026-07-05T12:00:00.000Z'))).toBe(true) // domingo (dow 0!)
  })

  it('segunda-feira = semana NOVA → false até a próxima sexta', () => {
    expect(sender.isDue(new Date('2026-07-06T12:00:00.000Z'))).toBe(false)
  })
})

describe('SendParentReportsService.runCycle', () => {
  let ctx: ReturnType<typeof buildSender>
  beforeEach(async () => {
    ctx = buildSender(FRIDAY_17H_SP)
    await seedWeekActivity(ctx)
  })

  it('envia 1 e-mail por conta com atividade e marca APÓS o envio (2º ciclo dedupa)', async () => {
    const first = await ctx.sender.runCycle()
    expect(first.sent).toBe(1)
    expect(ctx.sentEmails.length).toBe(1)
    const email = ctx.sentEmails[0]
    expect(email?.templateKey).toBe('weekly-report')
    expect(email?.recipient.email).toBe('pai@example.com')
    expect(email?.variables.criancas).toBe('Lia')
    expect(email?.variables.resumo).toContain('Lia')
    expect(email?.variables.resumo).toContain('aula concluída')
    expect(email?.idempotencyKey).toBe(`weekly-report:${ACCOUNT}:w:2026-06-29`)

    const second = await ctx.sender.runCycle()
    expect(second.sent).toBe(0)
    expect(ctx.sentEmails.length).toBe(1)
  })

  it('fora do gatilho → no-op', async () => {
    ctx.clockRef.now = new Date('2026-07-02T20:00:00.000Z') // quinta
    expect(await ctx.sender.runCycle()).toEqual({ sent: 0, skipped: 0, failed: 0 })
    expect(ctx.sentEmails.length).toBe(0)
  })

  it('opt-out da conta → pula sem enviar', async () => {
    await ctx.reports.setDisabled(ACCOUNT, true, ctx.clockRef.now)
    const result = await ctx.sender.runCycle()
    expect(result.sent).toBe(0)
    expect(ctx.sentEmails.length).toBe(0)
  })

  it('auth fora → conta NÃO é marcada (re-tenta no próximo ciclo)', async () => {
    ctx.authCalls.failAlways = true
    const result = await ctx.sender.runCycle()
    expect(result.failed).toBe(1)
    expect(ctx.sentEmails.length).toBe(0)
    // Recuperou → o próximo ciclo envia.
    ctx.authCalls.failAlways = false
    const retry = await ctx.sender.runCycle()
    expect(retry.sent).toBe(1)
  })
})
