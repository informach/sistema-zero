import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { isLearningManifest, type LearningManifest } from '../../../packages/core/src/learning'
import {
  type SectionProjectCheck,
  sectionCompletionIssues,
} from '../../../packages/core/src/learning/section-progression'
import {
  evaluateStudioSectionProject,
  projectCheckAuthoring,
} from '../../../packages/studio/src/blockly/projectCheckAuthoring'
import { buildWorkspaceStateFromIR } from '../../../packages/studio/src/blockly/workspaceState'
import type { SZIRV2 } from '../../../packages/studio/src/ir/schema'
import { montarProjetoCadeTodoMundo } from './cade-todo-mundo-projeto'

function manifesto(name: string): LearningManifest {
  const value = JSON.parse(
    readFileSync(
      resolve(import.meta.dir, `../aulas/cade-todo-mundo-${name}.manifesto.json`),
      'utf8',
    ),
  )
  if (!isLearningManifest(value)) throw new Error(`Manifesto inválido: ${name}`)
  return value
}

function checks(name: string): SectionProjectCheck[] {
  return (
    manifesto(name).sections.find((s) => s.completion?.projectChecks?.length)?.completion
      ?.projectChecks ?? []
  )
}

describe('curso gratuito Cadê Todo Mundo?', () => {
  test('Aula 1 chega à experiência na segunda seção e deixa o mapa opcional na prática', () => {
    const m = manifesto('aula-1')
    expect(m.sections.map((section) => section.key)).toEqual([
      'apresentacao',
      'toque-e-resposta',
      'primeiro-achado',
    ])
    expect(m.sections[0]?.blockKeys).toEqual(['video-a1-abertura'])
    expect(m.sections[1]?.blockKeys).toEqual([
      'video-a1-toque',
      'ponte-a1-toque',
      'experiencia-toque',
    ])
    expect(m.sections[2]?.blockKeys).toEqual([
      'video-a1-programar',
      'ponte-a1-programar',
      'projeto',
      'caderno',
    ])
    expect(m.sections[2]?.completion?.blockIds).toEqual(['video-a1-programar', 'projeto'])
    expect(m.blocks.filter((block) => 'plannedVideo' in block)).toHaveLength(3)
    expect(m.blocks.filter((block) => block.key === 'caderno')).toHaveLength(1)
    expect(m.blocks.some((block) => block.key === 'video-a1-caderno')).toBe(false)
  })

  test('a prática e a entrega respeitam as regras de seção; a cena declara o jardim', () => {
    for (const name of ['aula-1', 'aula-2', 'certificado']) {
      const m = manifesto(name)
      const sections = m.sections.map((s) => ({
        ...s,
        id: s.key,
        blockIds: s.blockKeys,
        workspaceBlockId: s.workspaceKey,
      }))
      const blocks = m.blocks.map((b) => ({
        id: b.key,
        content: 'content' in b ? b.content : { kind: 'video' },
      }))
      expect(sectionCompletionIssues(sections, blocks), name).toEqual([])
    }
    const experience = manifesto('aula-1').blocks.find((b) => b.key === 'experiencia-toque')
    expect(
      experience && 'content' in experience && experience.content.kind === 'interactive'
        ? experience.content.activity.cenario
        : undefined,
    ).toBe('jardim')
  })

  test('todas as seções têm exatamente um vídeo e nenhuma traz oferta ou palpite', () => {
    for (const name of ['aula-1', 'aula-2', 'certificado']) {
      const m = manifesto(name)
      const byId = new Map(m.blocks.map((b) => [b.key, b]))
      for (const s of m.sections) {
        const blocks = s.blockKeys.map((key) => byId.get(key))
        expect(blocks.filter((b) => b && 'plannedVideo' in b)).toHaveLength(1)
      }
      expect(m.blocks.some((b) => b.content?.kind === 'quiz')).toBe(false)
      expect(m.blocks.some((b) => b.content?.kind === 'rich_text')).toBe(false)
      expect(
        m.blocks.some(
          (b) => b.content?.kind === 'interactive' && b.content.activity.type === 'question',
        ),
      ).toBe(false)
    }
  })

  test('a cena exige vídeo e descoberta; a prática exige vídeo e projeto', () => {
    const m = manifesto('aula-1')
    const concept = m.sections.find((s) => s.key === 'toque-e-resposta')!
    expect(concept.completion?.blockIds).toEqual(['video-a1-toque', 'experiencia-toque'])
    const practice = m.sections.find((s) => s.key === 'primeiro-achado')!
    expect(practice.completion?.blockIds).toEqual(['video-a1-programar', 'projeto'])
    expect(practice.completion?.projectChecks).toHaveLength(1)
  })

  test('cada regra de conclusão corresponde a um bloco que a criança realmente adiciona', () => {
    const first = manifesto('aula-1')
    const firstStudio = first.blocks.find((b) => b.key === 'projeto')?.content
    expect(projectCheckAuthoring(firstStudio).issues(checks('aula-1')[0]!.rule)).toEqual([])
    const before = montarProjetoCadeTodoMundo()
    expect(evaluateStudioSectionProject(checks('aula-1'), before).every((c) => !c.passed)).toBe(
      true,
    )
    const afterFirst = montarProjetoCadeTodoMundo(true)
    expect(evaluateStudioSectionProject(checks('aula-1'), afterFirst).every((c) => c.passed)).toBe(
      true,
    )

    const second = manifesto('aula-2')
    const secondStudio = second.blocks.find((b) => b.key === 'projeto')?.content
    expect(projectCheckAuthoring(secondStudio).issues(checks('aula-2')[0]!.rule)).toEqual([])
    expect(evaluateStudioSectionProject(checks('aula-2'), afterFirst).every((c) => !c.passed)).toBe(
      true,
    )
    const ir = structuredClone(afterFirst.ir) as SZIRV2
    const event = ir.behavior.events[0]
    if (event?.type !== 'g2d:onGroupClick') throw new Error('Evento preparado ausente')
    event.body.push({
      type: 'assign',
      name: 'achados',
      value: {
        type: 'binop',
        op: '+',
        left: { type: 'var', name: 'achados' },
        right: { type: 'num', value: 1 },
      },
    })
    const finished = { ...afterFirst, blocksState: buildWorkspaceStateFromIR(ir) }
    expect(evaluateStudioSectionProject(checks('aula-2'), finished).every((c) => c.passed)).toBe(
      true,
    )
  })
})
