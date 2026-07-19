import { describe, expect, it } from 'bun:test'
import { parse } from '@babel/parser'
import { generateJS } from '../../generators/js'
import { type JSStatement, SZIRSchema } from '../../ir/schema'
import { parseJS } from '../../parsers/js'

const n = (value: number) => ({ type: 'num' as const, value })
const color = (value: string) => ({ type: 'color' as const, value })

describe('Canvas 3D — limites, lifecycle e carregamento', () => {
  it('limita densidade, tesselação, DPR e tamanho da cidade no código executável', () => {
    const statements: JSStatement[] = [
      {
        type: 'rendererConfig',
        renderer: 'renderer',
        pixels: 'device',
        shadows: 'off',
        colorSpace: 'off',
        toneMapping: 'off',
      },
      {
        type: 'particlesSetup',
        particles: 'poeira',
        scene: 'cena',
        count: n(1_000_000_000),
        size: n(1),
        spread: n(20),
        color: color('#fff'),
      },
      {
        type: 'terrainSetup',
        terrain: 'terreno',
        scene: 'cena',
        heightFunction: 'alturaChao',
        size: n(100),
        segments: n(1_000_000),
        hills: n(3),
        smooth: n(10),
        color: color('#0f0'),
      },
      {
        type: 'citySetup',
        city: 'cidade',
        scene: 'cena',
        heightFunction: 'alturaChao',
        blocksX: n(1000),
        blocksZ: n(1000),
        spacing: n(14),
        roadWidth: n(5),
        minHeight: n(4),
        maxHeight: n(20),
        seed: n(7),
        color: color('#aaa'),
        roofColor: color('#333'),
      },
    ]
    const code = generateJS({ statements })

    expect(code).toContain('Math.min(window.devicePixelRatio || 1, 2)')
    expect(code).toContain('Math.min(20000')
    expect(code).toContain('Math.min(256')
    expect(code.match(/Math.min\(40/g)).toHaveLength(2)
    expect(code.match(/new THREE\.InstancedMesh/g)?.length).toBeGreaterThanOrEqual(3)
    expect(() => parse(code, { sourceType: 'module' })).not.toThrow()
  })

  it('rejeita criação de recursos 3D dentro do laço de animação', () => {
    const result = SZIRSchema.safeParse({
      html: [],
      css: [],
      extensions: [],
      js: [
        {
          type: 'animationLoop',
          body: [
            {
              type: 'particlesSetup',
              particles: 'poeira',
              scene: 'cena',
              count: n(100),
              size: n(1),
              spread: n(10),
              color: color('#fff'),
            },
          ],
        },
      ],
    })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues[0]?.message).toContain('fora do laço')
  })

  it('gera callback de erro para loaders e o parser o preserva', () => {
    const statement: JSStatement = {
      type: 'loaderLoad',
      loaderVar: 'carregador',
      url: { type: 'str', value: 'modelo.glb' },
      param: 'modelo',
      body: [{ type: 'consoleLog', value: { type: 'var', name: 'modelo' } }],
      errorParam: 'erro',
      errorBody: [{ type: 'consoleLog', value: { type: 'var', name: 'erro' } }],
    }
    const code = generateJS({ statements: [statement] })
    const back = parseJS(code)

    expect(code).toContain('}, undefined, (erro) => {')
    expect(back).toEqual([statement])
  })
})
