import { describe, expect, it } from 'bun:test'
import { SZIRSchema } from '../../ir/schema'

const n = (value: number) => ({ type: 'num' as const, value })
const color = (value: string) => ({ type: 'color' as const, value })

const project = (js: unknown[], canvas = true) => ({
  html: canvas ? [{ type: 'canvas', id: 'tela', width: 800, height: 600 }] : [],
  css: [],
  js,
  extensions: [],
})

describe('Canvas 3D — referências tipadas', () => {
  it('aceita o fluxo manual quando cada recurso foi declarado no papel certo', () => {
    expect(
      SZIRSchema.safeParse(
        project([
          { type: 'threeSceneSetup', scene: 'cena' },
          { type: 'threeRendererSetup', renderer: 'renderizador', canvas: 'tela' },
          {
            type: 'threeCameraSetup',
            camera: 'camera',
            canvas: 'tela',
            fov: n(60),
            near: n(0.1),
            far: n(1000),
          },
          {
            type: 'threeLightSetup',
            light: 'luz',
            scene: 'cena',
            kind: 'ambient',
            color: color('#ffffff'),
            intensity: n(1),
          },
          {
            type: 'rendererResponsive',
            renderer: 'renderizador',
            camera: 'camera',
            cleanup: 'pararResponsivo',
          },
        ]),
      ).success,
    ).toBe(true)
  })

  it('recusa tela ausente e recurso usado no papel errado', () => {
    const missingCanvas = SZIRSchema.safeParse(
      project([{ type: 'threeRendererSetup', renderer: 'renderizador', canvas: 'tela' }], false),
    )
    expect(missingCanvas.success).toBe(false)

    const wrongRole = SZIRSchema.safeParse(
      project([
        { type: 'threeSceneSetup', scene: 'cena' },
        { type: 'threeRendererSetup', renderer: 'renderizador', canvas: 'tela' },
        {
          type: 'threeLightSetup',
          light: 'luz',
          scene: 'renderizador',
          kind: 'ambient',
          color: color('#ffffff'),
          intensity: n(1),
        },
      ]),
    )
    expect(wrongRole.success).toBe(false)
  })

  it('recusa câmera, compositor e mundo físico que ainda não existem', () => {
    const cases = [
      { type: 'rendererResponsive', renderer: 'renderizador', camera: 'camera', cleanup: 'parar' },
      {
        type: 'bloomSetup',
        composer: 'efeitos',
        renderer: 'renderizador',
        scene: 'cena',
        camera: 'camera',
        strength: n(1),
        radius: n(0.5),
        threshold: n(0.8),
      },
      { type: 'physicsLiteStep', world: 'fisica', dt: n(1 / 60) },
    ]

    for (const statement of cases) {
      expect(SZIRSchema.safeParse(project([statement])).success, statement.type).toBe(false)
    }
  })

  it('recusa dois terrenos que declaram a mesma função de altura', () => {
    const terrain = (name: string) => ({
      type: 'terrainSetup',
      terrain: name,
      scene: 'cena',
      heightFunction: 'alturaChao',
      size: n(100),
      segments: n(32),
      hills: n(8),
      smooth: n(12),
      color: color('#55aa44'),
    })

    const result = SZIRSchema.safeParse(
      project([{ type: 'threeSceneSetup', scene: 'cena' }, terrain('ilha'), terrain('continente')]),
    )

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues[0]?.message).toContain('alturaChao')
  })

  it('eleva bindings de import porque o gerador também move imports para o topo', () => {
    const result = SZIRSchema.safeParse(
      project([
        {
          type: 'newInstance',
          varName: 'carregador',
          className: 'GLTFLoader',
          args: [],
        },
        {
          type: 'importNamed',
          names: ['GLTFLoader'],
          module: 'three/addons/loaders/GLTFLoader.js',
        },
      ]),
    )

    expect(result.success).toBe(true)
  })

  it('não mistura uma cena Three.js crua com o mundo-fachada do Jogo 3D', () => {
    const rawSceneAsWorld = SZIRSchema.safeParse(
      project([
        { type: 'threeSceneSetup', scene: 'cena' },
        { type: 'g3d:setBackground', worldVar: 'cena', color: '#102030' },
      ]),
    )
    expect(rawSceneAsWorld.success).toBe(false)

    const gameWorldAsScene = SZIRSchema.safeParse(
      project([
        { type: 'g3d:createScene', canvasId: 'tela', varName: 'mundo' },
        {
          type: 'threeLightSetup',
          light: 'luz',
          scene: 'mundo',
          kind: 'ambient',
          color: color('#ffffff'),
          intensity: n(1),
        },
      ]),
    )
    expect(gameWorldAsScene.success).toBe(false)
  })

  it('recusa objeto comum no comando especializado de água', () => {
    const result = SZIRSchema.safeParse(
      project([
        { type: 'threeSceneSetup', scene: 'cena' },
        {
          type: 'primitiveSetup',
          mesh: 'cubo',
          scene: 'cena',
          shape: 'box',
          width: n(1),
          height: n(1),
          depth: n(1),
          color: color('#ff8844'),
        },
        {
          type: 'animationLoop',
          body: [{ type: 'waterTime', water: 'cubo', dt: n(1 / 60) }],
        },
      ]),
    )

    expect(result.success).toBe(false)
  })

  it('distingue carregador de modelo de carregador de áudio', () => {
    const wrongModelLoader = SZIRSchema.safeParse(
      project([
        {
          type: 'newInstance',
          varName: 'carregadorSom',
          namespace: 'THREE',
          className: 'AudioLoader',
          args: [],
        },
        {
          type: 'loaderLoad',
          resourceKind: 'model',
          loaderVar: 'carregadorSom',
          url: { type: 'str', value: 'nave.glb' },
          param: 'gltf',
          body: [],
        },
      ]),
    )
    expect(wrongModelLoader.success).toBe(false)

    const correctAudioLoader = SZIRSchema.safeParse(
      project([
        {
          type: 'newInstance',
          varName: 'carregadorSom',
          namespace: 'THREE',
          className: 'AudioLoader',
          args: [],
        },
        {
          type: 'loaderLoad',
          resourceKind: 'audio',
          loaderVar: 'carregadorSom',
          url: { type: 'str', value: 'musica' },
          param: 'buffer',
          body: [],
        },
      ]),
    )
    expect(correctAudioLoader.success).toBe(true)
  })
})
