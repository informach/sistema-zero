import { expect, test } from 'bun:test'
import { criarDocumentoVazio, MarcadorSchema } from '@sistemazero/molda-cenarios-core/v2'
import { Box3, Matrix4, PerspectiveCamera, Raycaster, Vector2, Vector3 } from 'three'
import { MarcadoresDoPalco } from '../src/jogo/marcadores'

function cena() {
  const d = criarDocumentoVazio('d', 'Marcos')
  d.marcadores = [
    MarcadorSchema.parse({
      id: 'm',
      nome: 'Marco',
      grupo: null,
      bloqueado: false,
      oculto: false,
      posicao: { x: 0, y: 0, z: 0 },
      giro: 0,
      noChao: false,
      objeto: null,
    }),
  ]
  return d
}

test('prévia da rota acompanha relevo não linear ao mover e escalar, sem escalar o terreno', () => {
  const d = cena(),
    guias = new MarcadoresDoPalco()
  d.base = {
    tipo: 'terreno',
    cobertura: 'grade',
    origem: { x: -32, z: -32 },
    colunas: 64,
    linhas: 64,
    passo: 1,
    min: -10,
    max: 20,
    fundo: 0,
    pecas: [],
  }
  d.marcadores[0]!.configuracao = {
    tipo: 'rota',
    pontos: [
      { x: 0, y: 1, z: 0 },
      { x: 4, y: 1, z: 0 },
    ],
    fechada: false,
    seguirTerreno: true,
  }
  const fonte = (x: number) => (x * x) / 10,
    antes = structuredClone(d)
  try {
    guias.definir(d, fonte)
    const alvo = guias.alvos().get('m')!,
      matriz = new Matrix4().makeScale(2, 3, 1)
    matriz.setPosition(2, 0.4, 0)
    alvo.matriz.copy(matriz)
    alvo.atualizar()
    const g = (guias.grupo.children[0] as import('three').LineSegments).geometry,
      pos = g.getAttribute('position')
    for (let i = 0; i < g.drawRange.count; i++)
      expect(pos.getY(i)).toBeCloseTo(fonte(pos.getX(i)) + 3, 5)
    expect(guias.limitesDo('m', new Box3()).max.y).toBeCloseTo(13, 5)
    expect(d).toEqual(antes)
  } finally {
    guias.descartar()
  }
})
test('guia compartilha buffers, picking segue os segmentos e ocultar retira a escolha', () => {
  const d = cena(),
    m = new MarcadoresDoPalco(),
    camera = new PerspectiveCamera(48, 1.6, 0.1, 100),
    raio = new Raycaster()
  camera.position.set(0, 1, 6)
  camera.lookAt(0, 0.8, 0)
  camera.updateMatrixWorld()
  const p = new Vector3(0.25, 0.9, 0).project(camera)
  raio.setFromCamera(new Vector2(p.x, p.y), camera)
  try {
    expect(m.definir(d).falhas).toEqual([])
    expect(m.escolher(raio, camera, 900)?.id).toBe('m')
    const perto = new Vector3(-0.01, 0.5, 0).project(camera)
    raio.setFromCamera(new Vector2(perto.x, perto.y), camera)
    expect(m.escolher(raio, camera, 900)?.id).toBe('m')
    const linha = m.grupo.children[0] as import('three').LineSegments,
      g = linha.geometry,
      a = g.getAttribute('position')
    expect(m.definir(d).falhas).toEqual([])
    expect(linha.geometry).toBe(g)
    expect(linha.geometry.getAttribute('position')).toBe(a)
    d.marcadores[0]!.oculto = true
    m.definir(d)
    expect(m.escolher(raio, camera, 900)).toBeNull()
    expect(g.drawRange.count).toBe(0)
    expect(m.limitesDo('m', new Box3()).isEmpty()).toBe(true)
  } finally {
    m.descartar()
    m.descartar()
  }
})
test('alvo de edição atualiza guia e volume sem alterar marcador autoral', () => {
  const d = cena(),
    m = new MarcadoresDoPalco(),
    antes = structuredClone(d)
  try {
    m.definir(d)
    const alvo = m.alvos().get('m')!
    alvo.matriz.makeTranslation(2, 3, 4)
    alvo.atualizar()
    const caixa = m.limitesDo('m', new Box3())
    expect(caixa.min.toArray()).toEqual([2, 3, 4])
    expect(caixa.max.toArray()).toEqual([2.5, 4, 4])
    expect(d).toEqual(antes)
  } finally {
    m.descartar()
  }
})
test('aguardar relevo não desenha chão falso; reentrada respeita a mesma altura e a camada', () => {
  const d = cena(),
    m = new MarcadoresDoPalco()
  d.base = {
    tipo: 'terreno',
    cobertura: 'grade',
    origem: { x: -32, z: -32 },
    colunas: 64,
    linhas: 64,
    passo: 1,
    min: -10,
    max: 20,
    fundo: 0,
    pecas: [],
  }
  d.marcadores[0]!.noChao = true
  d.marcadores[0]!.posicao.y = 2
  try {
    expect(m.definir(d).carregando).toBe(1)
    expect(m.limitesDo('m', new Box3()).isEmpty()).toBe(true)
    expect(m.definir(d, () => 7).falhas).toEqual([])
    expect(m.limitesDo('m', new Box3()).min.y).toBe(9)
    d.camadas = [{ id: 'c', nome: 'Oculta', bloqueado: false, oculto: true }]
    d.marcadores[0]!.camada = 'c'
    m.definir(d, () => 7)
    expect(m.limitesDo('m', new Box3()).isEmpty()).toBe(true)
  } finally {
    m.descartar()
  }
})

