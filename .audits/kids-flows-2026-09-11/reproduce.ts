// Read-only audit: synthetic fixtures, in-memory repositories, no external requests.
import { strict as assert } from 'node:assert'
import { randomUUID } from 'node:crypto'
import gatewayConfig from '../../packages/api-gateway/gateway.config'
import { routeConfigSchema } from '../../packages/api-gateway/src/infrastructure/config/gateway-config.schema'
import { RouteRegistry } from '../../packages/api-gateway/src/infrastructure/routing/route-registry'
import { defaultLessonSection, sectionCompletionIssues } from '../../packages/core/src/learning'
import {
  evaluateStructureRule,
  gradeStudioActivity,
} from '../../packages/members/src/domain/course/studio-activity'
import { buildApp, grantLifetime, seedSampleCourse } from '../../packages/members/tests/helpers'

const STUDENT = '11111111-1111-1111-1111-111111111111'
const TEACHER = '99999999-9999-9999-9999-999999999999'
const REVISION = '12345678901234567890123456789012'
function setup() {
  const env = buildApp()
  const course = seedSampleCourse(env.courses)
  const lessonId = course.lessonIds[0]!
  grantLifetime(env.entitlements, { userId: STUDENT, courseRef: course.slug })
  env.courses.blocks = env.courses.blocks.filter((b) => b.lessonId !== lessonId)
  const request = async (path: string, method = 'GET', body?: unknown, user = STUDENT) => {
    const response = await env.app.handle(
      new Request(`http://localhost/members${path}`, {
        method,
        headers: { 'content-type': 'application/json', 'x-auth-user-id': user },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      }),
    )
    const payload = await response.json()
    assert.equal(response.status, 200, JSON.stringify(payload))
    return payload as any
  }
  const question = {
    kind: 'interactive' as const,
    title: 'Checagem escolhida',
    instructions: 'Confira.',
    required: false,
    hints: [],
    activity: { type: 'checkpoint' as const },
    checkpoint: {
      prompt: 'Qual?',
      choices: [
        { id: 'yes', label: 'Sim' },
        { id: 'no', label: 'Não' },
      ],
      correctChoiceId: 'yes',
      explanation: 'Sim.',
    },
  }
  return { ...env, course, lessonId, request, question }
}

// A: section selection is not the only source of mandatory criteria.
for (const extraKind of ['quiz', 'interactive'] as const) {
  const ctx = setup()
  const selectedId = randomUUID(),
    extraId = randomUUID()
  const section = {
    ...defaultLessonSection(randomUUID(), 'Etapa', [selectedId, extraId]),
    completion: { version: 1 as const, blockIds: [selectedId] },
  }
  ctx.courses.blocks.push(
    {
      id: selectedId,
      lessonId: ctx.lessonId,
      kind: 'interactive',
      sortOrder: 0,
      contentRevision: REVISION,
      content: ctx.question,
    },
    {
      id: extraId,
      lessonId: ctx.lessonId,
      kind: extraKind,
      sortOrder: 1,
      contentRevision: REVISION,
      content:
        extraKind === 'quiz'
          ? {
              kind: 'quiz',
              passingScore: 100,
              questions: [
                {
                  id: 'q',
                  prompt: 'Outra?',
                  choices: [
                    { id: 'yes', label: 'Sim' },
                    { id: 'no', label: 'Não' },
                  ],
                  correctChoiceIds: ['yes'],
                },
              ],
            }
          : { ...ctx.question, title: 'Checagem desmarcada', required: true },
    },
  )
  ctx.learningRepository.structures.set(ctx.lessonId, {
    revision: randomUUID(),
    sections: [section],
  })
  const authoringIssues = sectionCompletionIssues(
    [section],
    ctx.courses.blocks.filter((b) => b.lessonId === ctx.lessonId),
  )
  assert.deepEqual(authoringIssues, [])
  const result = await ctx.request(
    `/lessons/${ctx.lessonId}/blocks/${selectedId}/learning-attempts`,
    'POST',
    {
      id: randomUUID(),
      revision: REVISION,
      answers: { checkpoint: 'yes' },
      hintsUsed: 0,
    },
  )
  assert.equal(result.sectionProgress.completed, 0)
  console.log(
    JSON.stringify({
      case: 'unselected_block_still_blocks',
      extraKind,
      authoringIssues,
      selectedPassed: result.attempt.result.passed,
      section: result.sectionProgress.sections[0],
    }),
  )
}

