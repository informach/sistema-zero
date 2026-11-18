import { expect, test } from 'bun:test'
import { prepararCenaParaCompilacao } from '../src/compilar/preparar'
import {
  capturarFragmento,
  criarDocumentoVazio,
  type DocumentoDeCenario,
  type FonteDeAlturas,
  type InstanciaDeCenario,
} from '../src/v2'

const licencas = {
  equipe: false,
  bibliotecas: [
    { id: 'livre', nome: 'Modelos livres', licenca: 'livre' as const },
    { id: 'pack', nome: 'Pack da equipe', licenca: 'restrita' as const },
  ],
}
const pose = (x = 0, y = 0, z = 0) => ({
  posicao: { x, y, z },
  rotacao: { x: 0, y: 0, z: 0 },
  escala: { x: 1, y: 1, z: 1 },
})
const objeto = (id: string, modelo = 'f'): InstanciaDeCenario => ({
  id,
  nome: id,
  modelo,
  grupo: null,
  oculto: false,
  bloqueado: false,
  colisao: 'caixa',
  apoio: { tipo: 'absoluto' },
  transformacao: pose(),
})
function cena() {
  const d = criarDocumentoVazio('c', 'Composição')
  d.formas = [{ id: 'f', nome: 'Caixa', tipo: 'caixa', largura: 2, altura: 1, comprimento: 2 }]
  d.modelos = [
    {
      id: 'm',
      biblioteca: 'livre',
      modelo: 'arquivo',
      digest: 'a'.repeat(64),
      nome: 'Modelo',
      volume: { min: { x: -1, y: -2, z: -1 }, max: { x: 1, y: 0, z: 1 } },
    },
    {
      id: 'nao-usado',
      biblioteca: 'pack',
      modelo: 'restrito',
      digest: 'b'.repeat(64),
      nome: 'Fora da cena',
    },
  ]
  return d
}
function terreno(d: DocumentoDeCenario) {
  d.base = {
    tipo: 'terreno',
    cobertura: 'grade',
    origem: { x: 0, z: 0 },
    passo: 1,
    colunas: 64,
    linhas: 64,
    min: -10,
    max: 20,
    fundo: 0,
    pecas: [],
  }
}

test('preparação resolve apoio no terreno sem mutar autoria nem baixar modelos não usados', () => {
  const d = cena()
  terreno(d)
  const o = objeto('a', 'm')
  o.apoio = { tipo: 'terreno', deslocamento: 0.3, referencia: 'volume', inclinar: false }
  o.transformacao = pose(4, 99, 8)
  d.instancias = [o]
  const antes = JSON.stringify(d),
    fonte: FonteDeAlturas = (x) => 1 + x / 10,
    p = prepararCenaParaCompilacao(d, { cenario: d.id, revisao: 7 }, licencas, fonte)
  expect(p.objetos[0]!.transformacao.posicao.y).toBeCloseTo(3.7, 10)
  expect(p.objetos[0]!.apoio).toEqual({ tipo: 'absoluto' })
  expect(p.modelos.map((m) => m.id)).toEqual(['m'])
  expect(p.licencas.map((l) => l.id)).toEqual(['livre'])
  expect(p.fonte).toEqual({ cenario: 'c', revisao: 7 })
  expect(JSON.stringify(d)).toBe(antes)
})

test('apoio em objeto usa contato/escala e ocultação herdada não exporta a construção escondida', () => {
  const d = cena(),
    base = objeto('base'),
    banco = objeto('banco')
  base.transformacao = pose(2, 3, 4)
  base.transformacao.escala.y = 2
  banco.apoio = { tipo: 'objeto', objeto: 'base', contato: { x: 0, y: 1, z: 0 }, deslocamento: 0.2 }
  d.grupos = [{ id: 'g', nome: 'Escondidos', grupo: null, oculto: true, bloqueado: false }]
  const escondido = objeto('escondido', 'nao-usado')
  escondido.grupo = 'g'
  d.instancias = [base, banco, escondido]
  const p = prepararCenaParaCompilacao(d, { cenario: d.id, revisao: 0 }, licencas)
  expect(p.objetos.map((o) => o.id)).toEqual(['base', 'banco'])
  expect(p.objetos[1]!.transformacao.posicao.y).toBeCloseTo(5.2, 10)
  expect(p.modelos).toEqual([])
  expect(p.formas.map((f) => f.id)).toEqual(['f'])
})

test('apoio na água conserva pose completa no mundo', () => {
  const d = cena(),
    o = objeto('boia')
  d.aguas = [
    {
      id: 'lago',
      nome: 'Lago',
      grupo: null,
      bloqueado: false,
      oculto: false,
      tipo: 'lago',
      modelo: null,
      centro: { x: 10, z: 20 },
      giro: Math.PI / 2,
      escala: 2,
      nivel: 3,
      profundidade: 2,
      contorno: [
        { x: -2, z: -2 },
        { x: 2, z: -2 },
        { x: 2, z: 2 },
        { x: -2, z: 2 },
      ],
      recorte: [
        { x: -2, z: -2 },
        { x: 2, z: -2 },
        { x: 2, z: 2 },
        { x: -2, z: 2 },
      ],
    },
  ]
  o.apoio = {
    tipo: 'agua',
    agua: 'lago',
    local: { x: 1, z: 0 },
    deslocamento: 0.5,
    giro: 0.3,
    escala: 1,
  }
  d.instancias = [o]
  const p = prepararCenaParaCompilacao(d, { cenario: d.id, revisao: 0 }, licencas),
    t = p.objetos[0]!.transformacao
  expect(t.posicao).toEqual({ x: 10, y: 4, z: 18 })
  expect(t.rotacao.y).toBeCloseTo(Math.PI / 2 + 0.3, 10)
  expect(t.escala).toEqual({ x: 2, y: 2, z: 2 })
})

