import { describe, expect, test } from 'bun:test'
import { SendCourseRemindersService } from '../../src/application/renewal-reminder/send-course-reminders.service'
import {
  dueCourseReminder,
  oneCandidatePerCourse,
} from '../../src/domain/entitlement/course-reminders'
import type { AccountIdentity, AuthGateway } from '../../src/domain/ports/auth-gateway.port'
import type {
  CourseReminderCandidate,
  CourseReminderKind,
  CourseRemindersRepository,
} from '../../src/domain/ports/course-reminders-repository.port'
import type { SendEmailInput } from '../../src/domain/ports/messaging-gateway.port'

const DAY = 86_400_000
const WINDOW = 72 * 3600_000
const NOW = new Date('2026-12-10T12:00:00.000Z')
const silentLogger = { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} }

const candidate = (over: Partial<CourseReminderCandidate> = {}): CourseReminderCandidate => ({
  entitlementId: 'ent-1',
  accountId: 'conta-1',
  grantedAt: new Date(NOW.getTime() - 3 * DAY),
  courseRef: 'cade-todo-mundo',
  courseTitle: 'Cadê Todo Mundo',
  audience: 'kids',
  learner: 'child',
  started: false,
  completed: false,
  lastActivityAt: null,
  completedAt: null,
  sentKinds: [],
  ...over,
})

describe('qual lembrete cabe agora', () => {
  test('não começou: 2 dias depois do acesso, dentro da janela, uma vez', () => {
    expect(dueCourseReminder(candidate(), NOW, WINDOW)).toBe('course_not_started')
    // Antes dos 2 dias, nada; muito depois da janela (estreia do job), nada.
    expect(
      dueCourseReminder(candidate({ grantedAt: new Date(NOW.getTime() - DAY) }), NOW, WINDOW),
    ).toBeNull()
    expect(
      dueCourseReminder(candidate({ grantedAt: new Date(NOW.getTime() - 30 * DAY) }), NOW, WINDOW),
    ).toBeNull()
    expect(
      dueCourseReminder(candidate({ sentKinds: ['course_not_started'] }), NOW, WINDOW),
    ).toBeNull()
  })

  test('parou: 7 dias depois da última atividade, uma vez', () => {
    const parado = candidate({
      started: true,
      lastActivityAt: new Date(NOW.getTime() - 8 * DAY),
    })
    expect(dueCourseReminder(parado, NOW, WINDOW)).toBe('course_stalled')
    expect(
      dueCourseReminder(
        { ...parado, lastActivityAt: new Date(NOW.getTime() - 2 * DAY) },
        NOW,
        WINDOW,
      ),
    ).toBeNull()
    expect(dueCourseReminder({ ...parado, sentKinds: ['course_stalled'] }, NOW, WINDOW)).toBeNull()
    // Começou sem data de atividade (só posse): sem lembrete de parado.
    expect(dueCourseReminder({ ...parado, lastActivityAt: null }, NOW, WINDOW)).toBeNull()
  })

  test('concluiu: o parabéns logo depois da conclusão; concluído não recebe os outros', () => {
    const concluido = candidate({
      started: true,
      completed: true,
      lastActivityAt: new Date(NOW.getTime() - 10 * DAY),
      completedAt: new Date(NOW.getTime() - 3600_000),
    })
    expect(dueCourseReminder(concluido, NOW, WINDOW)).toBe('course_completed')
    expect(
      dueCourseReminder(
        { ...concluido, completedAt: new Date(NOW.getTime() - 9 * DAY) },
        NOW,
        WINDOW,
      ),
    ).toBeNull()
    expect(
      dueCourseReminder({ ...concluido, sentKinds: ['course_completed'] }, NOW, WINDOW),
    ).toBeNull()
  })

  test('duas matrículas do mesmo curso na conta: um lembrete só, com o que já foi enviado', () => {
    const [one] = oneCandidatePerCourse([
      candidate({ entitlementId: 'presente', sentKinds: ['course_not_started'] }),
      candidate({ entitlementId: 'compra', grantedAt: new Date(NOW.getTime() - 2.5 * DAY) }),
    ])
    expect(one).toMatchObject({ entitlementId: 'compra', sentKinds: ['course_not_started'] })
  })
})

