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
import { CHEFAO_SOURCE as SOURCE } from '../__gen_chefao'
import { gameKit3DBlocks } from '../blocks'
import { chefaoDasSombrasExample } from '../examples'
import { parseExampleLifecycleSource } from './exampleLifecycleSource'
import { collectTypes, stripIds } from './testUtils'

/**
 * Drift do exemplo "O Chefão das Sombras" (v0.9.0) — a vitrine do gênero CHEFÃO:
 * a FSM do kit em 3 FASES trocadas por "quando levar dano" (onHurt) lendo a
 * própria vida, o ANEL de tiros (spawnRing) e a cura entre fases (heal). A IR
 * embutida em examples.ts foi GERADA pelo parser real a partir do SOURCE (que
 * mora no __gen_chefao.ts, importado aqui para que fonte e teste NUNCA divirjam).
 */

beforeAll(() => {
  ensureBlocklyInitialized()
  registerExtensionBlocks(gameKit3DBlocks)
})

describe('Exemplo O Chefão das Sombras — drift contra o parser real', () => {
  it('está registrado no manifest e é da extensão game-3d-advanced', () => {
    expect(gameKit3DExamples).toContain(chefaoDasSombrasExample)
    expect(chefaoDasSombrasExample.ir.extensions).toEqual([{ extensionId: 'game-3d-advanced' }])
  })

  it('parseJS(SOURCE) ≡ IR embutida (zero rawJS/memberCall)', () => {
    const parsed = stripIds(parseExampleLifecycleSource(SOURCE)) as JSStatement[]
    const types = collectTypes(parsed)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('memberCall')).toBe(false)
    expect(parsed).toEqual(
      stripIds(behaviorStatements(chefaoDasSombrasExample.ir)) as JSStatement[],
    )
  })

  it('exercita os 3 blocos novos do gênero chefão', () => {
    const types = collectTypes(behaviorStatements(chefaoDasSombrasExample.ir))
    for (const t of [
      'g3k:onHurt', // reagir a dano → trocar de fase lendo a própria vida
      'g3k:spawnRing', // o anel de tiros (bullet-hell na unha)
      'g3k:heal', // curar entre fases (o simétrico do machucar)
      'g3k:healthOf', // a leitura que decide a fase
      'g3k:maxHealthOf',
    ]) {
      expect(types.has(t)).toBe(true)
    }
  })

  it('⭐ o acaso do exemplo passa TODO pelo sorteio do kit (a semente não pode mentir)', () => {
    const types = collectTypes(behaviorStatements(chefaoDasSombrasExample.ir))
    expect(types.has('randomInt')).toBe(false)
    expect(types.has('randomFloat')).toBe(false)
    expect(JSON.stringify(behaviorStatements(chefaoDasSombrasExample.ir))).not.toContain(
      'Math.random',
    )
  })

  it('nenhum texto visível usa travessão', () => {
    expect(JSON.stringify(chefaoDasSombrasExample.ir)).not.toContain('—')
    expect(chefaoDasSombrasExample.name).not.toContain('—')
    expect(chefaoDasSombrasExample.description ?? '').not.toContain('—')
  })

  it('fixpoint textual: gerar → parsear → gerar é byte-estável', () => {
    const code1 = compileStatements(
      stripIds(behaviorStatements(chefaoDasSombrasExample.ir)) as JSStatement[],
      0,
    )
    const reparsed = stripIds(parseJS(code1)) as JSStatement[]
    const code2 = compileStatements(reparsed, 0)
    expect(code2).toBe(code1)
  })

  it('round-trip por blocos: IR → workspace → IR devolve a mesma IR', () => {
    const state = buildWorkspaceStateFromIR(
      chefaoDasSombrasExample.ir as Parameters<typeof buildWorkspaceStateFromIR>[0],
    )
    const ws = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
      const rebuilt = stripIds(behaviorStatements(buildIRFromWorkspace(ws)))
      expect(rebuilt).toEqual(stripIds(behaviorStatements(chefaoDasSombrasExample.ir)))
    } finally {
      ws.dispose()
    }
  })
})

import { gameKit3DExamples } from '../exampleCatalog'
