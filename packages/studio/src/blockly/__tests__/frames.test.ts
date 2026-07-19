import * as Blockly from 'blockly/core'
import 'blockly/blocks'
import { beforeAll, describe, expect, it } from 'bun:test'
import { generateProjectFiles } from '#generators'
import { behaviorStatements } from '#ir'
import { buildIRFromWorkspace, collectFlatFromWorkspace } from '../buildIR'
import { blocksStateHasFrame, normalizeBlocksStateToFrames } from '../normalizeFrames'
import { ensureBlocklyInitialized } from '../setup'
import { buildWorkspaceStateFromIR } from '../workspaceState'

function connectInto(parent: Blockly.Block, input: string, child: Blockly.Block): void {
  const conn = parent.getInput(input)?.connection
  if (conn && child.previousConnection) conn.connect(child.previousConnection)
}

describe('Blocos-container (frames) — só gera o que está DENTRO', () => {
  beforeAll(() => ensureBlocklyInitialized())

  it('bloco DENTRO do Comportamento gera; bloco SOLTO fora de qualquer frame é rascunho (ignorado)', () => {
    const ws = new Blockly.Workspace()
    const behavior = ws.newBlock('sz_frame_start')
    connectInto(behavior, 'CHILDREN', ws.newBlock('sz_js_console_log_text'))
    // Rascunho: solto no topo, fora de qualquer frame → NÃO entra na IR.
    ws.newBlock('sz_js_console_log_text')

    const ir = buildIRFromWorkspace(ws)
    expect(ir.behavior.start).toHaveLength(1)
    expect(ir.behavior.start[0]?.type).toBe('consoleLog')
  })

  it('HTML→Estrutura e CSS→Aparência (cada categoria no seu arquivo)', () => {
    const ws = new Blockly.Workspace()
    connectInto(ws.newBlock('sz_frame_structure'), 'CHILDREN', ws.newBlock('sz_html_h1'))
    connectInto(
      ws.newBlock('sz_frame_appearance'),
      'CHILDREN',
      ws.newBlock('sz_css_body_background'),
    )

    const ir = buildIRFromWorkspace(ws)
    expect(ir.html).toHaveLength(1)
    expect(ir.css).toHaveLength(1)
    expect(behaviorStatements(ir)).toHaveLength(0)
  })

  it('a "boca" do frame respeita o tipo: HTML encaixa na Estrutura, CSS não', () => {
    const ws = new Blockly.Workspace()
    const html = ws.newBlock('sz_html_h1')
    connectInto(ws.newBlock('sz_frame_structure'), 'CHILDREN', html)
    expect(html.type).toBe('sz_html_h1')
    expect(html.getParent()?.type).toBe('sz_frame_structure')

    // CSS (previousStatement 'CSSEntry') não casa o check 'HTMLNode' da Estrutura:
    // o connect rejeita (lança OU é no-op) e o bloco fica sem pai.
    const css = ws.newBlock('sz_css_body_background')
    const conn = ws.newBlock('sz_frame_structure').getInput('CHILDREN')?.connection
    try {
      if (conn && css.previousConnection) conn.connect(css.previousConnection)
    } catch {
      /* check incompatível → esperado */
    }
    expect(css.getParent()).toBeNull()
  })

  it('eventos e loops só encaixam em suas próprias áreas', () => {
    const ws = new Blockly.Workspace()
    const start = ws.newBlock('sz_frame_start')
    const events = ws.newBlock('sz_frame_events')
    const loops = ws.newBlock('sz_frame_loops')
    const click = ws.newBlock('sz_js_on_click')
    const animation = ws.newBlock('sz_canvas_anim_loop')
    const clickConnection = click.previousConnection
    const animationConnection = animation.previousConnection
    if (!clickConnection || !animationConnection) throw new Error('Conexões do fixture ausentes')

    try {
      start.getInput('CHILDREN')?.connection?.connect(clickConnection)
    } catch {
      // O Blockly lança quando os checks não se cruzam.
    }
    expect(click.getParent()).toBeNull()
    events.getInput('CHILDREN')?.connection?.connect(clickConnection)
    expect(click.getParent()).toBe(events)

    try {
      start.getInput('CHILDREN')?.connection?.connect(animationConnection)
    } catch {
      // O Blockly lança quando os checks não se cruzam.
    }
    expect(animation.getParent()).toBeNull()
    loops.getInput('CHILDREN')?.connection?.connect(animationConnection)
    expect(animation.getParent()).toBe(loops)
  })
})

