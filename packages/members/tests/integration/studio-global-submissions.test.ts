import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { buildApp, seedSampleCourse } from '../helpers'

// Fila GLOBAL de entregas (página "Entregas" da Sala do Professor):
// GET /members/admin/studio-submissions — pendentes primeiro, filtros, paginação.
// A semântica SQL do `answered` (mensagem do professor após o envio) é coberta
// pela QA integrada; aqui o fake marca via `answeredKeys`.

const USER_A = '22222222-2222-2222-2222-222222222222'
const USER_B = '33333333-3333-3333-3333-333333333333'
const headers = { 'x-auth-user-id': USER_A, 'content-type': 'application/json' }

const listAll = (app: ReturnType<typeof buildApp>['app'], qs = '') =>
  app.handle(new Request(`http://localhost/members/admin/studio-submissions${qs}`, { headers }))

const readJson = (res: Response): Promise<any> => res.json()

function seedSubmission(
  fakes: ReturnType<typeof buildApp>,
  courseId: string,
  lessonId: string,
  userId: string,
  submittedAt: Date,
): string {
  const blockId = randomUUID()
  fakes.studioSubmissions.submissions.push({
    id: randomUUID(),
    userId,
    accountId: null,
    blockId,
    lessonId,
    courseId,
    project: { name: 'p', files: {} },
    submittedAt,
  })
  return blockId
}

describe('GET /members/admin/studio-submissions (fila global)', () => {
  test('pendentes primeiro, depois mais recentes; total e curso resolvidos', async () => {
    const fakes = buildApp()
    const { courseId, lessonIds } = seedSampleCourse(fakes.courses, 'curso-global-1')

    const oldPending = seedSubmission(
      fakes,
      courseId,
      lessonIds[0],
      USER_A,
      new Date('2026-07-01T10:00:00Z'),
    )
    const newAnswered = seedSubmission(
      fakes,
      courseId,
      lessonIds[0],
      USER_B,
      new Date('2026-07-05T10:00:00Z'),
    )
    fakes.studioSubmissions.answeredKeys.add(`${USER_B}:${newAnswered}`)

    const res = await listAll(fakes.app)
    expect(res.status).toBe(200)
    const body = await readJson(res)
    expect(body.total).toBe(2)
    // Pendente vem ANTES mesmo sendo mais antiga.
    expect(body.items[0].blockId).toBe(oldPending)
    expect(body.items[0].answered).toBe(false)
    expect(body.items[1].blockId).toBe(newAnswered)
    expect(body.items[1].answered).toBe(true)
    // Curso resolvido na linha (o BFF filtra/mostra sem 2ª ida).
    expect(body.items[0].courseId).toBe(courseId)
    expect(body.items[0].courseTitle).toBeTruthy()
    expect(body.items[0].audience).toBe('adult')
    expect(body.items[0].lessonTitle).toBeTruthy()
  })

  test('filtros: status/courseId; courseId inválido → 400 na borda', async () => {
    const fakes = buildApp()
    const c1 = seedSampleCourse(fakes.courses, 'curso-global-2')
    const c2 = seedSampleCourse(fakes.courses, 'curso-global-3')
    const pending = seedSubmission(fakes, c1.courseId, c1.lessonIds[0], USER_A, new Date())
    const answered = seedSubmission(fakes, c2.courseId, c2.lessonIds[0], USER_B, new Date())
    fakes.studioSubmissions.answeredKeys.add(`${USER_B}:${answered}`)

    const pendingRes = await readJson(await listAll(fakes.app, '?status=pending'))
    expect(pendingRes.total).toBe(1)
    expect(pendingRes.items[0].blockId).toBe(pending)

    const byCourse = await readJson(await listAll(fakes.app, `?courseId=${c2.courseId}`))
    expect(byCourse.total).toBe(1)
    expect(byCourse.items[0].blockId).toBe(answered)

    expect((await listAll(fakes.app, '?courseId=nao-e-uuid')).status).toBe(400)
  })

  test('paginação: limit/offset com total estável', async () => {
    const fakes = buildApp()
    const { courseId, lessonIds } = seedSampleCourse(fakes.courses, 'curso-global-4')
    for (let i = 0; i < 5; i++) {
      seedSubmission(fakes, courseId, lessonIds[0], USER_A, new Date(2026, 6, i + 1))
    }
    const page1 = await readJson(await listAll(fakes.app, '?limit=2&offset=0'))
    const page2 = await readJson(await listAll(fakes.app, '?limit=2&offset=2'))
    expect(page1.total).toBe(5)
    expect(page1.items).toHaveLength(2)
    expect(page2.items).toHaveLength(2)
    const ids1 = page1.items.map((i: { blockId: string }) => i.blockId)
    const ids2 = page2.items.map((i: { blockId: string }) => i.blockId)
    for (const id of ids2) expect(ids1).not.toContain(id)
  })

  test('filtro por aluno (?userIds=): casa userId E accountId; total acompanha', async () => {
    const fakes = buildApp()
    const PARENT = '44444444-4444-4444-4444-444444444444'
    const { courseId, lessonIds } = seedSampleCourse(fakes.courses, 'curso-global-5')
    seedSubmission(fakes, courseId, lessonIds[0], USER_A, new Date('2026-07-01T10:00:00Z'))
    seedSubmission(fakes, courseId, lessonIds[0], USER_B, new Date('2026-07-02T10:00:00Z'))
    // Entrega de PERFIL kids: userId = perfil, accountId = conta do responsável.
    fakes.studioSubmissions.submissions.push({
      id: randomUUID(),
      userId: '55555555-5555-5555-5555-555555555555',
      accountId: PARENT,
      blockId: randomUUID(),
      lessonId: lessonIds[0],
      courseId,
      project: { name: 'p', files: {} },
      submittedAt: new Date('2026-07-03T10:00:00Z'),
    })

    const byUser = await readJson(await listAll(fakes.app, `?userIds=${USER_A}`))
    expect(byUser.total).toBe(1)
    expect(byUser.items[0].userId).toBe(USER_A)

    // Pelo ACCOUNT do responsável acha a entrega da criança.
    const byAccount = await readJson(await listAll(fakes.app, `?userIds=${PARENT}`))
    expect(byAccount.total).toBe(1)
    expect(byAccount.items[0].accountId).toBe(PARENT)

    // CSV com lixo → só o uuid válido filtra; só lixo → filtro ignorado.
    const mixed = await readJson(await listAll(fakes.app, `?userIds=lixo,${USER_B}`))
    expect(mixed.total).toBe(1)
    expect((await readJson(await listAll(fakes.app, '?userIds=lixo'))).total).toBe(3)
  })
})

