import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { publishedLessonRevisions } from '../../members/src/domain/learning/published-lesson-revisions'
import { pythonEnvironmentFixture } from '../../studio/src/state/fixtures/pythonEnvironment'
import {
  createEmptyPythonLesson,
  enrollPythonLiveLesson,
  type PythonLessonFixture,
  pythonAdminOrigin,
  type QaRequest,
  readOwnedPythonLesson,
  verifyPublishedPythonLesson,
} from './e2e/python-lesson-fixture'

function server(responses: { status: number; body: unknown }[]) {
  const calls: { path: string; method: string; data: unknown }[] = []
  const request: QaRequest = {
    async fetch(url, options) {
      calls.push({ path: new URL(url).pathname, method: options.method, data: options.data })
      expect(options.maxRedirects).toBe(0)
      expect(options.maxRetries).toBe(0)
      const response = responses.shift()
      if (!response) throw new Error('Unexpected extra mutation')
      return { status: () => response.status, json: async () => response.body }
    },
  }
  return { request, calls }
}

function ownedFixture(): PythonLessonFixture {
  const runId = randomUUID()
  return {
    runId,
    modality: 'live',
    state: 'empty-lesson-awaiting-admin-ui',
    title: `QA Python live ${runId}`,
    courseId: randomUUID(),
    moduleId: randomUUID(),
    lessonId: randomUUID(),
    steps: [],
  }
}

function courseTree(fixture: PythonLessonFixture, version = 7) {
  return {
    id: fixture.courseId,
    slug: `qa-python-${fixture.runId}`,
    title: fixture.title,
    audience: 'kids',
    modality: fixture.modality,
    careerSlot: null,
    journeyRole: 'reward',
    status: 'draft',
    version,
    modules: [
      {
        id: fixture.moduleId,
        courseId: fixture.courseId,
        lessons: [
          {
            id: fixture.lessonId,
            moduleId: fixture.moduleId,
            courseId: fixture.courseId,
            slug: `qa-python-${fixture.runId}`,
          },
        ],
      },
    ],
  }
}

test('only the exact reviewed Admin parent is admitted', () => {
  expect(pythonAdminOrigin('http://localhost:43107')).toBe('http://localhost:43107')
  for (const value of [
    'http://127.0.0.1:43107',
    'http://localhost:43108',
    'http://localhost:43107/',
    'https://example.invalid',
    'http://user:password@localhost:43107',
  ])
    expect(() => pythonAdminOrigin(value)).toThrow()
})

test('empty fixture retains server IDs without authoring, publishing or room commands', async () => {
  const courseId = randomUUID(),
    moduleId = randomUUID(),
    lessonId = randomUUID()
  const { request, calls } = server(
    [courseId, moduleId, lessonId].map((id) => ({ status: 201, body: { id } })),
  )
  const snapshots: PythonLessonFixture[] = []
  const result = await createEmptyPythonLesson({
    request,
    origin: 'http://localhost:43107',
    modality: 'live',
    onStep: async (fixture) => {
      snapshots.push(fixture)
    },
  })
  expect(result).toMatchObject({
    courseId,
    moduleId,
    lessonId,
    state: 'empty-lesson-awaiting-admin-ui',
  })
  expect(calls).toHaveLength(3)
  expect(
    calls.every(
      (call) => call.method === 'POST' && !JSON.stringify(call.data).includes('initialProject'),
    ),
  ).toBe(true)
  expect(
    snapshots.find((snapshot) => snapshot.courseId === courseId && !snapshot.moduleId),
  ).toBeDefined()
  expect(snapshots.at(-1)).toEqual(result)
})

test('a failed module mutation preserves the prior course and negative status with no retry', async () => {
  const courseId = randomUUID()
  const { request, calls } = server([
    { status: 201, body: { id: courseId } },
    { status: 503, body: { error: 'unavailable' } },
  ])
  const snapshots: PythonLessonFixture[] = []
  await expect(
    createEmptyPythonLesson({
      request,
      origin: 'http://localhost:43107',
      modality: 'recorded',
      onStep: async (snapshot) => {
        snapshots.push(snapshot)
      },
    }),
  ).rejects.toThrow()
  expect(calls).toHaveLength(2)
  expect(snapshots.at(-1)).toMatchObject({ courseId, state: 'creating-empty-lesson' })
  expect(snapshots.at(-1)?.steps.at(-1)?.status).toBe(503)
})

