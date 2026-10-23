import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import {
  defaultLessonSection,
  type LessonSection,
  readStudioProjectExamples,
  type SectionProgressView,
} from '@sistemazero/core/learning'
import { buildApp, grantLifetime, seedSampleCourse } from '../helpers'

/**
 * Objetivos da parte (18/10/2026): o servidor confere cada objetivo, a parte passa com todos os
 * obrigatórios numa mesma verificação, o resultado fica guardado, a criança nunca recebe a regra
 * nem o gabarito e o XP sai uma vez só.
 */
const USER = '11111111-1111-1111-1111-111111111111'
const REVISION = '12345678901234567890123456789012'

const project = (behavior: Record<string, unknown[]>) => ({
  formatVersion: 2,
  name: 'Meu jogo',
  files: { 'index.html': '', 'style.css': '', 'script.js': '' },
  installedExtensions: [],
  ir: {
    version: 2,
    html: [],
    css: [],
    extensions: [],
    behavior: { molds: [], start: [], events: [], loops: [], ...behavior },
  },
})
const COM_LACO = project({
  loops: [{ type: 'repeat', times: { type: 'num', value: 3 }, body: [] }],
})
const COM_LACO_E_FUNCAO = project({
  loops: [{ type: 'repeat', times: { type: 'num', value: 3 }, body: [] }],
  molds: [{ type: 'funcDecl', name: 'pular', params: [], body: [] }],
})
const VAZIO = project({})

function setup() {
  const env = buildApp()
  const course = seedSampleCourse(env.courses)
  const lessonId = course.lessonIds[0]
  grantLifetime(env.entitlements, { userId: USER, courseRef: course.slug })
  env.courses.blocks = env.courses.blocks.filter((b) => b.lessonId !== lessonId)
  const studioId = randomUUID()
  const sectionId = randomUUID()
  const exampleId = randomUUID()
  env.courses.blocks.push({
    id: studioId,
    lessonId,
    kind: 'studio',
    sortOrder: 0,
    contentRevision: REVISION,
    content: {
      kind: 'studio',
      purpose: 'experiment',
      initialProject: VAZIO,
      projectExamples: {
        version: 1,
        examples: { [exampleId]: COM_LACO_E_FUNCAO },
        sections: { [sectionId]: { solutionExampleId: exampleId } },
      },
    },
  })
  const section: LessonSection = {
    ...defaultLessonSection(sectionId, 'Monte o jogo', [studioId]),
    intent: 'application',
    workspaceBlockId: studioId,
    completion: {
      version: 1,
      blockIds: [],
      projectChecks: [
        { id: 'laco', label: 'Use um laço', rule: { type: 'usesLoop' }, hint: 'Procure em Laços' },
        {
          id: 'funcao',
          label: 'Crie a função pular',
          rule: { type: 'definesFunction', name: 'pular' },
          optional: true,
        },
      ],
    },
  }
  const structureRevision = randomUUID()
  env.learningRepository.structures.set(lessonId, {
    revision: structureRevision,
    sections: [section],
  })
  const request = (path: string, method = 'GET', body?: unknown) =>
    env.app.handle(
      new Request(`http://localhost/members${path}`, {
        method,
        headers: { 'content-type': 'application/json', 'x-auth-user-id': USER },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      }),
    )
  const read = async () =>
    (await (await request(`/courses/${course.slug}/lessons/${lessonId}`)).json()) as {
      blocks: { id: string; content: Record<string, unknown> }[]
      sections: { id: string; completion?: { projectChecks?: Record<string, unknown>[] } }[]
      sectionProgress: SectionProgressView
    }
  const check = async (snapshot: unknown) =>
    (await (
      await request(`/lessons/${lessonId}/sections/${section.id}/project-check`, 'POST', {
        revision: structureRevision,
        project: snapshot,
      })
    ).json()) as {
      results: { id: string; passed: boolean }[]
      passed: boolean
      sectionProgress: SectionProgressView
      gamification: { xpAwarded: number } | null
    }
  const checkRaw = (snapshot: unknown) =>
    request(`/lessons/${lessonId}/sections/${section.id}/project-check`, 'POST', {
      revision: structureRevision,
      project: snapshot,
    })
  return { ...env, courseSlug: course.slug, lessonId, section, studioId, read, check, checkRaw }
}

