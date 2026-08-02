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
import { A_LENDA_DO_HEROI_SOURCE as SOURCE } from '../__gen_aLendaDoHeroi'
import { gameThreeDBlocks } from '../blocks'
import { aLendaDoHeroiBasicoExample } from '../examples'
import { parseExampleLifecycleSource } from './exampleLifecycleSource'

/**
 * Drift do exemplo "A Lenda do Herói" — o RPG de ação do SimonDev de NÍVEL
 * BÁSICO montado só com genéricos do Jogo 3D: um herói (setas/WASD, câmera de
 * cima) que ATACA de perto com a espada (barra de espaço) os monstros que vagam
 * (giram parados) e, ao te enxergar, PERSEGUEM (moveTowards). Encostar tira um
 * coração; derrote 10 antes que os 3 corações acabem. A IR embutida em
 * examples.ts foi GERADA pelo parser real a partir do SOURCE (que mora no
 * __gen_aLendaDoHeroi.ts, importado aqui para que fonte e teste NUNCA divirjam).
 */

beforeAll(() => {
  ensureBlocklyInitialized()
  registerExtensionBlocks(gameThreeDBlocks)
})

describe('Exemplo A Lenda do Herói — drift contra o parser real', () => {
  it('está registrado no manifest e é da extensão game-3d', () => {
    expect(gameThreeDExamples).toContain(aLendaDoHeroiBasicoExample)
    expect(aLendaDoHeroiBasicoExample.experience).toBe('game')
    expect(aLendaDoHeroiBasicoExample.ir.extensions).toEqual([{ extensionId: 'game-3d' }])
  })

  it('a IR embutida passa no schema (ciclo de vida + escopos)', () => {
    expect(SZIRV2Schema.safeParse(aLendaDoHeroiBasicoExample.ir).success).toBe(true)
  })

  it('nenhum texto visível usa travessão', () => {
    expect(aLendaDoHeroiBasicoExample.name).toBe('A Lenda do Herói')
    expect(aLendaDoHeroiBasicoExample.description ?? '').not.toContain('—')
    expect((aLendaDoHeroiBasicoExample.description ?? '').length).toBeLessThanOrEqual(200)
    expect(JSON.stringify(aLendaDoHeroiBasicoExample.ir.html)).not.toContain('—')
  })

  it('parseJS(SOURCE) ≡ IR embutida (zero rawJS/memberCall)', () => {
    const parsed = stripIds(parseExampleLifecycleSource(SOURCE)) as JSStatement[]
    const types = collectTypes(parsed)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('memberCall')).toBe(false)
    expect(types.has('memberCallExpr')).toBe(false)
    expect(parsed).toEqual(
      stripIds(behaviorStatements(aLendaDoHeroiBasicoExample.ir)) as JSStatement[],
    )
  })

  it('exercita as mecânicas prometidas do RPG (caçar, atacar de perto, perseguir)', () => {
    const statements = behaviorStatements(aLendaDoHeroiBasicoExample.ir)
    const types = collectTypes(statements)
    for (const t of [
      'g3d:createSwarm', // o enxame de monstros
      'g3d:spawnInSwarm', // monstros nascem na borda
      'g3d:countSwarm', // teto do enxame
      'g3d:everySeconds', // cadência de spawn
      'randomFloat', // o ângulo sorteado da posição de nascimento
      'g3d:keyDown', // setas/WASD + a espada (barra de espaço)
      'g3d:setPosition', // o herói anda no campo (com clamp na tela)
      'g3d:isNear', // alcance da espada + contato do monstro + raio de perseguição
      'g3d:moveTowards', // os monstros perseguem o herói
      'g3d:forEachInSwarm', // varre os monstros por quadro
      'g3d:removeFromSwarm', // derrotado pela espada ou some ao encostar
      'g3d:spin', // os monstros longe vagam (giram)
      'g3d:getPos', // posição do herói
      'g3d:animate', // o laço de quadro 3D
      'event', // o botão Jogar de novo
      'setProperty', // placar e corações no HUD
      'classOp', // mostra a tela de fim
    ]) {
      expect(types.has(t)).toBe(true)
    }
    // O estado do jogo (placar, corações, posição e partida) vive em variáveis.
    const raw = JSON.stringify(statements)
    expect(raw).toContain('"monstros"')
    expect(raw).toContain('"pontos"')
    expect(raw).toContain('"vida"')
    expect(raw).toContain('"rodando"')
  })

  it('⭐ é montado com GENÉRICOS (um enxame), não com um kit pronto', () => {
    const types = collectTypes(behaviorStatements(aLendaDoHeroiBasicoExample.ir))
    expect(types.has('g3d:createFullscreenScene')).toBe(true)
    expect(types.has('g3d:createRaceScene')).toBe(false)
    expect(types.has('g3d:createCrossingScene')).toBe(false)
  })

  it('fixpoint textual: gerar → parsear → gerar é byte-estável', () => {
    const code1 = compileStatements(
      stripIds(behaviorStatements(aLendaDoHeroiBasicoExample.ir)) as JSStatement[],
      0,
    )
    const reparsed = stripIds(parseJS(code1)) as JSStatement[]
    const code2 = compileStatements(reparsed, 0)
    expect(code2).toBe(code1)
  })

  it('round-trip por blocos: IR → workspace → IR devolve a mesma IR', () => {
    const state = buildWorkspaceStateFromIR(
      aLendaDoHeroiBasicoExample.ir as Parameters<typeof buildWorkspaceStateFromIR>[0],
    )
    const ws = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
      const rebuilt = stripIds(behaviorStatements(buildIRFromWorkspace(ws)))
      expect(rebuilt).toEqual(stripIds(behaviorStatements(aLendaDoHeroiBasicoExample.ir)))
    } finally {
      ws.dispose()
    }
  })
})

import { gameThreeDExamples } from '../exampleCatalog'