test('invalid origin is rejected before the first request', async () => {
  const { request, calls } = server([])
  await expect(
    createEmptyPythonLesson({
      request,
      origin: 'http://127.0.0.1:43107',
      modality: 'live',
      onStep: async () => {},
    }),
  ).rejects.toThrow()
  expect(calls).toHaveLength(0)
})

const hostedAdmin = 'https://admin-qa.example.invalid'

test('a hosted origin is admitted only when it equals the reviewed HTTPS binding', () => {
  expect(pythonAdminOrigin(hostedAdmin, hostedAdmin)).toBe(hostedAdmin)
  for (const [value, reviewed] of [
    ['http://admin-qa.example.invalid', 'http://admin-qa.example.invalid'],
    ['https://other.example.invalid', hostedAdmin],
    [`${hostedAdmin}/`, hostedAdmin],
    [`${hostedAdmin}/cursos`, `${hostedAdmin}/cursos`],
    ['http://localhost:43107', hostedAdmin],
  ] as const)
    expect(() => pythonAdminOrigin(value, reviewed)).toThrow()
})

test('the hosted JS Pro producer creates an adult QA course in its own namespace', async () => {
  const courseId = randomUUID(),
    moduleId = randomUUID(),
    lessonId = randomUUID()
  const { request, calls } = server(
    [courseId, moduleId, lessonId].map((id) => ({ status: 201, body: { id } })),
  )
  const result = await createEmptyPythonLesson({
    request,
    origin: hostedAdmin,
    modality: 'recorded',
    hosted: { adminOrigin: hostedAdmin, audience: 'adult' },
    onStep: async () => {},
  })
  expect(result).toMatchObject({
    hostedAdminOrigin: hostedAdmin,
    audience: 'adult',
    variant: 'hosted-js-pro',
    title: `QA JS Pro recorded ${result.runId}`,
  })
  expect(calls[0]?.data).toMatchObject({
    slug: `qa-js-pro-${result.runId}`,
    audience: 'adult',
    modality: 'recorded',
  })
  expect(JSON.stringify(calls.map((call) => call.data))).not.toContain('qa-python-')
})

test('a hosted fixture refuses a course with another audience or the Python namespace', async () => {
  const fixture: PythonLessonFixture = {
    ...ownedFixture(),
    modality: 'recorded',
    hostedAdminOrigin: hostedAdmin,
    audience: 'adult',
    variant: 'hosted-js-pro',
  }
  fixture.title = `QA JS Pro recorded ${fixture.runId}`
  const hostedTree = (overrides: Record<string, unknown>) => {
    const tree = courseTree(fixture)
    const slug = `qa-js-pro-${fixture.runId}`
    for (const lesson of tree.modules[0]?.lessons ?? []) lesson.slug = slug
    return { ...tree, slug, audience: 'adult', ...overrides }
  }
  const read = (body: unknown) =>
    readOwnedPythonLesson({
      request: server([{ status: 200, body }]).request,
      origin: hostedAdmin,
      fixture,
      onStep: async () => {},
    })
  await expect(read(hostedTree({ audience: 'kids' }))).rejects.toThrow()
  await expect(read(hostedTree({ slug: `qa-python-${fixture.runId}` }))).rejects.toThrow()
  await expect(read(hostedTree({}))).resolves.toBeDefined()
})

async function publication(kind: 'classic' | 'pro') {
  const { project } = await pythonEnvironmentFixture(kind)
  project.installedExtensions = [{ id: 'python-turtle', version: '1.0.0', installedAt: 1 }]
  const source = 'import turtle\nprint("preserved")\n'
  if (project.kind === 'pro') project.tree['main.py'] = { kind: 'file', content: source }
  else project.files['main.py'] = source
  const blockId = randomUUID(),
    sectionId = randomUUID()
  const document = {
    blocks: [
      {
        id: blockId,
        content: {
          kind: 'studio',
          initialProject: project,
          ...(kind === 'classic' ? { allowedModes: ['blocks', 'bridge'], pythonLevel: 3 } : {}),
        },
      },
    ],
    sections: [{ id: sectionId, workspaceBlockId: blockId }],
  }
  const published = {
    revision: publishedLessonRevisions(
      {
        title: 'QA Python',
        slug: 'qa-python',
        estimatedMinutes: 15,
        blocks: document.blocks,
        attachments: [],
      },
      document.sections,
    ).current,
    document,
  }
  return { published, runtime: project.runtime, kind, source }
}

