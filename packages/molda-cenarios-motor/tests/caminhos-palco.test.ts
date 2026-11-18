import { expect, test } from 'bun:test'
import {
  apoioNaSuperficie,
  type BaseDeTerreno,
  CaminhoSchema,
  criarDocumentoVazio,
  type FonteDeAlturas,
  posicaoNoMundo,
} from '@sistemazero/molda-cenarios-core/v2'
import {
  BoxGeometry,
  Group,
  Matrix4,
  MeshStandardMaterial,
  Raycaster,
  Texture,
  Vector3,
} from 'three'
import { CaminhosDoPalco } from '../src/curvas/caminhos'
import { agruparPecas } from '../src/curvas/lotes'
import { SuperficiesDosObjetos } from '../src/superficies'
import { TerrenoDoPalco } from '../src/Terreno'
import { MundoDoTeste } from '../src/teste/colisoes'

const comum = {
  id: 'caminho',
  nome: 'Passeio',
  grupo: null,
  oculto: false,
  bloqueado: false,
  acabamento: null,
  largura: 2,
  pontos: [
    { x: -8, z: 0 },
    { x: 8, z: 0 },
  ],
}
const base: BaseDeTerreno = {
  tipo: 'terreno',
  cobertura: 'grade',
  origem: { x: -32, z: -32 },
  colunas: 64,
  linhas: 64,
  passo: 1,
  min: -10,
  max: 40,
  fundo: 0,
  pecas: [],
}
const semModelo = () => null

test('agrupamento rígido conserva drawRange de cada material e os buffers compartilhados', () => {
  const g = new BoxGeometry(4, 1, 2),
    material = new MeshStandardMaterial()
  g.setDrawRange(6, 6)
  const antes = [...g.index!.array],
    a = agruparPecas(
      [
        { geometria: g, material, matriz: new Matrix4() },
        { geometria: g, material, matriz: new Matrix4().makeTranslation(6, 0, 0) },
      ],
      0,
      true,
    )
  try {
    expect(a.raiz.children).toHaveLength(1)
    const lote = a.raiz.children[0] as import('three').BatchedMesh
    expect(lote.geometry.getAttribute('position').count).toBe(6)
    expect(lote.geometry.index).toBeNull()
    expect([...g.index!.array]).toEqual(antes)
    expect(g.drawRange).toEqual({ start: 6, count: 6 })
  } finally {
    a.descartar()
    g.dispose()
    material.dispose()
  }
})

test('pisos no palco são selecionáveis, mantêm cache e não duplicam física do terreno', () => {
  const d = criarDocumentoVazio('d', 'Cenário'),
    c = new CaminhosDoPalco(),
    q = new SuperficiesDosObjetos()
  d.caminhos = [CaminhoSchema.parse({ ...comum, tipo: 'trilha' })]
  try {
    expect(c.definir(d, null, semModelo, semModelo, new Set())).toEqual({
      carregando: 0,
      falhas: [],
      avisos: [],
    })
    const g = c.superficies()[0]!.geometria
    q.definir(c.superficies())
    expect(q.escolher(new Raycaster(new Vector3(0, 4, 0), new Vector3(0, -1, 0)))?.id).toBe(
      'caminho',
    )
    expect(c.fontesDoTeste()).toHaveLength(0)
    c.definir(d, null, semModelo, semModelo, new Set())
    expect(c.superficies()[0]!.geometria).toBe(g)
    c.definir(d, null, semModelo, semModelo, new Set(['caminho']))
    expect(c.superficies()).toHaveLength(0)
    c.definir(d, null, semModelo, semModelo, new Set())
    expect(c.superficies()[0]!.geometria).toBe(g)
    let liberada = 0
    g.addEventListener('dispose', () => liberada++)
    c.definir({ ...d, caminhos: [] }, null, semModelo, semModelo, new Set())
    expect(liberada).toBe(1)
  } finally {
    q.descartar()
    c.descartar()
    c.limpar()
  }
})

test('ponte nativa mantém vão, pilares nas tampas reais e apoio estável na seleção', () => {
  const d = criarDocumentoVazio('d', 'Ponte'),
    c = new CaminhosDoPalco(),
    q = new SuperficiesDosObjetos()
  d.caminhos = [
    CaminhoSchema.parse({
      ...comum,
      tipo: 'ponte',
      cotas: { de: 3, ate: 4 },
      pilares: { espacamento: 5, largura: 0.3 },
    }),
  ]
  let mundo: MundoDoTeste | null = null
  try {
    const e = c.definir(d, null, semModelo, semModelo, new Set())
    expect(e.falhas).toEqual([])
    expect(c.fontesDoTeste().length).toBeGreaterThan(6)
    q.definir(c.superficies())
    const acerto = q.escolher(new Raycaster(new Vector3(0, 10, 0), new Vector3(0, -1, 0)))!
    expect(acerto.parte).toBe('tabuleiro/0')
    expect(acerto.ponto.y).toBeCloseTo(3.5, 5)
    mundo = new MundoDoTeste(c.fontesDoTeste())
    expect(mundo.rastrear(new Vector3(0, 1, -3), new Vector3(0, 1, 3))).toBeNull()
    const fonte: FonteDeAlturas = () => 0
    fonte.parteDoCaminho = (id, parte) => c.parte(id, parte)
    const apoio = apoioNaSuperficie(d, acerto.id, acerto.ponto, fonte, acerto.parte)
    const objeto = {
      modelo: 'm',
      apoio,
      transformacao: {
        posicao: { x: 0, y: 0, z: 0 },
        rotacao: { x: 0, y: 0, z: 0 },
        escala: { x: 1, y: 1, z: 1 },
      },
    }
    expect(posicaoNoMundo(d, objeto, fonte).y).toBeCloseTo(3.5, 5)
    c.definir(d, null, semModelo, semModelo, new Set(['caminho']))
    expect(c.superficies()).toHaveLength(0)
    expect(c.parte('caminho', 'tabuleiro/0')).not.toBeNull()
    expect(posicaoNoMundo(d, objeto, fonte).y).toBeCloseTo(3.5, 5)
  } finally {
    mundo?.descartar()
    q.descartar()
    c.descartar()
  }
})

