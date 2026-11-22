import { expect, test } from 'bun:test'
import { CylinderGeometry, Matrix4, Object3D, PlaneGeometry, Scene } from 'three'
import { MundoDoTeste } from '../../../../molda-cenarios-motor/src/teste/colisoes'
import { criarTransporteDeEnsaio } from '../../testing/scene3dTransportFixture'
import { physicsLiteRuntimeSource } from '../physicsLiteRuntime'
import { carregarCena3DDoProjeto } from '../scene3d'
import { criarInstaladorDeCenas3D } from '../scene3dCanvas'
import { criarFisicaDaCena3D } from '../scene3dPhysics'

interface Ponto {
  x: number
  y: number
  z: number
}
interface Corpo extends Ponto {
  vx: number
  vy: number
  vz: number
  grounded: boolean
}
interface Mundo {
  setScene(id: string, provedor: unknown): void
  addBody(id: string, objeto: Object3D, opcoes?: Record<string, unknown>): void
  addStaticBox(id: string, x: number, y: number, z: number, w: number, h: number, d: number): void
  body(id: string): Corpo
  step(dt: number): void
  jump(id: string, velocidade: number): boolean
  moveCharacter(id: string, x: number, z: number, velocidade: number): void
  setVelocity(id: string, x: number, y: number, z: number): void
  onCollision(callback: (a: string, b: string) => void): void
  raycast(
    x: number,
    y: number,
    z: number,
    dx: number,
    dy: number,
    dz: number,
    limite: number,
  ): { id: string; distance: number } | null
  remove(id: string): boolean
  clear(): void
  stats(): { bodies: number; statics: number; triggers: number }
}
function mundo(opcoes: Record<string, unknown> = {}): Mundo {
  return new Function('opcoes', `${physicsLiteRuntimeSource}\nreturn createSZPhysicsLite(opcoes);`)(
    opcoes,
  )
}
function corpo(fisica: Mundo, x: number, y: number, z: number, id = 'criador') {
  const objeto = new Object3D()
  objeto.position.set(x, y, z)
  fisica.addBody(id, objeto, { kind: 'character', width: 0.5, height: 1.16, depth: 0.5 })
  return objeto
}
function andarTempo(fisica: Mundo, quadros = 120) {
  for (let i = 0; i < quadros; i++) fisica.step(1 / 60)
}
async function preparar(opcoes: Parameters<typeof criarTransporteDeEnsaio>[0] = {}) {
  const fonte = await criarTransporteDeEnsaio(opcoes),
    instalador = criarInstaladorDeCenas3D((id, sinal, ajustes) =>
      carregarCena3DDoProjeto(id, fonte.assets, sinal, ajustes),
    ),
    cena = new Scene(),
    pronto = await instalador.instalar(fonte.assetId, cena, new AbortController().signal)
  return { fonte, instalador, cena, pronto }
}

test('Physics Lite usa o chão compilado fora da origem, sem chamar o piso analítico anterior', async () => {
  const { instalador, pronto } = await preparar({ origem: { x: 200, z: 300 }, fundo: 3 }),
    fisica = mundo({
      groundHeight: () => {
        throw Error('piso antigo consultado')
      },
    })
  try {
    fisica.setScene('ilha', pronto.fisica)
    const objeto = corpo(fisica, 210, 6, 310)
    andarTempo(fisica)
    expect(objeto.position.y).toBeCloseTo(3.58, 3)
    expect(fisica.body('criador').grounded).toBe(true)
    expect(fisica.raycast(210, 10, 310, 0, -1, 0, 20)).toEqual({ id: 'ilha', distance: 7 })
  } finally {
    fisica.clear()
    instalador.descartar()
  }
})

