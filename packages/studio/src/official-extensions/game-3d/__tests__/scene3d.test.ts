import { expect, test } from 'bun:test'
import { type CenaNoThree, resolverInicioDaCena } from '@sistemazero/molda-cenarios-motor/runtime'
import { AmbientLight, type Mesh, type PerspectiveCamera, type Scene } from 'three'
import { criarTransporteDeEnsaio } from '../../../testing/scene3dTransportFixture'
import { carregarCena3DDoProjeto } from '../../../three/scene3d'
import { criarInstaladorDeCenas3D } from '../../../three/scene3dCanvas'
import { call, loadRuntime } from './platformHarness'

interface Mundo {
  scene: Scene
  camera: PerspectiveCamera
  renderer: { _loop: ((t: number) => void) | null }
  _disposed: boolean
}
async function preparar(opcoes: Parameters<typeof criarTransporteDeEnsaio>[0] = {}) {
  const plano = await criarTransporteDeEnsaio(opcoes),
    carregados: CenaNoThree[] = [],
    instalador = criarInstaladorDeCenas3D(async (id, sinal, ajustes) => {
      const r = await carregarCena3DDoProjeto(id, plano.assets, sinal, ajustes)
      carregados.push(r)
      return r
    }),
    h = loadRuntime({
      realGeometry: true,
      sceneSDK: { instalar: instalador.instalar, inicio: resolverInicioDaCena },
    }),
    mundo: Mundo = call(h.api, 'createScene', 'tela')
  return { ...h, plano, carregados, instalador, mundo }
}

test('Jogo 3D carrega a base e chega fora da origem sem trocar câmera, renderer ou objetos autorais', async () => {
  const { api, plano, carregados, instalador, mundo } = await preparar({
      origem: { x: 200, z: 300 },
      fundo: 3,
    }),
    personagem: Mesh = call(api, 'createBlock', mundo, { width: 0.5, height: 1.16, depth: 0.5 }),
    camera = mundo.camera,
    renderer = mundo.renderer
  try {
    const carga = call(api, 'loadScene', mundo, plano.assetId)
    call(api, 'sceneStart', personagem)
    expect(await carga).toBe(true)
    expect(personagem.position.x).toBeGreaterThan(190)
    expect(personagem.position.z).toBeGreaterThan(290)
    expect(personagem.position.y).toBeCloseTo(3.58, 3)
    expect(personagem.parent).toBe(mundo.scene)
    expect(mundo.camera).toBe(camera)
    expect(mundo.renderer).toBe(renderer)
    expect(carregados[0]!.cena.parent).toBe(mundo.scene)
  } finally {
    call(api, 'disposeAll')
    instalador.descartar()
  }
})

test('uma posição explícita posterior vence o pedido de chegada que aguardava o preparo', async () => {
  const { api, plano, instalador, mundo } = await preparar(),
    personagem: Mesh = call(api, 'createBox', mundo)
  try {
    const carga = call(api, 'loadScene', mundo, plano.assetId)
    call(api, 'sceneStart', personagem)
    call(api, 'setPosition', personagem, 15, 4, 12)
    expect(await carga).toBe(true)
    expect(personagem.position.toArray()).toEqual([15, 4, 12])
  } finally {
    call(api, 'disposeAll')
    instalador.descartar()
  }
})

test('a chegada pedida durante uma substituição espera o novo cenário, sem usar o início antigo', async () => {
  const { api, plano, instalador, mundo } = await preparar({ origem: { x: 200, z: 300 } }),
    proximo = await criarTransporteDeEnsaio({ origem: { x: -200, z: -300 } }),
    personagem: Mesh = call(api, 'createBox', mundo)
  for (const asset of proximo.assets)
    if (!plano.assets.some((a) => a.id === asset.id)) plano.assets.push(asset)
  try {
    expect(await call(api, 'loadScene', mundo, plano.assetId)).toBe(true)
    call(api, 'sceneStart', personagem)
    const antes = personagem.position.toArray(),
      carga = call(api, 'loadScene', mundo, proximo.assetId)
    call(api, 'sceneStart', personagem)
    expect(personagem.position.toArray()).toEqual(antes)
    expect(await carga).toBe(true)
    const inicio = resolverInicioDaCena(instalador.instalado(mundo.scene)!).posicao
    expect(personagem.position.x).toBe(inicio.x)
    expect(personagem.position.z).toBe(inicio.z)
    expect(personagem.position.x).not.toBe(antes[0])
  } finally {
    call(api, 'disposeAll')
    instalador.descartar()
  }
})

