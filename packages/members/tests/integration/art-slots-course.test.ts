/**
 * Vaga de arte no CURSO (etapa 2 de `docs/plans/2026-10-29-desenho-da-crianca-no-jogo-design.md`),
 * ponta a ponta pela autoria: publicar o rascunho, reordenar e excluir aulas. A régua pura mora
 * no core (`artSlotCourseIssues`); aqui o que se protege é que TODA gravação passa por ela, e que
 * o "Conferir" avisa antes de publicar.
 */
import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { createAsset, createLessonAsset, pintaAssetToWire } from '@sistemazero/pinta/assets'
import {
  changeDraft,
  draftRequest,
  publishBlock,
  publishDraft,
  readDraft,
} from '../draft-authoring-helpers'
import { buildApp } from '../helpers'

type App = ReturnType<typeof buildApp>['app']
const readJson = (res: Response): Promise<any> => res.json()

const DESENHO = pintaAssetToWire({
  ...createLessonAsset('vector-sprite', 64, 'chave'),
  id: 'asset-chave',
}) as Record<string, unknown>

const imagem = (name: string) => ({
  id: name,
  name,
  kind: 'image',
  source: 'upload',
  dataUrl:
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  width: 1,
  height: 1,
})

const pinta = (artSlot: Record<string, unknown>) => ({
  kind: 'pinta',
  initialAsset: DESENHO,
  artSlot,
})
const estudio = (artSlots: { name: string; mode: 'add' | 'replace' }[]) => ({
  kind: 'studio',
  initialProject: {
    formatVersion: 2,
    name: 'chave-do-farol',
    files: { 'index.html': '' },
    assets: [imagem('chave-dourada'), imagem('farol')],
  },
  artSlots,
})