test('rotas/câmeras têm coordenadas finais e marcadores ocultos não viram dependência', () => {
  const d = cena()
  terreno(d)
  const base = {
    grupo: null,
    oculto: false,
    bloqueado: false,
    posicao: { x: 0, y: 2, z: 0 },
    giro: 0,
    noChao: true,
    objeto: null,
  }
  d.marcadores = [
    {
      ...base,
      id: 'r',
      nome: 'Rota',
      configuracao: {
        tipo: 'rota',
        pontos: [
          { x: 0, y: 0, z: 0 },
          { x: 4, y: 0, z: 0 },
        ],
        seguirTerreno: true,
        fechada: false,
      },
    },
    {
      ...base,
      id: 'c',
      nome: 'Câmera',
      configuracao: { tipo: 'camera', alvo: { x: 0, y: 0, z: -4 }, campoDeVisao: 55 },
    },
    { ...base, id: 'oculto', nome: 'Oculto', oculto: true },
  ]
  const fonte: FonteDeAlturas = (x) => 1 + x / 10,
    p = prepararCenaParaCompilacao(d, { cenario: d.id, revisao: 0 }, licencas, fonte)
  expect(p.marcadores.map((m) => m.marcador.id)).toEqual(['r', 'c'])
  expect(p.marcadores[0]!.transformacao.posicao.y).toBe(3)
  expect(p.marcadores[0]!.rota!.pontos.at(-1)!.y).toBeCloseTo(3.4, 10)
  expect(p.marcadores[0]!.rota!.comprimento).toBeGreaterThan(4)
  expect(p.marcadores[1]!.camera!.alvo).toEqual({ x: 0, y: 3, z: -4 })
  expect(p.marcadores[1]!.camera!.campoDeVisao).toBe(55)
})

test('dependências de aparência, céu e pintura são selecionadas sem incluir imagens ociosas', () => {
  const d = cena()
  terreno(d)
  const o = objeto('a')
  o.aparencia = { textura: { id: 'obj', repeticaoMetros: 2 } }
  d.instancias = [o]
  d.texturas = ['obj', 'ceu', 'solo', 'ociosa'].map((id, i) => ({
    id,
    biblioteca: i === 3 ? 'pack' : 'livre',
    textura: id,
    digest: String(i + 1).repeat(64),
  }))
  d.iluminacao.ceu = { tipo: 'panorama', textura: 'ceu', giro: 0, intensidade: 1 }
  if (d.base.tipo === 'terreno')
    d.base.solo = {
      camadas: [
        { id: 'terra', nome: 'Terra', cor: '#aa8844', textura: { id: 'solo', repeticaoMetros: 2 } },
      ],
      pecas: [],
    }
  const p = prepararCenaParaCompilacao(d, { cenario: d.id, revisao: 0 }, licencas, () => 0)
  expect(p.texturas.map((t) => t.id)).toEqual(['obj', 'ceu', 'solo'])
  expect(p.licencas.map((l) => l.id)).toEqual(['livre'])
})

test('conjunto é expandido uma vez, conserva procedência e confere a licença da biblioteca da composição', () => {
  const origem = cena()
  origem.instancias = [objeto('a')]
  const conteudo = capturarFragmento(origem, ['a'], 'conta'),
    d = criarDocumentoVazio('c', 'Conjuntos')
  d.definicoesConjuntos = [
    { id: 'def', nome: 'Conjunto', biblioteca: 'pack', conjunto: 'conjunto', revisao: 1, conteudo },
  ]
  d.montagens = [
    {
      id: 'raiz',
      nome: 'Conjunto',
      grupo: null,
      oculto: false,
      bloqueado: false,
      definicao: 'def',
      transformacao: pose(10, 7, 20),
    },
  ]
  const antes = JSON.stringify(d)
  expect(() => prepararCenaParaCompilacao(d, { cenario: d.id, revisao: 0 }, licencas)).toThrow(
    /Pack da equipe/,
  )
  const p = prepararCenaParaCompilacao(
    d,
    { cenario: d.id, revisao: 0 },
    { ...licencas, equipe: true },
  )
  expect(p.objetos).toHaveLength(1)
  expect(p.origens.get(p.objetos[0]!.id)).toBe('raiz')
  expect(p.montagens.map((m) => m.id)).toEqual(['raiz'])
  expect(p.licencas.map((l) => l.id)).toEqual(['pack'])
  expect(JSON.stringify(d)).toBe(antes)
})

test('perfil sem conversão, alturas ausentes e identificação/revisão inconsistentes impedem compilação', () => {
  const d = cena()
  for (const revisao of [-1, 0.5, NaN, Infinity])
    expect(() => prepararCenaParaCompilacao(d, { cenario: d.id, revisao }, licencas)).toThrow()
  expect(() => prepararCenaParaCompilacao(d, { cenario: 'outra', revisao: 0 }, licencas)).toThrow(
    /cenário/i,
  )
  terreno(d)
  expect(() => prepararCenaParaCompilacao(d, { cenario: d.id, revisao: 0 }, licencas)).toThrow(
    /altura|relevo/i,
  )
  d.base = { tipo: 'perfil', perfil: 'antigo', versao: '1', carimbos: [] }
  expect(() => prepararCenaParaCompilacao(d, { cenario: d.id, revisao: 0 }, licencas)).toThrow(
    /converta|perfil/i,
  )
})
