import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { studioSourceAtPath } from '@sistemazero/core/studio/code-anchor'
import { StudioProjectDocumentSchema } from '@sistemazero/core/studio/project-document'
import {
  type StudioRuntimeSelection,
  StudioRuntimeSelectionSchema,
  StudioSha256Schema,
} from '@sistemazero/core/studio/project-environment'
import { z } from 'zod'

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const entitySchema = z.object({ id: z.uuid() })
const publishedSchema = z.object({
  revision: StudioSha256Schema,
  document: z.object({
    blocks: z.array(
      z.object({
        id: z.uuid(),
        content: z.object({
          kind: z.string(),
          initialProject: z.unknown(),
          allowedModes: z.array(z.enum(['blocks', 'bridge', 'code'])).optional(),
          pythonLevel: z.number().int().min(1).max(3).optional(),
        }),
      }),
    ),
    sections: z.array(z.object({ id: z.uuid(), workspaceBlockId: z.uuid().nullable() })),
  }),
})
function identity(value: string) {
  assert.match(value, uuid, 'Expected an actual server UUID')
  return value
}

export interface QaRequest {
  fetch(
    url: string,
    options: {
      method: string
      data?: unknown
      maxRedirects: number
      maxRetries: number
      timeout: number
    },
  ): Promise<{ status(): number; json(): Promise<unknown> }>
}

type Step = { method: string; path: string; status: number; at: string }
export interface PythonLessonFixture {
  runId: string
  modality: 'live' | 'recorded'
  state: 'creating-empty-lesson' | 'empty-lesson-awaiting-admin-ui' | 'enrolled-before-call'
  title: string
  courseId?: string
  moduleId?: string
  lessonId?: string
  cohortId?: string
  sessionId?: string
  occurrenceId?: string
  enrollmentId?: string
  learnerPath?: string
  courseVersion?: number
  steps: Step[]
}

/** Exact local BFF only. Authentication is owned by the real Admin browser context. */
export function pythonAdminOrigin(value: string) {
  assert.equal(value, 'http://localhost:43107', 'Use the reviewed exact Admin parent')
  return value
}

function journal(
  request: QaRequest,
  origin: string,
  fixture: PythonLessonFixture,
  onStep: (fixture: PythonLessonFixture) => Promise<void>,
) {
  pythonAdminOrigin(origin)
  let calls = 0
  return async (method: string, path: string, data?: unknown, status = 200) => {
    assert(++calls <= 8, 'Bounded producer; never retry a mutation automatically')
    assert(path.startsWith('/api/members/') || path.startsWith('/api/admin/live/'))
    await onStep(structuredClone(fixture))
    const response = await request.fetch(new URL(path, origin).href, {
      method,
      ...(data === undefined ? {} : { data }),
      maxRedirects: 0,
      maxRetries: 0,
      timeout: 30_000,
    })
    fixture.steps.push({ method, path, status: response.status(), at: new Date().toISOString() })
    await onStep(structuredClone(fixture))
    assert.equal(response.status(), status, `${method} ${path}`)
    return response.json()
  }
}

const courseTreeSchema = z.object({
  id: z.uuid(),
  slug: z.string(),
  title: z.string(),
  audience: z.literal('kids'),
  modality: z.enum(['live', 'recorded']),
  status: z.literal('draft'),
  careerSlot: z.null(),
  journeyRole: z.literal('reward'),
  version: z.number().int().nonnegative(),
  modules: z
    .array(
      z.object({
        id: z.uuid(),
        courseId: z.uuid(),
        lessons: z
          .array(
            z.object({ id: z.uuid(), moduleId: z.uuid(), courseId: z.uuid(), slug: z.string() }),
          )
          .length(1),
      }),
    )
    .length(1),
})