describe('Migração transparente para frames (normalizeBlocksStateToFrames)', () => {
  beforeAll(() => ensureBlocklyInitialized())

  it('projeto LEGADO (blocos soltos, sem frames) migra para os 3 frames PRESERVANDO a saída', () => {
    // Estado legado: blocos soltos no topo, como antes dos frames.
    const ws = new Blockly.Workspace()
    ws.newBlock('sz_html_h1')
    ws.newBlock('sz_js_console_log_text')
    const legacy = Blockly.serialization.workspaces.save(ws)
    expect(blocksStateHasFrame(legacy)).toBe(false)

    // Saída ANTES (modelo plano, exatamente o que o projeto já gerava).
    const filesBefore = generateProjectFiles({
      ir: collectFlatFromWorkspace(ws),
      projectName: 'X',
    })

    // Migra → vira framado.
    const migrated = normalizeBlocksStateToFrames(legacy) as Record<string, unknown>
    expect(blocksStateHasFrame(migrated)).toBe(true)

    // Saída DEPOIS (modelo frames): idêntica byte-a-byte.
    const ws2 = new Blockly.Workspace()
    Blockly.serialization.workspaces.load(migrated, ws2)
    const filesAfter = generateProjectFiles({ ir: buildIRFromWorkspace(ws2), projectName: 'X' })

    expect(filesAfter).toEqual(filesBefore)
  })

  it('idempotente: estado JÁ com frames volta igual (mesma referência)', () => {
    const framed = buildWorkspaceStateFromIR({
      html: [],
      css: [],
      js: [{ type: 'consoleLog', value: { type: 'str', value: 'oi' } }],
      extensions: [],
    })
    expect(normalizeBlocksStateToFrames(framed)).toBe(framed)
  })

  it('estado nulo/vazio não muda', () => {
    expect(normalizeBlocksStateToFrames(null)).toBeNull()
    const empty = { blocks: { languageVersion: 0, blocks: [] } }
    expect(normalizeBlocksStateToFrames(empty)).toBe(empty)
  })

  it('desembrulha a área antiga em início, eventos e loops sem conservar o boot', () => {
    const legacy = {
      blocks: {
        languageVersion: 0,
        blocks: [
          {
            type: 'sz_frame_behavior',
            id: 'area-antiga',
            inputs: {
              CHILDREN: {
                block: {
                  type: 'sz_g2d_on_start',
                  id: 'inicio-antigo',
                  inputs: {
                    BODY: {
                      block: {
                        type: 'sz_g2d_create_sprite',
                        id: 'criar',
                        next: {
                          block: {
                            type: 'sz_g2d_on_key',
                            id: 'tecla',
                            next: {
                              block: {
                                type: 'sz_g2d_update_each_frame',
                                id: 'quadro',
                                next: { block: { type: 'sz_gk_start', id: 'boot' } },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        ],
      },
    }

    const migrated = normalizeBlocksStateToFrames(legacy) as typeof legacy
    const areas = migrated.blocks.blocks
    expect(areas.map((block) => block.type)).toEqual([
      'sz_frame_start',
      'sz_frame_events',
      'sz_frame_loops',
    ])
    expect(JSON.stringify(migrated)).toContain('"id":"criar"')
    expect(JSON.stringify(migrated)).toContain('"id":"tecla"')
    expect(JSON.stringify(migrated)).toContain('"id":"quadro"')
    expect(JSON.stringify(migrated)).not.toContain('"id":"boot"')
    expect(normalizeBlocksStateToFrames(migrated)).toBe(migrated)
  })
})
