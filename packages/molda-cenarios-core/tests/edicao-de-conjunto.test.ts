import { expect, test } from 'bun:test'
import {
  capturarConteudoDeConjunto,
  conteudoDoCenarioDeConjunto,
  criarDocumentoVazio,
  documentoParaEditarConjunto,
  posicaoNoMundo,
  validarDocumento,
} from '../src/v2'

function composicao() {
  const d = criarDocumentoVazio('origem', 'Jardim')
  d.formas = [{ id: 'f', nome: 'Caixa', tipo: 'caixa', largura: 2, altura: 1, comprimento: 2 }]
  d.instancias = [
    {
      id: 'base',
      nome: 'Base',
      grupo: null,
      modelo: 'f',
      bloqueado: false,
      oculto: false,
      apoio: { tipo: 'absoluto' },
      colisao: 'caixa',
      transformacao: {
        posicao: { x: 50, y: 3, z: 20 },
        rotacao: { x: 0, y: 0, z: 0 },
        escala: { x: 2, y: 1, z: 1 },
      },
    },
  ]
  d.instancias.push({
    ...structuredClone(d.instancias[0]!),
    id: 'topo',
    nome: 'Topo',
    apoio: { tipo: 'objeto', objeto: 'base', deslocamento: 0.2, contato: { x: 0.5, y: 1, z: 0 } },
    transformacao: {
      posicao: { x: 0, y: 0, z: 0 },
      rotacao: { x: 0, y: 0.3, z: 0 },
      escala: { x: 0.5, y: 0.5, z: 0.5 },
    },
  })
  return d
}

test('rascunho usa a mesma composição em coordenadas locais e conserva vínculos internos', () => {
  const origem = composicao(),
    conteudo = capturarConteudoDeConjunto(origem, ['base', 'topo'], 'conta'),
    antes = structuredClone(conteudo)
  const d = documentoParaEditarConjunto(conteudo, 'edicao', 'Jardim', 'conta')
  expect(d.id).toBe('edicao')
  expect(d.base.tipo).toBe('plano')
  expect(validarDocumento(d)).toEqual(d)
  expect(d.instancias[1]!.apoio.tipo).toBe('objeto')
  const base = posicaoNoMundo(d, d.instancias[0]!),
    topo = posicaoNoMundo(d, d.instancias[1]!)
  expect(topo.x - base.x).toBeCloseTo(1, 8)
  expect(topo.y - base.y).toBeCloseTo(1.2, 8)
  expect(d.instancias[0]!.transformacao.escala).toEqual(origem.instancias[0]!.transformacao.escala)
  expect(conteudo).toEqual(antes)
})

test('publicar uma borda nova mantém o pivô e a posição das peças anteriores', () => {
  const conteudo = capturarConteudoDeConjunto(composicao(), ['base', 'topo'], 'conta')
  const d = documentoParaEditarConjunto(conteudo, 'edicao', 'Jardim', 'conta')
  const posicoes = d.instancias.map((o) => posicaoNoMundo(d, o))
  d.instancias.push({
    ...structuredClone(d.instancias[0]!),
    id: 'borda',
    transformacao: { ...d.instancias[0]!.transformacao, posicao: { x: 40, y: 0, z: 20 } },
  })
  const novo = conteudoDoCenarioDeConjunto(d, 'conta')
  expect(novo.ancora).toEqual({ x: 0, y: 0, z: 0 })
  expect(novo.origem).toEqual({ cenario: 'edicao', espaco: 'conta' })
  expect(novo.instancias.slice(0, 2).map((o) => o.transformacao.posicao)).toEqual(posicoes)
  expect(novo.instancias[1]!.apoio.tipo).toBe('objeto')
})

test('rascunho não perde sistemas fora do conteúdo de objetos nem publica vazio ou outro espaço', () => {
  const conteudo = capturarConteudoDeConjunto(composicao(), ['base', 'topo'], 'conta'),
    d = documentoParaEditarConjunto(conteudo, 'edicao', 'Jardim', 'conta')
  expect(() => documentoParaEditarConjunto(conteudo, 'edicao', 'Jardim', 'outro')).toThrow('espaço')
  d.aguas = [
    { id: 'mar', nome: 'Mar', tipo: 'mar', nivel: 0, grupo: null, bloqueado: false, oculto: false },
  ]
  expect(() => conteudoDoCenarioDeConjunto(d, 'conta')).toThrow('objetos')
  expect(() =>
    conteudoDoCenarioDeConjunto(criarDocumentoVazio('vazio', 'Vazio'), 'conta'),
  ).toThrow()
})