test('canonical publication hash is accepted and draft UUID is refused', async () => {
  const input = await publication('pro')
  expect(input.published.revision).toMatch(/^[a-f0-9]{64}$/)
  expect(() => verifyPublishedPythonLesson(input)).not.toThrow()
  expect(() =>
    verifyPublishedPythonLesson({
      ...input,
      published: { ...input.published, revision: randomUUID() },
    }),
  ).toThrow()
})

test('classic acceptance refuses a blocks-only or wrong-level published curation', async () => {
  const input = await publication('classic')
  for (const curation of [
    { allowedModes: ['blocks'], pythonLevel: 3 },
    { allowedModes: ['blocks', 'bridge'], pythonLevel: 1 },
  ]) {
    const edited = structuredClone(input)
    const block = edited.published.document.blocks[0]
    if (!block) throw new Error('Missing fixture block')
    Object.assign(block.content, curation)
    expect(() => verifyPublishedPythonLesson(edited)).toThrow()
  }
})

for (const kind of ['classic', 'pro'] as const) {
  test(`published ${kind} validates canonical Python source and actual workspace`, async () => {
    const input = await publication(kind)
    const result = verifyPublishedPythonLesson(input)
    expect(result.project.programmingLanguage).toBe('python')
    expect(result.blockId).toBe(input.published.document.blocks[0]!.id)
  })
}

test('publication guard refuses altered source, runtime, extension and missing workspace', async () => {
  const input = await publication('pro')
  expect(() =>
    verifyPublishedPythonLesson({ ...input, source: `${input.source}# new\n` }),
  ).toThrow()
  expect(() =>
    verifyPublishedPythonLesson({
      ...input,
      runtime: { ...input.runtime, releaseId: 'other-release' },
    }),
  ).toThrow()
  const withoutWorkspace = structuredClone(input)
  withoutWorkspace.published.document.sections = []
  expect(() => verifyPublishedPythonLesson(withoutWorkspace)).toThrow()
  const withoutTurtle = structuredClone(input)
  withoutTurtle.published.document.blocks[0]!.content.initialProject.installedExtensions = []
  expect(() => verifyPublishedPythonLesson(withoutTurtle)).toThrow()
})

test('invalid publication cannot publish course or create a seat', async () => {
  const published = await publication('pro')
  const fixture = ownedFixture()
  const { request, calls } = server([
    { status: 200, body: courseTree(fixture) },
    { status: 200, body: published.published },
  ])
  await expect(
    enrollPythonLiveLesson({
      request,
      origin: 'http://localhost:43107',
      fixture,
      expected: { ...published, source: 'tampered' },
      teacherId: randomUUID(),
      accountId: randomUUID(),
      learnerId: randomUUID(),
      learnerName: 'Aluno QA',
      onStep: async () => {},
    }),
  ).rejects.toThrow()
  expect(calls).toHaveLength(2)
  expect(calls.every((call) => call.method === 'GET')).toBe(true)
})

test('fresh server publication is required before a new natural cohort and seat', async () => {
  const input = await publication('pro')
  const fixture = ownedFixture()
  const cohortId = randomUUID(),
    sessionId = randomUUID(),
    occurrenceId = randomUUID(),
    enrollmentId = randomUUID()
  const teacherId = randomUUID(),
    accountId = randomUUID(),
    learnerId = randomUUID()
  const { request, calls } = server([
    { status: 200, body: courseTree(fixture) },
    { status: 200, body: input.published },
    { status: 200, body: {} },
    {
      status: 201,
      body: { cohort: { id: cohortId }, sessions: [{ id: sessionId, occurrenceId }] },
    },
    { status: 200, body: {} },
    { status: 201, body: { id: enrollmentId, accountId, learnerId } },
  ])
  const result = await enrollPythonLiveLesson({
    request,
    origin: 'http://localhost:43107',
    fixture,
    expected: input,
    teacherId,
    accountId,
    learnerId,
    learnerName: 'Aluno QA',
    onStep: async () => {},
  })
  expect(result).toMatchObject({
    state: 'enrolled-before-call',
    enrollmentId,
    occurrenceId,
    sessionId,
    learnerPath: `/oficinas/aulas/${sessionId}`,
  })
  expect(calls[0]?.path).toBe(`/api/members/courses/${fixture.courseId}`)
  expect(calls[1]?.path).toBe(`/api/members/lessons/${fixture.lessonId}/draft/published`)
  expect(calls[2]?.data).toEqual({ status: 'published', version: 7 })
  expect(calls.some((call) => /open-lobby|admit|start|revoke/.test(call.path))).toBe(false)
})