function setup(candidates: CourseReminderCandidate[], identities: Record<string, AccountIdentity>) {
  const marks: Array<{ entitlementId: string; dedupeOn: string; kind: CourseReminderKind }> = []
  const sent: SendEmailInput[] = []
  const repo: CourseRemindersRepository = {
    async listCandidates() {
      return candidates
    },
    async markSent(entitlementId, dedupeOn, kind) {
      marks.push({ entitlementId, dedupeOn, kind })
    },
  }
  const auth: AuthGateway = {
    async getAccountIdentities(ids) {
      return ids.map((id) => identities[id]).filter((i): i is AccountIdentity => Boolean(i))
    },
    async getProfileNames() {
      return new Map()
    },
    async getProfileIdentities() {
      return new Map()
    },
  }
  const service = new SendCourseRemindersService(
    repo,
    auth,
    {
      async sendEmail(input) {
        sent.push(input)
      },
    },
    () => NOW,
    silentLogger,
    {
      funnelUrl: 'https://sistemazero.com.br',
      kidsAppUrl: 'https://kids.sistemazero.com.br/',
      adultAppUrl: 'https://comunidade.sistemazero.com.br',
    },
  )
  return { service, marks, sent }
}

const identity = (id: string): AccountIdentity => ({
  id,
  email: `${id}@exemplo.com`,
  firstName: 'Ana',
  activated: true,
})

describe('envio dos lembretes', () => {
  test('Kids vai ao responsável, com o link da entrada; o guia dos pais leva à área dos pais', async () => {
    const { service, sent, marks } = setup(
      [
        candidate(),
        candidate({
          entitlementId: 'ent-guia',
          accountId: 'conta-2',
          courseRef: 'transformando-o-vilao-em-aliado',
          courseTitle: 'Transformando o vilão em aliado',
          learner: 'parents',
        }),
      ],
      { 'conta-1': identity('conta-1'), 'conta-2': identity('conta-2') },
    )
    expect(await service.runCycle()).toEqual({ sent: 2, skipped: 0, failed: 0 })
    expect(sent[0]).toMatchObject({
      templateKey: 'course-not-started',
      variables: {
        nome: 'Ana',
        curso: 'Cadê Todo Mundo',
        link: 'https://kids.sistemazero.com.br/login/responsavel',
      },
    })
    expect(sent[1]?.variables?.link).toBe(
      'https://kids.sistemazero.com.br/pais/cursos/transformando-o-vilao-em-aliado',
    )
    // O guia tem os e-mails dele (nunca o da criança criando jogos).
    expect(sent[1]?.templateKey).toBe('course-not-started-vilao-em-aliado')
    expect(marks[0]).toEqual({
      entitlementId: 'ent-1',
      dedupeOn: candidate().grantedAt.toISOString().slice(0, 10),
      kind: 'course_not_started',
    })
  })

  test('outro curso para pais sem e-mails próprios usa os neutros dos pais', async () => {
    const { service, sent } = setup(
      [
        candidate({
          entitlementId: 'ent-pais',
          courseRef: 'outro-curso-para-pais',
          courseTitle: 'Outro curso para pais',
          learner: 'parents',
        }),
      ],
      { 'conta-1': identity('conta-1') },
    )
    await service.runCycle()
    expect(sent[0]?.templateKey).toBe('course-not-started-pais')
  })

  test('conclusão adulta: /cursos e a Comunidade adulta com as UTMs', async () => {
    const { service, sent } = setup(
      [
        candidate({
          audience: 'adult',
          started: true,
          completed: true,
          completedAt: new Date(NOW.getTime() - 3600_000),
        }),
      ],
      { 'conta-1': identity('conta-1') },
    )
    await service.runCycle()
    expect(sent[0]?.templateKey).toBe('course-completed-adult')
    expect(sent[0]?.variables?.link).toBe('https://comunidade.sistemazero.com.br/cursos')
    const comunidade = new URL(String(sent[0]?.variables?.comunidade))
    expect(comunidade.pathname).toBe('/pro/comunidade-dos-criadores/oferta/continuar')
    expect(comunidade.searchParams.get('utm_campaign')).toBe('curso-concluido')
  })

  test('conta sem e-mail (excluída): marca e não envia', async () => {
    const { service, sent, marks } = setup([candidate()], {})
    expect(await service.runCycle()).toEqual({ sent: 0, skipped: 1, failed: 0 })
    expect(sent).toHaveLength(0)
    expect(marks).toHaveLength(1)
  })
})