test('falha conserva a base vigente e descarte durante preparo não instala o resultado depois', async () => {
  const { api, plano, carregados, instalador, mundo } = await preparar()
  try {
    expect(await call(api, 'loadScene', mundo, plano.assetId)).toBe(true)
    expect(await call(api, 'loadScene', mundo, 'ausente')).toBe(false)
    expect(carregados[0]!.cena.parent).toBe(mundo.scene)
    const proxima = call(api, 'loadScene', mundo, plano.assetId)
    call(api, 'dispose', mundo)
    expect(await proxima).toBe(false)
    expect(mundo._disposed).toBe(true)
    expect(carregados.every((r) => r.colisoes.arvores === 0)).toBe(true)
    expect(instalador.instalado(mundo.scene)).toBeUndefined()
  } finally {
    call(api, 'disposeAll')
    instalador.descartar()
  }
})

test('sem laço da criança o cenário ainda aparece: carregar liga o desenho de cada quadro', async () => {
  // Staging, 20/11: "Criar cena" + "Usar o cenário" (sem "A cada quadro") deixava a tela no fundo.
  // A cena só era desenhada antes da carga, vazia, e nunca mais; a água viva também parava.
  const { api, plano, instalador, mundo } = await preparar(),
    desenhos: Scene[] = [],
    renderer = mundo.renderer as Mundo['renderer'] & { render(cena: Scene): void }
  renderer.render = (cena) => {
    desenhos.push(cena)
  }
  try {
    expect(await call(api, 'loadScene', mundo, plano.assetId)).toBe(true)
    expect(renderer._loop).not.toBeNull()
    renderer._loop?.(16)
    renderer._loop?.(32)
    expect(desenhos.length).toBe(2)
    expect(desenhos.every((c) => c === mundo.scene)).toBe(true)
  } finally {
    call(api, 'disposeAll')
    instalador.descartar()
  }
})

test('o loop autoral espera a primeira carga e o descarte libera somente o cenário daquele mundo', async () => {
  const { api, plano, instalador, mundo } = await preparar(),
    outro: Mundo = call(api, 'createScene', 'outra-tela')
  let quadros = 0
  try {
    const carga = call(api, 'loadScene', mundo, plano.assetId)
    call(api, 'animate', mundo, () => {
      quadros++
    })
    mundo.renderer._loop?.(0)
    expect(quadros).toBe(0)
    expect(await carga).toBe(true)
    expect(await call(api, 'loadScene', outro, plano.assetId)).toBe(true)
    mundo.renderer._loop?.(16)
    expect(quadros).toBe(1)
    call(api, 'dispose', mundo)
    expect(instalador.instalado(mundo.scene)).toBeUndefined()
    expect(instalador.instalado(outro.scene)?.fisica.active()).toBe(true)
  } finally {
    call(api, 'disposeAll')
    instalador.descartar()
  }
})

test('a exploração existente acompanha o terreno físico e cai pelo recorte compilado', async () => {
  const { api, plano, instalador, mundo, fire } = await preparar({ comBuraco: true }),
    personagem: Mesh = call(api, 'createBlock', mundo, { width: 0.5, height: 1.16, depth: 0.5 })
  try {
    expect(await call(api, 'loadScene', mundo, plano.assetId)).toBe(true)
    call(api, 'setPosition', personagem, 10, 2, 0)
    for (let i = 0; i < 90; i++) call(api, 'topDown', personagem, 1.5)
    expect(personagem.position.y).toBeCloseTo(0.58, 3)
    fire('keydown', { code: 'KeyS' })
    for (let i = 0; i < 360; i++) call(api, 'topDown', personagem, 1.5)
    expect(personagem.position.z).toBeGreaterThan(4)
    expect(personagem.position.y).toBeLessThan(-10)
    expect(call(api, 'onGround', mundo, personagem)).toBe(false)
    expect(call(api, 'groundHeight', mundo, personagem)).toBeNull()
  } finally {
    call(api, 'disposeAll')
    instalador.descartar()
  }
})

test('o passo físico existente respeita tabuleiro, teto e salto pelos triângulos reais', async () => {
  const { api, plano, instalador, mundo } = await preparar({
      comBuraco: true,
      comPonte: true,
      comTeto: true,
    }),
    personagem: Mesh = call(api, 'createBlock', mundo, { width: 0.5, height: 1.16, depth: 0.5 })
  try {
    expect(await call(api, 'loadScene', mundo, plano.assetId)).toBe(true)
    call(api, 'setPosition', personagem, 8.5, 1.5, 5.3)
    for (let i = 0; i < 90; i++) call(api, 'stepBody', personagem, mundo)
    expect(personagem.position.y).toBeCloseTo(0.98, 3)
    call(api, 'jump', personagem, 12)
    let topo = 0
    for (let i = 0; i < 240; i++) {
      call(api, 'stepBody', personagem, mundo)
      topo = Math.max(topo, personagem.position.y + 0.58)
    }
    expect(topo).toBeGreaterThan(2)
    expect(topo).toBeLessThanOrEqual(2.301)
    expect(call(api, 'onGround', mundo, personagem)).toBe(true)
  } finally {
    call(api, 'disposeAll')
    instalador.descartar()
  }
})

