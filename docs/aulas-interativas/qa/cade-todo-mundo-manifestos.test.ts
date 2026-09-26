import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  blockCheckpoint,
  blockPrediction,
  isLearningManifest,
  type LearningManifest,
  publicInteractiveBlock,
} from '../../../packages/core/src/learning'
import {
  type SectionProjectCheck,
  sectionCompletionIssues,
} from '../../../packages/core/src/learning/section-progression'
import {
  evaluateStudioSectionProject,
  projectCheckAuthoring,
} from '../../../packages/studio/src/blockly/projectCheckAuthoring'
import { buildCoreToolbox } from '../../../packages/studio/src/blockly/toolbox'
import { buildWorkspaceStateFromIR } from '../../../packages/studio/src/blockly/workspaceState'
import type { SZIRV2 } from '../../../packages/studio/src/ir/schema'
import { gameTwoDToolboxCategory } from '../../../packages/studio/src/official-extensions/game-2d/blocks'
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

function montarProjetoCompleto() {
  const afterFirst = montarProjetoCadeTodoMundo(true)
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
  return { ...afterFirst, blocksState: buildWorkspaceStateFromIR(ir) }
}

describe('curso gratuito Cadê Todo Mundo?', () => {
  test('o manifesto aceita leitura do caderno somente como booleano', () => {
    const m = manifesto('aula-1')
    const caderno = m.blocks.find((block) => block.key === 'caderno')
    if (!caderno || !('content' in caderno) || caderno.content.kind !== 'materials')
      throw new Error('Caderno ausente')
    caderno.content.bookPreview = true
    expect(isLearningManifest(m)).toBe(true)
    caderno.content.bookPreview = 'sim' as never
    expect(isLearningManifest(m)).toBe(false)
  })

  test('Aula 1 apresenta o caderno antes da experiência e conclui a cena sem pergunta final', () => {
    const m = manifesto('aula-1')
    expect(m.sections.map((section) => section.key)).toEqual([
      'apresentacao',
      'seu-caderno-do-aluno',
      'toque-e-resposta',
      'primeiro-achado',
    ])
    expect(m.sections[0]?.blockKeys).toEqual(['video-a1-abertura'])
    expect(m.sections[1]?.blockKeys).toEqual(['video-a1-caderno', 'caderno'])
    expect(m.sections[1]?.intent).toBe('material')
    expect(m.sections[1]?.completion?.blockIds).toEqual(['video-a1-caderno'])
    expect(m.sections[2]?.blockKeys).toEqual([
      'video-a1-toque',
      'ponte-a1-toque',
      'experiencia-toque',
    ])
    expect(m.sections[3]?.blockKeys).toEqual([
      'video-a1-programar',
      'ponte-a1-programar',
      'projeto',
    ])
    expect(m.sections[3]?.completion?.blockIds).toEqual(['video-a1-programar', 'projeto'])
    expect(m.blocks.filter((block) => 'plannedVideo' in block)).toHaveLength(4)
    const caderno = m.blocks.find((block) => block.key === 'caderno')
    expect(caderno?.content?.kind).toBe('materials')
    expect(
      caderno && 'content' in caderno && caderno.content.kind === 'materials'
        ? caderno.content.bookPreview
        : undefined,
    ).toBe(true)
    expect(
      caderno && 'content' in caderno && caderno.content.kind === 'materials'
        ? caderno.content.title
        : undefined,
    ).toBe('Caderno do Aluno — Cadê Todo Mundo?')
    const experience = m.blocks.find((block) => block.key === 'experiencia-toque')
    expect(experience?.content?.kind).toBe('interactive')
    if (experience?.content?.kind === 'interactive') {
      expect(experience.content.semPerguntaFinal).toBe(true)
      expect(blockPrediction(experience.content)).toBeUndefined()
      expect(blockCheckpoint(experience.content)).toBeUndefined()
      expect(publicInteractiveBlock(experience.content).checkpoint).toBeUndefined()
    }
  })

  test('Aula 2 remete ao caderno da Aula 1 sem duplicar o bloco', () => {
    const m = manifesto('aula-2')
    expect(m.sections.map((s) => s.key)).toEqual([
      'retomada',
      'variavel-achados',
      'contar-achados',
      'conclusao',
    ])
    const concept = m.sections.find((section) => section.key === 'variavel-achados')
    expect(concept?.blockKeys).toEqual([
      'video-a2-variavel',
      'ponte-a2-variavel',
      'experiencia-achados',
    ])
    expect(concept?.completion?.blockIds).toEqual(['video-a2-variavel', 'experiencia-achados'])
    const experience = m.blocks.find((block) => block.key === 'experiencia-achados')
    expect(experience?.content?.kind).toBe('interactive')
    if (experience?.content?.kind === 'interactive') {
      expect(experience.content.activity).toMatchObject({
        type: 'experimentation',
        scene: 'found-counter',
        cenario: 'jardim',
      })
      expect(experience.content.semPerguntaFinal).toBe(true)
      expect(experience.content.instructions).toBe(
        'O que acontece com Achados quando você encontra alguém, procura sem achar e começa outra busca?',
      )
      expect(experience.content.prediction).toBeUndefined()
      expect(blockPrediction(experience.content)).toBeUndefined()
      expect(blockCheckpoint(experience.content)).toBeUndefined()
    }
    const practice = m.sections.find((section) => section.key === 'contar-achados')
    expect(practice?.blockKeys).toEqual(['video-a2-contagem', 'ponte-a2-contagem', 'projeto'])
    expect(practice?.completion?.blockIds).toEqual(['video-a2-contagem', 'projeto'])
    expect(m.blocks.some((block) => block.key === 'caderno')).toBe(false)
    expect(m.retireBlockKeys).toContain('caderno')
  })

  test('só a Aula 2 permite compartilhar após o envio, sem exigir publicação para concluir', () => {
    const primeira = manifesto('aula-1').blocks.find((block) => block.key === 'projeto')
    const segunda = manifesto('aula-2').blocks.find((block) => block.key === 'projeto')
    expect(
      primeira && 'content' in primeira && primeira.content.kind === 'studio'
        ? primeira.content.showcase?.enabled
        : undefined,
    ).not.toBe(true)
    expect(
      segunda && 'content' in segunda && segunda.content.kind === 'studio'
        ? segunda.content.showcase
        : undefined,
    ).toEqual({
      enabled: true,
      title: 'Cadê Todo Mundo?',
      summary: 'Um jogo de encontrar personagens escondidos no jardim.',
    })
    const practice = manifesto('aula-2').sections.find(
      (section) => section.key === 'contar-achados',
    )
    expect(practice?.completion?.blockIds).toEqual(['video-a2-contagem', 'projeto'])
    const closing = manifesto('aula-2').sections.find((section) => section.key === 'conclusao')
    expect(practice?.workspaceKey).toBe('projeto')
    expect(closing?.workspaceKey).toBe('projeto')
    expect(closing?.blockKeys).toEqual(['video-a2-fecho'])
    expect(closing?.completion?.blockIds).toEqual(['video-a2-fecho'])
    expect(
      manifesto('aula-2')
        .sections.flatMap((section) => section.blockKeys)
        .filter((key) => key === 'projeto'),
    ).toEqual(['projeto'])
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
    const finished = montarProjetoCompleto()
    expect(evaluateStudioSectionProject(checks('aula-2'), finished).every((c) => c.passed)).toBe(
      true,
    )
  })

  test('inventário de blocos corresponde ao jogo completo', () => {
    const { blocks } = JSON.parse(
      readFileSync(resolve(import.meta.dir, '../blocos-cade-todo-mundo.json'), 'utf8'),
    ) as { blocks: string[] }
    const types = new Set<string>()
    function visit(value: unknown): void {
      if (Array.isArray(value)) {
        value.forEach(visit)
      } else if (value !== null && typeof value === 'object') {
        const record = value as Record<string, unknown>
        if (typeof record.type === 'string' && record.type.startsWith('sz_')) {
          types.add(record.type)
        }
        Object.values(record).forEach(visit)
      }
    }
    visit(montarProjetoCompleto().blocksState)
    const internal = new Set(['sz_frame_structure', 'sz_frame_appearance'])
    const usedBlocks = [...types]
      .filter(
        (type) => !type.startsWith('sz_html') && !type.startsWith('sz_css') && !internal.has(type),
      )
      .sort()
    expect(blocks).toEqual(usedBlocks)
  })

  test('o Estúdio das duas aulas mostra somente os blocos do curso', () => {
    const { blocks } = JSON.parse(
      readFileSync(resolve(import.meta.dir, '../blocos-cade-todo-mundo.json'), 'utf8'),
    ) as { blocks: string[] }

    for (const aula of ['aula-1', 'aula-2']) {
      const studioBlocks = manifesto(aula).blocks.filter(
        (block) => block.content?.kind === 'studio',
      )
      expect(studioBlocks).toHaveLength(1)
      const studio = studioBlocks[0]?.content
      if (studio?.kind !== 'studio') throw new Error(`Estúdio ausente: ${aula}`)
      expect([...(studio.allowBlocks ?? [])].sort()).toEqual(blocks)

      const palette = buildCoreToolbox([gameTwoDToolboxCategory], {
        level: 'iniciante-2d',
        allowBlocks: studio.allowBlocks,
      })
      const categories: string[] = []
      const offered: string[] = []
      function collect(entries: readonly unknown[]): void {
        for (const entry of entries) {
          if (!entry || typeof entry !== 'object') continue
          const node = entry as {
            kind?: string
            name?: string
            type?: string
            contents?: unknown[]
          }
          if (node.kind === 'category' && node.name) categories.push(node.name)
          if (node.kind === 'block' && node.type) offered.push(node.type)
          if (Array.isArray(node.contents)) collect(node.contents)
        }
      }
      collect(palette.contents)
      expect(categories).toContain('Jogo 2D')
      expect(categories).not.toContain('HTML')
      expect(categories).not.toContain('CSS')
      expect(categories).not.toContain('Canvas')
      expect(offered.filter((type) => !blocks.includes(type))).toEqual([])
    }
  })

  test('o projeto inicial das duas aulas usa somente blocos de programação e Jogo 2D', () => {
    for (const aula of ['aula-1', 'aula-2']) {
      const studio = manifesto(aula).blocks.find(
        (block) => block.content?.kind === 'studio',
      )?.content
      if (studio?.kind !== 'studio') throw new Error(`Estúdio ausente: ${aula}`)
      const project = studio.initialProject as ReturnType<typeof montarProjetoCadeTodoMundo>
      expect(project.ir.html).toEqual([])
      expect(project.ir.css).toEqual([])
      const serialized = JSON.stringify(project.blocksState)
      expect(serialized).not.toMatch(/sz_(?:html|css|canvas|frame_structure|frame_appearance)/)
    }
  })
})