// B: help -> teacher inbox -> reply -> student inbox, reusing the same context.
{
  const ctx = setup(),
    blockId = randomUUID()
  const section = {
    ...defaultLessonSection(randomUUID(), 'Preparar', [blockId]),
    completion: { version: 1 as const, blockIds: [blockId] },
  }
  ctx.courses.blocks.push({
    id: blockId,
    lessonId: ctx.lessonId,
    kind: 'interactive',
    sortOrder: 0,
    contentRevision: REVISION,
    content: ctx.question,
  })
  ctx.learningRepository.structures.set(ctx.lessonId, {
    revision: randomUUID(),
    sections: [section],
  })
  const path = `/lessons/${ctx.lessonId}/section-help`
  const first = await ctx.request(path, 'POST', {
    sectionId: section.id,
    body: 'Preciso de ajuda.',
  })
  const second = await ctx.request(path, 'POST', {
    sectionId: section.id,
    body: 'Mais um detalhe.',
  })
  assert.equal(first.threadId, second.threadId)
  const inbox = await ctx.request(
    '/admin/teacher-threads?context=lesson_section',
    'GET',
    undefined,
    TEACHER,
  )
  assert.equal(inbox.threads.length, 1)
  assert.equal(inbox.threads[0].unread, true)
  assert.equal(inbox.threads[0].messageCount, 2)
  ctx.clockRef.now = new Date(ctx.clockRef.now.getTime() + 1000)
  await ctx.request(
    `/admin/teacher-threads/${first.threadId}/messages`,
    'POST',
    { body: 'Vamos olhar a preparação.' },
    TEACHER,
  )
  const studentInbox = await ctx.request(`/teacher-threads?audience=${inbox.threads[0].audience}`)
  assert.equal(studentInbox.threads[0].unread, true)
  assert.equal(studentInbox.threads[0].messageCount, 3)
  console.log(
    JSON.stringify({
      case: 'help_round_trip',
      sameThread: true,
      context: inbox.threads[0].contextType,
      title: inbox.threads[0].title,
      teacherReceivedUnread: true,
      studentReceivedUnreadReply: true,
    }),
  )
}

// C: current structure checks test existence, not useful execution or connected blocks.
{
  const project = {
    ir: { version: 2, behavior: { start: [], molds: [], events: [], loops: [] } },
    blocksState: { blocks: { blocks: [{ type: 'audit_block', disabled: true }] } },
  }
  const passed = evaluateStructureRule({ type: 'usesBlock', blockType: 'audit_block' }, project)
  assert.equal(passed, true)
  const grade = gradeStudioActivity(
    {
      instructions: 'Rodar e mostrar o resultado',
      passingScore: 100,
      checks: [
        {
          id: 'result',
          label: 'Resultado',
          kind: 'behavior',
          rule: { type: 'consoleContains', text: 'resultado' },
        },
      ],
    },
    {},
    [{ checkId: 'result', passed: true }],
  )
  assert.equal(grade.passed, true)
  assert.equal(grade.results[0]?.verifiedBy, 'client')
  console.log(
    JSON.stringify({
      case: 'verification_limits',
      disabledBlockPassesUsesBlock: passed,
      emptyProjectBehaviorGrade: grade,
    }),
  )
}

// D: the UI's read-all body drops its selected-student filter.
{
  const ctx = setup(),
    otherStudent = randomUUID()
  for (const user of [STUDENT, otherStudent]) {
    const thread = await ctx.request(
      '/admin/teacher-threads',
      'POST',
      {
        userId: user,
        audience: 'kids',
        contextType: 'general',
        body: 'Olá!',
      },
      TEACHER,
    )
    ctx.clockRef.now = new Date(ctx.clockRef.now.getTime() + 1000)
    await ctx.request(
      `/teacher-threads/${thread.id}/messages?audience=kids`,
      'POST',
      { body: 'Minha resposta.' },
      user,
    )
  }
  const filtered = await ctx.request(
    `/admin/teacher-threads?audience=kids&userIds=${STUDENT}`,
    'GET',
    undefined,
    TEACHER,
  )
  assert.equal(filtered.threads.length, 1)
  assert.equal(filtered.threads[0].unread, true)
  const result = await ctx.request(
    '/admin/teacher-threads/read-all',
    'POST',
    { audience: 'kids' },
    TEACHER,
  )
  const other = await ctx.request(
    `/admin/teacher-threads?audience=kids&userIds=${otherStudent}`,
    'GET',
    undefined,
    TEACHER,
  )
  assert.equal(result.updated, 2)
  assert.equal(other.threads[0].unread, false)
  console.log(
    JSON.stringify({
      case: 'read_all_drops_student_filter',
      visibleThreads: filtered.threads.length,
      markedRead: result.updated,
      hiddenStudentsMarkedRead: true,
    }),
  )
}

// E: use the actual gateway registry, not a mocked BFF/upstream connection.
{
  const registry = new RouteRegistry(
    gatewayConfig.routes.map((route) => routeConfigSchema.parse(route)),
  )
  const lessonId = randomUUID(),
    sectionId = randomUUID()
  const projectCheck = registry.resolve(
    'POST',
    `/members/lessons/${lessonId}/sections/${sectionId}/project-check`,
    'v1',
  )
  const help = registry.resolve('POST', `/members/lessons/${lessonId}/section-help`, 'v1')
  const teacherPost = registry.resolve('POST', '/members/admin/teacher-threads', 'v1')
  assert.equal(projectCheck, undefined)
  assert.equal(help?.route.id, 'members-section-help')
  assert.equal(teacherPost?.route.id, 'members-admin-teacher-threads-write')
  console.log(
    JSON.stringify({
      case: 'real_gateway_routes',
      projectCheck: projectCheck?.route.id ?? null,
      help: help?.route.id,
      teacherPost: teacherPost?.route.id,
    }),
  )
}
