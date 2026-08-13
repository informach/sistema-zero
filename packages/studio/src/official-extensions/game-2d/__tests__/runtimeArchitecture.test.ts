import { describe, expect, it } from 'bun:test'
import { gameTwoDRuntime } from '../runtime'
import { gameTwoDArcadeKitsRuntime } from '../runtime/arcadeKits'
import { gameTwoDAudioRuntime } from '../runtime/audio'
import { gameTwoDEnemiesRuntime } from '../runtime/enemies'
import { gameTwoDInputAndMotionRuntime } from '../runtime/inputAndMotion'
import { gameTwoDLifecycleRuntime } from '../runtime/lifecycle'
import { gameTwoDPhysicsRuntime } from '../runtime/physics'
import { gameTwoDSpritesRuntime } from '../runtime/sprites'
import { gameTwoDUtilitiesRuntime } from '../runtime/utilities'
import { gameTwoDWorldRuntime } from '../runtime/world'

/**
 * ⚠️ Esta lista era ESCRITA À MÃO e fixava NOVE domínios enquanto o runtime já
 * registrava treze. O `classic-platformer` — que zera o teclado semântico, os
 * handlers de ação e o pad de toque — entrou em 08/2026 e ficou de fora: perder o
 * reset dele não quebrava teste nenhum, e o sintoma seria a segunda partida
 * nascendo com uma tecla presa. Agora os nomes saem do runtime COMPOSTO, então
 * domínio novo entra sozinho na conta.
 */
function registeredDomains(source: string): string[] {
  return [...source.matchAll(/_registerRuntimeDomain\('([\w-]+)'/g)]
    .map((match) => match[1] as string)
    .sort()
}

describe('gameTwoDRuntime — arquitetura dos domínios', () => {
  it('cada domínio com estado registra seu próprio reset', () => {
    const domains = [
      [gameTwoDLifecycleRuntime, 'lifecycle'],
      [gameTwoDPhysicsRuntime, 'physics'],
      [gameTwoDAudioRuntime, 'audio'],
      [gameTwoDInputAndMotionRuntime, 'input-and-motion'],
      [gameTwoDWorldRuntime, 'world'],
      [gameTwoDArcadeKitsRuntime, 'arcade-kits'],
      [gameTwoDEnemiesRuntime, 'enemies'],
      [gameTwoDSpritesRuntime, 'sprites'],
      [gameTwoDUtilitiesRuntime, 'utilities'],
    ] as const

    for (const [source, name] of domains) {
      expect(source).toContain(`_registerRuntimeDomain('${name}'`)
    }
  })

  it('TODO domínio registrado no runtime composto é conhecido, e nenhum some', () => {
    const encontrados = registeredDomains(gameTwoDRuntime)
    // Sem duplicata: dois `_registerRuntimeDomain` com o mesmo nome fazem o segundo
    // sobrescrever o reset do primeiro, em silêncio.
    expect(encontrados).toEqual([...new Set(encontrados)])
    expect(encontrados).toEqual([
      'arcade-kits',
      'audio',
      'casual-kits',
      'classic-platformer',
      'enemies',
      'input-and-motion',
      'lifecycle',
      'physics',
      'sprites',
      'stage-accessibility',
      'stage-backdrop',
      'utilities',
      'world',
    ])
  })

  it('restart apenas orquestra os resets registrados', () => {
    const restart = gameTwoDArcadeKitsRuntime.slice(
      gameTwoDArcadeKitsRuntime.indexOf('function restart()'),
      gameTwoDArcadeKitsRuntime.indexOf('// ---- Cenário: fundo de estrelas'),
    )
    expect(restart).toContain('_resetRuntimeDomains();')
    for (const internalState of [
      '_loopHandlers',
      'pointerHandlers',
      'frameCounters',
      '_shapes',
      'particles',
      '_tileMapCreates',
      'world.gravity',
      'camera.x',
      '_forest',
      '_banana',
      '_fpsLast',
    ]) {
      expect(restart).not.toContain(internalState)
    }
  })
})
