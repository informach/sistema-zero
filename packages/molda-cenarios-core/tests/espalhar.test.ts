import { expect, test } from 'bun:test'
import {
  type AmostraDeEspalhamento,
  criarAmostradorDeEspalhamento,
  criarDocumentoVazio,
  dominioDoChao,
  executarLote,
  inverterLote,
  LIMITES_ESPALHAMENTO,
  materializarEspalhamento,
  type ReceitaDeEspalhamento,
  volumeNoMundo,
} from '../src/v2'
import { criarSorteio } from '../src/v2/sorteio'

function cena() {
  const d = criarDocumentoVazio('c', 'Jardim')
  d.formas = [
    { id: 'flor', nome: 'Flor', tipo: 'caixa', largura: 0.4, altura: 0.6, comprimento: 0.4 },
  ]
  return d
}
function receita(): ReceitaDeEspalhamento {
  return {
    prototipos: [
      {
        nome: 'Flor',
        modelo: 'flor',
        colisao: 'caixa',
        rotacao: { x: 0, y: 0, z: 0 },
        escala: { x: 1, y: 1, z: 1 },
      },
    ],
    traco: [{ x: 0, z: 0 }],
    raio: 5,
    densidade: 25,
    afastamento: 1,
    giro: Math.PI,
    tamanhoMin: 0.8,
    tamanhoMax: 1.2,
    semente: 77,
    limite: 100,
    evitarObjetos: true,
    grupo: null,
    camada: null,
  }
}
const comIds = (
  amostras: ReturnType<ReturnType<typeof criarAmostradorDeEspalhamento>['gerar']>['amostras'],
) => amostras.map((a, i) => ({ ...a, id: `novo-${i}` }))
const amostrar = (d = cena(), r = receita()) =>
  comIds(criarAmostradorDeEspalhamento(d, r).gerar().amostras)

test('PRNG inteiro conserva a sequência e não usa o relógio; pincel determinístico conserva a origem', () => {
  const sorteio = criarSorteio(0)
  expect(sorteio()).toBe(1013904223 / 0x100000000)
  expect(sorteio()).toBe(1196435762 / 0x100000000)
  expect(() => criarSorteio(Number.NaN)).toThrow()
  const d = cena(),
    antes = structuredClone(d),
    r = receita(),
    contexto = criarAmostradorDeEspalhamento(d, r)
  const a = contexto.gerar(),
    b = contexto.gerar()
  expect(a).toEqual(b)
  expect(a.amostras.length).toBeGreaterThan(10)
  expect(criarAmostradorDeEspalhamento(d, { ...r, semente: 78 }).gerar()).not.toEqual(a)
  expect(d).toEqual(antes)
  for (const [i, p] of a.amostras.entries()) {
    expect(p.x * p.x + p.z * p.z).toBeLessThanOrEqual(r.raio ** 2)
    for (const outro of a.amostras.slice(i + 1))
      expect(Math.hypot(p.x - outro.x, p.z - outro.z)).toBeGreaterThanOrEqual(r.afastamento)
  }
})

test('prévia e aplicação preservam proporção, aparência, giro, espelho e contato no chão real', () => {
  const d = cena(),
    r = receita()
  d.texturas = [{ id: 't', biblioteca: 'b', textura: 't', digest: 'a'.repeat(64) }]
  r.prototipos[0] = {
    ...r.prototipos[0]!,
    rotacao: { x: 0.2, y: 0.3, z: 0.4 },
    escala: { x: 2, y: 0.5, z: 1 },
    espelho: { x: true, y: false, z: true },
    aparencia: { cor: '#334455', textura: { id: 't', repeticaoMetros: 2 } },
    propriedades: { 'jardim.tipo': 'flor' },
  }
  const amostras = amostrar(d, r),
    objetos = materializarEspalhamento(d, { receita: r, amostras })
  const novo = executarLote(
    { documento: d, revisao: 0 },
    {
      revisaoEsperada: 0,
      comandos: [{ tipo: 'objetos.espalhar', pincelada: { receita: r, amostras } }],
    },
  )
  expect(novo.documento.instancias).toEqual(objetos)
  for (const o of objetos) {
    expect(o.transformacao.escala.x / o.transformacao.escala.z).toBeCloseTo(2, 10)
    expect(o.transformacao.escala.y / o.transformacao.escala.z).toBeCloseTo(0.5, 10)
    expect(o.aparencia).toEqual(r.prototipos[0]!.aparencia)
    expect(o.espelho).toEqual(r.prototipos[0]!.espelho)
    expect(o.propriedades).toEqual(r.prototipos[0]!.propriedades)
    expect(volumeNoMundo(novo.documento, o).min.y).toBeCloseTo(0, 8)
  }
  expect(
    executarLote(novo, { revisaoEsperada: 1, comandos: inverterLote(d, novo.documento) }).documento,
  ).toEqual(d)
})

