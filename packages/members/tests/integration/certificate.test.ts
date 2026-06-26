import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { SERIAL_RE } from '../../src/domain/certificate/certificate'
import type { CertificateBlock } from '../../src/domain/course/lesson-block'
import type { InMemoryCourseRepository } from '../fakes/in-memory'
import { buildApp, grantLifetime, seedSampleCourse } from '../helpers'

const USER = '33333333-3333-3333-3333-333333333333'
const authHeaders = {
  'x-auth-user-id': USER,
  'x-auth-user-name': 'Maria Silva',
  'content-type': 'application/json',
}

type App = ReturnType<typeof buildApp>['app']
const readJson = (res: Response): Promise<any> => res.json()

/** Anexa uma aula FINAL publicada com um bloco de certificado ao curso já semeado. */
function seedCertificateLesson(
  courses: InMemoryCourseRepository,
  courseId: string,
  moduleId: string,
  config: Partial<CertificateBlock> = {},
  sortOrder = 9,
): { lessonId: string; blockId: string } {
  const lessonId = randomUUID()
  const blockId = randomUUID()
  courses.lessons.push({
    id: lessonId,
    moduleId,
    courseId,
    slug: 'certificado',
    title: 'Seu certificado',
    sortOrder,
    estimatedMinutes: null,
    isPublished: true,
  })
  courses.blocks.push({
    id: blockId,
    lessonId,
    kind: 'certificate',
    sortOrder: 0,
    content: { kind: 'certificate', issuerName: 'Equipe Sistema Zero', ...config },
  })
  return { lessonId, blockId }
}

const getState = (app: App, lessonId: string, blockId: string, headers = authHeaders) =>
  app.handle(
    new Request(`http://localhost/members/lessons/${lessonId}/blocks/${blockId}/certificate`, {
      headers,
    }),
  )

const issue = (app: App, lessonId: string, blockId: string, headers = authHeaders) =>
  app.handle(
    new Request(`http://localhost/members/lessons/${lessonId}/blocks/${blockId}/certificate`, {
      method: 'POST',
      headers,
    }),
  )

const complete = (app: App, lessonId: string) =>
  app.handle(
    new Request(`http://localhost/members/lessons/${lessonId}/complete`, {
      method: 'POST',
      headers: authHeaders,
    }),
  )

const validate = (app: App, id: string) =>
  app.handle(new Request(`http://localhost/members/internal/certificates/${id}/validate`))

const revoke = (app: App, id: string) =>
  app.handle(
    new Request(`http://localhost/members/admin/certificates/${id}/revoke`, {
      method: 'POST',
      headers: authHeaders,
    }),
  )

const createBlock = (app: App, lessonId: string, content: CertificateBlock) =>
  app.handle(
    new Request(`http://localhost/members/admin/lessons/${lessonId}/blocks`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ content }),
    }),
  )

const updateBlock = (app: App, blockId: string, content: CertificateBlock) =>
  app.handle(
    new Request(`http://localhost/members/admin/blocks/${blockId}`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ content }),
    }),
  )

