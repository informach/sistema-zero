import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { loadEnv } from '../src/infrastructure/config/env'
import { createDbConnection } from '../src/infrastructure/persistence/drizzle/db'
import {
  courses,
  entitlements,
  lessonAttachments,
  lessonBlocks,
  lessons,
  modules,
} from '../src/infrastructure/persistence/drizzle/schema'

/**
 * Seed do conteúdo inicial (Fatia 1 — autoria/admin é fatia seguinte). Cria um curso
 * PUBLICADO com módulos/aulas, incluindo uma aula COMPOSTA (rich_text + video + embed)
 * e uma aula de QUIZ + um anexo. Idempotente por slug do curso.
 *
 * Convenção: `course.slug` === `fulfillment.courseRef` do produto no catálogo (o
 * snapshot da matrícula liga o aluno ao curso por esse slug).
 *
 * Uso:
 *   bun run db:seed [--slug no-comando-da-ia] [--grant-user <userId>]
 * `--grant-user` concede uma matrícula VITALÍCIA de teste (exercita a API do aluno
 * sem um pagamento real).
 */
function arg(name: string, fallback: string | null): string | null {
  const i = process.argv.indexOf(name)
  if (i >= 0 && i + 1 < process.argv.length) return process.argv[i + 1] ?? fallback
  return fallback
}

const env = loadEnv()
const slug = arg('--slug', 'no-comando-da-ia') ?? 'no-comando-da-ia'
const grantUser = arg('--grant-user', null)

const { db, close } = createDbConnection(env.DATABASE_URL, { max: 2 })

try {
  const now = new Date()
  const [existing] = await db
    .select({ id: courses.id })
    .from(courses)
    .where(eq(courses.slug, slug))
    .limit(1)

  if (existing) {
    console.log(`[seed] curso '${slug}' já existe (id=${existing.id}) — pulando conteúdo.`)
  } else {
    const courseId = randomUUID()
    await db.insert(courses).values({
      id: courseId,
      slug,
      title: 'No Comando da IA',
      subtitle: 'Domine a IA no seu dia a dia',
      description: 'Curso introdutório para assumir o comando da inteligência artificial.',
      coverImageUrl: null,
      status: 'published',
      createdAt: now,
      updatedAt: now,
    })

    // Módulo 1 — aula composta + quiz
    const m1 = randomUUID()
    await db.insert(modules).values({
      id: m1,
      courseId,
      title: 'Boas-vindas',
      summary: 'Comece por aqui',
      sortOrder: 0,
      createdAt: now,
      updatedAt: now,
    })

    const l1 = randomUUID()
    await db.insert(lessons).values({
      id: l1,
      moduleId: m1,
      courseId,
      slug: 'apresentacao',
      title: 'Apresentação (vídeo + interativo + texto)',
      sortOrder: 0,
      estimatedMinutes: 8,
      createdAt: now,
      updatedAt: now,
    })
    await db.insert(lessonBlocks).values([
      {
        id: randomUUID(),
        lessonId: l1,
        kind: 'rich_text',
        sortOrder: 0,
        content: {
          kind: 'rich_text',
          markdown: '# Bem-vindo!\nNeste curso você vai **assumir o comando da IA**.',
          codeLanguageHints: ['ts'],
        },
      },
      {
        id: randomUUID(),
        lessonId: l1,
        kind: 'video',
        sortOrder: 1,
        content: {
          kind: 'video',
          provider: 'youtube',
          src: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          durationSeconds: 320,
        },
      },
      {
        id: randomUUID(),
        lessonId: l1,
        kind: 'embed',
        sortOrder: 2,
        content: {
          kind: 'embed',
          embedType: 'three_js',
          html: '<canvas id="demo"></canvas>',
          height: 420,
        },
      },
    ])
    await db.insert(lessonAttachments).values({
      id: randomUUID(),
      lessonId: l1,
      label: 'Slides da aula (PDF)',
      url: 'https://example.com/slides.pdf',
      fileType: 'application/pdf',
      sizeBytes: null,
      sortOrder: 0,
    })

    const l2 = randomUUID()
    await db.insert(lessons).values({
      id: l2,
      moduleId: m1,
      courseId,
      slug: 'quiz-inicial',
      title: 'Quiz inicial',
      sortOrder: 1,
      estimatedMinutes: 5,
      createdAt: now,
      updatedAt: now,
    })
    await db.insert(lessonBlocks).values({
      id: randomUUID(),
      lessonId: l2,
      kind: 'quiz',
      sortOrder: 0,
      content: {
        kind: 'quiz',
        questions: [
          {
            id: 'q1',
            prompt: 'IA generativa serve para…',
            choices: [
              { id: 'a', label: 'Gerar conteúdo' },
              { id: 'b', label: 'Apenas armazenar dados' },
            ],
            correctChoiceIds: ['a'],
            explanation: 'IA generativa cria conteúdo novo.',
          },
        ],
        passingScore: 1,
      },
    })

    // Módulo 2 — aula de vídeo
    const m2 = randomUUID()
    await db.insert(modules).values({
      id: m2,
      courseId,
      title: 'Primeiros passos',
      summary: null,
      sortOrder: 1,
      createdAt: now,
      updatedAt: now,
    })
    const l3 = randomUUID()
    await db.insert(lessons).values({
      id: l3,
      moduleId: m2,
      courseId,
      slug: 'ferramentas',
      title: 'Ferramentas essenciais',
      sortOrder: 0,
      estimatedMinutes: 12,
      createdAt: now,
      updatedAt: now,
    })
    await db.insert(lessonBlocks).values({
      id: randomUUID(),
      lessonId: l3,
      kind: 'video',
      sortOrder: 0,
      content: {
        kind: 'video',
        provider: 'vimeo',
        src: 'https://vimeo.com/000',
        durationSeconds: 600,
      },
    })

    console.log(`[seed] curso '${slug}' criado (id=${courseId}) — 2 módulos, 3 aulas.`)
  }

  if (grantUser) {
    const idempotencyKey = `manual:seed:${grantUser}:${slug}`
    await db
      .insert(entitlements)
      .values({
        id: randomUUID(),
        userId: grantUser,
        productId: randomUUID(),
        productKind: 'course',
        accessType: 'course',
        courseRef: slug,
        offerId: null,
        snapshot: {
          offerId: 'seed',
          offerSlug: 'seed',
          productId: 'seed',
          sku: 'seed',
          name: 'No Comando da IA',
          kind: 'course',
          accessType: 'course',
          courseRef: slug,
          fulfillment: { accessType: 'course', courseRef: slug },
          resolvedAt: now.toISOString(),
        },
        status: 'active',
        sourceKind: 'manual',
        sourceId: 'seed',
        subscriptionId: null,
        grantedAt: now,
        expiresAt: null,
        revokedAt: null,
        idempotencyKey,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing({ target: entitlements.idempotencyKey })
    console.log(`[seed] matrícula vitalícia de teste concedida a ${grantUser} no curso '${slug}'.`)
  }
} finally {
  await close()
}
