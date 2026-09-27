import { describe, expect, it } from 'bun:test'
import { randomUUID } from 'node:crypto'
import type { LessonDraft, LessonDraftDocument } from '@sistemazero/core/learning'
import { changeDraft, draftRequest, publishDraft, readDraft } from '../draft-authoring-helpers'
import { buildApp, seedSampleCourse } from '../helpers'

/**
 * "Trazer a versão publicada de volta para o rascunho."
 *
 * O caso real (18/09/2026): ela apagou blocos sem querer no percurso da edição. O rascunho e o
 * publicado são documentos separados — o que ela apagou continuava no ar —, e só faltava a volta.
 */
function setup() {
  const env = buildApp()
  const course = seedSampleCourse(env.courses)
  const lessonId = course.lessonIds[0] as string
  return { ...env, lessonId }
}

/** Publica uma aula com dois blocos de texto e devolve os ids. */
async function aulaPublicada(ctx: ReturnType<typeof setup>) {
  const { app, lessonId } = ctx
  const primeiro = await readDraft(app, lessonId)
  const secao = primeiro.document.sections[0]?.id
  const b1 = randomUUID()
  const b2 = randomUUID()
  for (const [id, markdown] of [
    [b1, 'O que é uma variável'],
    [b2, 'Resumo da aula'],
  ] as const) {
    const salvo = await changeDraft(app, lessonId, {
      type: 'block',
      block: { id, content: { kind: 'rich_text', markdown } },
      sectionId: secao,
    })
    expect(salvo.status).toBe(200)
  }
  expect((await publishDraft(app, lessonId)).status).toBe(200)
  return { b1, b2, secao }
}

async function restaurar(ctx: ReturnType<typeof setup>, ids?: string[]) {
  const atual = await readDraft(ctx.app, ctx.lessonId)
  const response = await draftRequest(ctx.app, ctx.lessonId, '/restore-published', 'POST', {
    expectedRevision: atual.revision,
    operationId: randomUUID(),
    ...(ids ? { ids } : {}),
  })
  return { status: response.status, draft: (await response.json()) as LessonDraft }
}

const apagar = (ctx: ReturnType<typeof setup>, blockId: string) =>
  changeDraft(ctx.app, ctx.lessonId, { type: 'remove-block', blockId })

const criar = (ctx: ReturnType<typeof setup>, sectionId: string | undefined, texto: string) =>
  changeDraft(ctx.app, ctx.lessonId, {
    type: 'block',
    block: { id: randomUUID(), content: { kind: 'rich_text', markdown: texto } },
    sectionId,
  })

const ids = (document: LessonDraftDocument) => document.blocks.map((b) => b.id).sort()

