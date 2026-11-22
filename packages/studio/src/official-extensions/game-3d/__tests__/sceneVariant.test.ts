import { describe, expect, it } from 'bun:test'
import { gameThreeDRuntime, gameThreeDRuntimeForVariant } from '../runtime'
import { gameThreeDSceneAbsentRuntimeSource, gameThreeDSceneRuntimeSource } from '../runtimeScene'
import {
  GAME_3D_WITHOUT_SCENE_VARIANT,
  gameThreeDRuntimeVariant,
  gameThreeDUsesScene,
} from '../sceneVariant'

/**
 * Cenário do Molda injetado só quando o projeto usa (revisão completa da missão, 20/11/2026,
 * achado T1): o fragmento entrava em todo jogo 3D e os tetos de payload subiram para caber.
 * O jogo sem cenário tem de ser o mesmo jogo (a prova de jogar fica em
 * `platformKitVariant.test.ts`, que tem o harness); aqui, a forma das variantes.
 */

const runtimeBody = (source: string) => source.replace(/^import \* as THREE from 'three';\n/, '')
const SCENE_LINE = 'world._sceneArrivals = new Set();'
const ABSENT_LINE = 'function sceneAbsent()'

describe('Cenário do Molda: o substituto cobre o fragmento', () => {
  it('toda função do fragmento tem um substituto declarado', () => {
    const names = [...gameThreeDSceneRuntimeSource.matchAll(/^ {2}function ([A-Za-z_$][\w$]*)\(/gm)]
      .map((m) => m[1] as string)
      .sort()
    // Anti-vácuo: o fragmento tem as funções do cenário.
    expect(names.length).toBeGreaterThanOrEqual(11)
    // `sceneRegion` só é chamada pelo subfragmento das regiões das regras, que não entra no motor
    // sem cenário (`withGameRules3DRuntime(fonte, false)`): ali ela não precisa de substituto, e a
    // prova é o motor sem cenário não citá-la.
    expect(names).toContain('sceneRegion')
    expect(gameThreeDRuntimeForVariant(GAME_3D_WITHOUT_SCENE_VARIANT)).not.toContain('sceneRegion')
    for (const name of names.filter((n) => n !== 'sceneRegion'))
      expect(
        new RegExp(String.raw`\bfunction ${name}\(|\b${name} = sceneAbsent\b`).test(
          gameThreeDSceneAbsentRuntimeSource,
        ),
        name,
      ).toBe(true)
  })
})

describe('Cenário do Molda: detecção pelo código', () => {
  it('loadScene e sceneStart pedem o cenário; o resto não', () => {
    expect(gameThreeDUsesScene('SZGame3D.loadScene(cena, "ilha")')).toBe(true)
    expect(gameThreeDUsesScene('SZGame3D.sceneStart(heroi)')).toBe(true)
    expect(gameThreeDUsesScene("const g = SZGame3D; g['loadScene'](c, x)")).toBe(true)
    expect(gameThreeDUsesScene('meuloadSceneX(); loadScene2()')).toBe(false)
    expect(gameThreeDUsesScene('SZGame3D.createScene("tela")')).toBe(false)
  })

  it('as duas dimensões se somam; sem contexto, o completo', () => {
    expect(gameThreeDRuntimeVariant()).toBe('')
    expect(gameThreeDRuntimeVariant({ code: 'SZGame3D.createScene("t")' })).toBe(
      `sem-kit-plataforma+${GAME_3D_WITHOUT_SCENE_VARIANT}`,
    )
    expect(gameThreeDRuntimeVariant({ code: 'SZGame3D.loadStage(c, m)' })).toBe(
      GAME_3D_WITHOUT_SCENE_VARIANT,
    )
    expect(gameThreeDRuntimeVariant({ code: 'SZGame3D.loadScene(c, "ilha")' })).toBe(
      'sem-kit-plataforma',
    )
    expect(
      gameThreeDRuntimeVariant({ code: 'SZGame3D.loadStage(c, m); SZGame3D.loadScene(c, "x")' }),
    ).toBe('')
  })
})

describe('Cenário do Molda: as variantes do runtime', () => {
  const semCenario = gameThreeDRuntimeForVariant(GAME_3D_WITHOUT_SCENE_VARIANT)
  const enxuto = gameThreeDRuntimeForVariant(`sem-kit-plataforma+${GAME_3D_WITHOUT_SCENE_VARIANT}`)

  it('o completo traz o fragmento; as sem cenário só o substituto', () => {
    expect(gameThreeDRuntime).toContain(SCENE_LINE)
    expect(gameThreeDRuntime).not.toContain(ABSENT_LINE)
    for (const source of [semCenario, enxuto]) {
      expect(source).not.toContain(SCENE_LINE)
      expect(source).toContain(ABSENT_LINE)
    }
    // O fragmento do cenário pesa: a variante sem ele economiza isto. Desceu de 6.500 para 6.000
    // quando os dois laços de apoio foram para o SDK (`fisica.apoio`, lote 6 da conclusão).
    expect(gameThreeDRuntime.length - semCenario.length).toBeGreaterThan(6_000)
  })

  it('compilam, sem crase nem cifrão-chave soltos, e a mesma variante não recompõe', () => {
    for (const source of [semCenario, enxuto]) {
      expect(() => new Function('THREE', 'window', 'document', runtimeBody(source))).not.toThrow()
      expect(source).not.toContain('`')
      expect(source).not.toContain('${')
    }
    expect(gameThreeDRuntimeForVariant(GAME_3D_WITHOUT_SCENE_VARIANT)).toBe(semCenario)
  })

  it('chamar o cenário no runtime sem cenário para com o recado, não no carregamento', () => {
    const win: Record<string, unknown> = { addEventListener() {}, removeEventListener() {} }
    new Function('THREE', 'window', 'document', runtimeBody(semCenario))({}, win, document)
    const api = win.SZGame3D as Record<string, () => unknown>
    expect(typeof api.loadScene).toBe('function')
    expect(() => api.loadScene?.()).toThrow('cenário do Molda')
    expect(() => api.sceneStart?.()).toThrow('cenário do Molda')
  })
})
