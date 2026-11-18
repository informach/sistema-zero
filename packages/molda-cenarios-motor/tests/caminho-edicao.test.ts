import { expect, test } from 'bun:test'
import {
  criarDocumentoVazio,
  prepararOperacaoDeAgua,
  prepararOperacaoDeCaminho,
} from '@sistemazero/molda-cenarios-core/v2'
import type { Line } from 'three'
import { EdicaoComTerreno } from '../src/edicao-com-terreno'
import { PontosDeAutoria } from '../src/pontos-de-autoria'

const caminho = () =>
  prepararOperacaoDeCaminho(
    {
      id: 'c',
      nome: 'Passeio',
      tipo: 'trilha',
      grupo: null,
      oculto: false,
      bloqueado: false,
      acabamento: null,
      largura: 2.5,
      pontos: [
        { x: 0, z: 0 },
        { x: 8, z: 0 },
      ],
    },
    null,
  )

test('prévia de caminho troca só seu eixo e cancelar preserva a cabeça original', () => {
  const doc = criarDocumentoVazio('d', 'Teste'),
    op = caminho()
  let restauracoes = 0
  const edicao = new EdicaoComTerreno({
    prever() {},
    restaurar() {
      restauracoes++
    },
  })
  edicao.prever(doc, doc, op)
  expect(edicao.projetar(doc).caminhos).toEqual([op.caminho])
  expect(doc.caminhos).toEqual([])
  expect(edicao.tipo).toBe('caminho')
  edicao.finalizar(true, 'caminho')
  expect(edicao.projetar(doc)).toBe(doc)
  expect(restauracoes).toBe(1)
})

test('água e caminho não substituem a prévia ou encerram o preparo do outro dono', () => {
  const doc = criarDocumentoVazio('d', 'Teste'),
    op = caminho(),
    agua = prepararOperacaoDeAgua({ id: 'a', nome: 'Mar' }, { tipo: 'mar', nivel: -1 }, null)
  let restauracoes = 0
  const edicao = new EdicaoComTerreno({
    prever() {},
    restaurar() {
      restauracoes++
    },
  })
  for (const [primeira, segunda, dono] of [
    [op, agua, 'agua'],
    [agua, op, 'caminho'],
  ] as const) {
    edicao.prever(doc, doc, primeira)
    const projetada = edicao.projetar(doc),
      antes = restauracoes
    expect(() => edicao.prever(doc, doc, segunda)).toThrow('Termine a prévia')
    edicao.finalizar(true, dono)
    expect(edicao.projetar(doc)).toBe(projetada)
    expect(restauracoes).toBe(antes)
    edicao.finalizar(true)
  }
})

test('nova cabeça invalida o caminho e resultado atrasado não cria prévia', () => {
  const doc = criarDocumentoVazio('d', 'Teste'),
    atual = { ...doc, nome: 'Atual' },
    edicao = new EdicaoComTerreno({ prever() {}, restaurar() {} })
  edicao.prever(doc, doc, caminho())
  expect(edicao.projetar(atual)).toBe(atual)
  expect(() => edicao.prever(doc, atual, caminho())).toThrow('O cenário mudou')
  expect(edicao.ativa).toBe(false)
})

test('editar uma trilha conserva sua ordem e a precedência dos encontros', () => {
  const doc = criarDocumentoVazio('d', 'Teste'),
    op = caminho(),
    edicao = new EdicaoComTerreno({ prever() {}, restaurar() {} })
  doc.caminhos = [op.caminho, { ...op.caminho, id: 'vizinha' }]
  edicao.prever(doc, doc, { ...op, caminho: { ...op.caminho, nome: 'Novo acabamento' } })
  expect(edicao.projetar(doc).caminhos.map((c) => c.id)).toEqual(['c', 'vizinha'])
  expect(edicao.projetar(doc).caminhos[0]!.nome).toBe('Novo acabamento')
})

test('alças em movimento reutilizam os buffers e desenham somente os pontos ativos', () => {
  const p = new PontosDeAutoria(8, 10),
    pontos = [
      { x: 10, y: 1, z: 5 },
      { x: 12, y: 0, z: 7 },
    ]
  try {
    p.definir(pontos)
    const g = (p.grupo.children[0] as Line).geometry,
      posicao = g.getAttribute('position'),
      cor = g.getAttribute('color')
    p.definir([...pontos, { x: 14, y: 0, z: 9 }], true, 0)
    expect(g.getAttribute('position')).toBe(posicao)
    expect(g.getAttribute('color')).toBe(cor)
    expect(g.drawRange.count).toBe(4)
    expect(cor.getX(0)).toBe(cor.getX(3))
    p.definir(pontos)
    expect(g.drawRange.count).toBe(2)
    expect(g.boundingSphere!.center.x).toBeGreaterThanOrEqual(10)
    p.definir(null)
    expect(g.drawRange.count).toBe(0)
  } finally {
    p.descartar()
  }
})