test('mistura protótipos da mesma fonte com aparências diferentes sem ultrapassar os limites', () => {
  const d = cena(),
    r = receita()
  r.evitarObjetos = false
  r.prototipos.push({ ...r.prototipos[0]!, nome: 'Outra flor', aparencia: { cor: '#dd3366' } })
  const amostras = amostrar(d, r)
  expect(new Set(amostras.map((a) => a.prototipo)).size).toBe(2)
  const objetos = materializarEspalhamento(d, { receita: r, amostras })
  expect(objetos.some((o) => o.aparencia?.cor === '#dd3366')).toBe(true)
  expect(objetos.some((o) => o.aparencia === undefined)).toBe(true)
  for (const a of amostras) {
    expect(a.fator).toBeGreaterThanOrEqual(r.tamanhoMin)
    expect(a.fator).toBeLessThanOrEqual(r.tamanhoMax)
    expect(Math.abs(a.giro)).toBeLessThanOrEqual(r.giro)
  }
})

test('ocupação existente usa os volumes reais; novos modelos não atravessam a construção', () => {
  const d = cena(),
    r = receita()
  const [o] = materializarEspalhamento(d, {
    receita: r,
    amostras: [{ id: 'casa', x: 0, z: 0, fator: 1, giro: 0, prototipo: 0 }],
  })
  o!.transformacao.escala = { x: 12, y: 2, z: 12 }
  o!.bloqueado = true
  o!.oculto = true
  d.instancias.push(o!)
  const casa = volumeNoMundo(d, o!),
    comOcupacao = amostrar(d, r)
  const semOcupacao = amostrar(d, { ...r, evitarObjetos: false })
  expect(comOcupacao).not.toEqual(semOcupacao)
  const objetos = materializarEspalhamento(d, { receita: r, amostras: comOcupacao })
  for (const objeto of objetos) {
    const v = volumeNoMundo(d, objeto)
    expect(
      v.max.x <= casa.min.x ||
        v.min.x >= casa.max.x ||
        v.max.z <= casa.min.z ||
        v.min.z >= casa.max.z,
    ).toBe(true)
  }
})

test('terreno exige alturas carregadas; recortes, peças ausentes e bordas não viram piso', () => {
  const d = cena(),
    r = receita()
  d.base = {
    tipo: 'terreno',
    origem: { x: 0, z: 0 },
    passo: 1,
    colunas: 128,
    linhas: 64,
    min: -10,
    max: 10,
    fundo: -10,
    pecas: [{ coluna: 0, linha: 0, digest: 'a'.repeat(64) }],
    recortes: [
      [
        { x: 2, z: 2 },
        { x: 8, z: 2 },
        { x: 8, z: 8 },
        { x: 2, z: 8 },
      ],
    ],
  }
  r.traco = [
    { x: 6, z: 6 },
    { x: 63, z: 25 },
  ]
  r.raio = 10
  expect(() => criarAmostradorDeEspalhamento(d, r)).toThrow('alturas')
  const fonte = (x: number, z: number) => x * 0.1 + z * 0.02,
    contexto = criarAmostradorDeEspalhamento(d, r, fonte),
    amostras = comIds(contexto.gerar().amostras)
  expect(amostras.length).toBeGreaterThan(1)
  const temChao = dominioDoChao(d.base)
  expect(temChao({ x: 2, z: 2 })).toBe(false)
  expect(temChao({ x: 80, z: 20 })).toBe(false)
  expect(temChao({ x: -1, z: 20 })).toBe(false)
  for (const a of amostras) expect(temChao(a)).toBe(true)
  for (const o of materializarEspalhamento(d, { receita: r, amostras }))
    expect(volumeNoMundo(d, o, fonte).min.y).toBeCloseTo(
      fonte(o.transformacao.posicao.x, o.transformacao.posicao.z),
      8,
    )
  expect(() => criarAmostradorDeEspalhamento(d, r, () => Number.NaN).gerar()).toThrow('altura')
})