test('o recorte compilado deixa o corpo cair por gravidade, sem piso zero invisível', async () => {
  const { instalador, pronto } = await preparar({ comBuraco: true }),
    fisica = mundo()
  try {
    fisica.setScene('ilha', pronto.fisica)
    const objeto = corpo(fisica, 10, 2, 8)
    andarTempo(fisica)
    expect(objeto.position.y).toBeLessThan(-10)
    expect(fisica.body('criador').grounded).toBe(false)
    expect(fisica.raycast(10, 10, 8, 0, -1, 0, 30)).toBeNull()
  } finally {
    fisica.clear()
    instalador.descartar()
  }
})

test('o tabuleiro real sustenta o corpo, permite salto e o teto compilado impede atravessamento', async () => {
  const { instalador, pronto } = await preparar({ comBuraco: true, comPonte: true, comTeto: true }),
    fisica = mundo(),
    contatos: string[] = []
  try {
    fisica.setScene('ilha', pronto.fisica)
    corpo(fisica, 8.5, 1.5, 5.3)
    fisica.onCollision((a, b) => contatos.push(`${a}:${b}`))
    andarTempo(fisica)
    expect(fisica.body('criador').y).toBeCloseTo(0.98, 3)
    expect(fisica.jump('criador', 12)).toBe(true)
    let topo = 0
    for (let i = 0; i < 90; i++) {
      fisica.step(1 / 60)
      topo = Math.max(topo, fisica.body('criador').y + 0.58)
    }
    expect(topo).toBeGreaterThan(2)
    expect(topo).toBeLessThanOrEqual(2.301)
    expect(fisica.body('criador').grounded).toBe(true)
    expect(contatos).toContain('criador:ilha')
    fisica.addStaticBox('autoral', 8.5, 3, 5.3, 1, 0.1, 1)
    expect(fisica.raycast(8.5, 4, 5.3, 0, -1, 0, 10)?.id).toBe('autoral')
    expect(fisica.raycast(8.5, 2, 5.3, 0, -1, 0, 10)?.id).toBe('ilha')
  } finally {
    fisica.clear()
    instalador.descartar()
  }
})

test('troca e descarte não consultam BVH liberado nem recriam chão; corpos e colisores autorais permanecem', async () => {
  const { fonte, instalador, cena, pronto } = await preparar(),
    fisica = mundo()
  try {
    fisica.setScene('ilha', pronto.fisica)
    corpo(fisica, 10, 2, 10)
    fisica.addStaticBox('autoral', 20, 1, 20, 1, 2, 1)
    expect(() => fisica.addStaticBox('ilha', 0, 0, 0, 1, 1, 1)).toThrow()
    andarTempo(fisica)
    const novo = await instalador.instalar(fonte.assetId, cena, new AbortController().signal)
    expect(pronto.fisica.active()).toBe(false)
    fisica.setScene('ilha', novo.fisica)
    andarTempo(fisica, 10)
    expect(fisica.body('criador').grounded).toBe(true)
    expect(fisica.stats()).toMatchObject({ bodies: 1, statics: 2 })
    novo.descartar()
    expect(() => andarTempo(fisica)).not.toThrow()
    expect(fisica.body('criador').y).toBeLessThan(-10)
    expect(fisica.stats()).toMatchObject({ bodies: 1, statics: 1 })
    expect(fisica.raycast(20, 5, 20, 0, -1, 0, 10)?.id).toBe('autoral')
    expect(fisica.remove('ilha')).toBe(false)
    expect(() => fisica.setScene('outro', pronto.fisica)).toThrow()
  } finally {
    fisica.clear()
    instalador.descartar()
  }
})

test('o deslocamento subdividido não atravessa a parede triangular fina, inclusive com corpo pequeno e rápido', async () => {
  const { instalador, pronto } = await preparar(),
    fisica = mundo({ gravity: 0 })
  try {
    fisica.setScene('ilha', pronto.fisica)
    const objeto = new Object3D()
    objeto.position.set(0.2, 0.3, -1)
    fisica.addBody('pequeno', objeto, { width: 0.02, height: 0.1, depth: 0.02 })
    fisica.setVelocity('pequeno', 0, 0, 120)
    fisica.step(1 / 60)
    expect(objeto.position.z).toBeLessThanOrEqual(-0.009)
    expect(fisica.body('pequeno').vz).toBeCloseTo(0, 5)
  } finally {
    fisica.clear()
    instalador.descartar()
  }
})