/** A nonce in the locally created fixture must also be present in the fresh server tree. */
function ownCourse(fixture: PythonLessonFixture, value: unknown) {
  identity(fixture.runId)
  const course = courseTreeSchema.parse(value)
  assert.equal(course.id, fixture.courseId)
  assert.equal(course.slug, `qa-python-${fixture.runId}`)
  assert.equal(course.title, `QA Python ${fixture.modality} ${fixture.runId}`)
  assert.equal(course.title, fixture.title)
  assert.equal(course.modality, fixture.modality)
  const module = course.modules[0]
  assert(module)
  assert.equal(module.id, fixture.moduleId)
  assert.equal(module.courseId, fixture.courseId)
  const lesson = module.lessons[0]
  assert(lesson)
  assert.equal(lesson.id, fixture.lessonId)
  assert.equal(lesson.courseId, fixture.courseId)
  assert.equal(lesson.moduleId, fixture.moduleId)
  assert.equal(lesson.slug, `qa-python-${fixture.runId}`)
  return course
}

/** Must run before navigating to the editing UI; this read performs no mutation. */
export async function readOwnedPythonLesson(input: {
  request: QaRequest
  origin: string
  fixture: PythonLessonFixture
  onStep: (fixture: PythonLessonFixture) => Promise<void>
}) {
  assert.equal(input.fixture.state, 'empty-lesson-awaiting-admin-ui')
  assert(input.fixture.courseId)
  identity(input.fixture.courseId)
  const send = journal(input.request, input.origin, input.fixture, input.onStep)
  return ownCourse(
    input.fixture,
    await send('GET', `/api/members/courses/${input.fixture.courseId}`),
  )
}

/** No Studio document, structure, publication or media state is manufactured here. */
export async function createEmptyPythonLesson(input: {
  request: QaRequest
  origin: string
  modality: 'live' | 'recorded'
  onStep: (fixture: PythonLessonFixture) => Promise<void>
}) {
  pythonAdminOrigin(input.origin)
  assert(['live', 'recorded'].includes(input.modality))
  const runId = randomUUID()
  const fixture: PythonLessonFixture = {
    runId,
    modality: input.modality,
    state: 'creating-empty-lesson',
    title: `QA Python ${input.modality} ${runId}`,
    steps: [],
  }
  const send = journal(input.request, input.origin, fixture, input.onStep)
  const course = entitySchema.parse(
    await send(
      'POST',
      '/api/members/courses',
      {
        slug: `qa-python-${runId}`,
        title: fixture.title,
        status: 'draft',
        audience: 'kids',
        modality: input.modality,
        level: 'avancado',
        track: '2d',
        careerSlot: null,
        sequentialLock: false,
        videoBeforeActivity: false,
      },
      201,
    ),
  )
  fixture.courseId = identity(course.id)
  const module = entitySchema.parse(
    await send(
      'POST',
      `/api/members/courses/${fixture.courseId}/modules`,
      { title: 'Projeto Python', summary: null },
      201,
    ),
  )
  fixture.moduleId = identity(module.id)
  const lesson = entitySchema.parse(
    await send(
      'POST',
      `/api/members/modules/${fixture.moduleId}/lessons`,
      { slug: `qa-python-${runId}`, title: 'Minha execução Python', estimatedMinutes: 15 },
      201,
    ),
  )
  fixture.lessonId = identity(lesson.id)
  fixture.state = 'empty-lesson-awaiting-admin-ui'
  await input.onStep(structuredClone(fixture))
  return fixture
}

/** Checks server-published bytes, never substitutes a prepared project for Admin UI authoring. */
export function verifyPublishedPythonLesson(input: {
  published: unknown
  runtime: StudioRuntimeSelection
  kind: 'classic' | 'pro'
  source: string
}) {
  const runtime = StudioRuntimeSelectionSchema.parse(input.runtime)
  const published = publishedSchema.parse(input.published)
  const blocks = published.document.blocks.filter((block) => block.content.kind === 'studio')
  assert.equal(blocks.length, 1, 'Exactly one Admin-authored Studio project')
  const block = blocks[0]
  assert(block)
  identity(block.id)
  const project = StudioProjectDocumentSchema.parse(block.content.initialProject)
  assert.equal(project.formatVersion, 3)
  assert.equal(project.programmingLanguage, 'python')
  assert.equal(project.kind, input.kind)
  assert.deepEqual(project.runtime, runtime)
  assert(project.programmingLanguage === 'python')
  assert.equal(
    studioSourceAtPath(project, project.python.entrypoint),
    input.source,
    'Published source must equal the text entered through the keyboard',
  )
  if (input.kind === 'classic') {
    assert.deepEqual(
      block.content.allowedModes,
      ['blocks', 'bridge'],
      'Classic gate must publish both real student modes',
    )
    assert.equal(
      block.content.pythonLevel,
      3,
      'This fixture explicitly exercises the complete Python palette',
    )
  }
  assert(
    project.installedExtensions.some(
      (extension) => extension.id === 'python-turtle' && extension.version === '1.0.0',
    ),
  )
  const section = published.document.sections.find((entry) => entry.workspaceBlockId === block.id)
  assert(section, 'Actual section must designate this Studio workspace')
  identity(section.id)
  return { revision: published.revision, blockId: block.id, sectionId: section.id, project }
}

