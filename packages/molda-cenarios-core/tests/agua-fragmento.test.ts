import { expect, test } from 'bun:test'
import {
  AguaSchema,
  apoioNaAgua,
  capturarConteudoDeConjunto,
  capturarFragmento,
  colarFragmento,
  criarDocumentoVazio,
  executarLote,
  idsDoFragmento,
  inverterLote,
  transformacaoResolvida,
  validarFragmento,
} from '../src/v2'

function cena() {
  const doc = criarDocumentoVazio('origem', 'Lago')
  doc.grupos = [{ id: 'g', nome: 'Margem', grupo: null, bloqueado: false, oculto: false }]
  doc.modelos = [{ id: 'bacia', modelo: 'bacia', biblioteca: 'catalogo', digest: 'a'.repeat(64) }]
  doc.formas = [{ id: 'boia', nome: 'Boia', tipo: 'caixa', largura: 1, altura: 1, comprimento: 1 }]
  const contorno = [
    { x: -5, z: -5 },
    { x: 5, z: -5 },
    { x: 5, z: 5 },
    { x: -5, z: 5 },
  ]
  doc.aguas = [
    AguaSchema.parse({
      id: 'lago',
      nome: 'Lago',
      grupo: 'g',
      bloqueado: false,
      oculto: false,
      tipo: 'lago',
      modelo: 'bacia',
      nivel: 4,
      centro: { x: 20, z: 10 },
      giro: 0.4,
      escala: 1.5,
      profundidade: 3,
      contorno,
      recorte: contorno,
      encaixeModelo: { nivelLocal: 1.4, materiaisDaAgua: ['agua'], materiaisSolidos: ['margem'] },
    }),
  ]
  const t = {
    posicao: { x: 20, y: 4.5, z: 10 },
    rotacao: { x: 0.1, y: 0.5, z: 0.2 },
    escala: { x: 1, y: 2, z: 1 },
  }
  doc.instancias = [
    {
      id: 'o',
      nome: 'Boia',
      grupo: 'g',
      modelo: 'boia',
      bloqueado: false,
      oculto: false,
      colisao: 'nenhuma',
      transformacao: t,
      apoio: apoioNaAgua(doc, 'lago', t),
    },
  ]
  return doc
}
test('fragmento copia água, GLB e apoio interno; colagem move o conjunto sem copiar relevo', () => {
  const doc = cena(),
    antes = structuredClone(doc),
    f = capturarFragmento(doc, ['g'], 'conta'),
    ids = idsDoFragmento(f, 'copia'),
    destino = criarDocumentoVazio('destino', 'Destino')
  const ponto = { x: f.ancora.x + 30, y: f.ancora.y + 2, z: f.ancora.z - 10 }
  const colado = executarLote(
    { documento: destino, revisao: 0 },
    {
      revisaoEsperada: 0,
      comandos: [{ tipo: 'fragmento.colar', fragmento: f, prefixo: 'copia', ponto }],
    },
  ).documento
  expect(doc).toEqual(antes)
  expect(colado.base).toEqual(destino.base)
  expect(colado.aguas).toHaveLength(1)
  expect(colado.modelos[0]!.digest).toBe('a'.repeat(64))
  expect(colado.aguas[0]).toMatchObject({
    modelo: colado.modelos[0]!.id,
    centro: { x: 50, z: 0 },
    nivel: 6,
  })
  expect(colado.instancias[0]!.apoio).toMatchObject({ tipo: 'agua', agua: colado.aguas[0]!.id })
  expect(transformacaoResolvida(colado, colado.instancias[0]!).posicao).toEqual({
    x: 50,
    y: 6.5,
    z: 0,
  })
  expect(ids.raizes).toEqual(['copia/grupo/0'])
  expect(
    executarLote(
      { documento: colado, revisao: 1 },
      { revisaoEsperada: 1, comandos: inverterLote(destino, colado) },
    ).documento,
  ).toEqual(destino)
})
test('água sozinha é fragmento válido e conta como raiz determinística', () => {
  const f = capturarFragmento(cena(), ['lago'], 'conta')
  expect(f.instancias).toEqual([])
  expect(idsDoFragmento(f, 'p').raizes).toEqual(['p/agua/0'])
})