test('atravessa a junta entre peças reais sem preencher todo o buraco com um piso artificial', async () => {
  const { instalador, pronto } = await preparar({ comBuraco: true, comPonte: true }),
    fisica = mundo()
  try {
    fisica.setScene('ilha', pronto.fisica)
    corpo(fisica, 8.05, 1.2, 5.5)
    andarTempo(fisica, 30)
    fisica.moveCharacter('criador', 0, 1, 1.5)
    let menor = Infinity
    for (let i = 0; i < 65; i++) {
      fisica.step(1 / 60)
      menor = Math.min(menor, fisica.body('criador').y)
    }
    expect(menor).toBeGreaterThan(0.75)
    expect(fisica.body('criador').z).toBeGreaterThan(6.5)
    expect(fisica.raycast(10, 3, 8, 0, -1, 0, 10)).toBeNull()
  } finally {
    fisica.clear()
    instalador.descartar()
  }
})

test('remover a ligação emprestada não descarta a cena visual; clear permite reutilizar o mundo legado', async () => {
  const { instalador, pronto } = await preparar(),
    fisica = mundo()
  try {
    fisica.setScene('ilha', pronto.fisica)
    corpo(fisica, 10, 1, 10)
    expect(fisica.remove('ilha')).toBe(true)
    expect(pronto.fisica.active()).toBe(true)
    expect(pronto.colisoes.arvores).toBeGreaterThan(0)
    andarTempo(fisica)
    expect(fisica.body('criador').y).toBeLessThan(-10)
    fisica.clear()
    corpo(fisica, 10, 1, 10)
    andarTempo(fisica)
    expect(fisica.body('criador').y).toBeCloseTo(0.58, 4)
  } finally {
    fisica.clear()
    instalador.descartar()
  }
})

test('o cenário participa dos limites e dos IDs físicos; uma ligação inválida conserva a atual', async () => {
  const { instalador, pronto } = await preparar(),
    fisica = mundo({ maxStatics: 1 }),
    inversa = mundo({ maxStatics: 1 })
  try {
    fisica.setScene('ilha', pronto.fisica)
    expect(() => fisica.addStaticBox('outro', 0, 0, 0, 1, 1, 1)).toThrow('Limite')
    expect(() => fisica.setScene('errado', {})).toThrow('carregado')
    expect(fisica.raycast(10, 4, 10, 0, -1, 0, 10)?.id).toBe('ilha')
    fisica.setScene('renomeado', pronto.fisica)
    expect(fisica.remove('ilha')).toBe(false)
    expect(fisica.remove('renomeado')).toBe(true)
    inversa.addStaticBox('autoral', 0, 0, 0, 1, 1, 1)
    expect(() => inversa.setScene('ilha', pronto.fisica)).toThrow('Limite')
    expect(inversa.stats().statics).toBe(1)
  } finally {
    fisica.clear()
    inversa.clear()
    instalador.descartar()
  }
})

test('os pés apoiam sobre toras arredondadas sem escorregar lateralmente nas juntas da ponte', () => {
  const geometria = new CylinderGeometry(0.22, 0.22, 2, 12),
    colisoes = new MundoDoTeste(
      Array.from({ length: 8 }, (_, i) => ({
        geometria,
        matriz: new Matrix4().makeRotationZ(Math.PI / 2).setPosition(0, 0, i * 0.5),
      })),
    ),
    fisica = mundo()
  try {
    fisica.setScene(
      'ponte',
      criarFisicaDaCena3D({ colisoes }, () => true),
    )
    corpo(fisica, 0, 0.8, 0)
    andarTempo(fisica, 15)
    fisica.moveCharacter('criador', 0, 1, 1.5)
    let menor = Infinity
    for (let i = 0; i < 180; i++) {
      fisica.step(1 / 60)
      menor = Math.min(menor, fisica.body('criador').y)
    }
    expect(menor).toBeGreaterThan(0.65)
    expect(fisica.body('criador').z).toBeGreaterThan(2)
    expect(Math.abs(fisica.body('criador').x)).toBeLessThan(0.02)
  } finally {
    fisica.clear()
    colisoes.descartar()
    geometria.dispose()
  }
})

