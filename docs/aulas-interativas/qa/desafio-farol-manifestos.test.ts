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
import { montarProjetoFarol } from './desafio-farol-projeto'

function manifesto(name: string): LearningManifest {
  const value = JSON.parse(
    readFileSync(resolve(import.meta.dir, `../aulas/desafio-${name}.manifesto.json`), 'utf8'),
  )
  if (!isLearningManifest(value)) throw new Error(`Manifesto inválido: ${name}`)
  return value
}

function checks(name: string): SectionProjectCheck[] {
  return (
    manifesto(name).sections.find((section) => section.completion?.projectChecks?.length)
      ?.completion?.projectChecks ?? []
  )
}

describe('Desafio do Primeiro Jogo — A Chave do Farol', () => {
  test('todos os cinco manifestos têm conclusões coerentes', () => {
    for (const name of ['introducao', 'dia-1', 'dia-2', 'dia-3', 'certificado']) {
      const m = manifesto(name)
      const sections = m.sections.map((section) => ({
        ...section,
        id: section.key,
        blockIds: section.blockKeys,
        workspaceBlockId: section.workspaceKey,
      }))
      const blocks = m.blocks.map((block) => ({
        id: block.key,
        content: 'content' in block ? block.content : { kind: 'video' },
      }))
      expect(sectionCompletionIssues(sections, blocks), name).toEqual([])
      expect(m.courseSlug).toBe('desafio-primeiro-jogo')
    }
  })

  test('cada seção comum tem um vídeo; a atividade exige vídeo e ação da criança', () => {
    for (const name of ['introducao', 'dia-1', 'dia-2', 'dia-3']) {
      const m = manifesto(name)
      const byKey = new Map(m.blocks.map((block) => [block.key, block]))
      for (const section of m.sections) {
        const videos = section.blockKeys.filter((key) => {
          const block = byKey.get(key)
          return block && 'plannedVideo' in block
        })
        expect(videos, `${name}/${section.key}`).toHaveLength(1)
        expect(section.completion?.blockIds).toContain(videos[0]!)
        const activities = section.blockKeys.filter((key) => {
          const block = byKey.get(key)
          return block?.content?.kind === 'interactive' || block?.content?.kind === 'studio'
        })
        for (const activity of activities) expect(section.completion?.blockIds).toContain(activity)
      }
      expect(m.blocks.some((block) => block.content?.kind === 'quiz')).toBe(false)
    }
  })

  test('a única experiência compara a porta com e sem chave, antes da prática', () => {
    const m = manifesto('dia-3')
    expect(m.sections.findIndex((section) => section.key === 'condicao')).toBeLessThan(
      m.sections.findIndex((section) => section.key === 'decisao'),
    )
    const activity = m.blocks.find((block) => block.key === 'experiencia-porta')
    expect(activity?.content?.kind).toBe('interactive')
    if (activity?.content?.kind !== 'interactive') throw new Error('Experiência ausente')
    expect(activity.content.activity.scene).toBe('lighthouse-key')
    expect(m.sections.find((section) => section.key === 'condicao')?.completion?.blockIds).toEqual([
      'video-d3-condicao',
      'experiencia-porta',
    ])
  })

  test('os critérios de Estúdio não aprovam as retomadas antes da criança programar', () => {
    for (const day of ['dia-1', 'dia-2', 'dia-3'] as const) {
      const m = manifesto(day)
      const studio = m.blocks.find((block) => block.key === 'projeto')?.content
      const rules = checks(day)
      expect(rules.length).toBeGreaterThan(0)
      for (const item of rules)
        expect(projectCheckAuthoring(studio).issues(item.rule), `${day}/${item.id}`).toEqual([])
      const before = montarProjetoFarol(day)
      expect(
        evaluateStudioSectionProject(rules, before).every((result) => !result.passed),
        day,
      ).toBe(true)
      const next = day === 'dia-1' ? 'dia-2' : day === 'dia-2' ? 'dia-3' : 'concluido'
      const after = montarProjetoFarol(next)
      expect(
        evaluateStudioSectionProject(rules, after).every((result) => result.passed),
        day,
      ).toBe(true)
    }
  })

  test('a meta da porta recusa uma condição que não consulta temChave', () => {
    const project = montarProjetoFarol('concluido')
    const ir = structuredClone(project.ir) as SZIRV2
    const event = ir.behavior.events.find(
      (item) => item.type === 'g2d:onOverlap' && item.bVar === 'farol',
    )
    if (event?.type !== 'g2d:onOverlap') throw new Error('Evento do farol ausente')
    const condition = event.body.find((item) => item.type === 'if')
    if (condition?.type !== 'if') throw new Error('Condição da porta ausente')
    condition.cond = { type: 'bool', value: false }
    const wrong = { ...project, ir, blocksState: buildWorkspaceStateFromIR(ir) }
    const result = evaluateStudioSectionProject(checks('dia-3'), wrong)
    expect(result.find((item) => item.checkId === 'encontro-farol')?.passed).toBe(false)
    expect(result.find((item) => item.checkId === 'condicao')?.passed).toBe(false)
  })

  test('cada roteiro cobre as seções e gravações do manifesto na mesma ordem', () => {
    for (const name of ['introducao', 'dia-1', 'dia-2', 'dia-3', 'certificado']) {
      const m = manifesto(name)
      const script = readFileSync(
        resolve(import.meta.dir, `../aulas/desafio-${name}.roteiro.md`),
        'utf8',
      )
      const sectionTitles = [...script.matchAll(/^## Seção \d+\. (.+)$/gm)].map((match) => match[1])
      expect(sectionTitles, name).toEqual(m.sections.map((section) => section.title))
      const videoKeys = [...script.matchAll(/^### Vídeo `([^`]+)`/gm)].map((match) => match[1])
      expect(videoKeys, name).toEqual(
        m.blocks.filter((block) => 'plannedVideo' in block).map((block) => block.key),
      )
    }
  })
})
