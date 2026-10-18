import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import {
  defaultLessonSection,
  type LessonSection,
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
  files: {},
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
  env.courses.blocks.push({
    id: studioId,
    lessonId,
    kind: 'studio',
    sortOrder: 0,
    contentRevision: REVISION,
    content: {
      kind: 'studio',
      initialProject: VAZIO,
      solutionProject: COM_LACO_E_FUNCAO,
    },
  })
  const section: LessonSection = {
    ...defaultLessonSection(randomUUID(), 'Monte o jogo', []),
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
  return { ...env, lessonId, section, studioId, read, check }
}

describe('objetivos da parte no servidor', () => {
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
    const content = block.content
    await ctx.courses.updateBlock(ctx.studioId, 'studio', { ...content, solutionProject: COM_LACO })
    expect(await objetivos()).toHaveLength(2)
    await ctx.courses.updateBlock(ctx.studioId, 'studio', {
      ...content,
      initialProject: COM_LACO_E_FUNCAO,
    })
    expect(await objetivos()).toBeUndefined()
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
