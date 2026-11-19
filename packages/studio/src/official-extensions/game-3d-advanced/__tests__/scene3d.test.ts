import { expect, test } from 'bun:test'
import { resolverInicioDaCena } from '@sistemazero/molda-cenarios-motor/runtime'
import { Frustum, Matrix4, Mesh, type Object3D, PlaneGeometry, Vector3 } from 'three'
import { criarTransporteDeEnsaio } from '../../../testing/scene3dTransportFixture'
import { carregarCena3DDoProjeto } from '../../../three/scene3d'
import { criarInstaladorDeCenas3D } from '../../../three/scene3dCanvas'
import { type KitApi, makeFakeThree, runtimeBody } from './kitHarness'

interface ApiComCenario extends KitApi {
  loadScene(id: string): Promise<boolean>
  sceneStart(e: unknown): void
  disposeAll(): void
  groundPoint(axis: string): number | null
  cameraLookAtPoint(x: number, y: number, z: number): void
}
interface Objeto {
  mesh: Object3D
  vx: number
  vy: number
  vz: number
  grounded: boolean
}

async function preparar(opcoes: Parameters<typeof criarTransporteDeEnsaio>[0] = {}) {
  const plano = await criarTransporteDeEnsaio(opcoes),
    anterior = Object.getOwnPropertyDescriptor(window, 'SZScene3D'),
    carregar = (
      id: string,
      sinal: AbortSignal,
      ajustes?: Parameters<typeof carregarCena3DDoProjeto>[3],
    ) => carregarCena3DDoProjeto(id, plano.assets, sinal, ajustes),
    instalador = criarInstaladorDeCenas3D(carregar),
    sdk: NonNullable<Window['SZScene3D']> = {
      carregar,
      instalar: instalador.instalar,
      instalado: instalador.instalado,
      inicio: resolverInicioDaCena,
    },
    { THREE, renderers } = makeFakeThree()
  Object.defineProperty(window, 'SZScene3D', { value: sdk, configurable: true })
  new Function('THREE', 'window', runtimeBody)(THREE, window)
  const api = (window as unknown as { SZGameKit3D: ApiComCenario }).SZGameKit3D
  const limpar = () => {
    api.disposeAll()
    instalador.descartar()
    if (anterior) Object.defineProperty(window, 'SZScene3D', anterior)
    else Reflect.deleteProperty(window, 'SZScene3D')
  }
  try {
    api.setup({ width: 640, height: 360, world: 80 })
    api.setEffects({ bloom: false, vignette: false })
    api.defineMold('heroi', { health: 100, speed: 3 }, () => {
      api.part({ shape: 'box', w: 0.5, h: 1.16, d: 0.5, x: 0, y: 0.58, z: 0, color: '#3355cc' })
    })
    const pronto = new Promise<void>((resolve) => api.onEnterState('menu', resolve)),
      carga = api.loadScene(plano.assetId)
    // The scene request precedes start, like the editor's Ao iniciar recipe.
    expect(renderers).toHaveLength(0)
    api.start()
    expect(await carga).toBe(true)
    await pronto
    const renderer = renderers[0]!
    let tempo = 0
    const step = (quadros: number) => {
      if (!renderer.loop) throw Error('O loop do Avançado não foi ligado.')
      for (let i = 0; i < quadros; i++) {
        tempo += 1000 / 60
        renderer.loop(tempo)
      }
    }
    step(1)
    api.setState('jogando')
    return { api, plano, instalador, renderer, step, limpar }
  } catch (error) {
    limpar()
    throw error
  }
}

test('Avançado pede a base antes do start e chega fora da origem sem outro renderer, câmera ou controlador', async () => {
  const { api, plano, instalador, renderer, step, limpar } = await preparar({
    origem: { x: 2000, z: 3000 },
    fundo: 3,
  })
  try {
    const camera = renderer.camera,
      scene = renderer.scene!,
      personagem = api.spawn('heroi', 0, 0, 0) as Objeto,
      base = instalador.instalado(scene)!
    api.sceneStart(personagem)
    api.cameraFollow(personagem, 6, 3)
    step(90)
    const inicio = resolverInicioDaCena(base).posicao
    expect(personagem.mesh.position.x).toBe(inicio.x)
    expect(personagem.mesh.position.z).toBe(inicio.z)
    expect(personagem.mesh.position.y).toBeCloseTo(3, 3)
    expect(personagem.mesh.parent).toBe(scene)
    expect(renderer.camera).toBe(camera)
    expect(renderer.scene).toBe(scene)
    camera!.updateMatrixWorld(true)
    const frustum = new Frustum().setFromProjectionMatrix(
      new Matrix4().multiplyMatrices(camera!.projectionMatrix, camera!.matrixWorldInverse),
    )
    expect(
      frustum.containsPoint(personagem.mesh.position.clone().add(new Vector3(0, 0.58, 0))),
    ).toBe(true)
    expect(base.dados.fonte).toBeDefined()
    expect(plano.assetId.length).toBeGreaterThan(0)
  } finally {
    limpar()
  }
})

