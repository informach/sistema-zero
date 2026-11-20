import { afterEach, describe, expect, it } from 'bun:test'
import { generateJS } from '#generators'
import type { BehaviorIR } from '#ir'
import { gameKit3DExtension } from '..'
import { gameKit3DExamples } from '../exampleCatalog'
import { gameKit3DRuntime, gameKit3DRuntimeForVariant } from '../runtime'
import { gameKit3DSceneAbsentRuntimeSource, gameKit3DSceneRuntimeSource } from '../runtimeScene'
import {
  GAME_KIT_3D_WITHOUT_SCENE_VARIANT,
  gameKit3DRuntimeVariant,
  gameKit3DUsesScene,
} from '../sceneVariant'
import { loadExampleKit } from './kitHarness'
import { stripIds } from './testUtils'

/**
 * Cenário do Molda injetado só quando o projeto usa (revisão completa da missão, 20/11/2026,
 * achado T1): o fragmento entrava em todo jogo 3D Avançado e o teto de payload subiu para
 * caber. O jogo sem cenário tem de ser o MESMO jogo do runtime completo.
 */

const runtimeBody = (source: string) => source.replace(/^import \* as THREE from 'three';\n/, '')
const semCenario = gameKit3DRuntimeForVariant(GAME_KIT_3D_WITHOUT_SCENE_VARIANT)

afterEach(() => {
  window.dispatchEvent(new Event('pagehide'))
})

describe('Cenário do Molda no Avançado: o substituto cobre o fragmento', () => {
  it('toda função e todo estado do fragmento têm substituto declarado', () => {
    const functions = [
      ...gameKit3DSceneRuntimeSource.matchAll(/^ {2}function ([A-Za-z_$][\w$]*)\(/gm),
    ].map((m) => m[1] as string)
    // Anti-vácuo: o fragmento tem as funções do cenário.
    expect(functions.length).toBeGreaterThanOrEqual(16)
    for (const name of functions)
      expect(
        new RegExp(String.raw`\bfunction ${name}\(|\b${name} = sceneAbsent\b`).test(
          gameKit3DSceneAbsentRuntimeSource,
        ),
        name,
      ).toBe(true)
    // O estado que o motor base lê (preparar, quadro, câmera e física) existe nas duas.
    for (const name of ['importedScene', 'sceneRequest', 'importedArrivals', 'importedRayEnd'])
      expect(gameKit3DSceneAbsentRuntimeSource, name).toContain(`${name} = `)
  })
})

describe('Cenário do Molda no Avançado: detecção e variantes', () => {
  it('loadScene e sceneStart pedem o cenário; sem contexto, o completo', () => {
    expect(gameKit3DUsesScene('SZGameKit3D.loadScene("ilha")')).toBe(true)
    expect(gameKit3DUsesScene('SZGameKit3D.sceneStart(heroi)')).toBe(true)
    expect(gameKit3DUsesScene('meuloadSceneX(); loadScene2()')).toBe(false)
    expect(gameKit3DRuntimeVariant()).toBe('')
    expect(gameKit3DRuntimeVariant({ code: 'SZGameKit3D.loadScene("ilha")' })).toBe('')
    expect(gameKit3DRuntimeVariant({ code: 'SZGameKit3D.setup({})' })).toBe(
      GAME_KIT_3D_WITHOUT_SCENE_VARIANT,
    )
  })

  it('loadBootstrapScript escolhe pela detecção; a variante não recompõe', async () => {
    const runtime = gameKit3DExtension.runtime
    if (!runtime.loadBootstrapScript) throw new Error('o Avançado carrega por loadBootstrapScript')
    expect(await runtime.loadBootstrapScript()).toBe(gameKit3DRuntime)
    expect(await runtime.loadBootstrapScript({ code: 'SZGameKit3D.setup({})' })).toBe(semCenario)
    expect(gameKit3DRuntimeForVariant(GAME_KIT_3D_WITHOUT_SCENE_VARIANT)).toBe(semCenario)
  })

  it('a sem cenário compila, não tem crase e é bem menor', () => {
    expect(() => new Function('THREE', 'window', runtimeBody(semCenario))).not.toThrow()
    expect(semCenario).not.toContain('`')
    expect(semCenario).not.toContain('${')
    expect(gameKit3DRuntime.length - semCenario.length).toBeGreaterThan(7_000)
  })
})

/** Sorteio e relógio fixos: as duas variantes têm de ver o MESMO jogo para serem comparadas. */
async function deterministic<T>(run: () => Promise<T>): Promise<T> {
  const random = Math.random
  const now = performance.now
  let seed = 1
  let clock = 0
  Math.random = () => {
    seed = (seed * 16_807) % 2_147_483_647
    return (seed - 1) / 2_147_483_646
  }
  performance.now = () => (clock += 1)
  try {
    return await run()
  } finally {
    Math.random = random
    performance.now = now
  }
}

async function play(js: string, body: string) {
  return deterministic(async () => {
    const { api, step, stage } = await loadExampleKit(js, { body })
    const button = stage.querySelector('[data-szg3k-screen] button') as HTMLButtonElement | null
    button?.click()
    step(120)
    const result = { state: api.state(), stage: stage.innerHTML }
    window.dispatchEvent(new Event('pagehide'))
    return result
  })
}

describe('Cenário do Molda no Avançado: o runtime sem cenário joga os exemplos igual', () => {
  it('todo exemplo sem cenário joga igual nas duas variantes', async () => {
    let played = 0
    const withScene: string[] = []
    for (const example of gameKit3DExamples) {
      const behavior = (example.ir as { behavior?: BehaviorIR }).behavior
      if (!behavior) continue
      const js = generateJS({ behavior: stripIds(behavior), lifecycle: 'game-3d-advanced' })
      if (gameKit3DRuntimeVariant({ code: js }) !== GAME_KIT_3D_WITHOUT_SCENE_VARIANT) {
        withScene.push(example.name)
        continue
      }
      const enxuto = await play(js, runtimeBody(semCenario))
      const completo = await play(js, runtimeBody(gameKit3DRuntime))
      expect({ example: example.name, ...enxuto }).toEqual({ example: example.name, ...completo })
      played++
    }
    // O único exemplo com cenário recebe o runtime completo; os outros 19 jogaram igual.
    expect(withScene).toEqual(['Herói do Molda'])
    expect(played).toBeGreaterThanOrEqual(19)
  }, 120_000)
})