// "Já conferi esta entrega" (08/2026): a saída da fila para a entrega SEM recado
// do aluno — antes dela, fechar exigia RESPONDER uma conversa que só nasce
// quando a criança escreve algo no envio.
describe('POST /members/admin/studio-submissions/:blockId/:userId/review', () => {
  // ⚠️ O relógio do buildApp é FIXO (2026-06-02T12:00Z) e é ele que carimba o
  // "conferi" — as entregas destes testes precisam ser ANTERIORES a ele, senão o
  // carimbo nasce velho e a régua do `>=` (que é o ponto do reenvio) não fecha.
  const ANTES_DO_CARIMBO = new Date('2026-06-01T10:00:00Z')

  const review = (
    app: ReturnType<typeof buildApp>['app'],
    blockId: string,
    userId: string,
    reviewed: boolean,
  ) =>
    app.handle(
      new Request(`http://localhost/members/admin/studio-submissions/${blockId}/${userId}/review`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ reviewed }),
      }),
    )

  test('conferir tira da fila de pendentes sem mandar recado nenhum', async () => {
    const fakes = buildApp()
    const { courseId, lessonIds } = seedSampleCourse(fakes.courses, 'curso-review-1')
    const blockId = seedSubmission(fakes, courseId, lessonIds[0], USER_A, ANTES_DO_CARIMBO)

    expect((await readJson(await listAll(fakes.app, '?status=pending'))).total).toBe(1)

    const res = await review(fakes.app, blockId, USER_A, true)
    expect(res.status).toBe(200)
    expect((await readJson(res)).reviewed).toBe(true)

    expect((await readJson(await listAll(fakes.app, '?status=pending'))).total).toBe(0)
    const all = await readJson(await listAll(fakes.app))
    expect(all.items[0].reviewed).toBe(true)
    // Conferir NÃO é responder: nenhuma conversa, nenhuma mensagem para a criança.
    expect(all.items[0].answered).toBe(false)
    expect(fakes.teacherThreadsRepo.threads).toHaveLength(0)
    expect(fakes.teacherThreadsRepo.messages).toHaveLength(0)
  })

  test('filtro status=reviewed separa quem foi conferida de quem foi respondida', async () => {
    const fakes = buildApp()
    const { courseId, lessonIds } = seedSampleCourse(fakes.courses, 'curso-review-2')
    const conferida = seedSubmission(fakes, courseId, lessonIds[0], USER_A, ANTES_DO_CARIMBO)
    const respondida = seedSubmission(fakes, courseId, lessonIds[0], USER_B, ANTES_DO_CARIMBO)
    fakes.studioSubmissions.answeredKeys.add(`${USER_B}:${respondida}`)
    await review(fakes.app, conferida, USER_A, true)

    const onlyReviewed = await readJson(await listAll(fakes.app, '?status=reviewed'))
    expect(onlyReviewed.total).toBe(1)
    expect(onlyReviewed.items[0].blockId).toBe(conferida)

    const onlyAnswered = await readJson(await listAll(fakes.app, '?status=answered'))
    expect(onlyAnswered.total).toBe(1)
    expect(onlyAnswered.items[0].blockId).toBe(respondida)

    expect((await readJson(await listAll(fakes.app, '?status=pending'))).total).toBe(0)
  })

  test('⭐ REENVIAR depois de conferida devolve a entrega para a fila', async () => {
    const fakes = buildApp()
    const { courseId, lessonIds } = seedSampleCourse(fakes.courses, 'curso-review-3')
    const blockId = seedSubmission(
      fakes,
      courseId,
      lessonIds[0],
      USER_A,
      new Date('2026-06-01T10:00:00Z'),
    )
    await review(fakes.app, blockId, USER_A, true)
    expect((await readJson(await listAll(fakes.app, '?status=pending'))).total).toBe(0)

    // A criança manda outra versão: o carimbo NÃO é apagado, mas passa a ser
    // anterior ao envio — e a régua do `>=` reabre a pendência sozinha.
    const row = fakes.studioSubmissions.submissions.find((s) => s.blockId === blockId)
    if (!row) throw new Error('entrega sumiu')
    const carimbo = row.reviewedAt
    if (!carimbo) throw new Error('não carimbou')
    row.submittedAt = new Date(carimbo.getTime() + 1000)
    const pending = await readJson(await listAll(fakes.app, '?status=pending'))
    expect(pending.total).toBe(1)
    expect(pending.items[0].reviewed).toBe(false)
  })

  test('desmarcar devolve para pendentes (desfazer clique errado)', async () => {
    const fakes = buildApp()
    const { courseId, lessonIds } = seedSampleCourse(fakes.courses, 'curso-review-4')
    const blockId = seedSubmission(fakes, courseId, lessonIds[0], USER_A, ANTES_DO_CARIMBO)
    await review(fakes.app, blockId, USER_A, true)

    const res = await review(fakes.app, blockId, USER_A, false)
    expect(res.status).toBe(200)
    expect((await readJson(res)).reviewedAt).toBeNull()
    expect((await readJson(await listAll(fakes.app, '?status=pending'))).total).toBe(1)
  })

  test('entrega inexistente → 404, e uuid inválido → 400 na borda', async () => {
    const fakes = buildApp()
    expect((await review(fakes.app, randomUUID(), USER_A, true)).status).toBe(404)
    expect((await review(fakes.app, 'nao-e-uuid', USER_A, true)).status).toBe(400)
  })
})