test('troca pendente aguarda o novo início e place posterior cancela a chegada', async () => {
  const { api, plano, instalador, renderer, limpar } = await preparar({
      origem: { x: 200, z: 300 },
    }),
    proximo = await criarTransporteDeEnsaio({ origem: { x: -200, z: -300 } })
  for (const asset of proximo.assets)
    if (!plano.assets.some((a) => a.id === asset.id)) plano.assets.push(asset)
  try {
    const personagem = api.spawn('heroi', 0, 0, 0) as Objeto
    api.sceneStart(personagem)
    const antes = personagem.mesh.position.toArray(),
      carga = api.loadScene(proximo.assetId)
    api.sceneStart(personagem)
    expect(personagem.mesh.position.toArray()).toEqual(antes)
    expect(await carga).toBe(true)
    const inicio = resolverInicioDaCena(instalador.instalado(renderer.scene!)!).posicao
    expect(personagem.mesh.position.x).toBe(inicio.x)
    expect(personagem.mesh.position.z).toBe(inicio.z)
    const volta = api.loadScene(plano.assetId)
    api.sceneStart(personagem)
    api.place(personagem, 15, 4, 12)
    expect(await volta).toBe(true)
    expect(personagem.mesh.position.toArray()).toEqual([15, 4, 12])
  } finally {
    limpar()
  }
})

test('base vigente sobrevive à falha; descarte durante preparo impede montagem atrasada', async () => {
  const { api, plano, instalador, renderer, limpar } = await preparar()
  try {
    const scene = renderer.scene!,
      base = instalador.instalado(scene)!
    expect(await api.loadScene('ausente')).toBe(false)
    expect(instalador.instalado(scene)).toBe(base)
    expect(base.fisica.active()).toBe(true)
    const carga = api.loadScene(plano.assetId)
    api.disposeAll()
    expect(await carga).toBe(false)
    expect(instalador.instalado(scene)).toBeUndefined()
    expect(base.colisoes.arvores).toBe(0)
  } finally {
    limpar()
  }
})

test('uma chegada atrasada não ressuscita um objeto reciclado nem move a nova vida do mesmo mesh', async () => {
  const { api, plano, limpar } = await preparar()
  try {
    const velho = api.spawn('heroi', 0, 0, 0) as Objeto,
      carga = api.loadScene(plano.assetId)
    api.sceneStart(velho)
    api.recycle(velho)
    const novo = api.spawn('heroi', 15, 4, 12) as Objeto
    expect(novo.mesh).toBe(velho.mesh)
    expect(await carga).toBe(true)
    expect(api.exists(velho)).toBe(false)
    expect(api.exists(novo)).toBe(true)
    expect(novo.mesh.position.toArray()).toEqual([15, 4, 12])
  } finally {
    limpar()
  }
})

test('a gravidade do Avançado pousa na superfície compilada elevada, conservando o molde dos pés', async () => {
  const { api, instalador, renderer, step, limpar } = await preparar({
    origem: { x: 200, z: 300 },
    fundo: 3,
  })
  try {
    const inicio = resolverInicioDaCena(instalador.instalado(renderer.scene!)!).posicao,
      e = api.spawn('heroi', inicio.x, 8, inicio.z) as Objeto
    api.fall(e, 22)
    step(120)
    expect(e.mesh.position.y).toBeCloseTo(3, 3)
    expect(api.onGround(e)).toBe(true)
  } finally {
    limpar()
  }
})

test('o recorte compilado deixa cair continuamente, sem o piso analítico antigo', async () => {
  const { api, step, limpar } = await preparar({ comBuraco: true })
  try {
    const e = api.spawn('heroi', 10, 2, 0) as Objeto
    api.fall(e, 22)
    step(90)
    expect(e.mesh.position.y).toBeCloseTo(0, 3)
    api.setVelocity(e, 0, 0, 1.5)
    step(360)
    expect(e.mesh.position.z).toBeGreaterThan(4)
    expect(e.mesh.position.y).toBeLessThan(-10)
    expect(api.onGround(e)).toBe(false)
  } finally {
    limpar()
  }
})

