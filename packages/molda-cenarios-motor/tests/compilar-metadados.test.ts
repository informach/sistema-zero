import { expect, test } from 'bun:test'
import {
  lerCenaCompilada,
  prepararCenaParaCompilacao,
} from '@sistemazero/molda-cenarios-core/compilar'
import {
  capturarFragmento,
  criarDocumentoVazio,
  type InstanciaDeCenario,
} from '@sistemazero/molda-cenarios-core/v2'
import { Matrix4 } from 'three'
import { compilarMetadadosDaCena } from '../src/compilar/metadados'

const objeto = (id: string): InstanciaDeCenario => ({
  id,
  nome: id,
  modelo: 'f',
  grupo: null,
  oculto: false,
  bloqueado: false,
  colisao: 'caixa',
  apoio: { tipo: 'absoluto' },
  transformacao: {
    posicao: { x: 0, y: 0, z: 0 },
    rotacao: { x: 0, y: 0, z: 0 },
    escala: { x: 1, y: 1, z: 1 },
  },
})
test('âncoras/propriedades e vínculo com objeto oculto sobrevivem sem exigir sua geometria', () => {
  const d = criarDocumentoVazio('c', 'Metadados')
  d.formas = [{ id: 'f', nome: 'Caixa', tipo: 'caixa', largura: 1, altura: 1, comprimento: 1 }]
  d.instancias = [
    { ...objeto('visivel'), propriedades: { uso: 'oficina' } },
    { ...objeto('oculto'), oculto: true },
  ]
  d.marcadores = [
    {
      id: 'm',
      nome: 'Ponto',
      grupo: null,
      oculto: false,
      bloqueado: false,
      posicao: { x: 1, y: 2, z: 3 },
      giro: 0.2,
      noChao: false,
      objeto: 'oculto',
    },
  ]
  const antes = JSON.stringify(d),
    p = prepararCenaParaCompilacao(
      d,
      { cenario: d.id, revisao: 0 },
      { equipe: false, bibliotecas: [] },
    ),
    matriz = new Matrix4().makeTranslation(8, 2, -1).elements,
    r = compilarMetadadosDaCena(d, p, new Map([['visivel', { matriz }]]))
  expect(r.entidades.find((e) => e.id === 'visivel')).toMatchObject({
    matriz,
    propriedades: { uso: 'oficina' },
    oculto: false,
  })
  expect(r.entidades.find((e) => e.id === 'oculto')!.oculto).toBe(true)
  expect(r.marcadores[0]!.objeto).toBe('oculto')
  expect(r.entidades.find((e) => e.id === 'm')!.matriz!.slice(12, 15)).toEqual([1, 2, 3])
  expect(p.objetos.map((o) => o.id)).toEqual(['visivel'])
  expect(JSON.stringify(d)).toBe(antes)
  expect(
    lerCenaCompilada({
      formato: 'molda-cena-compilada',
      versao: 1,
      nome: d.nome,
      unidade: 'metro',
      eixoVertical: 'y',
      fonte: { ...p.fonte, digest: 'a'.repeat(64) },
      arquivos: [],
      nos: [],
      colisoes: [],
      aguas: [],
      caminhos: [],
      texturas: [],
      licencas: [],
      ambiente: d.iluminacao,
      ...r,
    }).marcadores[0]!.objeto,
  ).toBe('oculto')
})
test('montagem conserva raiz, matriz, propriedades e revisão sem duplicar a procedência', () => {
  const fonte = criarDocumentoVazio('origem', 'Conjunto')
  fonte.formas = [{ id: 'f', nome: 'Caixa', tipo: 'caixa', largura: 1, altura: 1, comprimento: 1 }]
  fonte.instancias = [objeto('peca')]
  const d = criarDocumentoVazio('c', 'Montagens'),
    conteudo = capturarFragmento(fonte, ['peca'], 'conta')
  d.definicoesConjuntos = [
    { id: 'def', biblioteca: 'b', conjunto: 'casa', revisao: 7, nome: 'Casa', conteudo },
  ]
  d.montagens = ['a', 'b'].map((id, i) => ({
    id,
    nome: id,
    grupo: null,
    oculto: false,
    bloqueado: false,
    propriedades: { tipo: 'morada' },
    definicao: 'def',
    transformacao: {
      posicao: { x: 10 + i * 5, y: 2, z: 0 },
      rotacao: { x: 0, y: 0, z: 0 },
      escala: { x: 2, y: 2, z: 2 },
    },
  }))
  const p = prepararCenaParaCompilacao(
      d,
      { cenario: d.id, revisao: 2 },
      { equipe: false, bibliotecas: [{ id: 'b', nome: 'Livre', licenca: 'livre' }] },
    ),
    r = compilarMetadadosDaCena(d, p, new Map())
  expect(r.entidades.find((e) => e.id === 'a')).toMatchObject({
    tipo: 'montagem',
    propriedades: { tipo: 'morada' },
  })
  expect(r.entidades.find((e) => e.id === 'a')!.matriz!.slice(12, 15)).toEqual([10, 2, 0])
  expect(r.entidades.some((e) => e.tipo === 'objeto' && e.grupo === 'a')).toBe(true)
  expect(r.fontes.conjuntos).toEqual([{ id: 'def', biblioteca: 'b', conjunto: 'casa', revisao: 7 }])
})