test('a câmera que segue o personagem não atravessa uma parede real do cenário', async () => {
  const { api, plano, instalador, mundo } = await preparar(),
    personagem: Mesh = call(api, 'createBlock', mundo, { width: 0.2, height: 0.4, depth: 0.2 })
  try {
    expect(await call(api, 'loadScene', mundo, plano.assetId)).toBe(true)
    call(api, 'setPosition', personagem, 0.2, 0.3, -2)
    call(api, 'setCameraPosition', mundo, 0.2, 0.3, 2)
    call(api, 'cameraMode', mundo, 'longe', personagem)
    call(api, 'animate', mundo, () => {})
    mundo.renderer._loop?.(16)
    expect(mundo.camera.position.z).toBeLessThan(-0.1)
    expect(mundo.camera.position.distanceTo(personagem.position)).toBeLessThan(2)
    call(api, 'setCameraPosition', mundo, 0.2, 0.3, 2)
    mundo.renderer._loop?.(32)
    expect(mundo.camera.position.z).toBeCloseTo(2, 5)
  } finally {
    call(api, 'disposeAll')
    instalador.descartar()
  }
})

test('parede fina impede atravessamento de um corpo pequeno em alta velocidade', async () => {
  const { api, plano, instalador, mundo } = await preparar(),
    pequeno: Mesh = call(api, 'createBlock', mundo, { width: 0.02, height: 0.1, depth: 0.02 })
  try {
    expect(await call(api, 'loadScene', mundo, plano.assetId)).toBe(true)
    call(api, 'setPosition', pequeno, 0.2, 0.3, -1)
    call(api, 'body', pequeno, 0)
    call(api, 'setVelocity', pequeno, 0, 0, 120)
    call(api, 'stepBody', pequeno, mundo)
    expect(pequeno.position.z).toBeLessThanOrEqual(-0.009)
  } finally {
    call(api, 'disposeAll')
    instalador.descartar()
  }
})

test('um sólido autoral continua apoiando o personagem sobre um recorte do cenário', async () => {
  const { api, plano, instalador, mundo } = await preparar({ comBuraco: true }),
    personagem: Mesh = call(api, 'createBlock', mundo, { width: 0.5, height: 1.16, depth: 0.5 }),
    solido: Mesh = call(api, 'createBlock', mundo, { width: 2, height: 0.4, depth: 2 })
  try {
    expect(await call(api, 'loadScene', mundo, plano.assetId)).toBe(true)
    call(api, 'setPosition', solido, 10, 0.4, 8)
    call(api, 'setSolid', solido)
    call(api, 'setPosition', personagem, 10, 2, 8)
    for (let i = 0; i < 120; i++) call(api, 'stepBody', personagem, mundo)
    expect(personagem.position.y).toBeCloseTo(1.18, 3)
    expect(call(api, 'onGround', mundo, personagem)).toBe(true)
  } finally {
    call(api, 'disposeAll')
    instalador.descartar()
  }
})

test('três substituições conservam luz/objeto autorais e liberam todas as bases anteriores', async () => {
  const { api, plano, carregados, instalador, mundo } = await preparar(),
    objeto: Mesh = call(api, 'createBox', mundo),
    luz = new AmbientLight('#ccccff', 0.5)
  mundo.scene.add(luz)
  try {
    for (let i = 0; i < 3; i++) {
      expect(await call(api, 'loadScene', mundo, plano.assetId)).toBe(true)
      expect(objeto.parent).toBe(mundo.scene)
      expect(luz.parent).toBe(mundo.scene)
      expect(carregados.at(-1)!.colisoes.arvores).toBeGreaterThan(0)
      for (const anterior of carregados.slice(0, -1)) {
        expect(anterior.cena.parent).toBeNull()
        expect(anterior.colisoes.arvores).toBe(0)
      }
    }
  } finally {
    call(api, 'disposeAll')
    instalador.descartar()
  }
})