describe('Certificado — elegibilidade, emissão idempotente e validação', () => {
  test('não elegível enquanto faltam aulas (estado + 409 na emissão)', async () => {
    const { app, courses, entitlements } = buildApp()
    const { slug, courseId, moduleId } = seedSampleCourse(courses)
    grantLifetime(entitlements, { userId: USER, courseRef: slug })
    const { lessonId, blockId } = seedCertificateLesson(courses, courseId, moduleId)

    const state = await getState(app, lessonId, blockId).then(readJson)
    expect(state).toMatchObject({ eligible: false, issued: false })

    const res = await issue(app, lessonId, blockId)
    expect(res.status).toBe(409)
    expect((await readJson(res)).error.code).toBe('CERTIFICATE_NOT_ELIGIBLE')
  })

  test('emite após concluir todas as outras aulas; reemissão é idempotente', async () => {
    const { app, courses, entitlements } = buildApp()
    const { slug, courseId, moduleId, lessonIds } = seedSampleCourse(courses)
    grantLifetime(entitlements, { userId: USER, courseRef: slug })
    const { lessonId, blockId } = seedCertificateLesson(courses, courseId, moduleId)

    await complete(app, lessonIds[0])
    await complete(app, lessonIds[1])

    const eligible = await getState(app, lessonId, blockId).then(readJson)
    expect(eligible).toMatchObject({ eligible: true, issued: false })

    const first = await issue(app, lessonId, blockId)
    expect(first.status).toBe(200)
    const body = await readJson(first)
    expect(body.certificate.studentName).toBe('Maria Silva')
    expect(body.certificate.courseTitle).toBe('Curso Demo')
    expect(body.certificate.serial).toMatch(SERIAL_RE)
    expect(body.config).toMatchObject({ kind: 'certificate', issuerName: 'Equipe Sistema Zero' })

    // Reemissão: MESMO certificado (não reemite).
    const again = await issue(app, lessonId, blockId).then(readJson)
    expect(again.certificate.id).toBe(body.certificate.id)
    expect(again.certificate.serial).toBe(body.certificate.serial)

    const state = await getState(app, lessonId, blockId).then(readJson)
    expect(state).toMatchObject({ eligible: true, issued: true, serial: body.certificate.serial })
  })

  test('certificado no MEIO: elegível com as aulas ANTERIORES feitas, ignorando a de depois', async () => {
    const { app, courses, entitlements } = buildApp()
    const { slug, courseId, moduleId, lessonIds } = seedSampleCourse(courses)
    grantLifetime(entitlements, { userId: USER, courseRef: slug })
    // lessonIds = [sortOrder 0, sortOrder 1]. Põe o certificado ENTRE elas (0.5): a aula
    // ANTERIOR é lessonIds[0]; lessonIds[1] (sortOrder 1) fica DEPOIS do certificado.
    const { lessonId, blockId } = seedCertificateLesson(courses, courseId, moduleId, {}, 0.5)

    // Nada concluído → não elegível (falta a anterior).
    expect(await getState(app, lessonId, blockId).then(readJson)).toMatchObject({ eligible: false })

    // Conclui SÓ a aula anterior; a de DEPOIS (lessonIds[1]) segue pendente.
    await complete(app, lessonIds[0])

    const state = await getState(app, lessonId, blockId).then(readJson)
    expect(state).toMatchObject({ eligible: true, issued: false })

    // Emite mesmo com a aula posterior pendente.
    const res = await issue(app, lessonId, blockId)
    expect(res.status).toBe(200)
  })

  test('a rota genérica de complete não conclui aula de certificado', async () => {
    const { app, courses, entitlements, progress, certificates } = buildApp()
    const { slug, courseId, moduleId, lessonIds } = seedSampleCourse(courses)
    grantLifetime(entitlements, { userId: USER, courseRef: slug })
    const { lessonId, blockId } = seedCertificateLesson(courses, courseId, moduleId)
    await complete(app, lessonIds[0])
    await complete(app, lessonIds[1])

    const res = await complete(app, lessonId)
    expect(res.status).toBe(409)
    expect((await readJson(res)).error.code).toBe('CERTIFICATE_GATE_NOT_ISSUED')
    expect(await progress.listCompletedLessonIds(USER, courseId)).not.toContain(lessonId)
    expect(certificates.rows).toHaveLength(0)

    const state = await getState(app, lessonId, blockId).then(readJson)
    expect(state).toMatchObject({ eligible: true, issued: false, revoked: false })
  })

  test('reemissão de registro existente auto-cura progresso ausente', async () => {
    const { app, courses, entitlements, progress, certificates } = buildApp()
    const { slug, courseId, moduleId, lessonIds } = seedSampleCourse(courses)
    grantLifetime(entitlements, { userId: USER, courseRef: slug })
    const { lessonId, blockId } = seedCertificateLesson(courses, courseId, moduleId)
    await complete(app, lessonIds[0])
    await complete(app, lessonIds[1])

    certificates.rows.push({
      id: randomUUID(),
      userId: USER,
      accountId: USER,
      courseId,
      courseRef: slug,
      serial: 'SZ-2026-0123456789ABCDEF',
      studentName: 'Maria Silva',
      courseTitle: 'Curso Demo',
      completedAt: new Date('2026-06-02T12:00:00.000Z'),
      issuedAt: new Date('2026-06-02T12:00:00.000Z'),
      revokedAt: null,
    })
    expect(await progress.listCompletedLessonIds(USER, courseId)).not.toContain(lessonId)

    const res = await issue(app, lessonId, blockId)
    expect(res.status).toBe(200)
    expect((await readJson(res)).certificate.serial).toBe('SZ-2026-0123456789ABCDEF')
    expect(await progress.listCompletedLessonIds(USER, courseId)).toContain(lessonId)
  })

  test('validação pública confirma; revogar invalida', async () => {
    const { app, courses, entitlements } = buildApp()
    const { slug, courseId, moduleId, lessonIds } = seedSampleCourse(courses)
    grantLifetime(entitlements, { userId: USER, courseRef: slug })
    const { lessonId, blockId } = seedCertificateLesson(courses, courseId, moduleId)
    await complete(app, lessonIds[0])
    await complete(app, lessonIds[1])
    const { certificate } = await issue(app, lessonId, blockId).then(readJson)

    const ok = await validate(app, certificate.id).then(readJson)
    expect(ok).toMatchObject({
      valid: true,
      studentName: 'Maria Silva',
      courseTitle: 'Curso Demo',
      serial: certificate.serial,
    })

    expect((await revoke(app, certificate.id)).status).toBe(200)
    const state = await getState(app, lessonId, blockId).then(readJson)
    expect(state).toMatchObject({ issued: true, revoked: true, serial: certificate.serial })
    const download = await issue(app, lessonId, blockId)
    expect(download.status).toBe(410)
    expect((await readJson(download)).error.code).toBe('CERTIFICATE_REVOKED')
    const revoked = await validate(app, certificate.id).then(readJson)
    expect(revoked).toMatchObject({ valid: false, revoked: true, studentName: 'Maria Silva' })
  })

  test('id inexistente → valid:false (sem vazar)', async () => {
    const { app } = buildApp()
    const res = await validate(app, randomUUID())
    expect(res.status).toBe(200)
    expect(await readJson(res)).toMatchObject({
      valid: false,
      revoked: false,
      studentName: null,
      serial: null,
    })
  })

  test('nome com acento chega URI-encodado do gateway e é decodificado', async () => {
    const { app, courses, entitlements } = buildApp()
    const { slug, courseId, moduleId, lessonIds } = seedSampleCourse(courses)
    grantLifetime(entitlements, { userId: USER, courseRef: slug })
    const { lessonId, blockId } = seedCertificateLesson(courses, courseId, moduleId)
    await complete(app, lessonIds[0])
    await complete(app, lessonIds[1])

    const headers = { ...authHeaders, 'x-auth-user-name': 'Andr%C3%A9 Jos%C3%A9' }
    const body = await issue(app, lessonId, blockId, headers).then(readJson)
    expect(body.certificate.studentName).toBe('André José')
  })

  test('perfil kids: x-auth-profile-name vence o nome da conta', async () => {
    const { app, courses, entitlements } = buildApp()
    const { slug, courseId, moduleId, lessonIds } = seedSampleCourse(courses, 'curso-kids')
    grantLifetime(entitlements, { userId: USER, courseRef: slug })
    const { lessonId, blockId } = seedCertificateLesson(courses, courseId, moduleId)
    await complete(app, lessonIds[0])
    await complete(app, lessonIds[1])

    const headers = { ...authHeaders, 'x-auth-profile-name': 'Lulu' }
    const body = await issue(app, lessonId, blockId, headers).then(readJson)
    expect(body.certificate.studentName).toBe('Lulu')
  })

  test('autoria bloqueia mais de um bloco certificado por curso', async () => {
    const { app, courses } = buildApp()
    const { lessonIds, ebookBlockId } = seedSampleCourse(courses)

    const first = await createBlock(app, lessonIds[1], { kind: 'certificate' })
    expect(first.status).toBe(201)

    const second = await createBlock(app, lessonIds[0], { kind: 'certificate' })
    expect(second.status).toBe(400)
    expect((await readJson(second)).error.code).toBe('VALIDATION_ERROR')

    const update = await updateBlock(app, ebookBlockId, { kind: 'certificate' })
    expect(update.status).toBe(400)
    expect((await readJson(update)).error.code).toBe('VALIDATION_ERROR')
  })

  test('aula do certificado: conteúdo livre convive, mas blocos travantes são recusados', async () => {
    const { app, courses } = buildApp()
    const { lessonIds } = seedSampleCourse(courses)

    // lessonIds[0] tem 4 blocos NÃO-travantes (texto/vídeo/embed/ebook) → certificado OK
    // (regra relaxada: "encerramento com vídeo + certificado" é caso válido).
    const cert = await createBlock(app, lessonIds[0], { kind: 'certificate' })
    expect(cert.status).toBe(201)

    // Adicionar mais conteúdo livre (texto de parabéns) à aula do certificado → OK.
    const free = await createBlock(app, lessonIds[0], {
      kind: 'rich_text',
      markdown: 'Parabéns pela conquista!',
    } as never)
    expect(free.status).toBe(201)

    // Mas um bloco que TRAVA a conclusão (estúdio) na aula do certificado → 400.
    const studio = await createBlock(app, lessonIds[0], {
      kind: 'studio',
      initialProject: { name: 'Atividade', files: { 'index.html': '<h1>Oi</h1>' } },
    } as never)
    expect(studio.status).toBe(400)
    expect((await readJson(studio)).error.code).toBe('VALIDATION_ERROR')
  })

  test('não dá para criar certificado numa aula que já trava a conclusão (estúdio)', async () => {
    const { app, courses } = buildApp()
    const { lessonIds } = seedSampleCourse(courses)

    // Semeia um estúdio (travante) na aula vazia → criar certificado ali deve falhar.
    courses.blocks.push({
      id: randomUUID(),
      lessonId: lessonIds[1],
      kind: 'studio',
      sortOrder: 0,
      content: {
        kind: 'studio',
        initialProject: { name: 'Jogo', files: { 'index.html': '' } },
      },
    })
    const cert = await createBlock(app, lessonIds[1], { kind: 'certificate' })
    expect(cert.status).toBe(400)
    expect((await readJson(cert)).error.code).toBe('VALIDATION_ERROR')

    // Um quiz de FIXAÇÃO (sem nota de corte) NÃO trava → pode conviver com o certificado.
    const { lessonIds: l2 } = seedSampleCourse(courses, 'curso-2')
    const cert2 = await createBlock(app, l2[1], { kind: 'certificate' })
    expect(cert2.status).toBe(201)
    const formativeQuiz = await createBlock(app, l2[1], {
      kind: 'quiz',
      questions: [
        {
          id: 'q1',
          prompt: 'Gostou?',
          choices: [
            { id: 'a', label: 'Sim' },
            { id: 'b', label: 'Muito' },
          ],
          correctChoiceIds: ['a'],
        },
      ],
    } as never)
    expect(formativeQuiz.status).toBe(201)
  })
})