test('ponte real sustenta salto/pouso e teto limita o corpo sem cobrir o recorte', async () => {
  const { api, step, limpar } = await preparar({ comBuraco: true, comPonte: true, comTeto: true })
  try {
    // Avançado anchors at the feet; 0.8 leaves the full 1.16 m body below the ceiling.
    const e = api.spawn('heroi', 8.5, 0.8, 5.3) as Objeto
    api.fall(e, 22)
    step(90)
    expect(e.mesh.position.y).toBeCloseTo(0.4, 3)
    api.jump(e, 12)
    step(1)
    expect(api.onGround(e)).toBe(false)
    let topo = 0
    for (let i = 0; i < 240; i++) {
      step(1)
      topo = Math.max(topo, e.mesh.position.y + 1.16)
    }
    expect(topo).toBeGreaterThan(2)
    expect(topo).toBeLessThanOrEqual(2.301)
    expect(e.mesh.position.x).toBeCloseTo(8.5, 6)
    expect(e.mesh.position.z).toBeCloseTo(5.3, 6)
    expect(e.vy).toBeCloseTo(0, 3)
    expect(api.onGround(e)).toBe(true)
    expect(e.mesh.position.y).toBeCloseTo(0.4, 3)
  } finally {
    limpar()
  }
})

test('parede triangular segura o corpo rápido sem gravidade; o fantasma atravessa essa parede', async () => {
  const { api, step, limpar } = await preparar()
  try {
    api.defineMold('pequeno', { health: 100, speed: 0 }, () =>
      api.part({ shape: 'box', w: 0.1, h: 0.2, d: 0.1, x: 0, y: 0.1, z: 0, color: '#3355cc' }),
    )
    const solido = api.spawn('pequeno', 0.2, 0.3, -1) as Objeto,
      fantasma = api.spawn('heroi', 0.8, 0.3, -1) as Objeto
    api.passThrough(fantasma, true)
    api.setVelocity(solido, 0, 0, 120)
    api.setVelocity(fantasma, 0, 0, 120)
    step(1)
    expect(solido.mesh.position.z).toBeLessThanOrEqual(-0.049)
    expect(fantasma.mesh.position.z).toBeGreaterThan(0.9)
  } finally {
    limpar()
  }
})

test('andar na rampa nativa não cria lançamentos verticais e um pulo solicitado no quadro é recebido', async () => {
  const { api, step, limpar } = await preparar({ comRampa: true })
  try {
    const e = api.spawn('heroi', 9, 0.7, 6) as Objeto
    api.fall(e, 22)
    step(8)
    expect(api.onGround(e)).toBe(true)
    expect(e.mesh.position.y).toBeGreaterThan(0.5)
    for (let i = 0; i < 40; i++) {
      api.setVelocity(e, 0, e.vy, 1.5)
      step(1)
      expect(api.onGround(e)).toBe(true)
      expect(e.vy).toBeCloseTo(0, 8)
    }
    api.setVelocity(e, 0, e.vy, 0)
    const base = e.mesh.position.y
    let pedido = true
    api.onUpdate(() => {
      api.moveWithKeys(e, 0)
      if (pedido) {
        pedido = false
        api.jump(e, 7)
      }
    })
    step(1)
    let topo = base
    for (let i = 0; i < 90; i++) {
      step(1)
      topo = Math.max(topo, e.mesh.position.y)
    }
    expect(topo).toBeGreaterThan(base + 0.25)
    expect(api.onGround(e)).toBe(true)
    const pouso = e.mesh.position.y
    api.setVelocity(e, 0, 5, 0)
    step(1)
    expect(e.vy).toBeGreaterThan(4)
    expect(e.mesh.position.y).toBeGreaterThan(pouso)
  } finally {
    limpar()
  }
})

