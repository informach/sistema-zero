import { describe, expect, it } from 'bun:test'
import type * as Blockly from 'blockly/core'
import { applySemanticDiagnostics } from '../semanticDiagnostics'

function warningWorkspace(blockId: string) {
  const warnings: Array<string | null> = []
  const block = {
    setWarningText(text: string | null) {
      warnings.push(text)
    },
  }
  const workspace = {
    getAllBlocks: () => [block],
    getBlockById: (id: string) => (id === blockId ? block : null),
  } as unknown as Blockly.Workspace
  return { workspace, warnings }
}

describe('diagnósticos semânticos nos blocos', () => {
  it('prende o nome inexistente ao bloco e impede a geração', () => {
    const { workspace, warnings } = warningWorkspace('desenho-1')
    const valid = applySemanticDiagnostics(workspace, {
      html: [],
      css: [],
      extensions: [{ extensionId: 'game-2d' }],
      js: [
        {
          type: 'g2d:onStart',
          body: [
            {
              type: 'g2d:drawSprite',
              __id: 'desenho-1',
              spriteVar: 'fantasma',
              ctxVar: 'ctx',
            },
          ],
        },
      ],
    })

    expect(valid).toBe(false)
    expect(warnings.at(-1)).toContain('fantasma')
  })

  it('limpa o aviso anterior quando o projeto volta a ser válido', () => {
    const { workspace, warnings } = warningWorkspace('desenho-1')
    const valid = applySemanticDiagnostics(workspace, {
      html: [],
      css: [],
      extensions: [{ extensionId: 'game-2d' }],
      js: [],
    })

    expect(valid).toBe(true)
    expect(warnings).toEqual([null])
  })

  it('avisa quando a criança esquece o # de um id HTML, sem bloquear o preview', () => {
    const { workspace, warnings } = warningWorkspace('css-1')
    const valid = applySemanticDiagnostics(workspace, {
      html: [{ type: 'element', tag: 'div', id: 'caixa' }],
      css: [{ selector: 'caixa', declarations: { color: 'red' }, __id: 'css-1' }],
      js: [],
      extensions: [],
    })

    expect(valid).toBe(true)
    expect(warnings.at(-1)).toContain('#caixa')
  })

  it('avisa sobre id ou classe que ainda não existe, sem bloquear CSS avançado', () => {
    const { workspace, warnings } = warningWorkspace('css-1')
    const valid = applySemanticDiagnostics(workspace, {
      html: [{ type: 'element', tag: 'div', id: 'caixa', attrs: { class: 'cartao' } }],
      css: [{ selector: '#fantasma', declarations: { color: 'red' }, __id: 'css-1' }],
      js: [],
      extensions: [],
    })

    expect(valid).toBe(true)
    expect(warnings.at(-1)).toContain('#fantasma')
  })
})