test('apoio de rio muda coordenadas mundiais uma vez e conserva pose completa na colagem', () => {
  const doc = cena()
  doc.aguas = [
    AguaSchema.parse({
      id: 'rio',
      nome: 'Rio',
      grupo: 'g',
      bloqueado: false,
      oculto: false,
      tipo: 'rio',
      pontos: [
        { x: 10, y: 4, z: 10 },
        { x: 30, y: 3, z: 10 },
      ],
      largura: 4,
      profundidade: 2,
      correnteza: 1,
    }),
  ]
  const t = { ...doc.instancias[0]!.transformacao, posicao: { x: 20, y: 4, z: 10 } }
  doc.instancias[0]!.apoio = apoioNaAgua(doc, 'rio', t)
  doc.instancias[0]!.transformacao = t
  const f = capturarFragmento(doc, ['g'], 'conta'),
    colado = colarFragmento(criarDocumentoVazio('d', 'D'), f, 'p', {
      x: f.ancora.x + 20,
      y: f.ancora.y + 2,
      z: f.ancora.z - 3,
    })
  const antes = transformacaoResolvida(doc, doc.instancias[0]!),
    depois = transformacaoResolvida(colado, colado.instancias[0]!)
  expect(depois.posicao).toEqual({ x: 40, y: 6, z: 7 })
  expect(depois.rotacao).toEqual(antes.rotacao)
  expect(depois.escala).toEqual(antes.escala)
})

test('colagem desloca perfil/controles do rio e cotas da queda e barragem', () => {
  const doc = cena(),
    lago = doc.aguas[0]!
  doc.instancias = []
  const variantes = [
    {
      id: 'rio',
      nome: 'Rio',
      tipo: 'rio',
      pontos: [
        { x: 10, y: 4, z: 10 },
        { x: 30, y: 3, z: 10 },
      ],
      controle: [
        { x: 10, z: 10 },
        { x: 30, z: 10 },
      ],
      largura: 4,
      profundidade: 2,
      correnteza: 1,
    },
    {
      id: 'queda',
      nome: 'Queda',
      tipo: 'cachoeira',
      topo: { x: 10, y: 8, z: 10 },
      base: { x: 12, y: 2, z: 10 },
      largura: 3,
      giro: 0,
      nado: false,
    },
    {
      ...lago,
      id: 'represa',
      tipo: 'represa',
      barragem: { de: { x: -5, z: -4 }, ate: { x: 5, z: -4 }, crista: 5, largura: 2 },
    },
  ]
  for (const entrada of variantes) {
    doc.aguas = [AguaSchema.parse({ grupo: null, bloqueado: false, oculto: false, ...entrada })]
    const f = capturarFragmento(doc, [doc.aguas[0]!.id], 'conta')
    const colado = colarFragmento(criarDocumentoVazio('d', 'D'), f, 'p', {
      x: f.ancora.x + 20,
      y: f.ancora.y + 2,
      z: f.ancora.z - 3,
    })
    const a = colado.aguas[0]!
    if (a.tipo === 'rio') {
      expect(a.pontos).toEqual([
        { x: 30, y: 6, z: 7 },
        { x: 50, y: 5, z: 7 },
      ])
      expect(a.controle).toEqual([
        { x: 30, z: 7 },
        { x: 50, z: 7 },
      ])
    } else if (a.tipo === 'cachoeira') {
      expect(a.topo).toEqual({ x: 30, y: 10, z: 7 })
      expect(a.base).toEqual({ x: 32, y: 4, z: 7 })
    } else if (a.tipo === 'represa') {
      expect(a.nivel).toBe(6)
      expect(a.barragem.crista).toBe(7)
      expect(a.barragem.de).toEqual({ x: -5, z: -4 })
    } else throw Error('Variante inesperada')
  }
})
test('mar permanece único; vínculo externo é recusado e conjunto de objetos não perde água silenciosamente', () => {
  const doc = cena(),
    f = capturarFragmento(doc, ['g'], 'conta')
  expect(() => validarFragmento({ ...f, aguas: undefined })).toThrow('ausente')
  expect(() => capturarConteudoDeConjunto(doc, ['g'], 'conta')).toThrow('Água não faz parte')
  doc.instancias = []
  doc.aguas = [
    AguaSchema.parse({
      id: 'mar',
      nome: 'Mar',
      grupo: null,
      bloqueado: false,
      oculto: false,
      tipo: 'mar',
      nivel: -2,
    }),
  ]
  const mar = capturarFragmento(doc, ['mar'], 'conta'),
    antes = structuredClone(doc)
  expect(() => colarFragmento(doc, mar, 'p', mar.ancora)).toThrow('mar')
  expect(doc).toEqual(antes)
})
