import { beforeAll, describe, expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import { compileStatements } from '#generators'
import { behaviorStatements, type JSStatement, SZIRV2Schema } from '#ir'
import 'blockly/blocks'
import { registerExtensionBlocks } from '../../../blockly/blocks'
import { buildIRFromWorkspace } from '../../../blockly/buildIR'
import { ensureBlocklyInitialized } from '../../../blockly/setup'
import { buildWorkspaceStateFromIR } from '../../../blockly/workspaceState'
import { parseJS } from '../../../parsers/js'
import { collectTypes, stripIds } from '../../game-3d-advanced/exampleSourceUtils'
import { REINO_COGUMELO_SOURCE as SOURCE } from '../__gen_reinoCogumelo'
import { gameThreeDBlocks } from '../blocks'
import { gameThreeDExamples } from '../exampleCatalog'
import { reinoCogumeloExample } from '../examples'
import { FASES_REINO_COGUMELO } from '../stagesReinoCogumelo'
import { parseExampleLifecycleSource } from './exampleLifecycleSource'

/**
 * Drift do exemplo "Reino Cogumelo" — o jogo de correr e pular com as 32 fases,
 * montado sobre o Kit Plataforma. A IR embutida em examples.ts foi GERADA pelo
 * parser real a partir do SOURCE (que mora no __gen_reinoCogumelo.ts, importado
 * aqui para que fonte e teste NUNCA possam divergir).
 */

beforeAll(() => {
  ensureBlocklyInitialized()
  registerExtensionBlocks(gameThreeDBlocks)
})

describe('Exemplo Reino Cogumelo — drift contra o parser real', () => {
  it('está registrado no manifest e é da extensão game-3d', () => {
    expect(gameThreeDExamples).toContain(reinoCogumeloExample)
    expect(reinoCogumeloExample.experience).toBe('game')
    expect(reinoCogumeloExample.ir.extensions).toEqual([{ extensionId: 'game-3d' }])
  })

  it('a IR embutida passa no schema (ciclo de vida + escopos)', () => {
    expect(SZIRV2Schema.safeParse(reinoCogumeloExample.ir).success).toBe(true)
  })

  it('nenhum texto visível usa travessão', () => {
    expect(reinoCogumeloExample.name).toBe('Reino Cogumelo')
    expect(reinoCogumeloExample.description ?? '').not.toContain('—')
    expect((reinoCogumeloExample.description ?? '').length).toBeLessThanOrEqual(200)
    expect(JSON.stringify(reinoCogumeloExample.ir.html)).not.toContain('—')
  })

  it('parseJS(SOURCE) ≡ IR embutida (zero rawJS/memberCall)', () => {
    const parsed = stripIds(parseExampleLifecycleSource(SOURCE)) as JSStatement[]
    const types = collectTypes(parsed)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('memberCall')).toBe(false)
    expect(types.has('memberCallExpr')).toBe(false)
    expect(parsed).toEqual(stripIds(behaviorStatements(reinoCogumeloExample.ir)) as JSStatement[])
  })

  it('exercita as mecânicas prometidas do jogo de plataforma', () => {
    const statements = behaviorStatements(reinoCogumeloExample.ir)
    const types = collectTypes(statements)
    for (const t of [
      'g3d:createPlatformScene', // a cena do gênero, já com céu, luz e câmera de lado
      'g3d:createHero', // o personagem, com peso e colisão
      'g3d:stage', // montar a fase e dizer em que mundo/área ela está
      'g3d:stageFrame', // o passo da fase, a câmera travada e a bola de fogo
      'g3d:onStage', // os avisos do jogo (moeda, pisão, bandeira, chefe)
      'g3d:stageAsk', // o placar e o estado da fase
      'g3d:classicPlatformer', // inércia, corrida e pulo de altura variável
      'g3d:keyPressed', // o fogo sai UMA vez por toque, não enquanto segura
      'g3d:animate', // o laço de quadro
      'array', // as 32 fases numa lista
      'index', // e a escolha pelo número da fase
      'funcDecl', // abrirFase() e mostrarPlacar() concentram as regras
      'callFunction',
      // O HUD é HTML por cima do canvas: um só nó carrega o elemento e a escrita.
      'setProperty',
      'if',
    ]) {
      expect(types.has(t), t).toBe(true)
    }
    const raw = JSON.stringify(statements)
    // A troca de fase e o fim de jogo são REGRAS do programa, não do motor.
    expect(raw).toContain('"numeroDaFase"')
    expect(raw).toContain('"venceu"')
    expect(raw).toContain('"perdeu"')
  })

  it('as 32 fases estão na IR, e são as mesmas do módulo de mapas', () => {
    const raw = JSON.stringify(behaviorStatements(reinoCogumeloExample.ir))
    expect(FASES_REINO_COGUMELO).toHaveLength(32)
    for (const mapa of FASES_REINO_COGUMELO) {
      // Uma cópia só do mapa: se alguém editar o exemplo à mão, isto acusa.
      expect(raw).toContain(JSON.stringify(mapa).slice(1, -1))
    }
  })

  it('nenhum asset externo: as texturas nascem do próprio programa', () => {
    // O pedido era um jogo asset-free. Imagem importada entraria por setTexture.
    const types = collectTypes(behaviorStatements(reinoCogumeloExample.ir))
    expect(types.has('g3d:setTexture')).toBe(false)
    expect(reinoCogumeloExample.assets ?? []).toEqual([])
  })

  it('fixpoint textual: gerar → parsear → gerar é byte-estável', () => {
    const code1 = compileStatements(
      stripIds(behaviorStatements(reinoCogumeloExample.ir)) as JSStatement[],
      0,
    )
    const reparsed = stripIds(parseJS(code1)) as JSStatement[]
    const code2 = compileStatements(reparsed, 0)
    expect(code2).toBe(code1)
  })

  it('round-trip por blocos: IR → workspace → IR devolve a mesma IR', () => {
    const state = buildWorkspaceStateFromIR(
      reinoCogumeloExample.ir as Parameters<typeof buildWorkspaceStateFromIR>[0],
    )
    const ws = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
      const rebuilt = stripIds(behaviorStatements(buildIRFromWorkspace(ws)))
      expect(rebuilt).toEqual(stripIds(behaviorStatements(reinoCogumeloExample.ir)))
    } finally {
      ws.dispose()
    }
  })
})
