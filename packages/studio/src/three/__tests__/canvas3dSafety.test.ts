import { describe, expect, it } from 'bun:test'
import { parse } from '@babel/parser'
import { generateJS } from '../../generators/js'
import { isLifecycleRootAllowed, validateLifecycleSemantics } from '../../ir/lifecycle'
import { type JSStatement, SZIRSchema } from '../../ir/schema'
import { parseJS } from '../../parsers/js'

const n = (value: number) => ({ type: 'num' as const, value })
const color = (value: string) => ({ type: 'color' as const, value })

describe('Canvas 3D — limites, lifecycle e carregamento', () => {
  it('restringe água, grama e passo da física a contextos contínuos', () => {
    const statements: JSStatement[] = [
      { type: 'waterTime', water: 'agua', dt: n(1 / 60) },
      { type: 'grassTime', grass: 'grama', dt: n(1 / 60) },
      { type: 'physicsLiteStep', world: 'fisica', dt: n(1 / 60) },
    ]

    for (const statement of statements) {
      expect(isLifecycleRootAllowed(statement, 'start'), statement.type).toBe(false)
      expect(
        validateLifecycleSemantics(statement, ['behavior', 'start', 0]),
        statement.type,
      ).not.toEqual([])
    }
  })

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

  it('rejeita construtor persistente encaixado como valor dentro do laço', () => {
    const result = SZIRSchema.safeParse({
      html: [],
      css: [],
      extensions: [],
      js: [
        { type: 'importStar', name: 'THREE', module: 'three' },
        {
          type: 'newInstance',
          varName: 'cena',
          namespace: 'THREE',
          className: 'Scene',
          args: [],
        },
        {
          type: 'animationLoop',
          body: [
            {
              type: 'memberCall',
              object: { type: 'var', name: 'cena' },
              method: 'add',
              args: [{ type: 'newExpr', namespace: 'THREE', className: 'Mesh', args: [] }],
            },
          ],
        },
      ],
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message.includes('fora do laço'))).toBe(true)
    }
  })

  it('mantém valores matemáticos temporários disponíveis dentro do laço', () => {
    const result = SZIRSchema.safeParse({
      html: [],
      css: [],
      extensions: [],
      js: [
        { type: 'importStar', name: 'THREE', module: 'three' },
        {
          type: 'animationLoop',
          body: [
            {
              type: 'var',
              name: 'direcao',
              value: { type: 'newExpr', namespace: 'THREE', className: 'Vector3', args: [] },
            },
          ],
        },
      ],
    })

    expect(result.success).toBe(true)
  })

  it('distingue classe local de addon realmente importado no lifecycle', () => {
    const localClass = SZIRSchema.safeParse({
      html: [],
      css: [],
      extensions: [],
      js: [
        { type: 'classDecl', name: 'Water', ctorBody: [], methods: [] },
        {
          type: 'animationLoop',
          body: [
            {
              type: 'var',
              name: 'gota',
              value: { type: 'newExpr', className: 'Water', args: [] },
            },
          ],
        },
      ],
    })
    expect(localClass.success).toBe(true)

    const importedExpression = SZIRSchema.safeParse({
      html: [],
      css: [],
      extensions: [],
      js: [
        {
          type: 'importNamed',
          names: ['Water'],
          module: 'three/addons/objects/Water.js',
        },
        {
          type: 'animationLoop',
          body: [
            {
              type: 'var',
              name: 'agua',
              value: { type: 'newExpr', className: 'Water', args: [] },
            },
          ],
        },
      ],
    })
    expect(importedExpression.success).toBe(false)

    const importedStatement = SZIRSchema.safeParse({
      html: [],
      css: [],
      extensions: [],
      js: [
        {
          type: 'importNamed',
          names: ['Water'],
          module: 'three/addons/objects/Water.js',
        },
        {
          type: 'animationLoop',
          body: [{ type: 'newInstance', varName: 'agua', className: 'Water', args: [] }],
        },
      ],
    })
    expect(importedStatement.success).toBe(false)
  })

  it('rejeita toda preparação persistente que ainda podia ser recriada a cada quadro', () => {
    const creators: JSStatement[] = [
      {
        type: 'rendererResponsive',
        renderer: 'renderizador',
        camera: 'camera',
        cleanup: 'pararResponsivo',
      },
      {
        type: 'physicsLiteSetup',
        world: 'fisica',
        heightFunction: 'alturaChao',
        gravity: n(-22),
        maxSubSteps: n(3),
      },
      {
        type: 'physicsLiteStaticBox',
        world: 'fisica',
        id: 'parede',
        x: n(0),
        y: n(1),
        z: n(0),
        width: n(2),
        height: n(2),
        depth: n(2),
      },
      {
        type: 'physicsLiteStaticSphere',
        world: 'fisica',
        id: 'rocha',
        x: n(0),
        y: n(1),
        z: n(0),
        radius: n(1),
      },
      { type: 'physicsLiteStaticObject', world: 'fisica', id: 'predio', object: 'predio' },
      { type: 'physicsLiteStaticCity', world: 'fisica', city: 'cidade', prefix: 'cidade' },
      {
        type: 'physicsLiteBody',
        world: 'fisica',
        object: 'jogador',
        id: 'jogador',
        kind: 'character',
        width: n(1),
        height: n(2),
        depth: n(1),
        friction: n(0.8),
        bounce: n(0),
      },
      {
        type: 'physicsLiteTrigger',
        world: 'fisica',
        id: 'praca',
        x: n(0),
        y: n(1),
        z: n(0),
        width: n(6),
        height: n(2),
        depth: n(6),
      },
    ]

    for (const creator of creators) {
      const result = SZIRSchema.safeParse({
        html: [],
        css: [],
        extensions: [],
        js: [{ type: 'animationLoop', body: [creator] }],
      })
      expect(result.success, creator.type).toBe(false)
    }
  })

  it('inclui a biblioteca 3D quando um facilitador gera código que depende dela', () => {
    const code = generateJS({
      statements: [
        {
          type: 'primitiveSetup',
          mesh: 'cubo',
          scene: 'cena',
          shape: 'box',
          width: n(1),
          height: n(1),
          depth: n(1),
          color: color('#38bdf8'),
        },
      ],
    })

    expect(code.startsWith("import * as THREE from 'three';\n")).toBe(true)
    expect(code.match(/from 'three'/g)).toHaveLength(1)
    expect(() => parse(code, { sourceType: 'module' })).not.toThrow()

    const behaviorCode = generateJS({
      behavior: {
        start: [
          {
            type: 'primitiveSetup',
            mesh: 'cubo',
            scene: 'cena',
            shape: 'box',
            width: n(1),
            height: n(1),
            depth: n(1),
            color: color('#38bdf8'),
          },
        ],
        events: [],
        loops: [],
      },
    })
    expect(behaviorCode.startsWith("import * as THREE from 'three';\n")).toBe(true)
  })

  it('gera callback de erro para loaders e o parser o preserva', () => {
    const statement: JSStatement = {
      type: 'loaderLoad',
      resourceKind: 'model',
      loaderVar: 'carregador',
      url: { type: 'str', value: 'modelo.glb' },
      param: 'modelo',
      body: [{ type: 'consoleLog', value: { type: 'var', name: 'modelo' } }],
      errorParam: 'erro',
      errorBody: [{ type: 'consoleLog', value: { type: 'var', name: 'erro' } }],
    }
    const statements: JSStatement[] = [
      { type: 'importStar', name: 'THREE', module: 'three' },
      {
        type: 'newInstance',
        varName: 'carregador',
        className: 'GLTFLoader',
        args: [],
        namespace: 'THREE',
      },
      statement,
    ]
    const code = generateJS({ statements })
    const back = parseJS(code)

    expect(code).toContain('}, undefined, (erro) => {')
    expect(back).toEqual(statements)
  })
})
