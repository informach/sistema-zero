import { beforeAll, describe, expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import { compileStatements } from '#generators'
import { behaviorStatements, type JSStatement, normalizeSZIR } from '#ir'
import 'blockly/blocks'
import { registerExtensionBlocks } from '../../../blockly/blocks'
import { buildIRFromWorkspace } from '../../../blockly/buildIR'
import { ensureBlocklyInitialized } from '../../../blockly/setup'
import { buildWorkspaceStateFromIR } from '../../../blockly/workspaceState'
import { parseJS } from '../../../parsers/js'
import { collectTypes, DINO_CORREDOR_SOURCE as SOURCE, stripIds } from '../__gen_dinoCorredor'
import { gameTwoDBlocks } from '../blocks'
import { dinoCorredorExample } from '../examples'
import { gameTwoDManifest } from '../manifest'

/**
 * Drift do exemplo "Dino Corredor" — o degrau BÁSICO da família Clear Code. A
 * IR embutida em examples/clearcode.ts foi GERADA pelo parser real a partir do
 * SOURCE (que mora no __gen_dinoCorredor.ts, importado aqui para que fonte e
 * teste NUNCA possam divergir — duas cópias do fonte é como um drift passa
 * despercebido). O preparo do palco (setupStage + setStageDescription) não faz
 * parte do SOURCE: quem o injeta é o wrapper `beginnerGameExample`, e a dupla é
 * conferida à parte.
 */

/** O mesmo contrato de ciclo de vida dos exemplos, com a extensão game-2d. */
function parseExampleLifecycleSource(source: string): JSStatement[] {
  const normalized = normalizeSZIR({
    html: [],
    css: [],
    js: parseJS(source),
    extensions: [{ extensionId: 'game-2d' }],
  })
  // O parser representa alguns campos opcionais ausentes como `undefined`.
  // Uma IR persistida é JSON e, portanto, não guarda essas chaves.
  return JSON.parse(JSON.stringify(behaviorStatements(normalized))) as JSStatement[]
}

beforeAll(() => {
  ensureBlocklyInitialized()
  registerExtensionBlocks(gameTwoDBlocks)
})

describe('Exemplo Dino Corredor — drift contra o parser real', () => {
  it('está registrado no manifest e é da extensão game-2d', () => {
    expect(gameTwoDManifest.examples).toContain(dinoCorredorExample)
    expect(dinoCorredorExample.ir.extensions).toEqual([{ extensionId: 'game-2d' }])
    expect(dinoCorredorExample.name).toBe('Dino Corredor')
    expect(dinoCorredorExample.experience).toBe('game')
  })

  it('parseJS(SOURCE) ≡ IR embutida (zero rawJS/memberCall), fora a dupla do wrapper', () => {
    const parsed = stripIds(parseExampleLifecycleSource(SOURCE))
    const types = collectTypes(parsed)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('memberCall')).toBe(false)

    const embedded = stripIds(behaviorStatements(dinoCorredorExample.ir)) as JSStatement[]
    // As duas primeiras posições são o preparo injetado pelo beginnerGameExample
    // (palco do canvas + descrição acessível = a description do cartão).
    expect(embedded[0]).toEqual({
      type: 'g2d:setupStage',
      width: 480,
      height: 270,
      bg: '#bdf4ff',
    } as JSStatement)
    expect(embedded[1]).toEqual({
      type: 'g2d:setStageDescription',
      description: dinoCorredorExample.description ?? '',
    } as JSStatement)
    expect(parsed).toEqual(embedded.slice(2))
  })

  it('exercita a mecânica prometida do degrau básico', () => {
    const types = collectTypes(behaviorStatements(dinoCorredorExample.ir))
    for (const t of [
      'g2d:setHitboxScale', // ⭐ a colisão PERDOADORA (dial Clear Code) no dino
      'g2d:createDino', // o dino do kit (100% procedural)
      'g2d:controlDino', // pulo com espaço (gravidade + impulso, sem pulo duplo)
      'g2d:forest', // o cenário de floresta do kit
      'g2d:spawnObstacle', // cactos na borda direita
      'g2d:randomBetween', // posição/velocidade levemente sorteadas
      'g2d:pruneOffscreen', // limpar quem saiu da tela
      'g2d:everySeconds', // raízes periódicas (spawn, +1 ponto/s, acelerar)
      'g2d:drawScore', // o placar no HUD
      'g2d:playFx', // som no pulo e no game over
      'g2d:setScene', // telas: início → jogando → perdeu
      'g2d:sceneIs',
      'g2d:showScreen',
      'g2d:restart',
    ]) {
      expect(types.has(t)).toBe(true)
    }
    // A colisão perdoadora usa ~80% (a vitrine do dial de dificuldade).
    const raw = JSON.stringify(behaviorStatements(dinoCorredorExample.ir))
    expect(raw).toContain('"type":"g2d:setHitboxScale","spriteVar":"dino"')
    expect(raw).toContain('"fx":"jump"')
    expect(raw).toContain('"fx":"gameover"')
  })

  it('as cadências são raízes periódicas próprias, com o "se a tela atual é jogando?" dentro', () => {
    const periodicRoots = dinoCorredorExample.ir.behavior.loops.filter(
      (statement): statement is Extract<JSStatement, { type: 'g2d:everySeconds' }> =>
        statement.type === 'g2d:everySeconds',
    )
    expect(periodicRoots.length).toBe(3)
    for (const root of periodicRoots) {
      expect(root.body[0]).toMatchObject({
        type: 'if',
        cond: { type: 'g2d:sceneIs', name: 'jogando' },
      })
    }
    // Nenhuma cadência escondida dentro do "a cada quadro".
    const frameLoop = dinoCorredorExample.ir.behavior.loops.find(
      (statement) => statement.type === 'g2d:updateEachFrame',
    )
    expect(frameLoop).toBeDefined()
    expect(collectTypes(frameLoop).has('g2d:everySeconds')).toBe(false)
  })

  it('nenhum texto visível usa travessão', () => {
    expect(JSON.stringify(dinoCorredorExample.ir)).not.toContain('—')
    expect(dinoCorredorExample.name).not.toContain('—')
    expect(dinoCorredorExample.description ?? '').not.toContain('—')
  })

  it('fixpoint textual: gerar → parsear → gerar é byte-estável', () => {
    const code1 = compileStatements(
      stripIds(behaviorStatements(dinoCorredorExample.ir)) as JSStatement[],
      0,
    )
    const reparsed = stripIds(parseJS(code1)) as JSStatement[]
    const code2 = compileStatements(reparsed, 0)
    expect(code2).toBe(code1)
  })

  it('round-trip por blocos: IR → workspace → IR preserva o jogo inteiro', () => {
    const state = buildWorkspaceStateFromIR(
      dinoCorredorExample.ir as Parameters<typeof buildWorkspaceStateFromIR>[0],
    )
    const ws = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
      const rebuilt = behaviorStatements(buildIRFromWorkspace(ws))
      const embedded = behaviorStatements(dinoCorredorExample.ir)
      expect(collectTypes(rebuilt).has('rawJS')).toBe(false)
      expect(rebuilt.length).toBe(embedded.length)
      // Igualdade SEMÂNTICA via código canônico: tolera plain-número × num-expr
      // (campo × soquete), mas qualquer bloco perdido ou trocado muda o texto.
      expect(compileStatements(stripIds(rebuilt) as JSStatement[], 0)).toBe(
        compileStatements(stripIds(embedded) as JSStatement[], 0),
      )
    } finally {
      ws.dispose()
    }
  })
})
