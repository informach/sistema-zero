import { expect, test } from 'bun:test'
import {
  executarLote as aplicar,
  type ComandoDeCenario,
  capturarConteudoDeConjunto,
  capturarFragmento,
  criarDocumentoVazio,
  type DocumentoDeCenario,
  inverterLote,
  posicaoDaMontagem,
  posicaoNoMundo,
  resolverConjuntos,
  volumeNoMundo,
} from '../src/v2'

const executarLote = (documento: DocumentoDeCenario, comandos: ComandoDeCenario[]) =>
  aplicar({ documento, revisao: 0 }, { revisaoEsperada: 0, comandos })

function cena() {
  const origem = criarDocumentoVazio('fonte', 'Banco e floreira')
  origem.formas = [
    { id: 'caixa', nome: 'Caixa', tipo: 'caixa', largura: 1, altura: 1, comprimento: 1 },
  ]
  origem.instancias = [0, 1].map((i) => ({
    id: `p${i}`,
    nome: `Peça ${i}`,
    modelo: 'caixa',
    grupo: null,
    bloqueado: false,
    oculto: false,
    colisao: 'caixa' as const,
    apoio: { tipo: 'absoluto' as const },
    transformacao: {
      posicao: { x: i * 2, y: i, z: 0 },
      rotacao: { x: 0, y: 0, z: 0 },
      escala: { x: 1, y: 1, z: 1 },
    },
  }))
  const d = criarDocumentoVazio('cenario', 'Terreno')
  d.base = {
    tipo: 'terreno',
    cobertura: 'grade',
    origem: { x: -32, z: -32 },
    colunas: 64,
    linhas: 64,
    passo: 1,
    min: -10,
    max: 100,
    fundo: 0,
    pecas: [],
  }
  d.definicoesConjuntos = [
    {
      id: 'def',
      biblioteca: 'b',
      conjunto: 'j',
      revisao: 1,
      nome: 'Jardim',
      conteudo: capturarConteudoDeConjunto(origem, ['p0', 'p1'], 'conta'),
    },
  ]
  const raiz = {
    id: 'raiz',
    nome: 'No chão',
    definicao: 'def',
    grupo: null,
    bloqueado: false,
    oculto: false,
    transformacao: {
      posicao: { x: 2, y: 1, z: 2 },
      rotacao: { x: 0, y: 0.4, z: 0 },
      escala: { x: 2, y: 2, z: 2 },
    },
  }
  d.montagens = [
    { ...raiz, apoio: { tipo: 'terreno', deslocamento: 1 } },
    { ...raiz, id: 'livre' },
  ]
  d.formas = origem.formas
  d.instancias = [
    {
      ...origem.instancias[0]!,
      id: 'em-cima',
      apoio: { tipo: 'objeto', objeto: 'raiz', contato: { x: 0, y: 2, z: 0 }, deslocamento: 0 },
    },
  ]
  return d
}
test('a raiz apoiada e sua pilha acompanham alturas novas; o conjunto livre e as relações internas permanecem', () => {
  const d = cena(),
    original = structuredClone(d)
  const antes = resolverConjuntos(d, () => 0).documento,
    depois = resolverConjuntos(d, () => 4).documento
  for (const p of antes.instancias) {
    const novo = depois.instancias.find((o) => o.id === p.id)!
    expect(novo.transformacao.posicao.y - p.transformacao.posicao.y).toBeCloseTo(
      p.id.startsWith('livre/') ? 0 : 4,
    )
    expect(novo.transformacao.rotacao).toEqual(p.transformacao.rotacao)
    expect(novo.transformacao.escala).toEqual(p.transformacao.escala)
  }
  expect(
    posicaoNoMundo(d, d.instancias[0]!, () => 4).y - posicaoNoMundo(d, d.instancias[0]!, () => 0).y,
  ).toBe(4)
  expect(
    volumeNoMundo(d, d.montagens![0]!, () => 4).min.y -
      volumeNoMundo(d, d.montagens![0]!, () => 0).min.y,
  ).toBe(4)
  expect(d).toEqual(original)
})
test('copiar e guardar a composição usam a altura carregada; separar exige posição atual e desfaz por inteiro', () => {
  const d = cena(),
    fonte = () => 4
  const fragmento = capturarFragmento(d, ['raiz'], 'conta', fonte)
  expect(fragmento.montagens![0]!.apoio?.tipo).toBe('absoluto')
  expect(fragmento.montagens![0]!.transformacao.posicao.y).toBe(5)
  const antes = capturarConteudoDeConjunto(d, ['raiz'], 'conta', () => 0),
    depois = capturarConteudoDeConjunto(d, ['raiz'], 'conta', fonte)
  expect(depois.ancora.y - antes.ancora.y).toBe(4)
  expect(() => executarLote(d, [{ tipo: 'montagem.desvincular', id: 'raiz' }])).toThrow(
    'posição atual',
  )
  const separado = executarLote(d, [
    {
      tipo: 'montagem.desvincular',
      id: 'raiz',
      posicao: posicaoDaMontagem(d, d.montagens![0]!, fonte),
    },
  ]).documento
  const esperado = resolverConjuntos(d, fonte).documento
  expect(
    separado.instancias.filter((o) => o.id.startsWith('raiz/')).map((o) => o.transformacao),
  ).toEqual(esperado.instancias.filter((o) => o.id.startsWith('raiz/')).map((o) => o.transformacao))
  const restaurado = executarLote(separado, inverterLote(d, separado)).documento
  const ordenar = (c: DocumentoDeCenario) => ({
    ...c,
    montagens: [...c.montagens!].sort((a, b) => a.id.localeCompare(b.id)),
  })
  expect(ordenar(restaurado)).toEqual(ordenar(d))
  const copia = executarLote(d, [
    { tipo: 'montagem.duplicar', id: 'raiz', novoId: 'acima', deslocamento: { x: 2, y: 3, z: 0 } },
  ]).documento.montagens!.find((m) => m.id === 'acima')!
  expect(posicaoDaMontagem(d, copia, fonte).y).toBe(8)
})