test('pintura e alturas distantes não reamostram rotas; altura sobre o percurso atualiza a guia', () => {
  const d = cena(),
    m = new MarcadoresDoPalco()
  d.base = {
    tipo: 'terreno',
    cobertura: 'grade',
    origem: { x: -32, z: -32 },
    colunas: 64,
    linhas: 64,
    passo: 1,
    min: -10,
    max: 20,
    fundo: 0,
    pecas: [],
  }
  d.marcadores[0]!.configuracao = {
    tipo: 'rota',
    pontos: [
      { x: 0, y: 0, z: 0 },
      { x: 4, y: 0, z: 0 },
    ],
    fechada: false,
    seguirTerreno: true,
  }
  let leituras = 0,
    altura = 0
  const fonte = (x: number) => {
    leituras++
    return (altura * x) / 4
  }
  try {
    m.definir(d, fonte)
    leituras = 0
    m.atualizarTerreno({ pintura: { x0: 0, z0: 0, x1: 64, z1: 64 } })
    m.definir(d, fonte)
    expect(leituras).toBe(0)
    m.atualizarTerreno({ alturas: { x0: 0, z0: 0, x1: 2, z1: 2 } })
    m.definir(d, fonte)
    expect(leituras).toBe(0)
    altura = 2
    m.atualizarTerreno({ alturas: { x0: 32, z0: 32, x1: 36, z1: 34 } })
    m.definir(d, fonte)
    expect(leituras).toBeGreaterThan(0)
    expect(m.limitesDo('m', new Box3()).max.y).toBeCloseTo(2, 6)
  } finally {
    m.descartar()
  }
})

test('escultura na raiz distante dos controles invalida a compensação de altura da rota', () => {
  const d = cena()
  d.base = {
    tipo: 'terreno',
    cobertura: 'grade',
    origem: { x: -32, z: -32 },
    colunas: 64,
    linhas: 64,
    passo: 1,
    min: -10,
    max: 20,
    fundo: 0,
    pecas: [],
  }
  d.marcadores[0]!.configuracao = {
    tipo: 'rota',
    pontos: [
      { x: 10, y: 1, z: 0 },
      { x: 14, y: 1, z: 0 },
    ],
    fechada: false,
    seguirTerreno: true,
  }
  for (const noChao of [true, false]) {
    const m = new MarcadoresDoPalco()
    let altura = 0
    const fonte = (x: number) => (Math.abs(x) < 1 ? altura : 0)
    d.marcadores[0]!.noChao = noChao
    try {
      m.definir(d, fonte)
      altura = 5
      m.atualizarTerreno({ alturas: { x0: 31, z0: 31, x1: 33, z1: 33 } })
      m.definir(d, fonte)
      const caixa = m.limitesDo('m', new Box3())
      expect(caixa.min.y).toBeCloseTo(noChao ? 1 : -4, 5)
      expect(caixa.max.y).toBeCloseTo(noChao ? 1 : -4, 5)
    } finally {
      m.descartar()
    }
  }
})

test('guias respeitam o orçamento agregado e descarte libera os buffers sem recriá-los', () => {
  const d = cena(),
    m = new MarcadoresDoPalco(),
    base = MarcadorSchema.parse({
      ...d.marcadores[0],
      configuracao: {
        tipo: 'zona',
        forma: {
          tipo: 'poligono',
          altura: 2,
          pontos: Array.from({ length: 128 }, (_, i) => ({
            x: Math.cos((i * Math.PI) / 64),
            z: Math.sin((i * Math.PI) / 64),
          })),
        },
      },
    })
  d.marcadores = Array.from({ length: 1000 }, (_, i) => ({
    ...base,
    id: `m${i}`,
    posicao: { x: i, y: 0, z: 0 },
  }))
  const estado = m.definir(d),
    geometria = (m.grupo.children[0] as import('three').LineSegments).geometry
  expect(estado.falhas.length).toBeGreaterThan(0)
  expect(geometria.drawRange.count).toBeLessThanOrEqual(600_000)
  expect(geometria.getAttribute('position').count).toBeLessThanOrEqual(600_000)
  expect(d.marcadores).toHaveLength(1000)
  let liberacoes = 0
  geometria.addEventListener('dispose', () => liberacoes++)
  m.descartar()
  m.descartar()
  m.definir(d)
  expect(liberacoes).toBe(1)
  expect(geometria.getAttribute('position')).toBeUndefined()
  expect(m.grupo.children).toEqual([])
})
