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
import { ESCALADA_PROFISSIONAL_SOURCE as SOURCE } from '../__gen_escaladaProfissional'
import { gameKitBlocks } from '../blocks'
import { escaladaProfissionalExample } from '../examples'
import { gameKitManifest } from '../manifest'

/**
 * Drift do exemplo "Escalada do Guerreiro Profissional" — o vertical-platformer
 * do Chris Courses sobre o 🏃 Kit Plataforma do motor avançado. A IR embutida em
 * examples/ foi GERADA pelo parser real a partir do SOURCE (que mora no
 * __gen_escaladaProfissional.ts, importado aqui para que fonte e teste NUNCA
 * possam divergir — duas cópias do fonte é como um drift passa despercebido).
 *
 * O jogo NÃO tem "A cada N segundos", então não passa pelo
 * withIndependentPeriodicLoops (a fase é montada inteira no "Ao iniciar").
 */

beforeAll(() => {
  ensureBlocklyInitialized()
  registerExtensionBlocks(gameKitBlocks)
})

describe('Exemplo Escalada do Guerreiro Profissional — drift contra o parser real', () => {
  it('está registrado no manifest e é da extensão game-2d-advanced', () => {
    expect(gameKitManifest.examples).toContain(escaladaProfissionalExample)
    expect(escaladaProfissionalExample.ir.extensions).toEqual([{ extensionId: 'game-2d-advanced' }])
    expect(escaladaProfissionalExample.name).toBe('Escalada do Guerreiro Profissional')
    expect(escaladaProfissionalExample.experience).toBe('game')
  })

  it('parseJS(SOURCE) ≡ IR embutida (zero rawJS/memberCall)', () => {
    const parsed = stripIds(parseExampleLifecycleSource(SOURCE, true))
    const types = collectTypes(parsed)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('memberCall')).toBe(false)
    expect(parsed).toEqual(
      stripIds(behaviorStatements(escaladaProfissionalExample.ir)) as JSStatement[],
    )
  })

  it('usa a arquitetura do Kit Plataforma: pulo gostoso, chão sólido e tábua one-way', () => {
    const types = collectTypes(behaviorStatements(escaladaProfissionalExample.ir))
    for (const t of [
      'gk:platformerHero', // o pulo gostoso (coyote/buffer/pulo variável)
      'gk:setJumpFeel',
      'gk:collideGroup', // o chão sólido (collisionBlocks do original)
      'gk:oneWayPlatform', // a tábua que se atravessa por baixo (platform one-way)
      'gk:dropThrough',
      'gk:platformerAnim',
      'gk:defineMold', // chão e tábua são DADOS, não personagens à mão
      'gk:defineLook', // visual 100% desenhado por código, sem assets
      'gk:spawnFromMold', // a torre inteira é montada com moldes
    ]) {
      expect(types.has(t)).toBe(true)
    }
    expect(escaladaProfissionalExample.assets ?? []).toHaveLength(0)
  })

  it('câmera que sobe + renascer no checkpoint + a bandeira no topo', () => {
    const types = collectTypes(behaviorStatements(escaladaProfissionalExample.ir))
    for (const t of [
      'gk:cameraFollow', // a câmera acompanha o herói subindo (shouldPanCamera do original)
      'gk:setCheckpoint', // o lugar de renascer
      'gk:respawn', // cair no buraco reposiciona
      'gk:defineRegion', // a bandeira no topo
      'gk:isInside', // ...chegou = vitória
      'gk:setState',
      'gk:drawShadow',
    ]) {
      expect(types.has(t)).toBe(true)
    }
    const raw = JSON.stringify(behaviorStatements(escaladaProfissionalExample.ir))
    // A câmera segue num mundo mais ALTO que a tela (1500 > 540).
    expect(raw).toContain('"type":"gk:cameraFollow"')
    expect(raw).toContain('"h":{"type":"num","value":1500}')
  })

  it('recorde persistente: a maior altura fica guardada', () => {
    const statements = behaviorStatements(escaladaProfissionalExample.ir)
    const types = collectTypes(statements)
    for (const t of ['gk:saveValue', 'gk:savedValue']) {
      expect(types.has(t)).toBe(true)
    }
    const raw = JSON.stringify(statements)
    expect(raw).toContain('"recorde"') // o valor salvo tem nome estável
    expect(raw).toContain('"altura"') // a altura é variável e sobe conforme o herói
  })

  it('não mistura kits: zero RPG/monstrinhos/luta e zero blocos do Jogo 2D básico', () => {
    const types = collectTypes(behaviorStatements(escaladaProfissionalExample.ir))
    for (const type of types) {
      expect(type.startsWith('gk:rpg')).toBe(false)
      expect(type.startsWith('gk:pkm')).toBe(false)
      expect(type.startsWith('gk:luta')).toBe(false)
      expect(type.startsWith('gk:td')).toBe(false)
      expect(type.startsWith('g2d:')).toBe(false)
    }
  })

  it('textos visíveis sem travessão', () => {
    expect(JSON.stringify(escaladaProfissionalExample.ir)).not.toContain('—')
    expect(escaladaProfissionalExample.description ?? '').not.toContain('—')
    expect((escaladaProfissionalExample.description ?? '').length).toBeLessThanOrEqual(200)
  })

  it('fixpoint textual: gerar → parsear → gerar é byte-estável', () => {
    const code1 = compileStatements(
      stripIds(behaviorStatements(escaladaProfissionalExample.ir)) as JSStatement[],
      0,
    )
    const reparsed = stripIds(parseJS(code1)) as JSStatement[]
    const code2 = compileStatements(reparsed, 0)
    expect(code2).toBe(code1)
  })

  it('round-trip por blocos: IR → workspace → IR devolve a mesma IR', () => {
    const state = buildWorkspaceStateFromIR(
      escaladaProfissionalExample.ir as Parameters<typeof buildWorkspaceStateFromIR>[0],
    )
    const ws = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
      const rebuilt = stripIds(behaviorStatements(buildIRFromWorkspace(ws)))
      expect(rebuilt).toEqual(stripIds(behaviorStatements(escaladaProfissionalExample.ir)))
    } finally {
      ws.dispose()
    }
  })
})