test('o fantasma com gravidade ainda pousa no chão real; um sólido autoral continua apoiando sobre o recorte', async () => {
  const { api, step, limpar } = await preparar({ comBuraco: true })
  try {
    const fantasma = api.spawn('heroi', 10, 2, 0) as Objeto
    api.passThrough(fantasma, true)
    api.fall(fantasma, 22)
    api.defineMold('patamar', { health: 100, speed: 0 }, () =>
      api.part({ shape: 'box', w: 2, h: 0.4, d: 2, x: 0, y: 0.2, z: 0, color: '#ffaa33' }),
    )
    api.makeSolid('patamar')
    const patamar = api.spawn('patamar', 10, 0.2, 8) as Objeto
    const passageiro = api.spawn('heroi', 10, 2, 8) as Objeto
    api.fall(passageiro, 22)
    step(120)
    expect(fantasma.mesh.position.y).toBeCloseTo(0, 3)
    expect(api.onGround(fantasma)).toBe(true)
    expect(passageiro.mesh.position.y).toBeCloseTo(0.6, 3)
    expect(api.onGround(passageiro)).toBe(true)
    api.setVelocity(patamar, 1, 0, 0)
    step(60)
    expect(passageiro.mesh.position.x).toBeCloseTo(11, 2)
    expect(passageiro.mesh.position.y).toBeCloseTo(0.6, 3)
  } finally {
    limpar()
  }
})

test('o ponto do mouse usa o terreno real elevado, inclusive fora da origem', async () => {
  const { api, renderer, instalador, step, limpar } = await preparar({
    origem: { x: 200, z: 300 },
    fundo: 3,
  })
  try {
    const p = resolverInicioDaCena(instalador.instalado(renderer.scene!)!).posicao
    api.cameraLookAtPoint(p.x, 3, p.z)
    api.cameraTop(30)
    step(1)
    expect(api.groundPoint('y')).toBeCloseTo(3, 5)
    expect(api.groundPoint('x')).toBeCloseTo(p.x, 5)
    expect(api.groundPoint('z')).toBeCloseTo(p.z, 5)
  } finally {
    limpar()
  }
})

test('o mouse não inventa um acerto em y zero dentro do recorte', async () => {
  const { api, step, limpar } = await preparar({ comBuraco: true })
  try {
    api.cameraLookAtPoint(10, 0, 8)
    api.cameraTop(30)
    step(1)
    expect(api.groundPoint('y')).toBeNull()
  } finally {
    limpar()
  }
})

test('a câmera que segue para diante da parede real e o modo de órbita permanece autoral', async () => {
  const { api, renderer, instalador, step, limpar } = await preparar({ comParedeAlta: true })
  try {
    const e = api.spawn('heroi', 0.2, 0.1, -2) as Objeto,
      camera = renderer.camera!
    api.setYaw(e, 180)
    api.cameraFollow(e, 4, 2)
    step(180)
    // The margin is measured along the ray, not along world Z at an oblique approach.
    expect(camera.position.z).toBeLessThan(0)
    const alvo = e.mesh.getWorldPosition(new Vector3())
    alvo.y += 1
    expect(
      instalador
        .instalado(renderer.scene!)!
        .colisoes.rastrear(alvo, camera.getWorldPosition(new Vector3())),
    ).toBeNull()
    expect(renderer.camera).toBe(camera)
    api.cameraOrbit(25)
    api.cameraLookAtPoint(0, 0, 0)
    step(1)
    expect(camera.position.z).toBeGreaterThan(2)
  } finally {
    limpar()
  }
})

test('descarregar pelo SDK não ressuscita o piso analítico nem consulta o BVH liberado', async () => {
  const { api, instalador, renderer, step, limpar } = await preparar()
  try {
    const base = instalador.instalado(renderer.scene!)!,
      e = api.spawn('heroi', 10, 2, 0) as Objeto
    base.descartar()
    api.fall(e, 22)
    step(120)
    expect(base.colisoes.arvores).toBe(0)
    expect(e.mesh.position.y).toBeLessThan(-10)
    expect(api.onGround(e)).toBe(false)
    api.cameraLookAtPoint(10, 0, 0)
    api.cameraTop(30)
    step(1)
    expect(api.groundPoint('y')).toBeNull()
  } finally {
    limpar()
  }
})