test('cerca e muro acompanham o terreno e agrupam módulos sem uma chamada por peça', () => {
  for (const tipo of ['cerca', 'muro']) {
    const d = criarDocumentoVazio('d', 'Estrutura'),
      c = new CaminhosDoPalco(),
      t = new TerrenoDoPalco(base, new Map())
    d.base = base
    d.caminhos = [CaminhoSchema.parse({ ...comum, tipo, largura: 0.15, comprimentoDoModulo: 1 })]
    try {
      const e = c.definir(d, t, semModelo, semModelo, new Set())
      expect(e.falhas).toEqual([])
      expect(c.superficies().length).toBeGreaterThan(10)
      let malhas = 0
      c.grupo.traverse((p) => {
        if ('isMesh' in p) malhas++
      })
      expect(malhas).toBeLessThan(5)
      expect(c.parte('caminho', tipo === 'cerca' ? 'poste/0' : 'modulo/0')).not.toBeNull()
    } finally {
      c.descartar()
      t.descartar()
    }
  }
})

test('altura atualiza o piso exibido e o picking, e buracos exigem reconstruir a topologia', () => {
  const d = criarDocumentoVazio('d', 'Trilha'),
    c = new CaminhosDoPalco(),
    t = new TerrenoDoPalco(base, new Map()),
    q = new SuperficiesDosObjetos()
  d.base = base
  d.caminhos = [CaminhoSchema.parse({ ...comum, tipo: 'trilha' })]
  try {
    expect(c.definir(d, t, semModelo, semModelo, new Set()).falhas).toEqual([])
    const g = c.superficies()[0]!.geometria
    q.definir(c.superficies())
    t.estado.campo.alturas.fill(2)
    const mudadas = c.atualizarTerreno({ alturas: { x0: 0, z0: 0, x1: 64, z1: 64 } })
    q.invalidarGeometrias(mudadas)
    expect(c.superficies()[0]!.geometria).toBe(g)
    expect(
      q.escolher(new Raycaster(new Vector3(0, 10, 0), new Vector3(0, -1, 0)))!.ponto.y,
    ).toBeCloseTo(2)
    c.atualizarTerreno({ buracos: { x0: 0, z0: 0, x1: 64, z1: 64 } })
    expect(c.superficies()).toHaveLength(0)
    c.definir(d, t, semModelo, semModelo, new Set())
    expect(c.superficies()[0]!.geometria).not.toBe(g)
  } finally {
    q.descartar()
    c.descartar()
    t.descartar()
  }
})

test('textura autoral, espera de recurso e três ciclos não modificam o acervo', () => {
  const d = criarDocumentoVazio('d', 'Catálogo'),
    c = new CaminhosDoPalco(),
    g = new BoxGeometry(4, 0.2, 2).translate(0, 0.1, 0),
    material = new MeshStandardMaterial(),
    textura = new Texture()
  g.computeBoundingBox()
  const modelo = {
    partes: [{ geometria: g, material, matriz: new Matrix4() }],
    caixa: g.boundingBox!.clone(),
    triangulos: 12,
    raiz: new Group(),
    descartar() {
      throw Error('Acervo não pode ser descartado')
    },
  }
  d.caminhos = [
    CaminhoSchema.parse({
      ...comum,
      tipo: 'trilha',
      acabamento: 'm',
      encaixeModelo: { eixo: 'x' },
      aparencia: { textura: { id: 't', repeticaoMetros: 2 } },
    }),
  ]
  let gs = 0,
    ms = 0,
    ts = 0
  g.addEventListener('dispose', () => gs++)
  material.addEventListener('dispose', () => ms++)
  textura.addEventListener('dispose', () => ts++)
  try {
    expect(c.definir(d, null, semModelo, semModelo, new Set()).carregando).toBe(1)
    for (let i = 0; i < 3; i++) {
      expect(
        c.definir(
          d,
          null,
          () => modelo,
          () => textura,
          new Set(),
        ).falhas,
      ).toEqual([])
      expect(c.fontesDoTeste()).toHaveLength(1)
      expect(c.superficies()[0]!.material).not.toBe(material)
      c.limpar()
    }
    expect(gs + ms + ts).toBe(0)
    expect(material.map).toBeNull()
  } finally {
    c.descartar()
    g.dispose()
    material.dispose()
    textura.dispose()
  }
})
