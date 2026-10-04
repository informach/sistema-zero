import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { LearningManifest } from '../../../packages/core/src/learning'
import { evaluateStudioSectionProject } from '../../../packages/studio/src/blockly/projectCheckAuthoring'
import { buildWorkspaceStateFromIR } from '../../../packages/studio/src/blockly/workspaceState'
import type { SZIRV2 } from '../../../packages/studio/src/ir/schema'
import { type DiaDoFarol, montarProjetoFarol } from './desafio-farol-projeto'

function evaluate(day: DiaDoFarol, ir: SZIRV2, sectionKey?: string) {
  const manifest = JSON.parse(
    readFileSync(resolve(import.meta.dir, `../aulas/desafio-${day}.manifesto.json`), 'utf8'),
  ) as LearningManifest
  const section = sectionKey
    ? manifest.sections.find((item) => item.key === sectionKey)
    : manifest.sections.find((item) => item.intent === 'delivery')
  if (!section?.completion?.projectChecks?.length) throw new Error('Critérios ausentes')
  return evaluateStudioSectionProject(section.completion.projectChecks, {
    ...montarProjetoFarol('concluido'),
    ir,
    blocksState: buildWorkspaceStateFromIR(ir),
  })
}

const finalIR = () => structuredClone(montarProjetoFarol('concluido').ir) as SZIRV2

describe('Farol: conservar o que já foi construído e verificar o encaixe real', () => {
  test('recusa movimento e borda soltos fora de A cada quadro', () => {
    const ir = finalIR()
    const frame = ir.behavior.loops.find((item) => item.type === 'g2d:updateEachFrame')
    if (frame?.type !== 'g2d:updateEachFrame') throw new Error('Quadro ausente')
    const moves = frame.body.filter((item) =>
      ['g2d:topDown', 'g2d:clampToScreen'].includes(item.type),
    )
    frame.body = frame.body.filter((item) => !moves.includes(item))
    ir.behavior.loops.push(...moves)
    expect(evaluate('dia-1', ir).every((item) => item.passed)).toBe(false)
  })

  test.each(['dia-2', 'dia-3'] as const)('%s recusa a perda do movimento anterior', (day) => {
    const ir = finalIR()
    const frame = ir.behavior.loops.find((item) => item.type === 'g2d:updateEachFrame')
    if (frame?.type !== 'g2d:updateEachFrame') throw new Error('Quadro ausente')
    frame.body = frame.body.filter((item) => item.type !== 'g2d:topDown')
    expect(evaluate(day, ir).every((item) => item.passed)).toBe(false)
  })

  test('Dia 3 recusa temChave começando verdadeiro', () => {
    const ir = finalIR()
    const memory = ir.behavior.start.find((item) => item.type === 'var' && item.name === 'temChave')
    if (memory?.type !== 'var') throw new Error('Memória ausente')
    memory.value = { type: 'bool', value: true }
    expect(evaluate('dia-3', ir).every((item) => item.passed)).toBe(false)
  })

  test('Dia 3 recusa coleta que não guarda a chave', () => {
    const ir = finalIR()
    const event = ir.behavior.events.find(
      (item) => item.type === 'g2d:onOverlap' && item.bVar === 'chave',
    )
    if (event?.type !== 'g2d:onOverlap') throw new Error('Coleta ausente')
    event.body = event.body.filter((item) => !(item.type === 'assign' && item.name === 'temChave'))
    expect(evaluate('dia-3', ir).every((item) => item.passed)).toBe(false)
  })

  test('a etapa sem chave aceita então vazio, mas a entrega exige a resposta com chave', () => {
    const ir = finalIR()
    const event = ir.behavior.events.find(
      (item) => item.type === 'g2d:onOverlap' && item.bVar === 'farol',
    )
    if (event?.type !== 'g2d:onOverlap') throw new Error('Porta ausente')
    const condition = event.body.find((item) => item.type === 'if')
    if (condition?.type !== 'if') throw new Error('Condição ausente')
    // biome-ignore lint/suspicious/noThenProperty: then é o ramo da condição no formato IR do Estúdio.
    condition.then = []
    expect(evaluate('dia-3', ir, 'sem-chave').every((item) => item.passed)).toBe(true)
    expect(evaluate('dia-3', ir, 'decisao').every((item) => item.passed)).toBe(false)
    condition.else = []
    expect(evaluate('dia-3', ir, 'sem-chave').every((item) => item.passed)).toBe(false)
  })
})
