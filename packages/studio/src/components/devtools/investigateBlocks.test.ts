import { describe, expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import 'blockly/blocks'
import * as PtBr from 'blockly/msg/pt-br'
import { blockAtScriptLine, blockLabel, declarationLine, findBlockJson } from './investigateBlocks'

// No editor o idioma dos blocos já está carregado; aqui, o mesmo pt-BR.
Blockly.setLocale(PtBr as unknown as Record<string, string>)

describe('do nome e da linha até o bloco (aba Investigar)', () => {
  const script = [
    'function __szProjectRun() {',
    '  let pontos = 0',
    '  heroi = SZGame2D.createSprite({ x: 148 })',
    '  pontos = pontos + 1',
    '}',
  ].join('\n')

  it('acha a linha que cria a variável: a declaração e, sem ela, a primeira atribuição', () => {
    expect(declarationLine(script, 'pontos')).toBe(2)
    expect(declarationLine(script, 'heroi')).toBe(3)
    expect(declarationLine(script, 'createSprite')).toBeNull()
    expect(declarationLine(script, 'naoExiste')).toBeNull()
    expect(declarationLine(script, 'a.b')).toBeNull()
  })

  it('a linha vira o bloco mais estreito que a contém, pelo mapa do sinal vermelho', () => {
    const map = {
      area: { file: 'script.js' as const, startLine: 1, endLine: 5 },
      soma: { file: 'script.js' as const, startLine: 4, endLine: 4 },
    }
    expect(blockAtScriptLine(map, 4)).toBe('soma')
    expect(blockAtScriptLine(map, 2)).toBe('area')
    expect(blockAtScriptLine(map, 9)).toBeNull()
  })

  it('o texto do bloco é só dele: sem o bloco de baixo nem os de dentro dos encaixes de comandos', () => {
    const state = {
      blocks: {
        blocks: [
          {
            type: 'controls_if',
            id: 'se',
            inputs: {
              IF0: { block: { type: 'logic_boolean', id: 'cond', fields: { BOOL: 'TRUE' } } },
              DO0: {
                block: {
                  type: 'text_print',
                  id: 'dentro',
                  inputs: { TEXT: { block: { type: 'text', id: 't', fields: { TEXT: 'oi' } } } },
                },
              },
            },
            next: { block: { type: 'text_print', id: 'depois' } },
          },
        ],
      },
    }
    expect(findBlockJson(state, 'dentro')?.type).toBe('text_print')
    const label = blockLabel(state, 'se') ?? ''
    expect(label).toContain('verdadeiro')
    expect(label).not.toContain('oi')
    expect(blockLabel(state, 'naoExiste')).toBeNull()
  })
})