const admin = (app: App, path: string, method: string, body?: unknown) =>
  app.handle(
    new Request(`http://localhost/members/admin${path}`, {
      method,
      headers: { 'content-type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }),
  )

/** Curso rascunho com um módulo e TRÊS aulas, criadas pela autoria. */
async function curso(app: App) {
  const course = await readJson(
    await admin(app, '/courses', 'POST', {
      slug: 'meu-desenho',
      title: 'Meu primeiro desenho',
      subtitle: null,
      description: null,
      coverImageUrl: null,
      status: 'draft',
    }),
  )
  const mod = await readJson(
    await admin(app, `/courses/${course.id}/modules`, 'POST', { title: 'Módulo', summary: null }),
  )
  const aulas: { id: string; title: string }[] = []
  for (const i of [1, 2, 3])
    aulas.push(
      await readJson(
        await admin(app, `/modules/${mod.id}/lessons`, 'POST', {
          slug: `aula-${i}`,
          title: `Aula ${i}`,
          estimatedMinutes: 5,
        }),
      ),
    )
  const [a1, a2, a3] = aulas
  if (!a1 || !a2 || !a3) throw new Error('fixture sem aula')
  return { moduleId: mod.id as string, aulas: [a1, a2, a3] as const }
}

const publicar = (app: App, lessonId: string, content: Record<string, unknown>) =>
  publishBlock(app, lessonId, { content: content as { kind: string } })

async function conflito(res: Response) {
  expect(res.status).toBe(409)
  const { error } = await readJson(res)
  expect(error.code).toBe('ART_SLOT_CONFLICT')
  return error.message as string
}

describe('vaga de arte no curso: a autoria recusa ao publicar', () => {
  test('o desenho numa aula e o jogo que o importa na seguinte passam, nos dois modos', async () => {
    const { app } = buildApp()
    const { aulas } = await curso(app)
    const [a1, a2, a3] = aulas.map((a) => a.id) as [string, string, string]

    expect(
      (await publicar(app, a1, pinta({ name: 'minha-chave', replaces: 'chave-dourada' }))).status,
    ).toBe(200)
    expect((await publicar(app, a2, estudio([{ name: 'minha-chave', mode: 'add' }]))).status).toBe(
      200,
    )
    expect(
      (await publicar(app, a3, estudio([{ name: 'minha-chave', mode: 'replace' }]))).status,
    ).toBe(200)
  })

  test('jogo que importa uma vaga que nenhum desenho preenche → 409', async () => {
    const { app } = buildApp()
    const { aulas } = await curso(app)

    const message = await conflito(
      await publicar(app, aulas[0].id, estudio([{ name: 'minha-chave', mode: 'add' }])),
    )
    expect(message).toContain('"Aula 1"')
    expect(message).toContain('nenhum desenho do curso preenche')
  })

  test('duas aulas preenchendo a mesma vaga → 409 nomeando as duas', async () => {
    const { app } = buildApp()
    const { aulas } = await curso(app)

    await publicar(app, aulas[0].id, pinta({ name: 'minha-chave' }))
    const message = await conflito(await publicar(app, aulas[1].id, pinta({ name: 'minha-chave' })))
    expect(message).toContain('"Aula 1" e "Aula 2"')
    expect((await publicar(app, aulas[1].id, pinta({ name: 'meu-farol' }))).status).toBe(200)
  })

  test('vaga preenchida só DEPOIS do jogo → 409', async () => {
    const { app } = buildApp()
    const { aulas } = await curso(app)

    await publicar(app, aulas[2].id, pinta({ name: 'minha-chave' }))
    const message = await conflito(
      await publicar(app, aulas[0].id, estudio([{ name: 'minha-chave', mode: 'add' }])),
    )
    expect(message).toContain('só é preenchida depois, na aula "Aula 3"')
  })

  test('dentro da mesma aula, o desenho precisa vir antes do jogo', async () => {
    const { app } = buildApp()
    const { aulas } = await curso(app)
    const lessonId = aulas[0].id
    const sectionId = (await readDraft(app, lessonId)).document.sections[0]?.id
    const add = (content: Record<string, unknown>) =>
      changeDraft(app, lessonId, {
        type: 'block',
        block: { id: randomUUID(), content: content as { kind: 'pinta' } },
        sectionId,
      })

    await add(estudio([{ name: 'minha-chave', mode: 'add' }]))
    await add(pinta({ name: 'minha-chave' }))
    await conflito(await publishDraft(app, lessonId))
  })

  test('modo trocar: a vaga precisa dizer a imagem, e ela precisa existir no jogo', async () => {
    const { app } = buildApp()
    const { aulas } = await curso(app)

    await publicar(app, aulas[0].id, pinta({ name: 'minha-chave' }))
    expect(
      await conflito(
        await publicar(app, aulas[1].id, estudio([{ name: 'minha-chave', mode: 'replace' }])),
      ),
    ).toContain('não diz qual imagem do jogo ele substitui')

    await publicar(app, aulas[0].id, pinta({ name: 'meu-farol', replaces: 'farol-de-ouro' }))
    expect(
      await conflito(
        await publicar(app, aulas[1].id, estudio([{ name: 'meu-farol', mode: 'replace' }])),
      ),
    ).toContain('"farol-de-ouro", que não existe no jogo')
  })

  test('modo materiais: o nome da vaga não pode ser uma imagem que o jogo já tem', async () => {
    const { app } = buildApp()
    const { aulas } = await curso(app)

    await publicar(app, aulas[0].id, pinta({ name: 'farol' }))
    expect(
      await conflito(await publicar(app, aulas[1].id, estudio([{ name: 'farol', mode: 'add' }]))),
    ).toContain('já tem uma imagem chamada "farol"')
  })

  test('tirar a vaga do desenho que um jogo importa → 409', async () => {
    const { app } = buildApp()
    const { aulas } = await curso(app)
    const blockId = randomUUID()

    await publishBlock(
      app,
      aulas[0].id,
      { content: pinta({ name: 'minha-chave' }) as { kind: string } },
      {},
      blockId,
    )
    await publicar(app, aulas[1].id, estudio([{ name: 'minha-chave', mode: 'add' }]))
    await conflito(
      await publishBlock(
        app,
        aulas[0].id,
        { content: { kind: 'pinta', initialAsset: DESENHO } },
        {},
        blockId,
      ),
    )
  })
})

describe('vaga de arte no curso: reordenar e excluir', () => {
  test('reordenar as aulas pondo o jogo antes do desenho → 409, e a ordem fica', async () => {
    const { app, courses } = buildApp()
    const { moduleId, aulas } = await curso(app)
    await publicar(app, aulas[0].id, pinta({ name: 'minha-chave' }))
    await publicar(app, aulas[1].id, estudio([{ name: 'minha-chave', mode: 'add' }]))

    const reorder = (ids: string[]) =>
      admin(app, `/modules/${moduleId}/lessons/reorder`, 'POST', { orderedIds: ids })
    await conflito(await reorder([aulas[1].id, aulas[0].id, aulas[2].id]))
    const ordem = courses.lessons
      .filter((l) => l.moduleId === moduleId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((l) => l.id)
    expect(ordem).toEqual(aulas.map((a) => a.id))
    expect((await reorder([aulas[0].id, aulas[2].id, aulas[1].id])).status).toBe(200)
  })

  test('excluir a aula do desenho que um jogo importa → 409; a do jogo sai', async () => {
    const { app, courses } = buildApp()
    const { aulas } = await curso(app)
    await publicar(app, aulas[0].id, pinta({ name: 'minha-chave' }))
    await publicar(app, aulas[1].id, estudio([{ name: 'minha-chave', mode: 'add' }]))

    await conflito(await admin(app, `/lessons/${aulas[0].id}`, 'DELETE'))
    expect(courses.lessons.some((l) => l.id === aulas[0].id)).toBe(true)
    expect(courses.blocks.some((b) => b.lessonId === aulas[0].id)).toBe(true)
    expect((await admin(app, `/lessons/${aulas[1].id}`, 'DELETE')).status).toBe(200)
    expect((await admin(app, `/lessons/${aulas[0].id}`, 'DELETE')).status).toBe(200)
  })

  test('um curso que já nasceu torto não prende quem mexe em outra coisa', async () => {
    const { app, courses } = buildApp()
    const { aulas } = await curso(app)
    // Estado gravado por fora da autoria: um jogo importando uma vaga que ninguém preenche.
    courses.blocks.push({
      id: randomUUID(),
      lessonId: aulas[2].id,
      kind: 'studio',
      sortOrder: 0,
      content: estudio([{ name: 'sumiu', mode: 'add' }]) as never,
      contentRevision: 'r',
    } as never)

    expect((await publicar(app, aulas[0].id, pinta({ name: 'minha-chave' }))).status).toBe(200)
    await conflito(await publicar(app, aulas[1].id, estudio([{ name: 'outra', mode: 'add' }])))
  })
})

describe('vaga de arte no curso: o "Conferir" avisa antes de publicar', () => {
  test('o rascunho que criaria o problema já aparece na conferência', async () => {
    const { app } = buildApp()
    const { aulas } = await curso(app)
    const lessonId = aulas[0].id
    const sectionId = (await readDraft(app, lessonId)).document.sections[0]?.id
    await changeDraft(app, lessonId, {
      type: 'block',
      block: {
        id: randomUUID(),
        content: estudio([{ name: 'minha-chave', mode: 'add' }]) as never,
      },
      sectionId,
    })

    const draft = await readDraft(app, lessonId)
    const res = await draftRequest(app, lessonId, '/validate', 'POST', {
      expectedRevision: draft.revision,
      operationId: randomUUID(),
      readyVideoIds: [],
    })
    expect(res.status).toBe(200)
    const issues: { message: string }[] = await readJson(res)
    expect(issues.some((i) => i.message.includes('nenhum desenho do curso preenche'))).toBe(true)
  })
})

describe('vaga de arte: review de 29/10/2026', () => {
  test('despublicar a aula do desenho que um jogo publicado importa → 409', async () => {
    const { app } = buildApp()
    const { aulas } = await curso(app)
    await publicar(app, aulas[0].id, pinta({ name: 'minha-chave' }))
    await publicar(app, aulas[1].id, estudio([{ name: 'minha-chave', mode: 'add' }]))

    expect(await conflito(await publishDraft(app, aulas[0].id, false))).toContain(
      'não está publicada',
    )
    // O jogo pode sair primeiro; depois o desenho também.
    expect((await publishDraft(app, aulas[1].id, false)).status).toBe(200)
    expect((await publishDraft(app, aulas[0].id, false)).status).toBe(200)
  })

  test('vaga de arte num desenho de mapa é recusada', async () => {
    const { app } = buildApp()
    const { aulas } = await curso(app)
    const mapa = pintaAssetToWire(
      createAsset({ kind: 'tilemap', name: 'mapa', tilesetId: 'pecas', cols: 4, rows: 4 }),
    )
    const res = await publicar(app, aulas[0].id, {
      kind: 'pinta',
      initialAsset: mapa,
      artSlot: { name: 'meu-mapa' },
    })
    expect(res.status).not.toBe(200)
    expect(JSON.stringify(await readJson(res))).toContain('Um mapa não vira imagem do jogo')
  })
})
