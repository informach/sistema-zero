import * as Blockly from 'blockly/core'
import 'blockly/blocks'
import { beforeAll, describe, expect, it } from 'bun:test'
import { buildIRFromWorkspace } from '../buildIR'
import { HTMLConnectionChecker } from '../htmlConnectionChecker'
import { migrateHTMLStructure } from '../migrateHTMLStructure'
import { ensureBlocklyInitialized } from '../setup'

function workspace(): Blockly.Workspace {
  return new Blockly.Workspace(
    new Blockly.Options({ plugins: { connectionChecker: HTMLConnectionChecker } }),
  )
}

function connectInside(parent: Blockly.Block, child: Blockly.Block): boolean {
  const inputConnection = parent.getInput('CHILDREN')?.connection
  const previousConnection = child.previousConnection
  if (!inputConnection || !previousConnection) throw new Error('Bloco sem conexão HTML esperada')
  return inputConnection.connect(previousConnection)
}

function loadMigrated(state: unknown): Blockly.Workspace {
  const migrated = migrateHTMLStructure(state)
  if (!migrated || typeof migrated !== 'object')
    throw new Error('Migração devolveu estado inválido')
  const ws = workspace()
  Blockly.serialization.workspaces.load(migrated, ws)
  return ws
}

describe('encaixes semânticos de HTML', () => {
  beforeAll(() => ensureBlocklyInitialized())

  it('aceita texto marcado no parágrafo e rejeita uma caixa dentro dele', () => {
    const ws = workspace()
    const paragraph = ws.newBlock('sz_html_p')
    const span = ws.newBlock('sz_html_span')
    const box = ws.newBlock('sz_html_div')

    expect(connectInside(paragraph, span)).toBe(true)
    span.unplug()
    expect(connectInside(paragraph, box)).toBe(false)
    ws.dispose()
  })

  it('aceita apenas itens dentro de uma lista', () => {
    const ws = workspace()
    const list = ws.newBlock('sz_html_ul')
    const item = ws.newBlock('sz_html_li')
    const paragraph = ws.newBlock('sz_html_p')

    expect(connectInside(list, item)).toBe(true)
    item.unplug()
    expect(connectInside(list, paragraph)).toBe(false)
    ws.dispose()
  })

  it('rejeita formulário dentro de outro formulário, mesmo com uma caixa no meio', () => {
    const ws = workspace()
    const outerForm = ws.newBlock('sz_html_form')
    const box = ws.newBlock('sz_html_div')
    const innerForm = ws.newBlock('sz_html_form')

    expect(connectInside(outerForm, box)).toBe(true)
    expect(connectInside(box, innerForm)).toBe(false)
    ws.dispose()
  })

  it('migra caixa inválida de dentro do parágrafo para depois dele', () => {
    const state = {
      blocks: {
        languageVersion: 0,
        blocks: [
          {
            type: 'sz_frame_structure',
            inputs: {
              CHILDREN: {
                block: {
                  type: 'sz_html_p',
                  fields: { TEXT: 'Antes', CLASS: '' },
                  inputs: {
                    CHILDREN: {
                      block: { type: 'sz_html_div', fields: { ID: '', CLASS: '' } },
                    },
                  },
                },
              },
            },
          },
        ],
      },
    }
    const ws = loadMigrated(state)
    const ir = buildIRFromWorkspace(ws)
    expect(ir.html.map((node) => (node.type === 'element' ? node.tag : node.type))).toEqual([
      'p',
      'div',
    ])
    const paragraph = ir.html[0]
    expect(paragraph?.type === 'element' ? paragraph.children : undefined).toBeUndefined()
    ws.dispose()
  })

  it('envolve item de lista órfão em uma lista sem perder o texto', () => {
    const state = {
      blocks: {
        languageVersion: 0,
        blocks: [
          {
            type: 'sz_frame_structure',
            inputs: {
              CHILDREN: {
                block: { type: 'sz_html_li', fields: { TEXT: 'Um item', CLASS: '' } },
              },
            },
          },
        ],
      },
    }
    const ws = loadMigrated(state)
    const ir = buildIRFromWorkspace(ws)
    expect(ir.html[0]).toMatchObject({
      type: 'element',
      tag: 'ul',
      children: [{ type: 'element', tag: 'li', text: 'Um item' }],
    })
    ws.dispose()
  })
})
