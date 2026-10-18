import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { defaultLessonSection, type LessonSection } from '@sistemazero/core/learning'
import { ProjectCheckUnavailableError } from '../../src/domain/learning/learning.errors'
import type {
  ProjectExecutionChecker,
  ProjectExecutionCheckInput,
} from '../../src/domain/ports/project-execution-checker.port'
import { buildApp, grantLifetime, seedSampleCourse } from '../helpers'

/**
 * Objetivos que RODAM o jogo (etapa 3, 18/10/2026): o members manda ao executor só os objetivos
 * de execução, com o tipo e o modelo do bloco AUTORADO; junta com os de estrutura; e, se o
 * executor não responder, não aprova nem guarda nada.
 */
const USER = '11111111-1111-1111-1111-111111111111'
const REVISION = '12345678901234567890123456789012'

const classico = (loops: unknown[] = []) => ({
  formatVersion: 2,
  name: 'Meu jogo',
  files: {},
  ir: {
    version: 2,
    html: [],
    css: [],
    extensions: [],
    behavior: { molds: [], start: [], events: [], loops },
  },
})
const COM_LACO = classico([{ type: 'repeat', times: { type: 'num', value: 3 }, body: [] }])
const anda = {
  type: 'behavior' as const,
  steps: [{ action: 'press' as const, key: 'ArrowRight' as const }],
  expect: { target: { kind: 'value' as const, path: 'heroi.x' }, compare: 'changed' as const },
}

function fakeExecutor(answer: (input: ProjectExecutionCheckInput) => boolean | 'fora') {
  const calls: ProjectExecutionCheckInput[] = []
  const executor: ProjectExecutionChecker = {
    async check(input) {
      calls.push(input)
      const passed = answer(input)
      if (passed === 'fora') throw new ProjectCheckUnavailableError()
      return {
        results: input.objectives.map((o) => ({
          id: o.id,
          passed,
          ...(passed ? {} : { detail: 'o herói não andou' }),
        })),
        screenshots: { anda: 'anBlZw==' },
      }
    },
  }
  return { executor, calls }
}

function setup(executor?: ProjectExecutionChecker, initialProject: unknown = classico()) {
  const env = buildApp({ projectExecutor: executor })
  const course = seedSampleCourse(env.courses)
  const lessonId = course.lessonIds[0]
  grantLifetime(env.entitlements, { userId: USER, courseRef: course.slug })
  env.courses.blocks = env.courses.blocks.filter((b) => b.lessonId !== lessonId)
  const studioId = randomUUID()
  env.courses.blocks.push({
    id: studioId,
    lessonId,
    kind: 'studio',
    sortOrder: 0,
    contentRevision: REVISION,
    content: { kind: 'studio', initialProject, solutionProject: COM_LACO },
  })
  const section: LessonSection = {
    ...defaultLessonSection(randomUUID(), 'Faça andar', []),
    intent: 'application',
    workspaceBlockId: studioId,
    completion: {
      version: 1,
      blockIds: [],
      projectChecks: [
        { id: 'laco', label: 'Use um laço', rule: { type: 'usesLoop' } },
        { id: 'anda', label: 'Faça o herói andar', rule: anda },
      ],
    },
  }
  const structureRevision = randomUUID()
  env.learningRepository.structures.set(lessonId, {
    revision: structureRevision,
    sections: [section],
  })
  const request = (
    path: string,
    method = 'GET',
    body?: unknown,
    headers: Record<string, string> = {},
  ) =>
    env.app.handle(
      new Request(`http://localhost/members${path}`, {
        method,
        headers: { 'content-type': 'application/json', 'x-auth-user-id': USER, ...headers },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      }),
    )
  const check = (project: unknown) =>
    request(`/lessons/${lessonId}/sections/${section.id}/project-check`, 'POST', {
      revision: structureRevision,
      project,
    })
  const read = async () =>
    (await (await request(`/courses/${course.slug}/lessons/${lessonId}`)).json()) as {
      sections: { completion?: { projectChecks?: Record<string, unknown>[] } }[]
      sectionProgress: { sections: { objectives?: unknown }[] }
    }
  return { ...env, request, check, read }
}

