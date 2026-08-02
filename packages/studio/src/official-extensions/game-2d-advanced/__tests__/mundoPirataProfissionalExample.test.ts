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
import { MUNDO_PIRATA_PROFISSIONAL_SOURCE as SOURCE } from '../__gen_mundoPirataProfissional'
import { gameKitBlocks } from '../blocks'
import { mundoPirataProfissionalExample } from '../examples'
import { gameKitManifest } from '../manifest'

/**
 * Drift do exemplo "Mundo Pirata Profissional" — o nível 2 da trilogia de
 * plataforma lateral sobre o motor avançado. A IR embutida em examples/ foi
 * GERADA pelo parser real a partir do SOURCE (que mora no
 * __gen_mundoPirataProfissional.ts, importado aqui para que fonte e teste NUNCA
 * possam divergir).
 */

beforeAll(() => {
  ensureBlocklyInitialized()
  registerExtensionBlocks(gameKitBlocks)
})

describe('Exemplo Mundo Pirata Profissional — drift contra o parser real', () => {
  it('está registrado no manifest e é da extensão game-2d-advanced', () => {
    expect(gameKitManifest.examples).toContain(mundoPirataProfissionalExample)
    expect(mundoPirataProfissionalExample.ir.extensions).toEqual([
      { extensionId: 'game-2d-advanced' },
    ])
    expect(mundoPirataProfissionalExample.name).toBe('Mundo Pirata Profissional')
    expect(mundoPirataProfissionalExample.experience).toBe('game')
  })

  it('parseJS(SOURCE) ≡ IR embutida (zero rawJS/memberCall)', () => {
    const parsed = stripIds(parseExampleLifecycleSource(SOURCE, true))
    const types = collectTypes(parsed)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('memberCall')).toBe(false)
    expect(parsed).toEqual(
      stripIds(behaviorStatements(mundoPirataProfissionalExample.ir)) as JSStatement[],
    )
  })

  it('⭐ usa o controlador de plataforma do motor + a SEMI-COLISÃO das tábuas', () => {
    const types = collectTypes(behaviorStatements(mundoPirataProfissionalExample.ir))
    for (const t of [
      'gk:platformerHero', // walk + pulo + gravidade do motor
      'gk:oneWayPlatform', // ⭐ pisar por cima e descer com ↓ (a feature do Super-Pirate)
      'gk:dropThrough',
      'gk:collideGroup', // chão sólido
      'gk:setCheckpoint', // checkpoint com respawn
      'gk:respawn',
      'gk:defineRegion', // a bandeira do fim é uma região
      'gk:isInside',
      'gk:platformerAnim',
    ]) {
      expect(types.has(t)).toBe(true)
    }
  })

  it('três inimigos distintos + moedas + vidas', () => {
    const statements = behaviorStatements(mundoPirataProfissionalExample.ir)
    const types = collectTypes(statements)
    for (const t of [
      'gk:defineMold',
      'gk:spawnFromMold',
      'gk:forEachActive',
      'gk:charactersTouch', // pisar/encostar
      'gk:setVelocity', // dente persegue, casco patrulha
      'gk:moveByVelocity',
      'gk:applyGravity',
      'gk:recycle', // pisão remove o inimigo / pérola some
      'gk:emit', // aviso de "levou dano"
      'gk:onEvent',
      'gk:cullOffscreen', // limpa as pérolas
      'gk:burst', // partículas de moeda e pisão
    ]) {
      expect(types.has(t)).toBe(true)
    }
    const raw = JSON.stringify(statements)
    for (const mold of ['"dente"', '"casco"', '"canhao"', '"perola"', '"moeda"']) {
      expect(raw).toContain(mold)
    }
    expect(raw).toContain('"vidas"')
    expect(raw).toContain('"pontos"')
    for (const screen of ['"menu"', '"vitoria"', '"fim"']) {
      expect(raw).toContain(screen)
    }
  })

  it('nenhum texto visível usa travessão', () => {
    expect(JSON.stringify(mundoPirataProfissionalExample.ir)).not.toContain('—')
    expect(mundoPirataProfissionalExample.name).not.toContain('—')
    expect(mundoPirataProfissionalExample.description ?? '').not.toContain('—')
  })

  it('fixpoint textual: gerar → parsear → gerar é byte-estável', () => {
    const code1 = compileStatements(
      stripIds(behaviorStatements(mundoPirataProfissionalExample.ir)) as JSStatement[],
      0,
    )
    const reparsed = stripIds(parseJS(code1)) as JSStatement[]
    const code2 = compileStatements(reparsed, 0)
    expect(code2).toBe(code1)
  })

  it('round-trip por blocos: IR → workspace → IR preserva o jogo inteiro', () => {
    const state = buildWorkspaceStateFromIR(
      mundoPirataProfissionalExample.ir as Parameters<typeof buildWorkspaceStateFromIR>[0],
    )
    const ws = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
      const rebuilt = behaviorStatements(buildIRFromWorkspace(ws))
      const embedded = behaviorStatements(mundoPirataProfissionalExample.ir)
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
