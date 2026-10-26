import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { KidsJourneyQueryService } from '../../src/application/kids-journey/kids-journey-query.service'
import { ListCatalogService } from '../../src/application/list-catalog/list-catalog.service'
import type { Course, CourseStatus } from '../../src/domain/course/course'
import {
  InMemoryCourseRepository,
  InMemoryEntitlementRepository,
  InMemoryGamificationRepository,
} from '../fakes/in-memory'
import { InMemoryKidsJourneySnapshots } from '../fakes/kids-journey-in-memory'
import { grantLifetime } from '../helpers'

const NOW = new Date('2026-06-02T12:00:00.000Z')
const clock = () => NOW

function makeCourse(over: Partial<Course> & { slug: string; title: string }): Course {
  const created = new Date('2026-06-01T00:00:00.000Z')
  return {
    id: randomUUID(),
    version: 0,
    subtitle: null,
    description: null,
    coverImageUrl: null,
    status: 'published' as CourseStatus,
    audience: 'adult',
    sequentialLock: true,
    videoBeforeActivity: false,
    level: 'iniciante',
    track: '2d',
    careerSlot: null,
    journeyRole: 'reward',
    modality: 'recorded',
    metadata: null,
    createdAt: created,
    updatedAt: created,
    ...over,
  }
}

function build() {
  const courses = new InMemoryCourseRepository()
  const entitlements = new InMemoryEntitlementRepository()
  const gamification = new InMemoryGamificationRepository({ entitlements, courses })
  const service = new ListCatalogService(
    courses,
    entitlements,
    gamification,
    clock,
    new KidsJourneyQueryService(new InMemoryKidsJourneySnapshots(courses, gamification)),
  )
  return { courses, entitlements, gamification, service }
}

describe('ListCatalogService (catálogo "Todos os cursos")', () => {
  test('lista só cursos published, dos mais antigos aos mais novos (ordem de criação)', async () => {
    const { courses, service } = build()
    courses.courses.push(
      // Título de propósito na ordem INVERSA da criação: a ordem padrão é a data.
      makeCourse({ slug: 'zeta', title: 'Zeta', createdAt: new Date('2026-01-01T00:00:00Z') }),
      makeCourse({ slug: 'alfa', title: 'Alfa', createdAt: new Date('2026-03-01T00:00:00Z') }),
      makeCourse({ slug: 'rascunho', title: 'Rascunho', status: 'draft' }),
      makeCourse({ slug: 'arquivado', title: 'Arquivado', status: 'archived' }),
    )

    const views = await service.execute('user-1')
    expect(views.map((v) => v.courseSlug)).toEqual(['zeta', 'alfa'])
  })

  test('hasAccess reflete matrícula ativa de curso; expirada não conta', async () => {
    const { courses, entitlements, service } = build()
    courses.courses.push(
      makeCourse({ slug: 'meu-curso', title: 'Meu Curso' }),
      makeCourse({ slug: 'outro-curso', title: 'Outro Curso' }),
      makeCourse({ slug: 'expirado', title: 'Vencido' }),
    )
    const userId = randomUUID()
    grantLifetime(entitlements, { userId, courseRef: 'meu-curso' })
    grantLifetime(entitlements, {
      userId,
      courseRef: 'expirado',
      expiresAt: new Date('2026-01-01T00:00:00.000Z'), // antes de NOW
      subscriptionId: randomUUID(),
    })

    const bySlug = new Map((await service.execute(userId)).map((v) => [v.courseSlug, v]))
    expect(bySlug.get('meu-curso')?.hasAccess).toBe(true)
    expect(bySlug.get('outro-curso')?.hasAccess).toBe(false)
    expect(bySlug.get('expirado')?.hasAccess).toBe(false)
  })

  test('salesPageUrl vem de metadata.salesPageUrl (string não-vazia) ou null', async () => {
    const { courses, service } = build()
    courses.courses.push(
      makeCourse({
        slug: 'com-url',
        title: 'Com URL',
        metadata: { salesPageUrl: 'https://funil.example.com/oferta' },
      }),
      makeCourse({ slug: 'sem-metadata', title: 'Sem Metadata' }),
      makeCourse({ slug: 'url-vazia', title: 'URL Vazia', metadata: { salesPageUrl: '' } }),
      makeCourse({ slug: 'tipo-errado', title: 'Tipo Errado', metadata: { salesPageUrl: 42 } }),
    )

    const bySlug = new Map((await service.execute('user-1')).map((v) => [v.courseSlug, v]))
    expect(bySlug.get('com-url')?.salesPageUrl).toBe('https://funil.example.com/oferta')
    expect(bySlug.get('sem-metadata')?.salesPageUrl).toBeNull()
    expect(bySlug.get('url-vazia')?.salesPageUrl).toBeNull()
    expect(bySlug.get('tipo-errado')?.salesPageUrl).toBeNull()
  })

  test('expõe os campos do card (título/subtítulo/capa) sem progresso', async () => {
    const { courses, entitlements, service } = build()
    const publishedCourse = makeCourse({
      slug: 'curso',
      title: 'Curso',
      subtitle: 'Sub',
      coverImageUrl: 'https://cdn.example.com/capa.webp',
    })
    courses.courses.push(publishedCourse)
    const userId = randomUUID()
    grantLifetime(entitlements, { userId, courseRef: 'curso' })

    const [view] = await service.execute(userId)
    expect(view).toEqual({
      courseId: publishedCourse.id,
      courseSlug: 'curso',
      title: 'Curso',
      subtitle: 'Sub',
      coverImageUrl: 'https://cdn.example.com/capa.webp',
      audience: 'adult',
      level: 'iniciante',
      track: '2d',
      careerSlot: null,
      journeyRole: 'reward',
      careerLock: { locked: false },
      curriculum: undefined,
      accessReason: 'journey',
      // This isolated fixture omits the adult journey reader; it has no ledger facts.
      milestones: { completed: false, showcased: false },
      hasAccess: true,
      salesPageUrl: null,
      createdAt: '2026-06-01T00:00:00.000Z',
    })
  })
})
