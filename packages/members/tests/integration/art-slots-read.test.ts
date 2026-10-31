/**
 * A leitura das vagas de arte pela criança (etapa 3 de
 * `docs/plans/2026-10-29-desenho-da-crianca-no-jogo-design.md`): o bloco de Estúdio pede os
 * desenhos das vagas que importa e recebe a entrega do PRÓPRIO perfil no bloco de Pinta de cada
 * vaga. A régua é a do carryover: acesso pela conta, conteúdo pelo perfil, mesma porta da aula.
 */
import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { createLessonAsset, pintaAssetFromWire, pintaAssetToWire } from '@sistemazero/pinta/assets'
import type { InMemoryCourseRepository } from '../fakes/in-memory'
import { buildApp, grantLifetime, seedSampleCourse } from '../helpers'

const CRIANCA = '33333333-3333-3333-3333-333333333333'
const IRMA = '44444444-4444-4444-4444-444444444444'
type App = ReturnType<typeof buildApp>['app']
const readJson = (res: Response): Promise<any> => res.json()
const headers = (userId: string) => ({
  'x-auth-user-id': userId,
  'content-type': 'application/json',
})

const CHAVE_DA_AULA = pintaAssetToWire({
  ...createLessonAsset('vector-sprite', 64, 'chave'),
  id: 'asset-chave',
}) as Record<string, unknown>

/** O desenho que uma criança entrega: a chave da aula com um nome próprio. */
function desenho(nome: string) {
  const asset = pintaAssetFromWire(CHAVE_DA_AULA)
  if (!asset) throw new Error('fixture Pinta inválida')
  return pintaAssetToWire({ ...asset, name: nome, updatedAt: Date.now() }) as Record<
    string,
    unknown
  >
}

function bloco(
  courses: InMemoryCourseRepository,
  lessonId: string,
  content: object,
  sortOrder = 30,
) {
  const id = randomUUID()
  courses.blocks.push({
    id,
    lessonId,
    kind: (content as { kind: 'pinta' | 'studio' }).kind,
    sortOrder,
    content: content as never,
  })
  return id
}

function cenario() {
  const { app, courses, entitlements } = buildApp()
  const { slug, lessonIds } = seedSampleCourse(courses)
  for (const userId of [CRIANCA, IRMA]) grantLifetime(entitlements, { userId, courseRef: slug })
  const [aulaDoDesenho, aulaDoJogo] = lessonIds
  if (!aulaDoDesenho || !aulaDoJogo) throw new Error('fixture sem aula')
  const pinta = bloco(courses, aulaDoDesenho, {
    kind: 'pinta',
    initialAsset: CHAVE_DA_AULA,
    artSlot: { name: 'minha-chave', replaces: 'chave-dourada' },
  })
  const estudio = bloco(courses, aulaDoJogo, {
    kind: 'studio',
    initialProject: { formatVersion: 2, name: 'chave-do-farol', files: { 'index.html': '' } },
    artSlots: [
      { name: 'minha-chave', mode: 'add' },
      { name: 'meu-farol', mode: 'replace' },
    ],
  })
  return { app, courses, aulaDoDesenho, aulaDoJogo, pinta, estudio }
}

const vagas = (app: App, userId: string, lessonId: string, blockId: string) =>
  app.handle(
    new Request(`http://localhost/members/lessons/${lessonId}/blocks/${blockId}/art-slots`, {
      headers: headers(userId),
    }),
  )

const entregar = (app: App, userId: string, lessonId: string, blockId: string, asset: object) =>
  app.handle(
    new Request(`http://localhost/members/lessons/${lessonId}/blocks/${blockId}/pinta-submission`, {
      method: 'POST',
      headers: headers(userId),
      body: JSON.stringify({ asset }),
    }),
  )

describe('vagas de arte: a criança recebe o próprio desenho no jogo', () => {
  test('sem entrega, as vagas voltam vazias, com o modo e a imagem substituída', async () => {
    const { app, aulaDoJogo, estudio } = cenario()

    const res = await vagas(app, CRIANCA, aulaDoJogo, estudio)
    expect(res.status).toBe(200)
    expect(await readJson(res)).toEqual({
      slots: [
        { name: 'minha-chave', mode: 'add', replaces: 'chave-dourada', asset: null },
        { name: 'meu-farol', mode: 'replace', replaces: null, asset: null },
      ],
    })
  })

  test('depois de entregar, a vaga traz o desenho; o reenvio troca pelo mais novo', async () => {
    const { app, aulaDoDesenho, aulaDoJogo, pinta, estudio } = cenario()

    expect((await entregar(app, CRIANCA, aulaDoDesenho, pinta, desenho('primeira'))).status).toBe(
      200,
    )
    let [chave] = (await readJson(await vagas(app, CRIANCA, aulaDoJogo, estudio))).slots
    expect(chave.asset).toMatchObject({ id: 'asset-chave', name: 'primeira' })

    await entregar(app, CRIANCA, aulaDoDesenho, pinta, desenho('redesenhada'))
    ;[chave] = (await readJson(await vagas(app, CRIANCA, aulaDoJogo, estudio))).slots
    expect(chave.asset).toMatchObject({ name: 'redesenhada' })
  })

  test('nunca o desenho de outro perfil', async () => {
    const { app, aulaDoDesenho, aulaDoJogo, pinta, estudio } = cenario()

    await entregar(app, IRMA, aulaDoDesenho, pinta, desenho('da-irma'))
    const [chave] = (await readJson(await vagas(app, CRIANCA, aulaDoJogo, estudio))).slots
    expect(chave.asset).toBeNull()
  })

  test('desenho em aula rascunho não entra no jogo', async () => {
    const { app, courses, aulaDoDesenho, aulaDoJogo, pinta, estudio } = cenario()
    await entregar(app, CRIANCA, aulaDoDesenho, pinta, desenho('antes'))
    const aula = courses.lessons.find((l) => l.id === aulaDoDesenho)
    if (!aula) throw new Error('aula sumiu')
    aula.isPublished = false

    const [chave] = (await readJson(await vagas(app, CRIANCA, aulaDoJogo, estudio))).slots
    expect(chave).toMatchObject({ asset: null, replaces: null })
  })

  test('Estúdio sem vaga devolve lista vazia; bloco que não é Estúdio é 404', async () => {
    const { app, courses, aulaDoDesenho, aulaDoJogo, pinta } = cenario()
    const semVaga = bloco(
      courses,
      aulaDoJogo,
      {
        kind: 'studio',
        initialProject: { formatVersion: 2, name: 'p', files: { 'index.html': '' } },
      },
      40,
    )

    expect(await readJson(await vagas(app, CRIANCA, aulaDoJogo, semVaga))).toEqual({ slots: [] })
    expect((await vagas(app, CRIANCA, aulaDoDesenho, pinta)).status).toBe(404)
  })

  test('sem matrícula no curso, a rota recusa', async () => {
    const { app, aulaDoJogo, estudio } = cenario()
    const res = await vagas(app, '55555555-5555-5555-5555-555555555555', aulaDoJogo, estudio)
    expect(res.status).toBe(403)
  })
})
