import { beforeAll, describe, expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import { compileStatements } from '#generators'
import { behaviorStatements, type JSStatement } from '#ir'
import { collectTypes, parseExampleLifecycleSource, stripIds } from './exampleContractHarness'
import 'blockly/blocks'
import { registerExtensionBlocks } from '../../../blockly/blocks'
import { buildIRFromWorkspace } from '../../../blockly/buildIR'
import { ensureBlocklyInitialized } from '../../../blockly/setup'
import { buildWorkspaceStateFromIR } from '../../../blockly/workspaceState'
import { parseJS } from '../../../parsers/js'
import { HEROI_QUE_EVOLUI_PROFISSIONAL_SOURCE as SOURCE } from '../__gen_heroiQueEvoluiProfissional'
import { gameKitBlocks } from '../blocks'
import { heroiQueEvoluiProfissionalExample } from '../examples'

/**
 * Drift do exemplo "Herói que Evolui Profissional" — o nível 2 da família Zelda
 * (Clear Code) sobre o motor avançado. Reusa o combate do Vila Ninja e acrescenta
 * o EXP + menu de melhoria. A IR embutida foi GERADA pelo parser real a partir do
 * SOURCE (que mora no __gen_heroiQueEvoluiProfissional.ts, importado aqui).
 */

beforeAll(() => {
  ensureBlocklyInitialized()
  registerExtensionBlocks(gameKitBlocks)
})

describe('Exemplo Herói que Evolui Profissional — drift contra o parser real', () => {
  it('está registrado no manifest e é da extensão game-2d-advanced', () => {
    expect(gameKitExamples).toContain(heroiQueEvoluiProfissionalExample)
    expect(heroiQueEvoluiProfissionalExample.ir.extensions).toEqual([
      { extensionId: 'game-2d-advanced' },
    ])
    expect(heroiQueEvoluiProfissionalExample.name).toBe('Herói que Evolui Profissional')
    expect(heroiQueEvoluiProfissionalExample.experience).toBe('game')
  })

  it('parseJS(SOURCE) ≡ IR embutida (zero rawJS/memberCall)', () => {
    const parsed = stripIds(parseExampleLifecycleSource(SOURCE, true))
    const types = collectTypes(parsed)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('memberCall')).toBe(false)
    expect(parsed).toEqual(
      stripIds(behaviorStatements(heroiQueEvoluiProfissionalExample.ir)) as JSStatement[],
    )
  })

  it('REUSA o combate do Vila Ninja: câmera, FSM de inimigo, golpe direcional, i-frames', () => {
    const types = collectTypes(behaviorStatements(heroiQueEvoluiProfissionalExample.ir))
    for (const t of [
      'gk:cameraFollowMap', // mundo maior que a tela
      'gk:createEmptyTilemap',
      'gk:startSpawner', // ondas de monstros
      'gk:attackFacing', // golpe na direção que olha
      'gk:didHit',
      'gk:entityState', // FSM por entidade (parado/andando/golpe)
      'gk:setEntityState',
      'gk:distanceBetween',
      'gk:seek',
      'gk:hurt',
      'gk:knockback',
      'gk:isInvincible',
      'gk:drawHearts',
    ]) {
      expect(types.has(t)).toBe(true)
    }
    expect(heroiQueEvoluiProfissionalExample.assets ?? []).toHaveLength(0)
  })

  it('O DIFERENCIAL: EXP + subir de nível + MENU DE MELHORIA (rpgMenu)', () => {
    const statements = behaviorStatements(heroiQueEvoluiProfissionalExample.ir)
    const types = collectTypes(statements)
    for (const t of ['gk:rpgMenu', 'gk:rpgOption', 'gk:setState', 'gk:drawBar']) {
      expect(types.has(t)).toBe(true)
    }
    const raw = JSON.stringify(statements)
    // subir de nível quando a EXP enche (exp >= nivel * 3)
    expect(raw).toContain(
      '"op":">=","left":{"type":"var","name":"exp"},"right":{"type":"binop","op":"*","left":{"type":"var","name":"nivel"},"right":{"type":"num","value":3}}',
    )
    // o menu tem as 3 melhorias que mexem em dano, alcance e rapidez
    expect(raw).toContain(
      '"name":"dano","value":{"type":"binop","op":"+","left":{"type":"var","name":"dano"},"right":{"type":"num","value":6}}',
    )
    expect(raw).toContain(
      '"name":"alcance","value":{"type":"binop","op":"+","left":{"type":"var","name":"alcance"},"right":{"type":"num","value":12}}',
    )
    expect(raw).toContain('"name":"rapidez"')
    // vencer é chegar ao nível 6
    expect(raw).toContain(
      '"op":">=","left":{"type":"var","name":"nivel"},"right":{"type":"num","value":6}',
    )
  })

  it('não mistura o Jogo 2D básico e não tem batalha pkm', () => {
    const types = collectTypes(behaviorStatements(heroiQueEvoluiProfissionalExample.ir))
    for (const type of types) {
      expect(type.startsWith('gk:pkm')).toBe(false)
      expect(type.startsWith('g2d:')).toBe(false)
    }
  })

  it('textos visíveis sem travessão', () => {
    expect(JSON.stringify(heroiQueEvoluiProfissionalExample.ir)).not.toContain('—')
    expect(heroiQueEvoluiProfissionalExample.description ?? '').not.toContain('—')
    expect((heroiQueEvoluiProfissionalExample.description ?? '').length).toBeLessThanOrEqual(230)
  })

  it('fixpoint textual: gerar → parsear → gerar é byte-estável', () => {
    const code1 = compileStatements(
      stripIds(behaviorStatements(heroiQueEvoluiProfissionalExample.ir)) as JSStatement[],
      0,
    )
    const reparsed = stripIds(parseJS(code1)) as JSStatement[]
    const code2 = compileStatements(reparsed, 0)
    expect(code2).toBe(code1)
  })

  it('round-trip por blocos: IR → workspace → IR devolve a mesma IR', () => {
    const state = buildWorkspaceStateFromIR(
      heroiQueEvoluiProfissionalExample.ir as Parameters<typeof buildWorkspaceStateFromIR>[0],
    )
    const ws = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
      const rebuilt = stripIds(behaviorStatements(buildIRFromWorkspace(ws)))
      expect(rebuilt).toEqual(stripIds(behaviorStatements(heroiQueEvoluiProfissionalExample.ir)))
    } finally {
      ws.dispose()
    }
  })
})

import { gameKitExamples } from '../exampleCatalog'