/** New seat only, after UI publication has been checked; no room/microphone/admission command. */
export async function enrollPythonLiveLesson(input: {
  request: QaRequest
  origin: string
  fixture: PythonLessonFixture
  expected: Omit<Parameters<typeof verifyPublishedPythonLesson>[0], 'published'>
  teacherId: string
  accountId: string
  learnerId: string
  learnerName: string
  onStep: (fixture: PythonLessonFixture) => Promise<void>
}) {
  const fixture = structuredClone(input.fixture)
  assert.equal(fixture.modality, 'live')
  assert.equal(fixture.state, 'empty-lesson-awaiting-admin-ui')
  assert(fixture.courseId && fixture.lessonId)
  identity(fixture.courseId)
  identity(fixture.lessonId)
  assert(!fixture.enrollmentId && !fixture.cohortId, 'Never replay an already enrolled fixture')
  identity(input.teacherId)
  identity(input.accountId)
  identity(input.learnerId)
  assert.notEqual(input.teacherId, input.accountId)
  assert.notEqual(input.accountId, input.learnerId)
  assert(input.learnerName.length > 0 && input.learnerName.length <= 100)
  const send = journal(input.request, input.origin, fixture, input.onStep)
  const course = ownCourse(fixture, await send('GET', `/api/members/courses/${fixture.courseId}`))
  fixture.courseVersion = course.version
  const published = await send('GET', `/api/members/lessons/${fixture.lessonId}/draft/published`)
  verifyPublishedPythonLesson({ published, ...input.expected })
  await send('PATCH', `/api/members/courses/${fixture.courseId}`, {
    status: 'published',
    version: course.version,
  })
  const startsAt = Date.now() - 60_000
  const created = z
    .object({
      cohort: entitySchema,
      sessions: z.array(z.object({ id: z.uuid(), occurrenceId: z.uuid() })).length(1),
    })
    .parse(
      await send(
        'POST',
        `/api/admin/live/courses/${fixture.courseId}/cohorts`,
        {
          title: fixture.title,
          capacity: 1,
          accessDays: 1,
          timeZone: 'America/Sao_Paulo',
          teacherIds: [input.teacherId],
          schedule: [
            {
              startsAt: new Date(startsAt).toISOString(),
              endsAt: new Date(startsAt + 3_600_000).toISOString(),
            },
          ],
        },
        201,
      ),
    )
  fixture.cohortId = identity(created.cohort.id)
  assert.equal(created.sessions.length, 1)
  const session = created.sessions[0]
  assert(session)
  fixture.sessionId = identity(session.id)
  fixture.occurrenceId = identity(session.occurrenceId)
  await send('PATCH', `/api/admin/live/cohorts/${fixture.cohortId}`, { status: 'open' })
  const enrollment = entitySchema
    .extend({ accountId: z.uuid(), learnerId: z.uuid() })
    .parse(
      await send(
        'POST',
        `/api/admin/live/cohorts/${fixture.cohortId}/enrollments`,
        { accountId: input.accountId, learnerId: input.learnerId, learnerName: input.learnerName },
        201,
      ),
    )
  fixture.enrollmentId = identity(enrollment.id)
  assert.equal(enrollment.accountId, input.accountId)
  assert.equal(enrollment.learnerId, input.learnerId)
  fixture.learnerPath = `/oficinas/aulas/${fixture.sessionId}`
  fixture.state = 'enrolled-before-call'
  await input.onStep(structuredClone(fixture))
  return fixture
}
