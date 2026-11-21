import { afterEach, describe, expect, it } from 'bun:test'
import { compileStatements } from '#generators'
import { behaviorStatements, normalizeSZIR } from '#ir'
import { worldThreeDExtension } from '..'
import { world3DExamples } from '../examples'
import { world3DRuntime, world3DRuntimeForVariant } from '../runtime'
import { world3DSceneAbsentRuntime, world3DSceneRuntime } from '../runtimeScene'
import {
  WORLD_3D_WITHOUT_SCENE_VARIANT,
  world3DRuntimeVariant,
  world3DUsesScene,
} from '../sceneVariant'
import { loadExampleWorld } from './kitHarness'

/**
 * Cenário do Molda injetado só quando o mundo usa (revisão completa da missão, 20/11/2026,
 * achado T1): o fragmento entrava em todo Mundo 3D e o teto de payload subiu para caber. O
 * mundo sem cenário tem de ser o MESMO mundo do runtime completo.
 */

const runtimeBody = (source: string) => source.replace(/^import \* as THREE from 'three';\n/, '')
const semCenario = world3DRuntimeForVariant(WORLD_3D_WITHOUT_SCENE_VARIANT)

afterEach(() => {
  window.dispatchEvent(new Event('pagehide'))
  for (const el of Array.from(document.querySelectorAll('#szw3d-stage, .szr-layer'))) el.remove()
})

describe('Cenário do Molda no Mundo 3D: o substituto cobre o fragmento', () => {
  it('toda função e todo estado do fragmento têm substituto declarado', () => {
    const functions = [...world3DSceneRuntime.matchAll(/^ {2}function ([A-Za-z_$][\w$]*)\(/gm)].map(
      (m) => m[1] as string,
    )
    const state = [...world3DSceneRuntime.matchAll(/^ {2}var ([A-Za-z_$][\w$]*) =/gm)].map(
      (m) => m[1] as string,
    )
    // Anti-vácuo: o fragmento tem as funções e o estado do cenário.
    expect(functions.length).toBeGreaterThanOrEqual(13)
    expect(state.length).toBeGreaterThanOrEqual(5)
    for (const name of functions)
      expect(
        new RegExp(String.raw`\bfunction ${name}\(|\b${name} = sceneAbsent\b`).test(
          world3DSceneAbsentRuntime,
        ),
        name,
      ).toBe(true)
    for (const name of state) expect(world3DSceneAbsentRuntime, name).toContain(`${name} = `)
  })
})

describe('Cenário do Molda no Mundo 3D: detecção e variantes', () => {
  it('loadScene pede o cenário; sem contexto, o completo', () => {
    expect(world3DUsesScene('SZWorld3D.loadScene("ilha")')).toBe(true)
    expect(world3DUsesScene('meuloadSceneX(); loadScene2()')).toBe(false)
    expect(world3DRuntimeVariant()).toBe('')
    expect(world3DRuntimeVariant({ code: 'SZWorld3D.loadScene("ilha")' })).toBe('')
    expect(world3DRuntimeVariant({ code: 'SZWorld3D.setup({})' })).toBe(
      WORLD_3D_WITHOUT_SCENE_VARIANT,
    )
  })

  it('loadBootstrapScript escolhe pela detecção; a variante não recompõe', async () => {
    const runtime = worldThreeDExtension.runtime
    if (!runtime.loadBootstrapScript) throw new Error('o Mundo 3D carrega por loadBootstrapScript')
    expect(await runtime.loadBootstrapScript()).toBe(world3DRuntime)
    expect(await runtime.loadBootstrapScript({ code: 'SZWorld3D.setup({})' })).toBe(semCenario)
    expect(world3DRuntimeForVariant(WORLD_3D_WITHOUT_SCENE_VARIANT)).toBe(semCenario)
  })

  it('a sem cenário compila, não tem crase e é bem menor', () => {
    expect(() => new Function('THREE', 'window', runtimeBody(semCenario))).not.toThrow()
    expect(semCenario).not.toContain('`')
    expect(semCenario).not.toContain('${')
    expect(world3DRuntime.length - semCenario.length).toBeGreaterThan(7_000)
  })
})

/** Sorteio e relógio fixos: as duas variantes têm de ver o MESMO mundo para serem comparadas. */
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

async function play(code: string, body: string) {
  return deterministic(async () => {
    const { step, stage } = await loadExampleWorld(code, undefined, body)
    const button = stage.ownerDocument.querySelector(
      '[data-szr-screen] button',
    ) as HTMLButtonElement | null
    button?.click()
    step(120)
    const result = { stage: stage.innerHTML }
    window.dispatchEvent(new Event('pagehide'))
    for (const el of Array.from(document.querySelectorAll('#szw3d-stage, .szr-layer'))) el.remove()
    return result
  })
}

describe('Cenário do Molda no Mundo 3D: o runtime sem cenário joga os exemplos igual', () => {
  it('todo exemplo sem cenário joga igual nas duas variantes', async () => {
    let played = 0
    for (const example of world3DExamples) {
      const code = compileStatements(behaviorStatements(normalizeSZIR(example.ir)), 0)
      if (world3DRuntimeVariant({ code }) !== WORLD_3D_WITHOUT_SCENE_VARIANT) continue
      const enxuto = await play(code, runtimeBody(semCenario))
      const completo = await play(code, runtimeBody(world3DRuntime))
      expect({ example: example.name, ...enxuto }).toEqual({ example: example.name, ...completo })
      played++
    }
    // Anti-vácuo: os 14 mundos do catálogo; nenhum usa cenário.
    expect(played).toBe(world3DExamples.length)
    expect(played).toBeGreaterThanOrEqual(14)
  }, 120_000)
})