test('o controle de exploração parado conserva apoio em solo inclinado sem virar um corpo rolando', async () => {
  const { api, plano, instalador, mundo } = await preparar({ comRampa: true }),
    personagem: Mesh = call(api, 'createBlock', mundo, { width: 0.5, height: 1.16, depth: 0.5 })
  try {
    expect(await call(api, 'loadScene', mundo, plano.assetId)).toBe(true)
    call(api, 'setPosition', personagem, 9, 2, 6)
    for (let i = 0; i < 90; i++) call(api, 'topDown', personagem, 1.5)
    const inicio = personagem.position.clone()
    for (let i = 0; i < 180; i++) call(api, 'topDown', personagem, 1.5)
    expect(
      Math.hypot(personagem.position.x - inicio.x, personagem.position.z - inicio.z),
    ).toBeLessThan(0.001)
    expect(call(api, 'onGround', mundo, personagem)).toBe(true)
  } finally {
    call(api, 'disposeAll')
    instalador.descartar()
  }
})

test('recomeçar durante o preparo aborta a partida antiga sem instalar sua carga atrasada', async () => {
  const plano = await criarTransporteDeEnsaio(),
    mundos: Mundo[] = [],
    cargas: Promise<boolean>[] = []
  let liberar = () => {},
    chamadas = 0
  const barreira = new Promise<void>((resolve) => {
      liberar = resolve
    }),
    instalador = criarInstaladorDeCenas3D(async (id, sinal, opcoes) => {
      if (++chamadas === 1) await barreira
      return carregarCena3DDoProjeto(id, plano.assets, sinal, opcoes)
    }),
    { api } = loadRuntime({
      realGeometry: true,
      sceneSDK: { instalar: instalador.instalar, inicio: resolverInicioDaCena },
    })
  try {
    call(api, 'runProject', () => {
      const mundo: Mundo = call(api, 'createScene', 'tela')
      mundos.push(mundo)
      cargas.push(call(api, 'loadScene', mundo, plano.assetId))
      call(api, 'sceneStart', call(api, 'createBox', mundo))
    })
    call(api, 'restart')
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(mundos).toHaveLength(2)
    expect(await cargas[1]).toBe(true)
    liberar()
    expect(await cargas[0]).toBe(false)
    expect(mundos[0]!._disposed).toBe(true)
    expect(instalador.instalado(mundos[0]!.scene)).toBeUndefined()
    expect(instalador.instalado(mundos[1]!.scene)?.fisica.active()).toBe(true)
  } finally {
    liberar()
    call(api, 'disposeAll')
    instalador.descartar()
  }
})

test('"Quando o heroi entrar na região" conta cada entrada uma vez, inclusive começando dentro', async () => {
  const origem = { x: 100, z: 200 }
  const { api, plano, instalador, mundo } = await preparar({ origem, comRegioes: true }),
    heroi: Mesh = call(api, 'createBox', mundo)
  try {
    call(api, 'setPosition', heroi, origem.x + 10, 3, origem.z + 10)
    expect(await call(api, 'loadScene', mundo, plano.assetId)).toBe(true)
    const entradas: string[] = []
    call(api, 'onEnterRegion', heroi, 'Vila', () => entradas.push('Vila'))
    call(api, 'onEnterRegion', heroi, 'Floresta', () => entradas.push('Floresta'))
    let tempo = 0
    const step = (quadros: number) => {
      for (let i = 0; i < quadros; i++) {
        tempo += 1000 / 60
        mundo.renderer._loop?.(tempo)
      }
    }
    step(3)
    expect(entradas).toEqual(['Vila'])
    call(api, 'setPosition', heroi, origem.x + 40, 3, origem.z + 10)
    step(3)
    call(api, 'setPosition', heroi, origem.x + 50, 3, origem.z + 20)
    step(3)
    expect(entradas).toEqual(['Vila', 'Floresta'])
    call(api, 'setPosition', heroi, origem.x + 10, 3, origem.z + 10)
    step(3)
    expect(entradas).toEqual(['Vila', 'Floresta', 'Vila'])
  } finally {
    call(api, 'disposeAll')
    instalador.descartar()
  }
})

test('com a câmera parada, a carga por regiões segue quem começou no cenário (revisão do lote 6)', async () => {
  const { api, plano, carregados, instalador, mundo } = await preparar({ comRegioes: true }),
    heroi: Mesh = call(api, 'createBox', mundo)
  try {
    call(api, 'setCameraPosition', mundo, -20, 10, 0)
    const carga = call(api, 'loadScene', mundo, plano.assetId)
    call(api, 'sceneStart', heroi)
    expect(await carga).toBe(true)
    call(api, 'setPosition', heroi, 20, 3, 0)
    mundo.renderer._loop?.(16)
    mundo.renderer._loop?.(33)
    // A câmera está na Vila; o herói, na Floresta: a região atual é a dele.
    expect(carregados.at(-1)?.estadoDasRegioes()?.atual).toBe('floresta')
  } finally {
    call(api, 'disposeAll')
    instalador.descartar()
  }
})
