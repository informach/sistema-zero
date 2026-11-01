import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { defaultLessonSection, type LessonDraftDocument } from '@sistemazero/core/learning'
import {
  adultSalesUrl,
  hash,
  type MediaProof,
  missingAdultTarget,
  planCourseSync,
  type Snapshot,
  sourceHash,
} from '../../src/domain/course-publication/course-sync'
import {
  readPublicationSnapshot,
  storePublicationSnapshot,
} from '../../src/domain/course-publication/jobs'

export function fixture(): Snapshot {
  const now = new Date('2026-11-01T10:00:00Z')
  const sourceId = randomUUID(),
    targetId = randomUUID(),
    moduleId = randomUUID(),
    targetModule = randomUUID(),
    lessonId = randomUUID(),
    targetLesson = randomUUID(),
    blockId = randomUUID()
  const document: LessonDraftDocument = {
    title: 'Uma busca',
    slug: 'aula-1',
    estimatedMinutes: 15,
    blocks: [{ id: blockId, content: { kind: 'dialogue', text: 'Jogue e observe.' } }],
    sections: [defaultLessonSection(randomUUID(), 'Comece', [blockId])],
    attachments: [],
    plannedVideos: [],
  }
  const course = {
    id: sourceId,
    version: 4,
    slug: 'busca',
    title: 'Busca',
    subtitle: 'Crie',
    description: 'Um jogo',
    coverImageUrl: 'https://assets.example/capa.webp',
    status: 'published' as const,
    audience: 'kids' as const,
    level: 'primeiros-passos' as const,
    track: '2d' as const,
    careerSlot: null,
    journeyRole: 'extra' as const,
    sequentialLock: true,
    videoBeforeActivity: true,
    modality: 'recorded' as const,
    metadata: {
      studioUnlockBlocks: ['sz_frame_start'],
      salesPageUrl: 'https://sistemazero.com.br/kids/busca',
    },
    createdAt: now,
    updatedAt: now,
  }
  const source = {
    course,
    modules: [
      {
        id: moduleId,
        courseId: sourceId,
        title: 'Primeiro',
        summary: 'Observe',
        animation: null,
        sortOrder: 0,
        archivedAt: null,
        createdAt: now,
        updatedAt: now,
      },
    ],
    lessons: [
      {
        row: {
          id: lessonId,
          courseId: sourceId,
          moduleId,
          title: document.title,
          slug: document.slug,
          estimatedMinutes: 15,
          sortOrder: 0,
          isPublished: true,
          archivedAt: null,
          createdAt: now,
          updatedAt: now,
        },
        published: document,
        publishedRevision: 'source-rev',
        draft: { revision: randomUUID(), document: structuredClone(document) },
      },
    ],
  }
  const empty = { ...structuredClone(document), blocks: [], sections: [], attachments: [] }
  const target = {
    course: {
      ...course,
      id: targetId,
      slug: 'busca-adulto',
      version: 1,
      audience: 'adult' as const,
      status: 'draft' as const,
      metadata: {
        salesPageUrl: 'https://sistemazero.com.br/pro/antiga',
        creatorSeed: { requiredLessonIds: [targetLesson] },
      },
    },
    modules: [{ ...source.modules[0]!, id: targetModule, courseId: targetId }],
    lessons: [
      {
        row: {
          ...source.lessons[0]!.row,
          id: targetLesson,
          moduleId: targetModule,
          courseId: targetId,
          isPublished: false,
        },
        published: empty,
        publishedRevision: 'target-rev',
        draft: { revision: randomUUID(), document: empty },
      },
    ],
  }
  return { environment: 'local', source, target }
}
export function proof(snapshot: Snapshot): MediaProof {
  return {
    environment: snapshot.environment,
    sourceHash: sourceHash(snapshot),
    checkedAt: new Date().toISOString(),
    readyVideoIds: [],
    voices: {},
    generated: 0,
    reused: 0,
  }
}

