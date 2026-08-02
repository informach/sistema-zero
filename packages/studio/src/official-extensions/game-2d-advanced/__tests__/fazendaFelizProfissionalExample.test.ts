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
import { FAZENDA_FELIZ_PROFISSIONAL_SOURCE as SOURCE } from '../__gen_fazendaFelizProfissional'
import { gameKitBlocks } from '../blocks'
import { fazendaFelizProfissionalExample } from '../examples'
import { gameKitManifest } from '../manifest'

/**
 * Drift do exemplo "Fazenda Feliz Profissional" — o nível 2 da família farming
 * (Clear Code) sobre o motor avançado. A IR embutida foi GERADA pelo parser real
 * a partir do SOURCE (que mora no __gen_fazendaFelizProfissional.ts, importado
 * aqui para que fonte e teste NUNCA possam divergir).
 */

beforeAll(() => {
  ensureBlocklyInitialized()
  registerExtensionBlocks(gameKitBlocks)
})

describe('Exemplo Fazenda Feliz Profissional — drift contra o parser real', () => {
  it('está registrado no manifest e é da extensão game-2d-advanced', () => {
    expect(gameKitManifest.examples).toContain(fazendaFelizProfissionalExample)
    expect(fazendaFelizProfissionalExample.ir.extensions).toEqual([
      { extensionId: 'game-2d-advanced' },
    ])
    expect(fazendaFelizProfissionalExample.name).toBe('Fazenda Feliz Profissional')
    expect(fazendaFelizProfissionalExample.experience).toBe('game')
  })

  it('parseJS(SOURCE) ≡ IR embutida (zero rawJS/memberCall)', () => {
    const parsed = stripIds(parseExampleLifecycleSource(SOURCE, true))
    const types = collectTypes(parsed)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('memberCall')).toBe(false)
    expect(parsed).toEqual(
      stripIds(behaviorStatements(fazendaFelizProfissionalExample.ir)) as JSStatement[],
    )
  })

  it('mundo com câmera + ferramentas + o ciclo do dia (o que o motor avançado traz)', () => {
    const types = collectTypes(behaviorStatements(fazendaFelizProfissionalExample.ir))
    for (const t of [
      'gk:cameraFollow', // a fazenda rola atrás do fazendeiro
      'gk:createCharacter',
      'gk:moveWithKeys',
      'gk:keepOnScreen',
      'gk:keyPressed', // Q troca ferramenta, Espaço usa, C dorme, V vende
      'gk:floatText', // o "+1" da colheita
      'gk:rpgMenu', // a LOJA para vender
      'gk:rpgOption',
      'gk:setState', // vencer leva ao estado "vitoria"
      'gk:defineLook',
    ]) {
      expect(types.has(t)).toBe(true)
    }
    expect(fazendaFelizProfissionalExample.assets ?? []).toHaveLength(0)
  })

  it('o MODELO dos canteiros é uma LISTA do núcleo (só cresce quem foi regado)', () => {
    const statements = behaviorStatements(fazendaFelizProfissionalExample.ir)
    const types = collectTypes(statements)
    for (const t of ['array', 'arrayPush', 'index', 'indexSet', 'forRange']) {
      expect(types.has(t)).toBe(true)
    }
    const raw = JSON.stringify(statements)
    // dormir só amadurece o canteiro plantado (2) que está MOLHADO (1)
    expect(raw).toContain('"arrayVar":"molhado"')
    // trocar ferramenta cicla por 3 (o % 3)
    expect(raw).toContain(
      '"op":"%","left":{"type":"binop","op":"+","left":{"type":"var","name":"ferramenta"},"right":{"type":"num","value":1}},"right":{"type":"num","value":3}',
    )
    // vender a colheita soma moedas (colheita * 5)
    expect(raw).toContain(
      '"name":"moedas","value":{"type":"binop","op":"+","left":{"type":"var","name":"moedas"},"right":{"type":"binop","op":"*","left":{"type":"var","name":"colheita"},"right":{"type":"num","value":5}}}',
    )
  })

  it('não mistura o Jogo 2D básico e não tem batalha pkm/luta', () => {
    const types = collectTypes(behaviorStatements(fazendaFelizProfissionalExample.ir))
    for (const type of types) {
      expect(type.startsWith('gk:pkm')).toBe(false)
      expect(type.startsWith('gk:luta')).toBe(false)
      expect(type.startsWith('g2d:')).toBe(false)
    }
  })

  it('textos visíveis sem travessão', () => {
    expect(JSON.stringify(fazendaFelizProfissionalExample.ir)).not.toContain('—')
    expect(fazendaFelizProfissionalExample.description ?? '').not.toContain('—')
    expect((fazendaFelizProfissionalExample.description ?? '').length).toBeLessThanOrEqual(230)
  })

  it('fixpoint textual: gerar → parsear → gerar é byte-estável', () => {
    const code1 = compileStatements(
      stripIds(behaviorStatements(fazendaFelizProfissionalExample.ir)) as JSStatement[],
      0,
    )
    const reparsed = stripIds(parseJS(code1)) as JSStatement[]
    const code2 = compileStatements(reparsed, 0)
    expect(code2).toBe(code1)
  })

  it('round-trip por blocos: IR → workspace → IR devolve a mesma IR', () => {
    const state = buildWorkspaceStateFromIR(
      fazendaFelizProfissionalExample.ir as Parameters<typeof buildWorkspaceStateFromIR>[0],
    )
    const ws = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
      const rebuilt = stripIds(behaviorStatements(buildIRFromWorkspace(ws)))
      expect(rebuilt).toEqual(stripIds(behaviorStatements(fazendaFelizProfissionalExample.ir)))
    } finally {
      ws.dispose()
    }
  })
})