describe('restaurar o rascunho a partir da versão publicada', () => {
  it('⭐ o bloco apagado sem querer volta, e o resto do rascunho fica', async () => {
    const ctx = setup()
    const { b1, b2, secao } = await aulaPublicada(ctx)
    expect((await apagar(ctx, b1)).status).toBe(200)
    expect((await criar(ctx, secao, 'escrito depois')).status).toBe(200)
    const antes = await readDraft(ctx.app, ctx.lessonId)
    const novo = ids(antes.document).filter((id) => id !== b2)

    const { status, draft } = await restaurar(ctx, [b1])
    expect(status).toBe(200)
    const depois = ids(draft.document)
    expect(depois).toContain(b1)
    expect(depois).toContain(b2)
    // O que ela escreveu depois da publicacao continua la.
    for (const id of novo) expect(depois).toContain(id)
    expect(draft.canUndoRestore).toBe(true)
  })

  it('⭐ o "Desfazer" devolve o rascunho de antes, e some depois de usado', async () => {
    const ctx = setup()
    const { b1 } = await aulaPublicada(ctx)
    await apagar(ctx, b1)
    const antes = await readDraft(ctx.app, ctx.lessonId)

    const { draft: restaurado } = await restaurar(ctx, [b1])
    expect(ids(restaurado.document)).toContain(b1)

    const desfeito = await draftRequest(ctx.app, ctx.lessonId, '/undo-restore', 'POST', {
      expectedRevision: restaurado.revision,
      operationId: randomUUID(),
    })
    expect(desfeito.status).toBe(200)
    const volta = (await desfeito.json()) as LessonDraft
    expect(ids(volta.document)).toEqual(ids(antes.document))
    expect(volta.canUndoRestore).toBe(false)

    const denovo = await draftRequest(ctx.app, ctx.lessonId, '/undo-restore', 'POST', {
      expectedRevision: volta.revision,
      operationId: randomUUID(),
    })
    expect(denovo.status).toBe(404)
  })

  it('⚠️ uma edição depois da restauração APAGA o desfazer', async () => {
    const ctx = setup()
    const { b1, secao } = await aulaPublicada(ctx)
    await apagar(ctx, b1)
    expect((await restaurar(ctx, [b1])).draft.canUndoRestore).toBe(true)

    await criar(ctx, secao, 'mais uma coisa')
    const depois = await readDraft(ctx.app, ctx.lessonId)
    expect(depois.canUndoRestore).toBe(false)
    const desfazer = await draftRequest(ctx.app, ctx.lessonId, '/undo-restore', 'POST', {
      expectedRevision: depois.revision,
      operationId: randomUUID(),
    })
    expect(desfazer.status).toBe(404)
  })

  it('sem `ids`, o rascunho inteiro volta a ser o publicado', async () => {
    const ctx = setup()
    const { b1, b2, secao } = await aulaPublicada(ctx)
    await apagar(ctx, b1)
    const antes = ids((await readDraft(ctx.app, ctx.lessonId)).document)
    expect((await criar(ctx, secao, 'só no rascunho')).status).toBe(200)
    const soNoRascunho = ids((await readDraft(ctx.app, ctx.lessonId)).document).filter(
      (id) => !antes.includes(id),
    )
    expect(soNoRascunho).toHaveLength(1)
    const { status, draft } = await restaurar(ctx)
    expect(status).toBe(200)
    const depois = ids(draft.document)
    expect(depois).toContain(b1)
    expect(depois).toContain(b2)
    // "Trazer tudo" DESCARTA o que so existia no rascunho — e por isso o painel avisa.
    for (const id of soNoRascunho) expect(depois).not.toContain(id)
  })

  it('⭐ o rascunho restaurado publica na sequência (o publishedRevision acompanha)', async () => {
    const ctx = setup()
    const { b1 } = await aulaPublicada(ctx)
    await apagar(ctx, b1)
    await restaurar(ctx)
    expect((await publishDraft(ctx.app, ctx.lessonId)).status).toBe(200)
  })

  it('revisão divergente (duas abas) é 409, e não sobrescreve nada', async () => {
    const ctx = setup()
    const { b1 } = await aulaPublicada(ctx)
    await apagar(ctx, b1)
    const velha = await readDraft(ctx.app, ctx.lessonId)
    await changeDraft(ctx.app, ctx.lessonId, {
      type: 'metadata',
      title: 'Outro título',
      slug: velha.document.slug,
      estimatedMinutes: velha.document.estimatedMinutes,
    })
    const conflito = await draftRequest(ctx.app, ctx.lessonId, '/restore-published', 'POST', {
      expectedRevision: velha.revision,
      operationId: randomUUID(),
      ids: [b1],
    })
    expect(conflito.status).toBe(409)
    expect(ids((await readDraft(ctx.app, ctx.lessonId)).document)).not.toContain(b1)
  })

  it('o GET do publicado mostra o que está no ar, não o rascunho', async () => {
    const ctx = setup()
    const { b1, b2 } = await aulaPublicada(ctx)
    await apagar(ctx, b1)
    const response = await draftRequest(ctx.app, ctx.lessonId, '/published')
    expect(response.status).toBe(200)
    const { document } = (await response.json()) as { document: LessonDraftDocument }
    expect(ids(document)).toContain(b1)
    expect(ids(document)).toContain(b2)
    // O rascunho ja nao tem o b1; o publicado tem.
    expect(ids((await readDraft(ctx.app, ctx.lessonId)).document)).not.toContain(b1)
  })
})
