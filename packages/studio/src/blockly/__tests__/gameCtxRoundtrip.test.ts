import * as Blockly from 'blockly/core'
import { compileStatements } from '#generators'
import 'blockly/blocks'
import { beforeAll, describe, expect, it } from 'bun:test'
import { gameTwoDBlocks } from '../../official-extensions/game-2d/blocks'
import { parseJS } from '../../parsers/js'
import { registerExtensionBlocks } from '../blocks'
import { buildIRFromWorkspace } from '../buildIR'
import { ensureBlocklyInitialized } from '../setup'
import { buildWorkspaceStateFromIR } from '../workspaceState'

/**
 * Ciclo completo da Ponte SÓ no JS, com os blocos de jogo registrados:
 * código -> IR -> blocos -> Blockly (live) -> IR -> código.
 */
function bridgeCycleJS(js: string): string {
  const jsIR = parseJS(js)
  const ir = { html: [], css: [], js: jsIR, extensions: [{ extensionId: 'game-2d' }] }
  const state = buildWorkspaceStateFromIR(ir as Parameters<typeof buildWorkspaceStateFromIR>[0])
  const ws = new Blockly.Workspace()
  Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
  const ir2 = buildIRFromWorkspace(ws)
  return compileStatements(ir2.js, 0)
}

describe('Ponte — palco implícito (ctx escondido) + "Limpar a tela"', () => {
  beforeAll(() => {
    ensureBlocklyInitialized()
    registerExtensionBlocks(gameTwoDBlocks)
  })

  it('parseJS reconhece SZGame2D.clear() como g2d:clear', () => {
    expect(parseJS('SZGame2D.clear();')).toEqual([{ type: 'g2d:clear' }])
  })

  it('o gerador emite SZGame2D.clear() para o bloco g2d:clear', () => {
    expect(compileStatements([{ type: 'g2d:clear' }], 0)).toContain('SZGame2D.clear();')
  })

  it('drawSprite + clear sobrevivem ao ciclo blocos<->código (sem rawJS)', () => {
    const js = [
      'const jogador = SZGame2D.createSprite({ x: 10, y: 10, w: 20, h: 20, color: "#22d3ee" });',
      'SZGame2D.gameLoop(function update() {',
      '  SZGame2D.clear();',
      '  SZGame2D.drawSprite(ctx, jogador);',
      '});',
    ].join('\n')
    const out = bridgeCycleJS(js)
    // O ctx continua no CÓDIGO (válido e reversível), mesmo sem o aluno vê-lo no bloco.
    expect(out).toContain('SZGame2D.clear();')
    expect(out).toContain('SZGame2D.drawSprite(ctx, jogador)')
    expect(out).not.toContain('rawJS')
  })

  it('o bloco de desenhar não serializa mais o campo CTX', () => {
    const state = buildWorkspaceStateFromIR({
      html: [],
      css: [],
      js: [{ type: 'g2d:drawSprite', spriteVar: 'jogador', ctxVar: 'ctx' }],
      extensions: [{ extensionId: 'game-2d' }],
    } as Parameters<typeof buildWorkspaceStateFromIR>[0])
    const json = JSON.stringify(state)
    expect(json).toContain('sz_g2d_draw_sprite')
    expect(json).not.toContain('"CTX"')
  })

  it('parseJS reconhece onKey e onOverlap (eventos "Quando…")', () => {
    expect(
      parseJS('SZGame2D.onKey("ArrowRight", function () { SZGame2D.playSound(440, 100); });'),
    ).toEqual([
      {
        type: 'g2d:onKey',
        key: 'ArrowRight',
        body: [{ type: 'g2d:playSound', freq: 440, durationMs: 100 }],
      },
    ])
    expect(
      parseJS(
        'SZGame2D.onOverlap(() => jogador, () => inimigo, function () { SZGame2D.playSound(440, 100); });',
      ),
    ).toEqual([
      {
        type: 'g2d:onOverlap',
        aVar: 'jogador',
        bVar: 'inimigo',
        body: [{ type: 'g2d:playSound', freq: 440, durationMs: 100 }],
      },
    ])
  })

  it('os eventos "Quando…" sobrevivem ao ciclo blocos<->código', () => {
    const js = [
      'const jogador = SZGame2D.createSprite({ x: 10, y: 10, w: 20, h: 20, color: "#22d3ee" });',
      'const inimigo = SZGame2D.createSprite({ x: 60, y: 60, w: 20, h: 20, color: "#f87171" });',
      'SZGame2D.onKey("ArrowUp", function () {',
      '  SZGame2D.playSound(880, 80);',
      '});',
      'SZGame2D.onOverlap(() => jogador, () => inimigo, function () {',
      '  SZGame2D.playSound(440, 100);',
      '});',
    ].join('\n')
    const out = bridgeCycleJS(js)
    expect(out).toContain('SZGame2D.onKey("ArrowUp", function')
    expect(out).toContain('SZGame2D.onOverlap(() => jogador, () => inimigo, function')
    expect(out).not.toContain('rawJS')
  })

  it('parseJS reconhece keyDown e touches como perguntas (booleanos)', () => {
    expect(
      JSON.stringify(
        parseJS('if (SZGame2D.keyDown("ArrowRight")) { SZGame2D.playSound(440, 100); }'),
      ),
    ).toContain('"g2d:keyDown"')
    expect(
      JSON.stringify(parseJS('if (SZGame2D.touches(a, b)) { SZGame2D.playSound(440, 100); }')),
    ).toContain('"g2d:touches"')
  })

  it('os booleanos caem num "se" e sobrevivem ao ciclo blocos<->código', () => {
    const js = [
      'const jogador = SZGame2D.createSprite({ x: 10, y: 10, w: 20, h: 20, color: "#22d3ee" });',
      'const inimigo = SZGame2D.createSprite({ x: 20, y: 20, w: 20, h: 20, color: "#f87171" });',
      'if (SZGame2D.touches(jogador, inimigo)) {',
      '  SZGame2D.playSound(440, 100);',
      '}',
      'if (SZGame2D.keyDown("ArrowUp")) {',
      '  SZGame2D.playSound(880, 80);',
      '}',
    ].join('\n')
    const out = bridgeCycleJS(js)
    expect(out).toContain('SZGame2D.touches(jogador, inimigo)')
    expect(out).toContain('SZGame2D.keyDown("ArrowUp")')
    expect(out).not.toContain('rawJS')
  })
})