test('an acknowledged seat with a foreign identity retains its ID and fails without retry', async () => {
  const input = await publication('pro')
  const fixture = ownedFixture()
  const cohortId = randomUUID(),
    sessionId = randomUUID(),
    occurrenceId = randomUUID(),
    enrollmentId = randomUUID()
  const teacherId = randomUUID(),
    accountId = randomUUID(),
    learnerId = randomUUID()
  const { request, calls } = server([
    { status: 200, body: courseTree(fixture) },
    { status: 200, body: input.published },
    { status: 200, body: {} },
    {
      status: 201,
      body: { cohort: { id: cohortId }, sessions: [{ id: sessionId, occurrenceId }] },
    },
    { status: 200, body: {} },
    { status: 201, body: { id: enrollmentId, accountId: randomUUID(), learnerId } },
  ])
  const snapshots: PythonLessonFixture[] = []
  await expect(
    enrollPythonLiveLesson({
      request,
      origin: 'http://localhost:43107',
      fixture,
      expected: input,
      teacherId,
      accountId,
      learnerId,
      learnerName: 'Aluno QA',
      onStep: async (value) => {
        snapshots.push(value)
      },
    }),
  ).rejects.toThrow()
  expect(calls).toHaveLength(6)
  expect(snapshots.at(-1)).toMatchObject({
    cohortId,
    sessionId,
    occurrenceId,
    enrollmentId,
    state: 'empty-lesson-awaiting-admin-ui',
  })
  expect(snapshots.at(-1)?.steps.at(-1)?.status).toBe(201)
  expect(snapshots.at(-1)?.learnerPath).toBeUndefined()
  expect(fixture.enrollmentId).toBeUndefined()
})

test('course ownership guard refuses an existing curriculum or a foreign lesson before editing', async () => {
  for (const changed of ['slug', 'careerSlot', 'lesson', 'status']) {
    const fixture = ownedFixture()
    const tree = courseTree(fixture)
    const body =
      changed === 'slug'
        ? { ...tree, slug: 'curso-existente' }
        : changed === 'careerSlot'
          ? { ...tree, careerSlot: 1 }
          : changed === 'status'
            ? { ...tree, status: 'published' }
            : {
                ...tree,
                modules: [
                  {
                    ...tree.modules[0],
                    lessons: [{ ...tree.modules[0]?.lessons[0], moduleId: randomUUID() }],
                  },
                ],
              }
    const { request, calls } = server([{ status: 200, body }])
    await expect(
      readOwnedPythonLesson({
        request,
        origin: 'http://localhost:43107',
        fixture,
        onStep: async () => {},
      }),
    ).rejects.toThrow()
    expect(calls).toHaveLength(1)
    expect(calls[0]?.method).toBe('GET')
  }
})

test('course version conflict preserves the owned fixture without retrying publication or creating a cohort', async () => {
  const fixture = ownedFixture()
  const publicationInput = await publication('pro')
  const { request, calls } = server([
    { status: 200, body: courseTree(fixture, 8) },
    { status: 200, body: publicationInput.published },
    { status: 409, body: { error: { message: 'Course changed' } } },
  ])
  const snapshots: PythonLessonFixture[] = []
  await expect(
    enrollPythonLiveLesson({
      request,
      origin: 'http://localhost:43107',
      fixture,
      expected: publicationInput,
      teacherId: randomUUID(),
      accountId: randomUUID(),
      learnerId: randomUUID(),
      learnerName: 'QA',
      onStep: async (value) => {
        snapshots.push(value)
      },
    }),
  ).rejects.toThrow()
  expect(calls).toHaveLength(3)
  expect(calls[2]?.data).toEqual({ status: 'published', version: 8 })
  expect(snapshots.at(-1)).toMatchObject({ courseId: fixture.courseId, courseVersion: 8 })
  expect(snapshots.at(-1)?.steps.at(-1)?.status).toBe(409)
  expect(snapshots.at(-1)?.cohortId).toBeUndefined()
})
