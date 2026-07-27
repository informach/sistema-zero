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
import { BATALHA_MONSTRINHOS_SOURCE as SOURCE } from '../__gen_batalhaMonstrinhos'
import { collectTypes, stripIds } from '../__gen_dinoCorredor'
import { gameTwoDBlocks } from '../blocks'
import { batalhaMonstrinhosExample } from '../examples'
import { gameTwoDManifest } from '../manifest'

/**
 * Drift do exemplo "Batalha de Monstrinhos" — o degrau BÁSICO da família
 * Pokemon-style Battle (Clear Code). A IR embutida em examples/clearcode.ts
 * foi GERADA pelo parser real a partir do SOURCE (que mora no
 * __gen_batalhaMonstrinhos.ts, importado aqui para que fonte e teste NUNCA
 * possam divergir). O preparo do palco (setupStage + setStageDescription) é
 * injetado pelo wrapper `beginnerGameExample` e conferido à parte.
 */

/** O mesmo contrato de ciclo de vida dos exemplos, com a extensão game-2d. */
function parseExampleLifecycleSource(source: string): JSStatement[] {
  const normalized = normalizeSZIR({
    html: [],
    css: [],
    js: parseJS(source),
    extensions: [{ extensionId: 'game-2d' }],
  })
  return JSON.parse(JSON.stringify(behaviorStatements(normalized))) as JSStatement[]
}

beforeAll(() => {
  ensureBlocklyInitialized()
  registerExtensionBlocks(gameTwoDBlocks)
})