test('o personagem conserva apoio em repouso no plano inclinado real e pode saltar dele', () => {
  const geometria = new PlaneGeometry(40, 40).rotateX(-Math.PI / 2 + 0.15),
    colisoes = new MundoDoTeste([{ geometria, matriz: new Matrix4() }]),
    fisica = mundo()
  try {
    fisica.setScene(
      'encosta',
      criarFisicaDaCena3D({ colisoes }, () => true),
    )
    corpo(fisica, 0, 1, 0)
    andarTempo(fisica, 60)
    const antes = fisica.body('criador')
    expect(antes.grounded).toBe(true)
    andarTempo(fisica, 300)
    const parado = fisica.body('criador')
    expect(Math.hypot(parado.x - antes.x, parado.z - antes.z)).toBeLessThan(0.005)
    expect(parado.grounded).toBe(true)
    expect(fisica.jump('criador', 7)).toBe(true)
    andarTempo(fisica, 15)
    expect(fisica.body('criador').y).toBeGreaterThan(parado.y + 0.25)
    andarTempo(fisica, 120)
    expect(fisica.body('criador').grounded).toBe(true)
  } finally {
    fisica.clear()
    colisoes.descartar()
    geometria.dispose()
  }
})

test('o apoio do personagem não retira o quique de um corpo dinâmico no cenário nativo', () => {
  const geometria = new PlaneGeometry(20, 20).rotateX(-Math.PI / 2),
    colisoes = new MundoDoTeste([{ geometria, matriz: new Matrix4() }]),
    fisica = mundo(),
    objeto = new Object3D()
  try {
    fisica.setScene(
      'solo',
      criarFisicaDaCena3D({ colisoes }, () => true),
    )
    objeto.position.set(0, 2, 0)
    fisica.addBody('bola', objeto, {
      kind: 'dynamic',
      width: 0.5,
      height: 0.5,
      depth: 0.5,
      bounce: 0.7,
    })
    let subiu = false,
      aposImpacto = 0
    for (let i = 0; i < 100; i++) {
      fisica.step(1 / 60)
      if (fisica.body('bola').vy > 1) subiu = true
      if (subiu) aposImpacto = Math.max(aposImpacto, fisica.body('bola').y)
    }
    expect(subiu).toBe(true)
    expect(aposImpacto).toBeGreaterThan(0.7)
  } finally {
    fisica.clear()
    colisoes.descartar()
    geometria.dispose()
  }
})

// O apoio dos pés (lote 6 da conclusão, 22/11/2026): a régua mora no mundo de colisões do motor
// (`apoioPorRaios`, provada contra o laço antigo em `molda-cenarios-motor/tests/apoio.test.ts`);
// o SDK confere a cena ativa e repassa.
test('o apoio do SDK repassa ao mundo de colisões e recusa a cena descarregada', () => {
  const chamadas: unknown[][] = []
  const colisoes = {
    apoio: (...args: unknown[]) => {
      chamadas.push(args)
      return { y: 2, normal: { x: 0, y: 1, z: 0 } }
    },
  }
  let ativa = true
  const fisica = criarFisicaDaCena3D({ colisoes } as never, () => ativa)
  expect(fisica.apoio(1, 2, 0.5, 4, -4, 0.64, true)).toEqual({ y: 2, normal: { x: 0, y: 1, z: 0 } })
  expect(chamadas).toEqual([[1, 2, 0.5, 4, -4, 0.64, true]])
  ativa = false
  expect(() => fisica.apoio(0, 0, 1, 1, -1, 0)).toThrow('descarregado')
})
