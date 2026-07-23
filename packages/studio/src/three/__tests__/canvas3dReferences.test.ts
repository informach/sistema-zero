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

const scene = { type: 'threeSceneSetup', scene: 'cena' }

const terrainSetup = () => ({
  type: 'terrainSetup',
  terrain: 'terreno',
  scene: 'cena',
  heightFunction: 'alturaChao',
  size: n(100),
  segments: n(32),
  hills: n(8),
  smooth: n(12),
  color: color('#55aa44'),
})

const primitiveSetup = () => ({
  type: 'primitiveSetup',
  mesh: 'cubo',
  scene: 'cena',
  shape: 'box',
  width: n(1),
  height: n(1),
  depth: n(1),
  color: color('#ff8844'),
})

const physicsSetup = () => ({
  type: 'physicsLiteSetup',
  world: 'fisica',
  heightFunction: 'alturaChao',
  gravity: n(-22),
  maxSubSteps: n(3),
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

  it('adapta automaticamente somente a câmera de perspectiva compatível', () => {
    const renderer = {
      type: 'newInstance',
      varName: 'renderizador',
      namespace: 'THREE',
      className: 'WebGLRenderer',
      args: [],
    }
    const responsive = {
      type: 'rendererResponsive',
      renderer: 'renderizador',
      camera: 'camera',
      cleanup: 'pararResponsivo',
    }
    const camera = (className: string) => ({
      type: 'newInstance',
      varName: 'camera',
      namespace: 'THREE',
      className,
      args: [],
    })

    expect(
      SZIRSchema.safeParse(project([renderer, camera('PerspectiveCamera'), responsive])).success,
    ).toBe(true)
    expect(
      SZIRSchema.safeParse(project([renderer, camera('OrthographicCamera'), responsive])).success,
    ).toBe(false)
  })

  it('recusa corpo físico ausente ou criado depois do comando que o usa', () => {
    const setup = [
      { type: 'threeSceneSetup', scene: 'cena' },
      {
        type: 'terrainSetup',
        terrain: 'terreno',
        scene: 'cena',
        heightFunction: 'alturaChao',
        size: n(100),
        segments: n(32),
        hills: n(8),
        smooth: n(12),
        color: color('#55aa44'),
      },
      {
        type: 'primitiveSetup',
        mesh: 'jogadorVisual',
        scene: 'cena',
        shape: 'capsule',
        width: n(1),
        height: n(2),
        depth: n(1),
        color: color('#38bdf8'),
      },
      {
        type: 'physicsLiteSetup',
        world: 'fisica',
        heightFunction: 'alturaChao',
        gravity: n(-22),
        maxSubSteps: n(3),
      },
    ]
    const body = {
      type: 'physicsLiteBody',
      world: 'fisica',
      object: 'jogadorVisual',
      id: 'jogador',
      kind: 'character',
      width: n(1),
      height: n(2),
      depth: n(1),
      friction: n(0.82),
      bounce: n(0),
    }
    const move = {
      type: 'physicsLiteMove',
      world: 'fisica',
      id: 'jogador',
      x: n(1),
      z: n(0),
      speed: n(6),
    }

    expect(SZIRSchema.safeParse(project([...setup, move])).success).toBe(false)
    expect(SZIRSchema.safeParse(project([...setup, move, body])).success).toBe(false)
    expect(SZIRSchema.safeParse(project([...setup, body, move])).success).toBe(true)
  })

  it('reserva mover e pular para corpos do tipo personagem', () => {
    const dynamicBody = {
      type: 'physicsLiteBody',
      world: 'fisica',
      object: 'cubo',
      id: 'caixa',
      kind: 'dynamic',
      width: n(1),
      height: n(1),
      depth: n(1),
      friction: n(0.8),
      bounce: n(0),
    }
    const move = {
      type: 'physicsLiteMove',
      world: 'fisica',
      id: 'caixa',
      x: n(1),
      z: n(0),
      speed: n(6),
    }
    const jump = { type: 'physicsLiteJump', world: 'fisica', id: 'caixa', speed: n(7) }
    const setup = [scene, terrainSetup(), primitiveSetup(), physicsSetup(), dynamicBody]

    expect(SZIRSchema.safeParse(project([...setup, move])).success).toBe(false)
    expect(SZIRSchema.safeParse(project([...setup, jump])).success).toBe(false)
  })

  it('aceita como sólidos somente objetos com colisor e cidades com mapa de colisão', () => {
    const setup = [scene, terrainSetup(), primitiveSetup(), physicsSetup()]
    const terrainAsCollider = {
      type: 'physicsLiteStaticObject',
      world: 'fisica',
      id: 'terrenoSolido',
      object: 'terreno',
    }
    const primitiveAsCity = {
      type: 'physicsLiteStaticCity',
      world: 'fisica',
      city: 'cubo',
      prefix: 'cidade',
    }

    expect(SZIRSchema.safeParse(project([...setup, terrainAsCollider])).success).toBe(false)
    expect(SZIRSchema.safeParse(project([...setup, primitiveAsCity])).success).toBe(false)
  })

  it('recusa IDs físicos duplicados dentro do mesmo mundo e permite reutilizar após remover', () => {
    const wall = (id: string) => ({
      type: 'physicsLiteStaticBox',
      world: 'fisica',
      id,
      x: n(0),
      y: n(1),
      z: n(0),
      width: n(1),
      height: n(2),
      depth: n(1),
    })
    const setup = [scene, terrainSetup(), physicsSetup()]

    expect(SZIRSchema.safeParse(project([...setup, wall('parede'), wall('parede')])).success).toBe(
      false,
    )
    expect(
      SZIRSchema.safeParse(
        project([
          ...setup,
          wall('parede'),
          { type: 'physicsLiteRemove', world: 'fisica', id: 'parede' },
          wall('parede'),
        ]),
      ).success,
    ).toBe(true)
  })

  it('só disponibiliza a função de altura depois de preparar o terreno', () => {
    const road = {
      type: 'roadSetup',
      road: 'estrada',
      scene: 'cena',
      x1: n(-5),
      z1: n(0),
      x2: n(5),
      z2: n(0),
      width: n(2),
      segments: n(8),
      color: color('#334155'),
      heightFunction: 'alturaChao',
    }

    expect(SZIRSchema.safeParse(project([scene, road, terrainSetup()])).success).toBe(false)
    expect(SZIRSchema.safeParse(project([scene, terrainSetup(), road])).success).toBe(true)
  })

  it('mantém estrada e prédio planos válidos quando nenhuma função de altura foi escolhida', () => {
    const road = {
      type: 'roadSetup',
      road: 'estrada',
      scene: 'cena',
      x1: n(-5),
      z1: n(0),
      x2: n(5),
      z2: n(0),
      width: n(2),
      segments: n(8),
      color: color('#334155'),
    }
    const building = {
      type: 'buildingSetup',
      building: 'predio',
      scene: 'cena',
      x: n(0),
      z: n(0),
      width: n(8),
      height: n(10),
      depth: n(8),
      color: color('#f59e0b'),
      roofColor: color('#b91c1c'),
    }

    expect(SZIRSchema.safeParse(project([scene, road, building])).success).toBe(true)
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
