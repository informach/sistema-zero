import { describe, expect, it } from 'bun:test'
import type { SZIR } from '#ir'
import type { StructureCheck } from '../studio/activity'
import { evaluateStructureChecks, evaluateStructureRule } from './structure'

// IR mínima: só `js` importa para estrutura. Cast tolerante (os nós abaixo são
// JSStatement válidos; o cast evita preencher campos irrelevantes ao teste).
function ir(js: unknown[]): SZIR {
  return { html: [], css: [], js: js as SZIR['js'], extensions: [] }
}

describe('evaluateStructureRule', () => {
  it('usesLoop reconhece laços (repeat/while/forRange/forEach) e nega sem laço', () => {
    expect(evaluateStructureRule({ type: 'usesLoop' }, ir([{ type: 'repeat' }]), null)).toBe(true)
    expect(evaluateStructureRule({ type: 'usesLoop' }, ir([{ type: 'while' }]), null)).toBe(true)
    expect(evaluateStructureRule({ type: 'usesLoop' }, ir([{ type: 'consoleLog' }]), null)).toBe(
      false,
    )
  })

  it('usesLoop acha laço ANINHADO (anda a árvore)', () => {
    const nested = ir([{ type: 'if', then: [{ type: 'forRange', body: [] }] }])
    expect(evaluateStructureRule({ type: 'usesLoop' }, nested, null)).toBe(true)
  })

  it('declaresVariable casa DECLARAÇÃO por nome (não referência)', () => {
    const tree = ir([{ type: 'var', name: 'pontos', value: { type: 'num', value: 0 } }])
    expect(evaluateStructureRule({ type: 'declaresVariable', name: 'pontos' }, tree, null)).toBe(
      true,
    )
    expect(evaluateStructureRule({ type: 'declaresVariable', name: 'vidas' }, tree, null)).toBe(
      false,
    )
    // declareVar (declaração SEM valor) também conta.
    expect(
      evaluateStructureRule(
        { type: 'declaresVariable', name: 'placar' },
        ir([{ type: 'declareVar', name: 'placar' }]),
        null,
      ),
    ).toBe(true)
    // Uma REFERÊNCIA (var sem `value`, ex.: usar a variável numa expressão) NÃO
    // conta como declaração — senão o aluno passaria só USANDO o nome (o anti-cola
    // é recalculado no servidor e este predicado é espelhado lá).
    expect(
      evaluateStructureRule(
        { type: 'declaresVariable', name: 'pontos' },
        ir([{ type: 'assign', name: 'x', value: { type: 'var', name: 'pontos' } }]),
        null,
      ),
    ).toBe(false)
  })

  it('definesFunction e callsFunction casam por nome', () => {
    const tree = ir([
      { type: 'funcDecl', name: 'somar', params: [], body: [] },
      { type: 'callFunction', name: 'somar', args: [] },
    ])
    expect(evaluateStructureRule({ type: 'definesFunction', name: 'somar' }, tree, null)).toBe(true)
    expect(evaluateStructureRule({ type: 'callsFunction', name: 'somar' }, tree, null)).toBe(true)
    expect(evaluateStructureRule({ type: 'callsFunction', name: 'outra' }, tree, null)).toBe(false)
  })

  it('usesBlock anda a serialização do Blockly (blocksState)', () => {
    const blocks = { blocks: { blocks: [{ type: 'controls_repeat', inputs: {} }] } }
    expect(
      evaluateStructureRule({ type: 'usesBlock', blockType: 'controls_repeat' }, ir([]), blocks),
    ).toBe(true)
    expect(
      evaluateStructureRule({ type: 'usesBlock', blockType: 'math_number' }, ir([]), blocks),
    ).toBe(false)
  })
})

describe('evaluateStructureChecks', () => {
  it('devolve um resultado por checagem, na ordem', () => {
    const checks: StructureCheck[] = [
      { id: 'a', label: 'usa laço', kind: 'structure', rule: { type: 'usesLoop' } },
      {
        id: 'b',
        label: 'declara x',
        kind: 'structure',
        rule: { type: 'declaresVariable', name: 'x' },
      },
    ]
    const results = evaluateStructureChecks(ir([{ type: 'repeat' }]), null, checks)
    expect(results.map((r) => [r.checkId, r.passed])).toEqual([
      ['a', true],
      ['b', false],
    ])
    expect(results.every((r) => r.kind === 'structure')).toBe(true)
  })
})
