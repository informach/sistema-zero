import { describe, expect, it } from 'bun:test'
import { gameTwoDArcadeKitsRuntime } from '../runtime/arcadeKits'
import { gameTwoDAudioRuntime } from '../runtime/audio'
import { gameTwoDInputAndMotionRuntime } from '../runtime/inputAndMotion'
import { gameTwoDLifecycleRuntime } from '../runtime/lifecycle'
import { gameTwoDPhysicsRuntime } from '../runtime/physics'
import { gameTwoDSpritesRuntime } from '../runtime/sprites'
import { gameTwoDUtilitiesRuntime } from '../runtime/utilities'
import { gameTwoDWorldRuntime } from '../runtime/world'

describe('gameTwoDRuntime — arquitetura dos domínios', () => {
  it('cada domínio com estado registra seu próprio reset', () => {
    const domains = [
      [gameTwoDLifecycleRuntime, 'lifecycle'],
      [gameTwoDPhysicsRuntime, 'physics'],
      [gameTwoDAudioRuntime, 'audio'],
      [gameTwoDInputAndMotionRuntime, 'input-and-motion'],
      [gameTwoDWorldRuntime, 'world'],
      [gameTwoDArcadeKitsRuntime, 'arcade-kits'],
      [gameTwoDSpritesRuntime, 'sprites'],
      [gameTwoDUtilitiesRuntime, 'utilities'],
    ] as const

    for (const [source, name] of domains) {
      expect(source).toContain(`_registerRuntimeDomain('${name}'`)
    }
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
