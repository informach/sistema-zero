import * as Blockly from 'blockly/core'
import { compileStatements } from '#generators'
import { behaviorStatements } from '#ir'
import 'blockly/blocks'
import { beforeAll, describe, expect, it } from 'bun:test'
import { parseJS } from '../../parsers/js'
import { buildIRFromWorkspace } from '../buildIR'
import { ensureBlocklyInitialized } from '../setup'
import { buildWorkspaceStateFromIR } from '../workspaceState'

/**
 * Blocos de Tela Cheia (Fullscreen API): entrar/sair/alternar + "está em tela
 * cheia?" + "quando a tela cheia mudar". Ciclo completo da Ponte (só JS, blocos
 * do núcleo): código -> IR -> blocos -> Blockly (live) -> IR -> código.
 */
function bridgeCycleJS(js: string): string {
  const jsIR = parseJS(js)
  const ir = { html: [], css: [], js: jsIR, extensions: [] }
  const state = buildWorkspaceStateFromIR(ir as Parameters<typeof buildWorkspaceStateFromIR>[0])
  const ws = new Blockly.Workspace()
  Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
  const ir2 = buildIRFromWorkspace(ws)
  return compileStatements(behaviorStatements(ir2), 0)
}

describe('Tela cheia (Fullscreen API)', () => {
  beforeAll(() => {
    ensureBlocklyInitialized()
  })

  it('gerador: entrar/sair/alternar emitem o JS esperado', () => {
    expect(compileStatements([{ type: 'requestFullscreen' }], 0)).toContain(
      'document.documentElement.requestFullscreen();',
    )
    expect(compileStatements([{ type: 'exitFullscreen' }], 0)).toContain(
      'document.exitFullscreen();',
    )
    const toggle = compileStatements([{ type: 'toggleFullscreen' }], 0)
    expect(toggle).toContain('if (document.fullscreenElement) {')
    expect(toggle).toContain('document.exitFullscreen();')
    expect(toggle).toContain('document.documentElement.requestFullscreen();')
  })

  it('gerador: "está em tela cheia?" vira document.fullscreenElement != null', () => {
    const out = compileStatements(
      [{ type: 'if', cond: { type: 'isFullscreen' }, then: [{ type: 'exitFullscreen' }] }],
      0,
    )
    expect(out).toContain('if (document.fullscreenElement != null)')
  })

  it('parser: reconhece entrar e sair', () => {
    expect(parseJS('document.documentElement.requestFullscreen();')).toEqual([
      { type: 'requestFullscreen' },
    ])
    expect(parseJS('document.exitFullscreen();')).toEqual([{ type: 'exitFullscreen' }])
  })

  it('parser: reconhece o if/else do "alternar" como toggleFullscreen', () => {
    const js = [
      'if (document.fullscreenElement) {',
      '  document.exitFullscreen();',
      '} else {',
      '  document.documentElement.requestFullscreen();',
      '}',
    ].join('\n')
    expect(parseJS(js)).toEqual([{ type: 'toggleFullscreen' }])
  })

  it('parser: reconhece "está em tela cheia?" dentro de um se', () => {
    expect(
      JSON.stringify(
        parseJS('if (document.fullscreenElement != null) { document.exitFullscreen(); }'),
      ),
    ).toContain('"isFullscreen"')
  })

  it('parser: reconhece o evento fullscreenchange', () => {
    expect(
      parseJS(
        'document.addEventListener("fullscreenchange", (event) => { document.exitFullscreen(); });',
      ),
    ).toEqual([
      {
        type: 'event',
        target: 'document',
        targetKind: 'document',
        event: 'fullscreenchange',
        body: [{ type: 'exitFullscreen' }],
      },
    ])
  })

  it('os 5 blocos sobrevivem ao ciclo blocos<->código (sem rawJS)', () => {
    const js = [
      'document.addEventListener("fullscreenchange", (event) => {',
      '  if (document.fullscreenElement != null) {',
      '    document.exitFullscreen();',
      '  }',
      '});',
      'document.addEventListener("click", (event) => {',
      '  if (document.fullscreenElement) {',
      '    document.exitFullscreen();',
      '  } else {',
      '    document.documentElement.requestFullscreen();',
      '  }',
      '});',
    ].join('\n')
    const out = bridgeCycleJS(js)
    expect(out).toContain('document.addEventListener("fullscreenchange"')
    expect(out).toContain('document.fullscreenElement != null')
    expect(out).toContain('if (document.fullscreenElement) {')
    expect(out).toContain('document.documentElement.requestFullscreen();')
    expect(out).not.toContain('rawJS')
  })
})
