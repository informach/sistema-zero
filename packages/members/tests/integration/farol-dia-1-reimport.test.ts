import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import { isLearningManifest, type LearningManifest } from '@sistemazero/core/learning'
import { importedLearningId } from '../../src/domain/learning/learning-import'
import { changeDraft, readDraft } from '../draft-authoring-helpers'
import { buildApp, seedSampleCourse } from '../helpers'

/**
 * Reimportar o Dia 1 do Farol sobre um rascunho que já recebeu a versão de 05/10/2026.
 *
 * Em 06/10/2026 saíram as seções `tanto` e `velocidade`. O manifesto novo aposenta os cinco blocos
 * delas, e dois são VÍDEOS ainda só planejados. A importação recusava qualquer vídeo no
 * `retireBlockKeys`, e o modo preservar (o padrão do Admin) devolvia 400 justamente na aula que
 * precisava ser atualizada. Os testes de importação existentes começavam numa aula vazia e não
 * viam isso.
 *
 * O "antes" é o manifesto atual com as duas seções e os cinco blocos de volta, como estavam no
 * commit de 05/10/2026: a diferença que importa é a estrutura, não o texto das falas.
 */
const DIA_1 = resolve(
  import.meta.dir,
  '../../../../docs/aulas-interativas/aulas/desafio-dia-1.manifesto.json',
)
const RETIRADOS = [
  'video-d1-tanto',
  'ponte-d1-tanto',
  'experiencia-velocidade',
  'video-d1-velocidade',
  'ponte-d1-velocidade',
]

async function manifestos() {
  const atual: unknown = await Bun.file(DIA_1).json()
  if (!isLearningManifest(atual)) throw new Error('Manifesto do Dia 1 inválido')
  const andar = atual.sections.find((section) => section.key === 'andar')
  if (!andar?.completion?.projectChecks) throw new Error('Seção andar sem critérios')
  const antes = structuredClone(atual) as LearningManifest
  antes.retireBlockKeys = ['video-d1-chegada', 'video-d1-movimento']
  antes.blocks.splice(
    antes.blocks.findIndex((block) => block.key === 'ponte-d1-andar') + 1,
    0,
    {
      key: 'video-d1-tanto',
      plannedVideo: 'Título: O tanto que ele anda\n\nComparar Velocidade 3 e Velocidade 1.',
    },
    {
      key: 'ponte-d1-tanto',
      content: {
        kind: 'dialogue',
        pose: 'speaking',
        text: 'Sua vez! Compare as duas velocidades e repare nas marcas no chão.',
      },
    },
    {
      key: 'experiencia-velocidade',
      content: {
        kind: 'interactive',
        required: true,
        title: 'O tanto que ele anda',
        semPerguntaFinal: true,
        instructions: 'Compare Velocidade 3 e Velocidade 1.',
        hints: [],
        activity: {
          type: 'experimentation',
          scene: 'lighthouse-walk',
          cenario: 'farol',
          setup: { goals: ['step-speed-3', 'step-speed-1'] },
        },
      },
    },
    {
      key: 'video-d1-velocidade',
      plannedVideo: 'Título: Escolha a velocidade\n\nTrocar o 3 por um número de 1 a 6.',
    },
    {
      key: 'ponte-d1-velocidade',
      content: {
        kind: 'dialogue',
        pose: 'speaking',
        text: 'Escolha a velocidade do seu personagem e depois clique em Verificar esta parte.',
      },
    } as LearningManifest['blocks'][number],
  )
  const secao = (key: string, title: string) => ({
    key,
    title,
    objective: title,
    externalTool: null,
    pendingMedia: [],
  })
  antes.sections.splice(
    antes.sections.findIndex((section) => section.key === 'andar') + 1,
    0,
    {
      ...secao('tanto', 'O tanto que ele anda'),
      intent: 'exploration',
      blockKeys: ['video-d1-tanto', 'ponte-d1-tanto', 'experiencia-velocidade'],
      workspaceKey: null,
      completion: { version: 1, blockIds: ['video-d1-tanto', 'experiencia-velocidade'] },
    },
    {
      ...secao('velocidade', 'Escolha a velocidade'),
      intent: 'application',
      blockKeys: ['video-d1-velocidade', 'ponte-d1-velocidade'],
      workspaceKey: 'projeto',
      completion: {
        version: 1,
        blockIds: ['video-d1-velocidade'],
        projectChecks: andar.completion.projectChecks,
      },
    } as LearningManifest['sections'][number],
  )
  if (!isLearningManifest(antes)) throw new Error('Manifesto de 05/10 montado inválido')
  return { antes, atual }
}