test('traço, densidade e tentativas têm teto; não cria trabalho ilimitado numa área saturada', () => {
  const d = cena(),
    r = receita()
  r.raio = 1
  r.afastamento = 1
  r.densidade = 1000
  r.traco = Array.from({ length: 512 }, () => ({ x: 0, z: 0 }))
  const resultado = criarAmostradorDeEspalhamento(d, r).gerar()
  expect(resultado.tentativas).toBeLessThanOrEqual(LIMITES_ESPALHAMENTO.tentativas)
  expect(resultado.faltouEspaco).toBe(true)
  expect(resultado.amostras.length).toBeLessThanOrEqual(r.limite)
  const pesado = criarAmostradorDeEspalhamento(d, { ...r, raio: 100, afastamento: 100 }).gerar()
  expect(pesado.saturou).toBe(true)
  expect(pesado.tentativas).toBeLessThanOrEqual(LIMITES_ESPALHAMENTO.tentativas)
  expect(() =>
    criarAmostradorDeEspalhamento(d, { ...r, traco: [...r.traco, { x: 0, z: 0 }] }),
  ).toThrow()
  expect(() => criarAmostradorDeEspalhamento(d, { ...r, raio: Number.NaN })).toThrow()
  expect(() => criarAmostradorDeEspalhamento(d, { ...r, tamanhoMin: 2, tamanhoMax: 1 })).toThrow()
})

test('uma pincelada é atômica, com dados e IDs limitados; cadeados próprios e herdados não são contornados', () => {
  const d = cena(),
    r = receita(),
    amostras = amostrar(d, r),
    antes = structuredClone(d)
  const aplicar = (a: AmostraDeEspalhamento[], receita = r) =>
    executarLote(
      { documento: d, revisao: 0 },
      {
        revisaoEsperada: 0,
        comandos: [{ tipo: 'objetos.espalhar', pincelada: { receita, amostras: a } }],
      },
    )
  expect(() => aplicar([amostras[0]!, amostras[0]!])).toThrow('repetido')
  expect(() => aplicar([{ ...amostras[0]!, x: 100 }])).toThrow('fora dos limites')
  expect(() => aplicar([{ ...amostras[0]!, fator: 5 }])).toThrow('fora dos limites')
  expect(() => aplicar([{ ...amostras[0]!, prototipo: 7 }])).toThrow('fora dos limites')
  expect(() => aplicar([amostras[0]!, { ...amostras[0]!, id: 'outro' }])).toThrow('afastamento')
  expect(d).toEqual(antes)
  d.camadas = [{ id: 'c', nome: 'Plantio', oculto: false, bloqueado: true }]
  d.grupos = [{ id: 'g', nome: 'Área', grupo: null, camada: 'c', oculto: false, bloqueado: false }]
  expect(() => aplicar(amostras, { ...r, grupo: 'g' })).toThrow('bloqueada')
  expect(() => aplicar(amostras, { ...r, camada: 'c' })).toThrow('bloqueada')
  expect(d.instancias).toEqual([])
  d.camadas[0]!.bloqueado = false
  expect(
    aplicar(amostras, { ...r, grupo: 'g', camada: 'c' }).documento.instancias.every(
      (o) => o.grupo === 'g' && o.camada === 'c',
    ),
  ).toBe(true)
})

test('sobrepor o traço não multiplica a densidade nem desloca a prévia; anexar áreas conserva o prefixo', () => {
  const d = cena(),
    r = receita(),
    contexto = criarAmostradorDeEspalhamento(d, r)
  const inicial = contexto.gerar().amostras
  expect(
    contexto.gerar([
      { x: 0, z: 0 },
      { x: 0, z: 0 },
    ]).amostras,
  ).toEqual(inicial)
  const ampliado = contexto.gerar([
    { x: 0, z: 0 },
    { x: 6, z: 0 },
  ]).amostras
  expect(ampliado.slice(0, inicial.length)).toEqual(inicial)
  expect(ampliado.length).toBeGreaterThan(inicial.length)
  const forma = d.formas![0]!
  if (forma.tipo === 'caixa') forma.largura = 10
  if (d.base.tipo === 'plano') d.base.largura = 8
  expect(contexto.gerar().amostras).toEqual(inicial)
})
