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
import { buildCoreToolbox } from '../../../packages/studio/src/blockly/toolbox'
import { buildWorkspaceStateFromIR } from '../../../packages/studio/src/blockly/workspaceState'
import type { SZIRV2 } from '../../../packages/studio/src/ir/schema'
import { gameTwoDToolboxCategory } from '../../../packages/studio/src/official-extensions/game-2d/blocks'
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
    for (const name of ['introducao', 'dia-1', 'dia-2', 'dia-3', 'certificado']) {
      const m = manifesto(name)
      const byKey = new Map(m.blocks.map((block) => [block.key, block]))
      for (const section of m.sections) {
        if (section.blockKeys.some((key) => byKey.get(key)?.content?.kind === 'quiz')) {
          expect(section.blockKeys.map((key) => byKey.get(key)?.content?.kind)).toEqual([
            'dialogue',
            'quiz',
          ])
          expect(section.completion?.blockIds).toEqual(['quiz-revisao-final'])
          continue
        }
        const videos = section.blockKeys.filter((key) => {
          const block = byKey.get(key)
          return block && 'plannedVideo' in block
        })
        expect(videos, `${name}/${section.key}`).toHaveLength(1)
        expect(section.completion?.blockIds).toContain(videos[0]!)
        const dialogues = section.blockKeys.filter(
          (key) => byKey.get(key)?.content?.kind === 'dialogue',
        )
        expect(dialogues, `${name}/${section.key}: ponte do Zappy`).toHaveLength(1)
        expect(section.blockKeys[section.blockKeys.indexOf(videos[0]!) + 1]).toBe(dialogues[0])
        expect(section.completion?.blockIds).not.toContain(dialogues[0]!)
        const activities = section.blockKeys.filter((key) => {
          const block = byKey.get(key)
          return block?.content?.kind === 'interactive' || block?.content?.kind === 'studio'
        })
        for (const activity of activities) expect(section.completion?.blockIds).toContain(activity)
      }
      expect(m.blocks.filter((block) => block.content?.kind === 'quiz')).toHaveLength(
        name === 'certificado' ? 1 : 0,
      )
    }
  })

  test('as três montagens oferecem somente Programação e Jogo 2D', () => {
    const { blocks } = JSON.parse(
      readFileSync(resolve(import.meta.dir, '../blocos-desafio-primeiro-jogo.json'), 'utf8'),
    ) as { blocks: string[] }
    for (const day of ['dia-1', 'dia-2', 'dia-3']) {
      const studio = manifesto(day).blocks.find((block) => block.key === 'projeto')?.content
      if (studio?.kind !== 'studio') throw new Error(`Estúdio ausente: ${day}`)
      expect([...(studio.allowBlocks ?? [])].sort()).toEqual(blocks)
      const palette = buildCoreToolbox([gameTwoDToolboxCategory], {
        level: 'iniciante-2d',
        allowBlocks: studio.allowBlocks,
      })
      const categories = palette.contents
        .filter((entry) => entry.kind === 'category')
        .map((entry) => entry.name)
      // Áreas contém só os recipientes de Programação: Ao iniciar, Quando acontecer
      // e Enquanto estiver rodando. Não é outra linguagem liberada ao aluno.
      expect([...categories].sort()).toEqual(['Jogo 2D', 'Programação', '🗂️ Áreas do projeto'])
      expect(JSON.stringify(palette)).not.toMatch(
        /sz_(?:html|css|canvas|frame_structure|frame_appearance)/,
      )
      const project = studio.initialProject as ReturnType<typeof montarProjetoFarol>
      expect(project.ir.html).toEqual([])
      expect(project.ir.css).toEqual([])
      expect(JSON.stringify(project.blocksState)).not.toMatch(
        /sz_(?:html|css|canvas|frame_structure|frame_appearance)/,
      )
    }
  })

  test('o jogo pronto exige participação, sem exigir vitória ou alimentar a cadeia de criação', () => {
    const m = manifesto('introducao')
    const content = m.blocks.find((block) => block.key === 'jogo-pronto')?.content
    if (content?.kind !== 'interactive' || content.activity.type !== 'project-play')
      throw new Error('Jogo pronto ausente')
    expect(content.activity.completion).toBe('participation')
    expect(content.activity.targets).toEqual([])
    expect(content.activity.project).toEqual(montarProjetoFarol('concluido'))
    expect(content.activity.stage).toEqual({ width: 480, height: 360 })
    expect(m.blocks.some((block) => block.content?.kind === 'studio')).toBe(false)
    expect(m.sections[0]?.completion?.blockIds).toEqual(['video-intro-farol', 'jogo-pronto'])
    expect(JSON.stringify(montarProjetoFarol('dia-1').ir)).not.toContain('g2d:topDown')
  })

  test('o caderno tem leitor opcional sem um mapa adicional que não faz parte das aulas', () => {
    const m = manifesto('introducao')
    const section = m.sections[1]
    expect(section?.key).toBe('caderno')
    expect(section?.completion?.blockIds).toEqual(['video-intro-caderno'])
    expect(m.blocks.find((block) => block.key === 'materiais-farol')?.content).toMatchObject({
      kind: 'materials',
      bookPreview: true,
      items: [],
    })
    expect(m.blocks.find((block) => block.key === 'mapa-familia')).toBeUndefined()
  })

  test('a primeira montagem preserva o projeto e retira os vídeos sem prática', () => {
    const m = manifesto('dia-1')
    expect(m.sections).toHaveLength(1)
    expect(m.sections[0]?.key).toBe('borda')
    expect(m.sections[0]?.workspaceKey).toBe('projeto')
    expect(m.retireBlockKeys).toEqual(['video-d1-chegada', 'video-d1-movimento'])
    for (const name of ['introducao', 'dia-1', 'dia-2', 'dia-3', 'certificado']) {
      const current = manifesto(name)
      for (const retired of current.retireBlockKeys ?? []) {
        expect(current.blocks.some((block) => block.key === retired)).toBe(false)
        expect(current.sections.some((section) => section.blockKeys.includes(retired))).toBe(false)
      }
    }
  })

  test('a experiência compara a porta com e sem chave antes da prática, sem pergunta redundante', () => {
    const m = manifesto('dia-3')
    expect(m.sections.findIndex((section) => section.key === 'condicao')).toBeLessThan(
      m.sections.findIndex((section) => section.key === 'decisao'),
    )
    const activity = m.blocks.find((block) => block.key === 'experiencia-porta')
    expect(activity?.content?.kind).toBe('interactive')
    if (activity?.content?.kind !== 'interactive') throw new Error('Experiência ausente')
    expect(activity.content.activity.scene).toBe('lighthouse-key')
    expect(activity.content.semPerguntaFinal).toBe(true)
    expect(m.sections.find((section) => section.key === 'condicao')?.completion?.blockIds).toEqual([
      'video-d3-condicao',
      'experiencia-porta',
    ])
  })

  test('a publicação retoma o mesmo projeto enviado e não bloqueia a conclusão por publicar', () => {
    for (const day of ['dia-1', 'dia-2', 'dia-3']) {
      const content = manifesto(day).blocks.find((block) => block.key === 'projeto')?.content
      if (content?.kind !== 'studio') throw new Error(`Estúdio ausente: ${day}`)
      expect(content.chain).toBe('desafio-primeiro-jogo')
      expect(content.showcase?.enabled === true).toBe(day === 'dia-3')
    }
    const m = manifesto('dia-3')
    const delivery = m.sections.find((section) => section.key === 'decisao')
    const publication = m.sections.find((section) => section.key === 'fecho')
    expect(publication?.workspaceKey).toBe(delivery?.workspaceKey)
    expect(publication?.workspaceKey).toBe('projeto')
    expect(publication?.completion?.blockIds).toEqual(['video-d3-fecho'])
    expect(publication?.blockKeys).not.toContain('projeto')
    expect(m.blocks.filter((block) => block.content?.kind === 'studio')).toHaveLength(1)
  })

  test('a celebração mantém a emissão do certificado e aposenta a apresentação comercial', () => {
    const m = manifesto('certificado')
    expect(m.sections.map((s) => s.key)).toEqual(['revisao-final', 'certificado'])
    expect(m.sections[1]?.completion?.blockIds).toEqual(['video-certificado-farol', 'certificado'])
    expect(m.blocks.find((block) => block.key === 'certificado')?.content?.kind).toBe('certificate')
    expect(m.retireBlockKeys).toContain('video-pitch-farol')
    expect(m.retireBlockKeys).toContain('link-comunidade')
    expect(m.blocks.some((block) => block.key.includes('pitch'))).toBe(false)
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

  test('a coleta não passa se temChave só muda no encontro com o farol', () => {
    const project = montarProjetoFarol('dia-3')
    const ir = structuredClone(project.ir) as SZIRV2
    const event = ir.behavior.events.find((item) => item.type === 'g2d:onOverlap')
    if (event?.type !== 'g2d:onOverlap') throw new Error('Coleta ausente')
    const remember = event.body.find((item) => item.type === 'assign' && item.name === 'temChave')
    if (!remember) throw new Error('Memória ausente')
    event.body = event.body.filter((item) => item !== remember)
    ir.behavior.events.push({
      type: 'g2d:onOverlap',
      aVar: 'personagem',
      bVar: 'farol',
      body: [remember],
    })
    const wrong = { ...project, ir, blocksState: buildWorkspaceStateFromIR(ir) }
    expect(
      evaluateStudioSectionProject(checks('dia-2'), wrong).every((result) => result.passed),
    ).toBe(false)
  })

  test('a coleta precisa atualizar o aviso dentro do encontro com a chave', () => {
    const project = montarProjetoFarol('dia-3')
    const ir = structuredClone(project.ir) as SZIRV2
    const event = ir.behavior.events.find((item) => item.type === 'g2d:onOverlap')
    if (event?.type !== 'g2d:onOverlap') throw new Error('Coleta ausente')
    event.body = event.body.filter((item) => item.type !== 'assign' || item.name !== 'aviso')
    const wrong = { ...project, ir, blocksState: buildWorkspaceStateFromIR(ir) }
    expect(
      evaluateStudioSectionProject(checks('dia-2'), wrong).every((result) => result.passed),
    ).toBe(false)
  })

  test.each(['then', 'else'] as const)('a decisão precisa do aviso no ramo %s', (branch) => {
    const project = montarProjetoFarol('concluido')
    const ir = structuredClone(project.ir) as SZIRV2
    const event = ir.behavior.events.find(
      (item) => item.type === 'g2d:onOverlap' && item.bVar === 'farol',
    )
    if (event?.type !== 'g2d:onOverlap') throw new Error('Porta ausente')
    const condition = event.body.find((item) => item.type === 'if')
    if (condition?.type !== 'if') throw new Error('Condição ausente')
    condition[branch] = (condition[branch] ?? []).filter(
      (item) => item.type !== 'assign' || item.name !== 'aviso',
    )
    const wrong = { ...project, ir, blocksState: buildWorkspaceStateFromIR(ir) }
    expect(
      evaluateStudioSectionProject(checks('dia-3'), wrong).every((result) => result.passed),
    ).toBe(false)
  })

  test('avisos com palavras próprias não são reprovados por copiar um texto diferente', () => {
    const project = montarProjetoFarol('concluido')
    const ir = structuredClone(project.ir) as SZIRV2
    for (const event of ir.behavior.events) {
      if (event.type !== 'g2d:onOverlap') continue
      for (const command of event.body) {
        if (command.type === 'assign' && command.name === 'aviso')
          command.value = { type: 'str', value: 'Achei! Vou levar a chave ao farol.' }
        if (command.type === 'if') {
          for (const [branch, message] of [
            ['then', 'O farol acendeu!'],
            ['else', 'Preciso buscar a chave.'],
          ] as const) {
            const statement = command[branch]?.find(
              (item) => item.type === 'assign' && item.name === 'aviso',
            )
            if (statement?.type === 'assign') statement.value = { type: 'str', value: message }
          }
        }
      }
    }
    const changed = { ...project, ir, blocksState: buildWorkspaceStateFromIR(ir) }
    for (const day of ['dia-2', 'dia-3'])
      expect(
        evaluateStudioSectionProject(checks(day), changed).every((result) => result.passed),
      ).toBe(true)
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

  test('a ajuda opcional aponta para tutoriais existentes, sem exigir sua leitura', () => {
    const library = JSON.parse(
      readFileSync(resolve(import.meta.dir, '../../como-fazer/como-fazer.json'), 'utf8'),
    ) as { tutorials: Array<{ slug: string }> }
    const slugs = new Set(library.tutorials.map((tutorial) => tutorial.slug))
    let links = 0
    for (const name of ['introducao', 'dia-1', 'dia-2', 'dia-3', 'certificado']) {
      const m = manifesto(name)
      for (const block of m.blocks) {
        if (block.content?.kind !== 'materials') continue
        for (const item of block.content.items) {
          if (item.kind !== 'link') continue
          expect(item.url.startsWith('/como-fazer/')).toBe(true)
          expect(slugs.has(item.url.slice('/como-fazer/'.length)), item.url).toBe(true)
          expect(
            m.sections.some((section) => section.completion?.blockIds.includes(block.key)),
          ).toBe(false)
          links++
        }
      }
    }
    expect(links).toBe(9)
  })
})