async function setup() {
  const env = buildApp({ requireAdmin: true })
  const course = seedSampleCourse(env.courses, 'desafio-primeiro-jogo', 'published', 'kids')
  const lessonId = course.lessonIds[0]!
  const { antes, atual } = await manifestos()
  env.courses.lessons.find((lesson) => lesson.id === lessonId)!.slug = atual.lessonSlug
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
  async function importar(document: unknown) {
    const preview = await request('import-preview', { document })
    const body = (await preview.json()) as {
      fingerprint: string
      blocks: { id: string; label?: string; action: string }[]
      error?: { code: string; message: string }
    }
    if (preview.status !== 200) return { status: preview.status, preview: body }
    const applied = await request('import-learning', {
      document,
      expectedFingerprint: body.fingerprint,
      operationId: randomUUID(),
    })
    return { status: applied.status, preview: body }
  }
  const first = await importar(antes)
  expect(first.status).toBe(200)
  const id = (kind: 'block' | 'section', key: string) => importedLearningId(lessonId, kind, key)
  return { env, lessonId, antes, atual, importar, id }
}

test('o Dia 1 novo reimporta em modo preservar sobre a versão de 05/10, aposentando os vídeos planejados', async () => {
  const { env, lessonId, atual, importar, id } = await setup()
  const before = await readDraft(env.app, lessonId)
  expect(before.document.sections).toHaveLength(8)
  // O progresso da criança é guardado por seção e mora fora do rascunho.
  const owner = { userId: randomUUID(), accountId: randomUUID() }
  env.learningRepository.sectionProgress.set(`${owner.accountId}:${owner.userId}:${lessonId}`, [
    {
      sectionId: id('section', 'quadro'),
      revision: 'r1',
      completedAt: '2026-10-05T12:00:00.000Z',
      projectPassed: false,
    },
    {
      sectionId: id('section', 'tanto'),
      revision: 'r1',
      completedAt: '2026-10-05T12:05:00.000Z',
      projectPassed: false,
    },
  ])
  const progress = structuredClone([...env.learningRepository.sectionProgress])
  const published = await env.courses.findLessonWithContent(lessonId)

  const second = await importar(atual)
  expect(second.status, JSON.stringify(second.preview)).toBe(200)
  expect(
    second.preview.blocks.filter((block) => block.action === 'retire').map((block) => block.label),
  ).toEqual(RETIRADOS)

  const after = await readDraft(env.app, lessonId)
  expect(after.document.sections.map((section) => section.id)).toEqual(
    atual.sections.map((section) => id('section', section.key)),
  )
  // As seções mantidas conservam o id que o progresso usa; as retiradas saem do rascunho.
  for (const key of ['apresentacao', 'caderno', 'quadro', 'andar', 'limite', 'borda'])
    expect(before.document.sections.some((section) => section.id === id('section', key))).toBe(true)
  for (const key of RETIRADOS) {
    expect(after.document.blocks.some((block) => block.id === id('block', key))).toBe(false)
    expect(after.document.plannedVideos.some((video) => video.blockId === id('block', key))).toBe(
      false,
    )
  }
  expect(after.document.blocks.find((block) => block.content.kind === 'studio')?.id).toBe(
    before.document.blocks.find((block) => block.content.kind === 'studio')?.id,
  )
  expect([...env.learningRepository.sectionProgress]).toEqual(progress)
  expect(await env.courses.findLessonWithContent(lessonId)).toEqual(published)
  // Reimportar o mesmo manifesto é estável.
  expect((await importar(atual)).status).toBe(200)
  expect((await readDraft(env.app, lessonId)).document).toEqual(after.document)
})

test('um vídeo retirado que já tem Vimeo escolhido sai do rascunho e a prévia diz qual era', async () => {
  const { env, lessonId, atual, importar, id } = await setup()
  const draft = await readDraft(env.app, lessonId)
  const linked = await changeDraft(env.app, lessonId, {
    type: 'planned-videos',
    plannedVideos: draft.document.plannedVideos.map((video) =>
      video.blockId === id('block', 'video-d1-tanto') ? { ...video, videoId: '123456789' } : video,
    ),
  })
  expect(linked.status).toBe(200)
  const result = await importar(atual)
  expect(result.status, JSON.stringify(result.preview)).toBe(200)
  expect(result.preview.blocks).toContainEqual({
    id: id('block', 'video-d1-tanto'),
    label: 'video-d1-tanto (Vimeo 123456789)',
    action: 'retire',
  })
  const after = await readDraft(env.app, lessonId)
  expect(after.document.sections).toHaveLength(atual.sections.length)
  expect(after.document.blocks.some((b) => b.id === id('block', 'video-d1-tanto'))).toBe(false)
})

test('um vídeo retirado que já tem fonte no bloco também sai do rascunho', async () => {
  const { env, lessonId, atual, importar, id } = await setup()
  const blockId = id('block', 'video-d1-velocidade')
  const saved = await changeDraft(env.app, lessonId, {
    type: 'block',
    block: {
      id: blockId,
      content: { kind: 'video', provider: 'vimeo', src: 'https://vimeo.com/987654321' },
    },
  })
  expect(saved.status).toBe(200)
  const result = await importar(atual)
  expect(result.status, JSON.stringify(result.preview)).toBe(200)
  expect(result.preview.blocks).toContainEqual({
    id: blockId,
    label: 'video-d1-velocidade (Vimeo 987654321)',
    action: 'retire',
  })
  expect((await readDraft(env.app, lessonId)).document.blocks.some((b) => b.id === blockId)).toBe(
    false,
  )
})