describe('objetivos da parte no servidor', () => {
  test('admin confere os mesmos objetivos como ensaio, sem progresso nem recompensa de aluno', async () => {
    const ctx = setup()
    const revision = ctx.learningRepository.structures.get(ctx.lessonId)!.revision
    const response = await ctx.app.handle(
      new Request(
        `http://localhost/members/lessons/${ctx.lessonId}/sections/${ctx.section.id}/project-check`,
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-auth-user-id': USER,
            'x-auth-user-role': 'admin',
            'x-auth-user-status': 'active',
          },
          body: JSON.stringify({ revision, project: COM_LACO }),
        },
      ),
    )
    expect(response.status).toBe(200)
    const result = (await response.json()) as {
      passed: boolean
      results: { id: string; passed: boolean }[]
      gamification: unknown
    }
    expect(result.passed).toBe(true)
    expect(result.results).toContainEqual({ id: 'laco', passed: true })
    expect(result.gamification).toBeNull()
    expect(ctx.learningRepository.sectionProgress.size).toBe(0)
    expect(ctx.gamification.events).toHaveLength(0)
    expect(ctx.learningRepository.evidence.size).toBe(0)
  })

  test('ensaio da equipe pode conferir parte posterior, mas não aceita revisão obsoleta', async () => {
    const ctx = setup()
    const current = ctx.learningRepository.structures.get(ctx.lessonId)!
    const firstBlockId = randomUUID()
    const workspace = ctx.courses.blocks.find((block) => block.id === ctx.studioId)!
    ctx.courses.blocks.push({ ...workspace, id: firstBlockId })
    const first: LessonSection = {
      ...ctx.section,
      id: randomUUID(),
      blockIds: [firstBlockId],
      workspaceBlockId: firstBlockId,
    }
    ctx.learningRepository.structures.set(ctx.lessonId, {
      ...current,
      sections: [first, ctx.section],
    })
    const check = (revision: string) =>
      ctx.app.handle(
        new Request(
          `http://localhost/members/lessons/${ctx.lessonId}/sections/${ctx.section.id}/project-check`,
          {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'x-auth-user-id': USER,
              'x-auth-user-role': 'admin',
              'x-auth-user-status': 'active',
            },
            body: JSON.stringify({ revision, project: COM_LACO }),
          },
        ),
      )
    expect((await check(randomUUID())).status).toBe(409)
    const response = await check(current.revision)
    expect(response.status).toBe(200)
    expect(((await response.json()) as { passed: boolean }).passed).toBe(true)
    expect(ctx.learningRepository.sectionProgress.size).toBe(0)
    expect(ctx.learningRepository.evidence.size).toBe(0)
    expect(ctx.gamification.events).toHaveLength(0)
  })

  test('o HTTP da aula não entrega exemplos privados nem a outra conta sem acesso', async () => {
    const ctx = setup()
    const studio = ctx.courses.blocks.find((block) => block.id === ctx.studioId)
    if (studio?.content.kind !== 'studio') throw new Error('Expected the lesson Studio')
    const exampleId = randomUUID()
    const examples = readStudioProjectExamples({
      version: 1,
      examples: {
        [exampleId]: {
          ...COM_LACO_E_FUNCAO,
          id: 'private-teacher-example',
          name: 'PRIVATE_TEACHER_SOLUTION_SENTINEL',
          createdAt: 0,
          updatedAt: 0,
          mode: 'blocks',
          installedExtensions: [],
          files: { 'index.html': '', 'style.css': '', 'script.js': '' },
        },
      },
      sections: { [ctx.section.id]: { solutionExampleId: exampleId } },
    })
    if (examples.kind !== 'valid') throw new Error('Expected valid private examples')
    studio.content.projectExamples = examples.value
    const lesson = await ctx.read()
    expect(lesson.blocks.some((block) => block.id === ctx.studioId)).toBe(true)
    expect(JSON.stringify(lesson)).not.toContain('PRIVATE_TEACHER_SOLUTION_SENTINEL')
    expect(JSON.stringify(lesson)).not.toContain(exampleId)
    const forbidden = await ctx.app.handle(
      new Request(`http://localhost/members/courses/${ctx.courseSlug}/lessons/${ctx.lessonId}`, {
        headers: { 'x-auth-user-id': '22222222-2222-2222-2222-222222222222' },
      }),
    )
    expect(forbidden.status).toBe(403)
    expect(await forbidden.text()).not.toContain('PRIVATE_TEACHER_SOLUTION_SENTINEL')
  })

  test('a criança recebe a vista: rótulo, dica, extra e tipo, nunca a regra nem o gabarito', async () => {
    const ctx = setup()
    const lesson = await ctx.read()
    const checks = lesson.sections[0]?.completion?.projectChecks
    expect(checks).toEqual([
      { id: 'laco', label: 'Use um laço', hint: 'Procure em Laços', kind: 'idea' },
      { id: 'funcao', label: 'Crie a função pular', optional: true, kind: 'idea' },
    ])
    expect(JSON.stringify(lesson.sections)).not.toContain('definesFunction')
    const studio = lesson.blocks.find((b) => b.id === ctx.studioId)
    expect(studio?.content.initialProject).toBeDefined()
    expect('solutionProject' in (studio?.content ?? {})).toBe(false)
  })

  test('cada objetivo volta com o próprio resultado; o extra que falta não tranca', async () => {
    const ctx = setup()
    const falhou = await ctx.check(VAZIO)
    expect(falhou.passed).toBe(false)
    expect(falhou.results).toEqual([
      { id: 'laco', passed: false },
      { id: 'funcao', passed: false },
    ])
    const passou = await ctx.check(COM_LACO)
    expect(passou.passed).toBe(true)
    expect(passou.results).toEqual([
      { id: 'laco', passed: true },
      { id: 'funcao', passed: false },
    ])
    expect(passou.sectionProgress.completed).toBe(1)
  })

  test('a lista se lembra do último resultado ao reabrir a fase', async () => {
    const ctx = setup()
    await ctx.check(VAZIO)
    const lesson = await ctx.read()
    expect(lesson.sectionProgress.sections[0]?.objectives).toEqual([
      { id: 'laco', passed: false },
      { id: 'funcao', passed: false },
    ])
  })

  test('mudar a regra da parte esquece o resultado guardado (era de outra pergunta)', async () => {
    const ctx = setup()
    await ctx.check(VAZIO)
    const changed: LessonSection = {
      ...ctx.section,
      completion: {
        version: 1,
        blockIds: [],
        projectChecks: [{ id: 'laco', label: 'Use um laço', rule: { type: 'usesLoop' } }],
      },
    }
    const current = ctx.learningRepository.structures.get(ctx.lessonId)
    if (!current) throw new Error('estrutura ausente')
    ctx.learningRepository.structures.set(ctx.lessonId, { ...current, sections: [changed] })
    const lesson = await ctx.read()
    expect(lesson.sectionProgress.sections[0]?.objectives).toBeUndefined()
  })

  test('obrigatórios pagam studio_passed uma vez; cada extra paga objective_extra uma vez', async () => {
    const ctx = setup()
    const primeira = await ctx.check(COM_LACO)
    expect(primeira.gamification?.xpAwarded).toBe(30)
    const tipos = () => ctx.gamification.events.map((e) => e.sourceType)
    expect(tipos()).toEqual(['studio_passed'])
    const extra = await ctx.check(COM_LACO_E_FUNCAO)
    expect(extra.gamification?.xpAwarded).toBe(5)
    expect(tipos().sort()).toEqual(['objective_extra', 'studio_passed'])
    const repetida = await ctx.check(COM_LACO_E_FUNCAO)
    expect(repetida.gamification?.xpAwarded ?? 0).toBe(0)
    expect(ctx.gamification.events).toHaveLength(2)
  })

  test('o prêmio que falhou uma vez é pago na verificação seguinte', async () => {
    const ctx = setup()
    ctx.gamification.failAlways = true
    const falhou = await ctx.check(COM_LACO_E_FUNCAO)
    expect(falhou.passed).toBe(true)
    expect(falhou.gamification).toBeNull()
    expect(ctx.gamification.events).toHaveLength(0)
    ctx.gamification.failAlways = false
    const depois = await ctx.check(COM_LACO_E_FUNCAO)
    expect(depois.gamification?.xpAwarded).toBe(35)
    expect(ctx.gamification.events.map((e) => e.sourceType).sort()).toEqual([
      'objective_extra',
      'studio_passed',
    ])
  })

  test('parte só com desafios extras e um vídeo não espera "Verificar esta parte"', async () => {
    const ctx = setup()
    const current = ctx.learningRepository.structures.get(ctx.lessonId)
    if (!current) throw new Error('estrutura ausente')
    const videoId = randomUUID()
    ctx.courses.blocks.push({
      id: videoId,
      lessonId: ctx.lessonId,
      kind: 'video',
      sortOrder: 1,
      contentRevision: REVISION,
      content: { kind: 'video', provider: 'vimeo', src: 'https://vimeo.com/123456789' },
    })
    const onlyExtras: LessonSection = {
      ...ctx.section,
      blockIds: [videoId],
      completion: {
        version: 1,
        blockIds: [videoId],
        projectChecks: [
          {
            id: 'funcao',
            label: 'Crie a função pular',
            rule: { type: 'definesFunction', name: 'pular' },
            optional: true,
          },
        ],
      },
    }
    ctx.learningRepository.structures.set(ctx.lessonId, { ...current, sections: [onlyExtras] })
    const lesson = await ctx.read()
    const kinds = lesson.sectionProgress.sections[0]?.pendingItems.map((i) => i.kind)
    expect(kinds).toEqual(['VIDEO_GATE_NOT_WATCHED'])
    expect(kinds).not.toContain('project-check')
    expect(kinds).not.toContain('authoring')
  })

  test('corrigir só o gabarito não esquece o que a criança já verificou; mudar o projeto inicial esquece', async () => {
    const ctx = setup()
    await ctx.check(VAZIO)
    const objetivos = async () => (await ctx.read()).sectionProgress.sections[0]?.objectives
    expect(await objetivos()).toHaveLength(2)
    const block = ctx.courses.blocks.find((b) => b.id === ctx.studioId)
    if (block?.content.kind !== 'studio') throw new Error('bloco ausente')
    const initialDraft = await ctx.drafts.read(ctx.lessonId)
    const changed = await ctx.drafts.change(ctx.lessonId, USER, {
      expectedRevision: initialDraft.revision,
      operationId: randomUUID(),
      change: {
        type: 'studio-example',
        blockId: ctx.studioId,
        sectionId: ctx.section.id,
        role: 'solution',
        action: { type: 'save', exampleId: randomUUID(), project: COM_LACO },
      },
    })
    await ctx.drafts.publish(ctx.lessonId, USER, changed.revision, randomUUID(), [])
    expect(await objetivos()).toHaveLength(2)
    const content = ctx.courses.blocks.find((b) => b.id === ctx.studioId)?.content
    if (content?.kind !== 'studio') throw new Error('Published Studio missing')
    const { projectExamples: _examples, ...editorConfiguration } = content
    await ctx.courses.updateBlock(ctx.studioId, 'studio', {
      ...editorConfiguration,
      initialProject: COM_LACO_E_FUNCAO,
    })
    expect(await objetivos()).toBeUndefined()
  })

  test('projeto de outro tipo ou com a Ponte ainda lendo o código é recusado', async () => {
    const ctx = setup()
    const pro = await ctx.checkRaw({ kind: 'pro', tree: {} })
    expect(pro.status).toBe(400)
    const lendo = await ctx.checkRaw({ ...COM_LACO, bridgeCodeAhead: true })
    expect(lendo.status).toBe(409)
    expect(((await lendo.json()) as { error: { code: string } }).error.code).toBe(
      'STUDIO_PROJECT_SYNCING',
    )
  })

  test('extra cumprido antes dos obrigatórios paga o XP dele e não fecha a parte', async () => {
    const ctx = setup()
    const somenteExtra = project({
      molds: [{ type: 'funcDecl', name: 'pular', params: [], body: [] }],
    })
    const resposta = await ctx.check(somenteExtra)
    expect(resposta.passed).toBe(false)
    expect(resposta.gamification?.xpAwarded).toBe(5)
    expect(ctx.gamification.events.map((e) => e.sourceType)).toEqual(['objective_extra'])
    expect(resposta.sectionProgress.completed).toBe(0)
  })
})
