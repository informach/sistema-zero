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
import { DUELO_DE_HEROIS_PROFISSIONAL_SOURCE as SOURCE } from '../__gen_dueloDeHeroisProfissional'
import { gameKitBlocks } from '../blocks'
import { dueloDeHeroisProfissionalExample } from '../examples'

/**
 * Drift do exemplo "Duelo de Heróis Profissional" — o fighting-game do Chris
 * Courses sobre o 🥊 Kit Luta do motor avançado. A IR embutida em examples/ foi
 * GERADA pelo parser real a partir do SOURCE (que mora no
 * __gen_dueloDeHeroisProfissional.ts, importado aqui para que fonte e teste NUNCA
 * possam divergir — duas cópias do fonte é como um drift passa despercebido).
 *
 * O jogo NÃO tem "A cada N segundos", então não passa pelo
 * withIndependentPeriodicLoops (a partida vem por lutaMatch/luta:acabou).
 */

beforeAll(() => {
  ensureBlocklyInitialized()
  registerExtensionBlocks(gameKitBlocks)
})

describe('Exemplo Duelo de Heróis Profissional — drift contra o parser real', () => {
  it('está registrado no manifest e é da extensão game-2d-advanced', () => {
    expect(gameKitExamples).toContain(dueloDeHeroisProfissionalExample)
    expect(dueloDeHeroisProfissionalExample.ir.extensions).toEqual([
      { extensionId: 'game-2d-advanced' },
    ])
    expect(dueloDeHeroisProfissionalExample.name).toBe('Duelo de Heróis Profissional')
    expect(dueloDeHeroisProfissionalExample.experience).toBe('game')
  })

  it('parseJS(SOURCE) ≡ IR embutida (zero rawJS/memberCall)', () => {
    const parsed = stripIds(parseExampleLifecycleSource(SOURCE, true))
    const types = collectTypes(parsed)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('memberCall')).toBe(false)
    expect(parsed).toEqual(
      stripIds(behaviorStatements(dueloDeHeroisProfissionalExample.ir)) as JSStatement[],
    )
  })

  it('usa a arquitetura do Kit Luta: partida, lutadores, golpes e HUD', () => {
    const types = collectTypes(behaviorStatements(dueloDeHeroisProfissionalExample.ir))
    for (const t of [
      'gk:lutaMatch', // a melhor de N rounds (o determineWinner do original)
      'gk:lutaFighter', // andar/pular/agachar/defender (o keys.a/d + velocity do original)
      'gk:lutaMove', // os golpes com dano/alcance
      'gk:lutaAttack', // disparar o golpe (o attack() do original)
      'gk:lutaWinner', // quem venceu, escrito na tela de fim
      'gk:lutaDrawHud', // as duas barras de vida + o relógio
      'gk:createCharacter', // os dois heróis são personagens
      'gk:defineMold', // o chão é um molde (o kit não tem chão)
      'gk:defineLook', // visual 100% desenhado por código, sem assets
      'gk:spawnFromMold', // o chão nasce por molde
      'gk:collideGroup', // os heróis pousam no chão
    ]) {
      expect(types.has(t)).toBe(true)
    }
    expect(dueloDeHeroisProfissionalExample.assets ?? []).toHaveLength(0)
  })

  it('dois jogadores humanos: cada herói tem seus próprios controles e golpes', () => {
    const raw = JSON.stringify(behaviorStatements(dueloDeHeroisProfissionalExample.ir))
    // Jogador 1 no teclado (A/D anda, W pula, S agacha, F defende).
    expect(raw).toContain('"left":"a"')
    expect(raw).toContain('"right":"d"')
    expect(raw).toContain('"guard":"f"')
    // Jogador 2 nas setas (sem IA) — o parser guarda os apelidos de tecla.
    expect(raw).toContain('"left":"seta esquerda"')
    expect(raw).toContain('"right":"seta direita"')
    // Cada golpe é disparado por uma tecla própria (o keyPressed → lutaAttack).
    expect(raw).toContain('"type":"gk:keyPressed"')
    // Especial atravessa a defesa E é de barra cheia (pierce + special).
    expect(raw).toContain('"pierce":true,"special":true')
    // Sem IA neste duelo: é humano contra humano.
    const types = collectTypes(behaviorStatements(dueloDeHeroisProfissionalExample.ir))
    expect(types.has('gk:lutaAI')).toBe(false)
  })

  it('o fim de jogo escreve o vencedor pelo event bus (luta:acabou)', () => {
    const statements = behaviorStatements(dueloDeHeroisProfissionalExample.ir)
    const types = collectTypes(statements)
    for (const t of ['gk:onEvent', 'gk:setScreenText', 'gk:playEffect']) {
      expect(types.has(t)).toBe(true)
    }
    const raw = JSON.stringify(statements)
    expect(raw).toContain('luta:acabou')
    // O texto de fim concatena o vencedor lido do kit.
    expect(raw).toContain('"type":"gk:lutaWinner"')
  })

  it('não mistura kits: zero RPG/monstrinhos/defesa e zero blocos do Jogo 2D básico', () => {
    const types = collectTypes(behaviorStatements(dueloDeHeroisProfissionalExample.ir))
    for (const type of types) {
      expect(type.startsWith('gk:rpg')).toBe(false)
      expect(type.startsWith('gk:pkm')).toBe(false)
      expect(type.startsWith('gk:td')).toBe(false)
      expect(type.startsWith('gk:nave')).toBe(false)
      expect(type.startsWith('g2d:')).toBe(false)
    }
  })

  it('textos visíveis sem travessão', () => {
    expect(JSON.stringify(dueloDeHeroisProfissionalExample.ir)).not.toContain('—')
    expect(dueloDeHeroisProfissionalExample.description ?? '').not.toContain('—')
    expect((dueloDeHeroisProfissionalExample.description ?? '').length).toBeLessThanOrEqual(200)
  })

  it('fixpoint textual: gerar → parsear → gerar é byte-estável', () => {
    const code1 = compileStatements(
      stripIds(behaviorStatements(dueloDeHeroisProfissionalExample.ir)) as JSStatement[],
      0,
    )
    const reparsed = stripIds(parseJS(code1)) as JSStatement[]
    const code2 = compileStatements(reparsed, 0)
    expect(code2).toBe(code1)
  })

  it('round-trip por blocos: IR → workspace → IR devolve a mesma IR', () => {
    const state = buildWorkspaceStateFromIR(
      dueloDeHeroisProfissionalExample.ir as Parameters<typeof buildWorkspaceStateFromIR>[0],
    )
    const ws = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
      const rebuilt = stripIds(behaviorStatements(buildIRFromWorkspace(ws)))
      expect(rebuilt).toEqual(stripIds(behaviorStatements(dueloDeHeroisProfissionalExample.ir)))
    } finally {
      ws.dispose()
    }
  })
})

import { gameKitExamples } from '../exampleCatalog'