describe('Exemplo Batalha de Monstrinhos — drift contra o parser real', () => {
  it('está registrado no manifest e é da extensão game-2d', () => {
    expect(gameTwoDManifest.examples).toContain(batalhaMonstrinhosExample)
    expect(batalhaMonstrinhosExample.ir.extensions).toEqual([{ extensionId: 'game-2d' }])
    expect(batalhaMonstrinhosExample.name).toBe('Batalha de Monstrinhos')
    expect(batalhaMonstrinhosExample.experience).toBe('game')
  })

  it('parseJS(SOURCE) ≡ IR embutida (zero rawJS/memberCall), fora a dupla do wrapper', () => {
    const parsed = stripIds(parseExampleLifecycleSource(SOURCE))
    const types = collectTypes(parsed)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('memberCall')).toBe(false)

    const embedded = stripIds(behaviorStatements(batalhaMonstrinhosExample.ir)) as JSStatement[]
    expect(embedded[0]).toEqual({
      type: 'g2d:setupStage',
      width: 480,
      height: 300,
      bg: '#28325a',
    } as JSStatement)
    expect(embedded[1]).toEqual({
      type: 'g2d:setStageDescription',
      description: batalhaMonstrinhosExample.description ?? '',
    } as JSStatement)
    expect(parsed).toEqual(embedded.slice(2))
  })

  it('exercita a mecânica prometida do degrau básico', () => {
    const types = collectTypes(behaviorStatements(batalhaMonstrinhosExample.ir))
    for (const t of [
      'g2d:afterSeconds', // ⭐ one-shot: libera os comandos 2s depois do início
      'g2d:everySeconds', // a vez do inimigo é uma raiz periódica própria
      'g2d:defineShape', // monstrinhos 100% desenhados por código
      'g2d:createShapeSprite',
      'g2d:setHealth', // vida dos DOIS lados
      'g2d:changeHealth', // dano e cura (dano negativo)
      'g2d:getHealth', // barras leem a vida real
      'g2d:getMaxHealth',
      'g2d:drawBar', // barra de vida dos dois monstrinhos
      'g2d:drawLabel', // o menu de golpes DESENHADO na tela
      'g2d:healthDepleted', // vida zerada troca a cena
      'g2d:randomChance', // o inimigo sorteia o golpe
      'g2d:randomBetween',
      'g2d:blinkSprite', // feedback no atingido
      'g2d:shake',
      'g2d:playFx',
      'g2d:setScene',
      'g2d:sceneIs',
      'g2d:showScreen',
      'g2d:restart',
      'event', // menu por teclas 1/2/3 = evento GENÉRICO de teclado
      'eventProp',
    ]) {
      expect(types.has(t)).toBe(true)
    }
    // Sem movimento: é uma batalha parada, como no estudo original.
    expect(types.has('g2d:topDown')).toBe(false)
    expect(types.has('g2d:platformer')).toBe(false)
    expect(types.has('g2d:move4')).toBe(false)
  })

  it('menu por teclas: 1/2/3 comparadas com a tecla do evento, opções escritas na tela', () => {
    const raw = JSON.stringify(behaviorStatements(batalhaMonstrinhosExample.ir))
    expect(raw).toContain('"type":"eventProp","prop":"key"')
    for (const key of ['1', '2', '3']) {
      expect(raw).toContain(`{"type":"str","value":"${key}"}`)
    }
    // As opções ficam DESENHADAS (o game-2d não tem menus navegáveis) e os
    // rótulos EXPLICITAM a tabela de vantagem e o teto da cura.
    expect(raw).toContain('1 Faísca (fogo, dano x2 na planta)')
    expect(raw).toContain('2 Jato (água, dano x1)   3 Poção (cura 5, até o máximo)')
  })

  it('tabela de vantagem em ses: fogo x2, água x1, e a poção cura sem passar do máximo', () => {
    const raw = JSON.stringify(behaviorStatements(batalhaMonstrinhosExample.ir))
    // dano = forca * 2 (fogo contra planta) e dano = forca * 1 (água).
    expect(raw).toContain(
      '"op":"*","left":{"type":"var","name":"forca"},"right":{"type":"num","value":2}',
    )
    expect(raw).toContain(
      '"op":"*","left":{"type":"var","name":"forca"},"right":{"type":"num","value":1}',
    )
    // Cura = dano negativo: changeHealth POSITIVO no próprio monstrinho (o
    // runtime clampa no máximo — utilities.ts — e o rótulo da tela avisa).
    expect(raw).toContain(
      '"type":"g2d:changeHealth","spriteVar":"meu","delta":{"type":"num","value":5}',
    )
  })

  it('turnos: afterSeconds é o one-shot de abertura e a vez do inimigo é a raiz periódica', () => {
    const loops = batalhaMonstrinhosExample.ir.behavior.loops
    // ⭐ USO GENUÍNO do afterSeconds: liberar os comandos UMA vez por partida.
    const opening = loops.find(
      (statement): statement is Extract<JSStatement, { type: 'g2d:afterSeconds' }> =>
        statement.type === 'g2d:afterSeconds',
    )
    expect(opening).toBeDefined()
    expect(JSON.stringify(opening)).toContain(
      '"name":"turno","value":{"type":"str","value":"jogador"}',
    )
    // O turno REPETIDO do inimigo NUNCA usa afterSeconds (é one-shot!): é uma
    // raiz "A cada 1,5 segundos" que só age quando turno == "inimigo".
    const enemyTurn = loops.find(
      (statement): statement is Extract<JSStatement, { type: 'g2d:everySeconds' }> =>
        statement.type === 'g2d:everySeconds',
    )
    expect(enemyTurn).toBeDefined()
    expect(enemyTurn?.seconds).toEqual({ type: 'num', value: 1.5 })
    const rawTurn = JSON.stringify(enemyTurn)
    expect(rawTurn).toContain('"type":"var","name":"turno"')
    expect(rawTurn).toContain('{"type":"str","value":"inimigo"}')
    // O golpe do inimigo é sorteado e devolve o turno ao jogador.
    expect(rawTurn).toContain('"type":"g2d:randomChance"')
    expect(rawTurn).toContain('"type":"g2d:randomBetween"')
    expect(rawTurn).toContain('"name":"turno","value":{"type":"str","value":"jogador"}')
    // Nenhuma cadência escondida dentro do "a cada quadro".
    const frameLoop = loops.find((statement) => statement.type === 'g2d:updateEachFrame')
    expect(frameLoop).toBeDefined()
    expect(collectTypes(frameLoop).has('g2d:everySeconds')).toBe(false)
    expect(collectTypes(frameLoop).has('g2d:afterSeconds')).toBe(false)
  })

  it('nenhum texto visível usa travessão', () => {
    expect(JSON.stringify(batalhaMonstrinhosExample.ir)).not.toContain('—')
    expect(batalhaMonstrinhosExample.name).not.toContain('—')
    expect(batalhaMonstrinhosExample.description ?? '').not.toContain('—')
  })

  it('fixpoint textual: gerar → parsear → gerar é byte-estável', () => {
    const code1 = compileStatements(
      stripIds(behaviorStatements(batalhaMonstrinhosExample.ir)) as JSStatement[],
      0,
    )
    const reparsed = stripIds(parseJS(code1)) as JSStatement[]
    const code2 = compileStatements(reparsed, 0)
    expect(code2).toBe(code1)
  })

  it('round-trip por blocos: IR → workspace → IR preserva o jogo inteiro', () => {
    const state = buildWorkspaceStateFromIR(
      batalhaMonstrinhosExample.ir as Parameters<typeof buildWorkspaceStateFromIR>[0],
    )
    const ws = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
      const rebuilt = behaviorStatements(buildIRFromWorkspace(ws))
      const embedded = behaviorStatements(batalhaMonstrinhosExample.ir)
      expect(collectTypes(rebuilt).has('rawJS')).toBe(false)
      expect(rebuilt.length).toBe(embedded.length)
      expect(compileStatements(stripIds(rebuilt) as JSStatement[], 0)).toBe(
        compileStatements(stripIds(embedded) as JSStatement[], 0),
      )
    } finally {
      ws.dispose()
    }
  })
})