test('a fábrica recomeça com a base nova e volta ao chão visível padrão quando deixa de pedir cenário', async () => {
  const { api, plano, instalador, renderer, step, limpar } = await preparar(),
    scene = renderer.scene!,
    camera = renderer.camera,
    cargas: Promise<boolean>[] = [],
    personagens: Objeto[] = []
  let comCena = true
  try {
    api.runProject(() => {
      if (comCena) cargas.push(api.loadScene(plano.assetId))
      api.defineMold('visitante', { health: 100, speed: 3 }, () =>
        api.part({ shape: 'box', w: 0.5, h: 1.16, d: 0.5, x: 0, y: 0.58, z: 0, color: '#3366dd' }),
      )
      api.onEnterState('jogando', () => {
        const e = api.spawn('visitante', 0, 2, 0) as Objeto
        personagens.push(e)
        if (comCena) api.sceneStart(e)
      })
    })
    const antiga = instalador.instalado(scene)!
    api.setState('menu')
    api.setState('jogando')
    expect(await cargas[0]).toBe(false)
    expect(await cargas[1]).toBe(true)
    const atual = instalador.instalado(scene)!
    expect(atual).not.toBe(antiga)
    expect(antiga.colisoes.arvores).toBe(0)
    expect(api.exists(personagens[0])).toBe(true)
    comCena = false
    api.setState('menu')
    api.setState('jogando')
    expect(instalador.instalado(scene)).toBeUndefined()
    expect(atual.colisoes.arvores).toBe(0)
    expect(api.exists(personagens[0])).toBe(false)
    expect(api.exists(personagens[1])).toBe(true)
    expect(
      scene.children.some((n) => n instanceof Mesh && n.geometry instanceof PlaneGeometry),
    ).toBe(true)
    api.fall(personagens[1], 22)
    step(120)
    expect(personagens[1]!.mesh.position.y).toBeCloseTo(0, 3)
    expect(renderer.camera).toBe(camera)
    expect(renderer.scene).toBe(scene)
  } finally {
    limpar()
  }
})

test('a câmera e a base distante permanecem estáveis enquanto a nova partida aguarda sua chegada', async () => {
  const { api, plano, instalador, renderer, step, limpar } = await preparar({
    origem: { x: 2000, z: 3000 },
  })
  let liberar!: () => void
  const espera = new Promise<void>((resolve) => {
      liberar = resolve
    }),
    cargas: Promise<boolean>[] = [],
    personagens: Objeto[] = []
  try {
    const antigo = api.spawn('heroi', 0, 0, 0) as Objeto
    api.sceneStart(antigo)
    api.cameraFollow(antigo, 6, 3)
    step(90)
    const camera = renderer.camera!,
      antes = camera.position.toArray(),
      orientacao = camera.quaternion.toArray(),
      base = instalador.instalado(renderer.scene!)!,
      sdk = window.SZScene3D!
    Object.defineProperty(window, 'SZScene3D', {
      configurable: true,
      value: {
        ...sdk,
        instalar: (...args: Parameters<typeof sdk.instalar>) =>
          espera.then(() => sdk.instalar(...args)),
      },
    })
    api.runProject(() => {
      cargas.push(api.loadScene(plano.assetId))
      api.defineMold('visitante', { health: 100, speed: 3 }, () =>
        api.part({ shape: 'box', w: 0.5, h: 1.16, d: 0.5, x: 0, y: 0.58, z: 0, color: '#3366dd' }),
      )
      api.onEnterState('jogando', () => {
        const e = api.spawn('visitante', 0, 0, 0) as Objeto
        personagens.push(e)
        api.sceneStart(e)
        api.cameraFollow(e, 6, 3)
      })
    })
    api.setState('menu')
    api.setState('jogando')
    step(30)
    expect(base.fisica.active()).toBe(true)
    expect(personagens[0]!.mesh.position.toArray()).toEqual([0, 0, 0])
    expect(camera.position.toArray()).toEqual(antes)
    expect(camera.quaternion.toArray()).toEqual(orientacao)
    liberar()
    expect(await cargas[0]).toBe(false)
    expect(await cargas[1]).toBe(true)
    step(90)
    expect(personagens[0]!.mesh.position.x).toBeGreaterThan(2000)
    expect(renderer.camera).toBe(camera)
    expect(base.fisica.active()).toBe(false)
  } finally {
    liberar()
    limpar()
  }
})

test('o quique do molde continua respondendo ao chão compilado', async () => {
  const { api, step, limpar } = await preparar()
  try {
    api.setBounce('heroi', 0.7)
    const e = api.spawn('heroi', 5, 3, 5) as Objeto
    api.fall(e, 22)
    let subiu = false,
      aposImpacto = 0
    for (let i = 0; i < 150; i++) {
      step(1)
      if (e.vy > 1) subiu = true
      if (subiu) aposImpacto = Math.max(aposImpacto, e.mesh.position.y)
    }
    expect(subiu).toBe(true)
    expect(aposImpacto).toBeGreaterThan(0.5)
    expect(e.mesh.position.y).toBeGreaterThanOrEqual(-1e-4)
  } finally {
    limpar()
  }
})