describe('objetivos que rodam o jogo, no servidor', () => {
  test('a criança vê o tipo "o jogo faz algo" e nunca a regra', async () => {
    const ctx = setup(fakeExecutor(() => true).executor)
    const checks = (await ctx.read()).sections[0]?.completion?.projectChecks
    expect(checks?.[1]).toEqual({ id: 'anda', label: 'Faça o herói andar', kind: 'game' })
    expect(JSON.stringify(checks)).not.toContain('ArrowRight')
  })

  test('só os de execução vão ao executor, com o tipo do bloco; o resultado junta os dois', async () => {
    const fake = fakeExecutor(() => true)
    const ctx = setup(fake.executor)
    const response = await ctx.check(COM_LACO)
    expect(response.status).toBe(200)
    const body = (await response.json()) as { results: unknown; passed: boolean }
    expect(body.results).toEqual([
      { id: 'laco', passed: true },
      { id: 'anda', passed: true },
    ])
    expect(body.passed).toBe(true)
    expect(fake.calls).toHaveLength(1)
    expect(fake.calls[0]).toMatchObject({ kind: 'classic', requester: USER })
    expect(fake.calls[0]?.objectives).toEqual([{ id: 'anda', rule: anda }])
    // A criança não recebe o motivo nem a captura (são da equipe).
    expect(JSON.stringify(body)).not.toContain('anBlZw')
  })

  test('o objetivo de execução que falha tranca a parte, mesmo com a estrutura certa', async () => {
    const ctx = setup(fakeExecutor(() => false).executor)
    const body = (await (await ctx.check(COM_LACO)).json()) as { passed: boolean; results: unknown }
    expect(body.passed).toBe(false)
    expect(JSON.stringify(body)).not.toContain('não andou')
  })

  test('executor fora do ar: 503 com frase de criança, nada guardado', async () => {
    const ctx = setup(fakeExecutor(() => 'fora').executor)
    const response = await ctx.check(COM_LACO)
    expect(response.status).toBe(503)
    expect(((await response.json()) as { error: { message: string } }).error.message).toBe(
      'Não consegui testar o seu jogo agora. Tente de novo.',
    )
    expect((await ctx.read()).sectionProgress.sections[0]?.objectives).toBeUndefined()
  })

  test('sem executor configurado: 503, nunca aprovação', async () => {
    const ctx = setup(undefined)
    expect((await ctx.check(COM_LACO)).status).toBe(503)
  })

  test('Pro: o modelo vem do projeto inicial da autora, não do que a criança mandou', async () => {
    const fake = fakeExecutor(() => true)
    const ctx = setup(fake.executor, {
      kind: 'pro',
      tree: {},
      proMeta: { templateId: 'canvas-puzzle' },
    })
    await ctx.check({ kind: 'pro', tree: {}, proMeta: { templateId: 'phaser-arcade' } })
    expect(fake.calls[0]).toMatchObject({ kind: 'pro', templateId: 'canvas-puzzle' })
  })

  test('"Testar agora" da equipe: motivo e captura, sem guardar; só equipe', async () => {
    const fake = fakeExecutor(() => false)
    const ctx = setup(fake.executor)
    const body = {
      project: COM_LACO,
      checks: [
        { id: 'laco', rule: { type: 'usesLoop' } },
        { id: 'anda', rule: anda },
      ],
    }
    const admin = { 'x-auth-user-role': 'admin', 'x-auth-user-status': 'active' }
    const response = await ctx.request('/admin/project-checks/test', 'POST', body, admin)
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      results: [
        { id: 'laco', passed: true },
        { id: 'anda', passed: false, detail: 'o herói não andou' },
      ],
      passed: false,
      screenshots: { anda: 'anBlZw==' },
    })
    expect(fake.calls[0]?.requester).toBe(`admin-${USER}`)
    expect([401, 403]).toContain((await ctx.request('/admin/project-checks/test', 'POST', body)).status)
    const broken = {
      ...body,
      checks: [{ id: 'x', rule: { ...anda, steps: [{ action: 'wait', ms: 99_000 }] } }],
    }
    expect((await ctx.request('/admin/project-checks/test', 'POST', broken, admin)).status).toBe(
      400,
    )
  })
})
