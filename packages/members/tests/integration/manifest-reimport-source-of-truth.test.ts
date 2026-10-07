import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import { isLearningManifest, type LearningManifest } from '@sistemazero/core/learning'
import { importedLearningId } from '../../src/domain/learning/learning-import'
import { changeDraft, readDraft } from '../draft-authoring-helpers'
import { buildApp, seedSampleCourse } from '../helpers'

/**
 * O manifesto é a fonte da verdade do que ele criou (07/10/2026).
 *
 * O caso real do staging: uma aula recebeu o Dia 1 do Desafio, teve o vídeo da borda vinculado ao
 * Vimeo e depois recebeu o manifesto do Dia 2 ("Vincular ao destino aberto"). No modo padrão, o
 * vídeo do Dia 1 ficava grudado na última parte, ao lado do vídeo do Dia 2: duas mídias numa parte
 * só, e a autora tinha de limpar à mão a cada atualização do manifesto.
 */
async function manifesto(nome: string, lessonSlug: string): Promise<LearningManifest> {
  const document: unknown = await Bun.file(
    resolve(import.meta.dir, `../../../../docs/aulas-interativas/aulas/${nome}.manifesto.json`),
  ).json()
  if (!isLearningManifest(document)) throw new Error(`Manifesto ${nome} inválido`)
  // O mesmo que o botão "Vincular ao destino aberto" do Admin faz.
  return { ...document, lessonSlug }
}

async function setup() {
  const env = buildApp({ requireAdmin: true })
  const course = seedSampleCourse(env.courses, 'desafio-primeiro-jogo', 'published', 'kids')
  // A aula 2 do curso de exemplo nasce sem blocos publicados.
  const lessonId = course.lessonIds[1]
  const lesson = env.courses.lessons.find((item) => item.id === lessonId)
  if (!lesson) throw new Error('Aula ausente na fixture')
  const request = (action: string, body: unknown) =>
    env.app.handle(
      new Request(`http://localhost/members/admin/lessons/${lessonId}/${action}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-auth-user-id': '11111111-1111-1111-1111-111111111111',
          'x-auth-user-role': 'admin',
          'x-auth-user-status': 'active',
        },
        body: JSON.stringify(body),
      }),
    )
  async function importar(document: unknown, mode: 'preserve' | 'replace' = 'preserve') {
    const preview = await request('import-preview', { document, mode })
    const body = (await preview.json()) as {
      fingerprint: string
      blocks: { id: string; label?: string; action: string }[]
      removedSections: { id: string; title: string }[]
      warnings: string[]
    }
    if (preview.status !== 200) return { status: preview.status, preview: body }
    const applied = await request('import-learning', {
      document,
      mode,
      expectedFingerprint: body.fingerprint,
      operationId: randomUUID(),
    })
    return { status: applied.status, preview: body }
  }
  const id = (key: string) => importedLearningId(lessonId, 'block', key)
  return { env, lessonId, slug: lesson.slug, importar, id }
}

function videosPorSecao(draft: Awaited<ReturnType<typeof readDraft>>) {
  const kinds = new Map(draft.document.blocks.map((block) => [block.id, block.content.kind]))
  return draft.document.sections.map(
    (section) => section.blockIds.filter((blockId) => kinds.get(blockId) === 'video').length,
  )
}

test('o Dia 2 importado sobre o Dia 1 tira o que era do Dia 1, inclusive o vídeo já vinculado', async () => {
  const { env, lessonId, slug, importar, id } = await setup()
  const dia1 = await manifesto('desafio-dia-1', slug)
  const dia2 = await manifesto('desafio-dia-2', slug)
  expect((await importar(dia1)).status).toBe(200)

  const vinculado = dia1.blocks.find((block) => 'plannedVideo' in block)?.key
  if (!vinculado) throw new Error('O Dia 1 não tem vídeo planejado')
  const draft = await readDraft(env.app, lessonId)
  const linked = await changeDraft(env.app, lessonId, {
    type: 'planned-videos',
    plannedVideos: draft.document.plannedVideos.map((video) =>
      video.blockId === id(vinculado) ? { ...video, videoId: '1232673566' } : video,
    ),
  })
  expect(linked.status).toBe(200)
  // Um bloco que a autora criou à mão no Admin (id aleatório, versão 4).
  const handmade = randomUUID()
  const added = await changeDraft(env.app, lessonId, {
    type: 'block',
    block: { id: handmade, content: { kind: 'rich_text', markdown: 'Recado da equipe' } },
    sectionId: draft.document.sections[0]?.id,
  })
  expect(added.status).toBe(200)

  const result = await importar(dia2)
  expect(result.status, JSON.stringify(result.preview)).toBe(200)
  expect(result.preview.blocks.find((block) => block.id === id(vinculado))?.label).toContain(
    'Vimeo 1232673566',
  )

  const after = await readDraft(env.app, lessonId)
  const chavesDia2 = new Set(dia2.blocks.map((block) => block.key))
  for (const block of dia1.blocks)
    if (!chavesDia2.has(block.key))
      expect(after.document.blocks.some((b) => b.id === id(block.key))).toBe(false)
  // Uma mídia por parte: o vídeo do Dia 1 não ficou grudado em nenhuma parte do Dia 2.
  for (const total of videosPorSecao(after)) expect(total).toBeLessThanOrEqual(1)
  expect(after.document.sections).toHaveLength(dia2.sections.length)
  expect(after.document.title).toBe(dia2.title)
  // O que foi feito à mão fica, no fim da última parte.
  expect(after.document.sections.at(-1)?.blockIds.at(-1)).toBe(handmade)

  // Reimportar o mesmo manifesto não muda nada.
  const again = await importar(dia2)
  expect(again.status).toBe(200)
  expect(again.preview.blocks.filter((block) => block.action === 'remove')).toEqual([])
  expect((await readDraft(env.app, lessonId)).document).toEqual(after.document)
})

test('substituir também tira o que foi criado à mão; atualizar mantém', async () => {
  const { env, lessonId, slug, importar } = await setup()
  const dia2 = await manifesto('desafio-dia-2', slug)
  expect((await importar(dia2)).status).toBe(200)
  const draft = await readDraft(env.app, lessonId)
  const handmade = randomUUID()
  const added = await changeDraft(env.app, lessonId, {
    type: 'block',
    block: { id: handmade, content: { kind: 'rich_text', markdown: 'Recado da equipe' } },
    sectionId: draft.document.sections[0]?.id,
  })
  expect(added.status).toBe(200)

  const atualizar = await importar(dia2)
  expect(atualizar.status).toBe(200)
  expect(atualizar.preview.blocks.find((block) => block.id === handmade)?.action).toBe('preserve')
  expect((await readDraft(env.app, lessonId)).document.blocks.some((b) => b.id === handmade)).toBe(
    true,
  )

  const substituir = await importar(dia2, 'replace')
  expect(substituir.status).toBe(200)
  expect(substituir.preview.blocks.find((block) => block.id === handmade)?.action).toBe('remove')
  expect((await readDraft(env.app, lessonId)).document.blocks.some((b) => b.id === handmade)).toBe(
    false,
  )
})
