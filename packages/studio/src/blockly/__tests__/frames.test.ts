import * as Blockly from 'blockly/core'
import 'blockly/blocks'
import { beforeAll, describe, expect, it } from 'bun:test'
import { generateProjectFiles } from '#generators'
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
    const behavior = ws.newBlock('sz_frame_behavior')
    connectInto(behavior, 'CHILDREN', ws.newBlock('sz_js_console_log_text'))
    // Rascunho: solto no topo, fora de qualquer frame → NÃO entra na IR.
    ws.newBlock('sz_js_console_log_text')

    const ir = buildIRFromWorkspace(ws)
    expect(ir.js).toHaveLength(1)
    expect(ir.js[0]?.type).toBe('consoleLog')
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
    expect(ir.js).toHaveLength(0)
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
})
