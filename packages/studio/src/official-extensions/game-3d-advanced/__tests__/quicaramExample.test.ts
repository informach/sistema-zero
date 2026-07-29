import { beforeAll, describe, expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import { compileStatements } from '#generators'
import { behaviorStatements, type JSStatement } from '#ir'
import 'blockly/blocks'
import { registerExtensionBlocks } from '../../../blockly/blocks'
import { buildIRFromWorkspace } from '../../../blockly/buildIR'
import { ensureBlocklyInitialized } from '../../../blockly/setup'
import { buildWorkspaceStateFromIR } from '../../../blockly/workspaceState'
import { parseJS } from '../../../parsers/js'
import { QUICARAM_SOURCE as SOURCE } from '../__gen_quicaram'
import { gameKit3DBlocks } from '../blocks'
import { quadraMalucaExample } from '../examples'
import { gameKit3DManifest } from '../manifest'
import { parseExampleLifecycleSource } from './exampleLifecycleSource'
import { collectTypes, stripIds } from './testUtils'

/**
 * Drift do exemplo "Quadra Maluca" — a vitrine dos consertos da v0.4.0: WASD
 * relativo à câmera, tipos de física por molde e quique dos dois lados. A IR
 * embutida em examples.ts foi GERADA pelo parser real a partir do SOURCE (que
 * mora no __gen_quicaram.ts, importado aqui para que fonte e teste NUNCA possam
 * divergir — duas cópias do fonte é como um drift passa despercebido).
 */

beforeAll(() => {
  ensureBlocklyInitialized()
  registerExtensionBlocks(gameKit3DBlocks)
})

describe('Exemplo Quadra Maluca — drift contra o parser real', () => {
  it('está registrado no manifest e é da extensão game-3d-advanced', () => {
    expect(gameKit3DManifest.examples).toContain(quadraMalucaExample)
    expect(quadraMalucaExample.ir.extensions).toEqual([{ extensionId: 'game-3d-advanced' }])
  })

  it('parseJS(SOURCE) ≡ IR embutida (zero rawJS/memberCall)', () => {
    const parsed = stripIds(parseExampleLifecycleSource(SOURCE)) as JSStatement[]
    const types = collectTypes(parsed)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('memberCall')).toBe(false)
    expect(parsed).toEqual(stripIds(behaviorStatements(quadraMalucaExample.ir)) as JSStatement[])
  })

  it('exercita o que a v0.4.0 consertou e ganhou', () => {
    const types = collectTypes(behaviorStatements(quadraMalucaExample.ir))
    for (const t of [
      'g3k:setPhysics', // um bloco por molde: personagem/bola/caixa/gelo
      'g3k:cameraOrbit', // a câmera arrastável — onde o WASD saía torto
      'g3k:cameraLookAt', // olhar uma ENTIDADE (era cravado na origem)
      'g3k:cameraAngle', // girar por código (antes só o mouse mexia)
      'g3k:cameraShake', // tremor no impacto
      'g3k:platformerKeys', // o WASD relativo à câmera
      'g3k:makeTrigger',
      'g3k:onOverlap',
      'g3k:setSeed',
    ]) {
      expect(types.has(t)).toBe(true)
    }
    // Os 4 tipos de física aparecem como CAMPO, não como tipo de nó.
    const raw = JSON.stringify(behaviorStatements(quadraMalucaExample.ir))
    for (const kind of ['"personagem"', '"bola"', '"caixa"', '"gelo"']) {
      expect(raw).toContain(kind)
    }
  })

  it('⭐ NÃO usa quique/atrito na superfície para as bolas quicarem', () => {
    // A prova de que o conserto é real: não há um setBounce sequer no exemplo, e
    // ainda assim as bolas quicam — porque o quique agora é da COISA (via o
    // preset "bola") e combina com o chão. Antes isso era impossível de escrever.
    const types = collectTypes(behaviorStatements(quadraMalucaExample.ir))
    expect(types.has('g3k:setBounce')).toBe(false)
  })

  it('nenhum texto visível usa travessão', () => {
    expect(JSON.stringify(quadraMalucaExample.ir)).not.toContain('—')
    expect(quadraMalucaExample.name).not.toContain('—')
    expect(quadraMalucaExample.description ?? '').not.toContain('—')
  })

  it('fixpoint textual: gerar → parsear → gerar é byte-estável', () => {
    const code1 = compileStatements(
      stripIds(behaviorStatements(quadraMalucaExample.ir)) as JSStatement[],
      0,
    )
    const reparsed = stripIds(parseJS(code1)) as JSStatement[]
    const code2 = compileStatements(reparsed, 0)
    expect(code2).toBe(code1)
  })

  it('round-trip por blocos: IR → workspace → IR devolve a mesma IR', () => {
    const state = buildWorkspaceStateFromIR(
      quadraMalucaExample.ir as Parameters<typeof buildWorkspaceStateFromIR>[0],
    )
    const ws = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
      const rebuilt = stripIds(behaviorStatements(buildIRFromWorkspace(ws)))
      expect(rebuilt).toEqual(stripIds(behaviorStatements(quadraMalucaExample.ir)))
    } finally {
      ws.dispose()
    }
  })
})