describe('sincronizar curso publicado entre públicos', () => {
  test('o registro durável hidrata só as datas das linhas, preservando strings dentro dos projetos', () => {
    const snapshot = fixture()
    const project = { createdAt: '2026-10-31T00:00:00Z', updatedAt: '2026-11-01T00:00:00Z' }
    snapshot.source.lessons[0]!.published.blocks[0]!.content.initialProject = project
    snapshot.source.archivedModules = [
      { ...snapshot.source.modules[0]!, archivedAt: new Date('2026-11-01T00:00:00Z') },
    ]
    const stored = storePublicationSnapshot(snapshot)
    const hydrated = readPublicationSnapshot(stored)
    expect(hydrated.source.course.createdAt).toBeInstanceOf(Date)
    expect(hydrated.source.archivedModules?.[0]?.archivedAt).toBeInstanceOf(Date)
    expect(hydrated.source.lessons[0]!.published.blocks[0]!.content.initialProject).toEqual(project)
    expect(hash(hydrated)).toBe(hash(snapshot))
    stored.source.course.createdAt = 'ontem'
    expect(() => readPublicationSnapshot(stored)).toThrow('Data inválida')
  })
  test('publica seguindo módulo e aula, mesmo quando o inventário chega em outra ordem', () => {
    const snapshot = fixture()
    const module = {
      ...snapshot.source.modules[0]!,
      id: randomUUID(),
      sortOrder: 1,
      title: 'Depois',
    }
    snapshot.source.modules.push(module)
    const lesson = structuredClone(snapshot.source.lessons[0]!)
    lesson.row = {
      ...lesson.row,
      id: randomUUID(),
      moduleId: module.id,
      slug: 'aula-depois',
      title: 'Depois',
    }
    const block = randomUUID()
    lesson.published = {
      ...lesson.published,
      slug: 'aula-depois',
      title: 'Depois',
      blocks: [{ id: block, content: { kind: 'dialogue', text: 'Depois.' } }],
      sections: [defaultLessonSection(randomUUID(), 'Depois', [block])],
    }
    lesson.draft = null
    snapshot.source.lessons.unshift(lesson)
    const plan = planCourseSync(snapshot)
    expect(plan.lessons.map((l) => l.row.slug)).toEqual(['aula-1', 'aula-depois'])
    lesson.row.moduleId = randomUUID()
    expect(() => planCourseSync(snapshot)).toThrow('módulo da origem')
  })
  test('planeja o curso ausente sem criar identidade nova a cada tentativa', () => {
    const snapshot = fixture()
    snapshot.target = missingAdultTarget(snapshot.source.course, 'busca-adulto', 'local')
    const first = planCourseSync(snapshot)
    const second = planCourseSync(structuredClone(snapshot))
    expect(first.planHash).toBe(second.planHash)
    expect(first.course.id).not.toBe(snapshot.source.course.id)
    expect(first.course.status).toBe('published')
    expect(first.lessons).toHaveLength(1)
    expect(snapshot.target.modules).toHaveLength(0)
  })
  test('preserva identidade adulta e origem, copia conteúdo e publica', () => {
    const snapshot = fixture(),
      before = hash(snapshot),
      plan = planCourseSync(snapshot)
    expect(plan.course.id).toBe(snapshot.target.course.id)
    expect(plan.course.slug).toBe('busca-adulto')
    expect(plan.course.audience).toBe('adult')
    expect(plan.course.status).toBe('published')
    expect(plan.course.journeyRole).toBe('extra')
    expect(plan.course.metadata?.salesPageUrl).toBe('https://sistemazero.com.br/pro/busca')
    expect(plan.course.metadata?.creatorSeed).toBeUndefined()
    expect(plan.course.metadata?.studioUnlockBlocks).toEqual(['sz_frame_start'])
    expect(plan.lessons[0]!.row.id).toBe(snapshot.target.lessons[0]!.row.id)
    expect(plan.lessons[0]!.row.isPublished).toBe(true)
    expect(plan.lessons[0]!.document.blocks[0]!.id).not.toBe(
      snapshot.source.lessons[0]!.published.blocks[0]!.id,
    )
    expect(hash(snapshot)).toBe(before)
  })
  test('a repetição é semântica, sem criar outra aula', () => {
    const snapshot = fixture(),
      plan = planCourseSync(snapshot, proof(snapshot))
    snapshot.target = {
      course: plan.course,
      modules: plan.modules,
      lessons: plan.lessons.map((l) => ({
        row: l.row,
        published: l.document,
        publishedRevision: 'next',
        draft: { revision: randomUUID(), document: l.document },
      })),
    }
    const again = planCourseSync(snapshot, proof(snapshot))
    expect(again.changed).toBe(false)
    expect(again.lessons.map((l) => l.row.id)).toEqual(plan.lessons.map((l) => l.row.id))
  })
  test('recusa edição não publicada, curso e aulas não publicados', () => {
    const snapshot = fixture()
    snapshot.source.lessons[0]!.draft!.document.title = 'Não publicada'
    expect(() => planCourseSync(snapshot)).toThrow('não publicada')
    snapshot.source.lessons[0]!.draft = null
    snapshot.source.lessons[0]!.row.isPublished = false
    expect(() => planCourseSync(snapshot)).toThrow('todas as aulas')
    snapshot.source.course.status = 'draft'
    expect(() => planCourseSync(snapshot)).toThrow('curso gravado publicado')
  })
  test('usa o projeto publicado quando só o relógio do editor mudou', () => {
    const snapshot = fixture(),
      lesson = snapshot.source.lessons[0]!
    const block = lesson.published.blocks[0]!
    block.content = {
      kind: 'studio',
      initialProject: { updatedAt: 10, files: { 'script.js': 'let velocidade = 3' } },
    }
    lesson.draft!.document = structuredClone(lesson.published)
    const edited = lesson.draft!.document.blocks[0]!.content.initialProject as Record<
      string,
      unknown
    >
    edited.updatedAt = 20
    const copied = planCourseSync(snapshot).lessons[0]!.document.blocks[0]!.content
      .initialProject as Record<string, unknown>
    expect(copied.updatedAt).toBe(10)
    edited.files = { 'script.js': 'let velocidade = 8' }
    expect(() => planCourseSync(snapshot)).toThrow('não publicada')
  })
  test('recusa prova de outro ambiente ou conteúdo alterado', () => {
    const snapshot = fixture(),
      media = proof(snapshot)
    media.environment = 'production'
    expect(() => planCourseSync(snapshot, media)).toThrow('ambiente')
    media.environment = 'local'
    snapshot.source.course.description = 'Mudou'
    expect(() => planCourseSync(snapshot, media)).toThrow('origem')
  })
  test('planeja retirar a aula excedente sem apagar o histórico', () => {
    const snapshot = fixture()
    snapshot.target.lessons.push({
      ...snapshot.target.lessons[0]!,
      row: { ...snapshot.target.lessons[0]!.row, id: randomUUID(), slug: 'extra' },
    })
    const plan = planCourseSync(snapshot)
    expect(plan.retirements.lessons).toEqual([snapshot.target.lessons[1]!.row.id])
    expect(plan.lessons).toHaveLength(1)
  })
  test('remapeia anexos, critérios, workspace e planos de vídeo', () => {
    const snapshot = fixture(),
      doc = snapshot.source.lessons[0]!.published
    const attachmentId = randomUUID(),
      book = randomUUID(),
      video = randomUUID()
    doc.attachments = [
      {
        id: attachmentId,
        label: 'Passo a passo',
        url: 'r2priv:materiais/livro.pdf',
        fileType: 'application/pdf',
        sizeBytes: 123,
        zappyStudentNotebook: true,
      },
    ]
    doc.blocks = [
      { id: book, content: { kind: 'ebook', attachmentId } },
      {
        id: video,
        content: { kind: 'video', provider: 'vimeo', src: 'https://player.vimeo.com/video/1234' },
      },
    ]
    doc.sections = [
      {
        ...defaultLessonSection(randomUUID(), 'Leia', [book, video]),
        workspaceBlockId: book,
        completion: {
          version: 1,
          blockIds: [book],
          materialItems: [{ blockId: book, itemIds: ['item'] }],
        },
      },
    ]
    snapshot.source.lessons[0]!.draft!.document = structuredClone(doc)
    snapshot.source.lessons[0]!.draft!.document.plannedVideos = [
      { blockId: video, instructions: 'Assista', videoId: '1234' },
    ]
    const mapped = planCourseSync(snapshot).lessons[0]!.document
    const b = mapped.blocks[0]!.id,
      a = mapped.attachments[0]!.id
    expect(mapped.blocks[0]!.content.attachmentId).toBe(a)
    expect(mapped.sections[0]!.blockIds[0]).toBe(b)
    expect(mapped.sections[0]!.workspaceBlockId).toBe(b)
    expect(mapped.sections[0]!.completion!.materialItems![0]!.blockId).toBe(b)
    expect(mapped.plannedVideos[0]!.blockId).toBe(mapped.blocks[1]!.id)
    expect(mapped.attachments[0]!.url).toBe(doc.attachments[0]!.url)
  })
  test('referência desconhecida nunca é deixada apontando para o Kids', () => {
    const snapshot = fixture()
    snapshot.source.lessons[0]!.published.sections[0]!.blockIds = [randomUUID()]
    snapshot.source.lessons[0]!.draft = null
    expect(() => planCourseSync(snapshot)).toThrow('Referência sem destino')
  })
  test('a concessão de uma posição Kids não reclassifica a jornada adulta', () => {
    const snapshot = fixture()
    snapshot.source.course.careerSlot = 1
    snapshot.source.course.journeyRole = 'positioned'
    expect(planCourseSync(snapshot).course.careerSlot).toBeNull()
    expect(planCourseSync(snapshot).course.journeyRole).toBe(snapshot.target.course.journeyRole)
  })
  test('traduz somente o segmento comercial e recusa adivinhação', () => {
    expect(adultSalesUrl('https://sistemazero.com.br/kids/busca?ref=kids', null)).toBe(
      'https://sistemazero.com.br/pro/busca?ref=kids',
    )
    expect(adultSalesUrl(null, 'https://sistemazero.com.br/pro/busca')).toBe(
      'https://sistemazero.com.br/pro/busca',
    )
    expect(() => adultSalesUrl('https://sistemazero.com.br/outra', null)).toThrow('/kids/')
  })
})
