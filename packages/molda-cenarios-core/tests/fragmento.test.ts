import { expect, test } from 'bun:test'
import {
  arquivosDosComandos,
  type ComandoDeCenario,
  capturarFragmento,
  criarDocumentoVazio,
  executarLote,
  idsDoFragmento,
  inverterLote,
  posicaoNoMundo,
  validarFragmento,
} from '../src/v2'

function cena() {
  const doc = criarDocumentoVazio('origem', 'Origem')
  doc.formas = [{ id: 'f', nome: 'Caixa', tipo: 'caixa', largura: 2, altura: 1, comprimento: 2 }]
  doc.grupos = [
    { id: 'g', nome: 'Jardim', grupo: null, bloqueado: false, oculto: false, camada: 'c' },
    { id: 'sub', nome: 'Flores', grupo: 'g', bloqueado: false, oculto: false },
  ]
  doc.camadas = [{ id: 'c', nome: 'Natureza', bloqueado: false, oculto: false }]
  doc.instancias = ['a', 'b', 'fora'].map((id, i) => ({
    id,
    nome: id,
    grupo: i < 2 ? 'sub' : null,
    bloqueado: false,
    oculto: false,
    modelo: 'f',
    apoio: { tipo: 'absoluto' as const },
    colisao: 'caixa' as const,
    transformacao: {
      posicao: { x: i * 3, y: 4, z: 8 },
      rotacao: { x: 0, y: 0, z: 0 },
      escala: { x: 1, y: 1, z: 1 },
    },
  }))
  return doc
}
const aplicar = (doc: ReturnType<typeof cena>, comandos: ComandoDeCenario[]) =>
  executarLote({ documento: doc, revisao: 0 }, { revisaoEsperada: 0, comandos }).documento
const capturar = (doc = cena(), ids = ['g']) => capturarFragmento(doc, ids, 'conta')

test('fragmento é independente, limitado e conserva só os recursos e ancestrais necessários', () => {
  const doc = cena(),
    antes = structuredClone(doc),
    f = capturar(doc, ['a'])
  expect(f.instancias.map((o) => o.id)).toEqual(['a'])
  expect(f.raizes).toEqual(['a'])
  expect(idsDoFragmento(f, 'p').raizes).toEqual(['p/objeto/0'])
  expect(f.grupos.map((g) => g.id)).toEqual(['g', 'sub'])
  expect(f.camadas.map((c) => c.id)).toEqual(['c'])
  expect(f.formas).toHaveLength(1)
  expect(validarFragmento(JSON.stringify(f))).toEqual(f)
  f.grupos[0]!.nome = 'Outra'
  expect(doc).toEqual(antes)
  expect(() => validarFragmento('{')).toThrow()
  expect(() => validarFragmento(' '.repeat(8 * 1024 * 1024 + 1))).toThrow('8 MB')
  expect(() => capturar(doc, [])).toThrow('Escolha')
  expect(() => validarFragmento({ ...f, endereco: 'https://exemplo' })).toThrow()
  expect(() => validarFragmento({ ...f, raizes: ['ausente'] })).toThrow('raiz ausente')
  expect(() => validarFragmento({ ...f, grupos: [f.grupos[0], f.grupos[0]] })).toThrow('duplicado')
})

test('colagem é determinística, conserva aparência e hierarquia e não altera a origem ou o destino', () => {
  const doc = cena()
  doc.instancias[0]!.espelho = { x: true, y: false, z: false }
  doc.instancias[0]!.transformacao.escala = { x: 2, y: 3, z: 0.5 }
  doc.instancias[0]!.aparencia = { cor: '#112233', textura: { id: 't', repeticaoMetros: 3 } }
  doc.texturas = [
    { id: 't', nome: 'Terra', biblioteca: 'biblioteca', textura: 'imagem', digest: 'a'.repeat(64) },
  ]
  const f = capturar(doc),
    antes = structuredClone(doc),
    destino = criarDocumentoVazio('destino', 'Destino')
  const c: ComandoDeCenario = {
    tipo: 'fragmento.colar',
    fragmento: f,
    prefixo: 'novo',
    ponto: { x: 20, y: 0, z: 20 },
  }
  const novo = aplicar(destino, [c])
  expect(aplicar(destino, [c])).toEqual(novo)
  expect(doc).toEqual(antes)
  expect(destino.instancias).toHaveLength(0)
  expect(novo.instancias).toHaveLength(2)
  expect(novo.grupos[1]!.grupo).toBe('novo/grupo/0')
  expect(novo.instancias[0]!.grupo).toBe('novo/grupo/1')
  expect(novo.instancias[0]!.espelho).toEqual(doc.instancias[0]!.espelho)
  expect(novo.instancias[0]!.transformacao.escala).toEqual(doc.instancias[0]!.transformacao.escala)
  expect(novo.instancias[0]!.aparencia).toEqual({
    cor: '#112233',
    textura: { id: 'novo/textura/0', repeticaoMetros: 3 },
  })
  expect(arquivosDosComandos([c])).toEqual([{ digest: 'a'.repeat(64), tipo: 'textura' }])
  expect(aplicar(novo, inverterLote(destino, novo))).toEqual(destino)
  expect(() => aplicar(novo, [c])).toThrow('já foi usado')
})

test('apoios internos com contato ou legados são remapeados sem deslocar a pilha duas vezes', () => {
  for (const contato of [undefined, { x: 0.2, y: 1, z: 0.3 }]) {
    const doc = cena()
    doc.instancias[0]!.transformacao.rotacao.y = 0.5
    doc.instancias[1]!.apoio = {
      tipo: 'objeto',
      objeto: 'a',
      deslocamento: 0.1,
      ...(contato ? { contato } : {}),
    }
    const antes = doc.instancias.slice(0, 2).map((o) => posicaoNoMundo(doc, o)),
      f = capturar(doc),
      ponto = { x: 0, y: 0, z: 0 },
      novo = aplicar(criarDocumentoVazio('alvo', 'Alvo'), [
        { tipo: 'fragmento.colar', fragmento: f, prefixo: 'p', ponto },
      ])
    for (let i = 0; i < 2; i++) {
      const atual = posicaoNoMundo(novo, novo.instancias[i]!)
      for (const eixo of ['x', 'y', 'z'] as const)
        expect(atual[eixo]).toBeCloseTo(antes[i]![eixo] - f.ancora[eixo], 9)
    }
    expect(novo.instancias[1]!.apoio).toMatchObject({ tipo: 'objeto', objeto: 'p/objeto/0' })
  }
})

test('apoio externo e terreno são resolvidos antes de sair da cena; falta de medidas é recusa clara', () => {
  const doc = cena()
  doc.instancias[0]!.apoio = {
    tipo: 'terreno',
    deslocamento: 3,
    inclinar: false,
    referencia: 'volume',
  }
  doc.instancias[1]!.apoio = {
    tipo: 'objeto',
    objeto: 'a',
    contato: { x: 0, y: 1, z: 0 },
    deslocamento: 0,
  }
  const f = capturar(doc, ['b'])
  expect(f.instancias[0]!.apoio).toEqual({ tipo: 'absoluto' })
  expect(f.instancias[0]!.transformacao.posicao).toEqual(posicaoNoMundo(doc, doc.instancias[1]!))
  expect(capturar(doc, ['a']).instancias[0]!.apoio).toEqual({ tipo: 'absoluto' })
  doc.modelos = [{ id: 'sem-medida', modelo: 'modelo', biblioteca: 'b', digest: 'b'.repeat(64) }]
  doc.instancias[2]!.modelo = 'sem-medida'
  expect(() => capturar(doc, ['fora'])).toThrow('medidas')
})

test('recursos com IDs colidentes recebem aliases; recursos idênticos são reutilizados', () => {
  const doc = cena()
  doc.modelos = [
    {
      id: 'modelo',
      biblioteca: 'b',
      modelo: 'm',
      digest: 'b'.repeat(64),
      volume: { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } },
    },
  ]
  doc.instancias[0]!.modelo = 'modelo'
  const f = capturar(doc),
    destino = cena()
  destino.formas![0]!.nome = 'Definição diferente'
  destino.camadas![0]!.nome = 'Camada diferente'
  destino.modelos = [{ ...doc.modelos[0]!, id: 'referencia-existente' }]
  const novo = aplicar(destino, [
    { tipo: 'fragmento.colar', fragmento: f, prefixo: 'p', ponto: f.ancora },
  ])
  expect(novo.modelos).toHaveLength(1)
  expect(novo.instancias[3]!.modelo).toBe('referencia-existente')
  expect(novo.instancias[4]!.modelo).toBe('p/forma/0')
  expect(novo.formas![0]).toEqual(destino.formas![0])
  expect(novo.grupos.at(-2)!.camada).toBe('p/camada/0')
  expect(novo.camadas![0]).toEqual(destino.camadas![0])
})

test('pastas vazias e conteúdo bloqueado podem ser copiados; colagem não contorna camada de destino', () => {
  const doc = cena()
  doc.grupos[0]!.bloqueado = true
  doc.camadas![0]!.bloqueado = true
  const f = capturar(doc),
    destino = criarDocumentoVazio('alvo', 'Alvo')
  const c: ComandoDeCenario = {
    tipo: 'fragmento.colar',
    fragmento: f,
    prefixo: 'p',
    ponto: f.ancora,
  }
  const novo = aplicar(destino, [c])
  expect(novo.grupos[0]!.bloqueado).toBe(true)
  expect(novo.camadas![0]!.bloqueado).toBe(true)
  expect(aplicar(novo, inverterLote(destino, novo))).toEqual(destino)
  expect(() => aplicar(doc, [c])).toThrow('camada de destino')
  doc.instancias = []
  expect(capturar(doc).grupos).toHaveLength(2)
})

test('colagem grande é uma única intenção, com orçamento e inversão atômicos', () => {
  const doc = cena(),
    base = doc.instancias[0]!
  doc.instancias = Array.from({ length: 600 }, (_, i) => ({ ...base, id: `objeto-${i}` }))
  const f = capturar(doc),
    destino = criarDocumentoVazio('alvo', 'Alvo'),
    c: ComandoDeCenario = { tipo: 'fragmento.colar', fragmento: f, prefixo: 'p', ponto: f.ancora }
  const novo = aplicar(destino, [c])
  expect(novo.instancias).toHaveLength(600)
  expect(idsDoFragmento(f, 'p').instancias.size).toBe(600)
  expect(aplicar(novo, inverterLote(destino, novo))).toEqual(destino)
  expect(() => aplicar(destino, [{ ...c, prefixo: '../invalido' }])).toThrow()
  expect(() => aplicar(destino, [{ ...c, ponto: { x: Number.NaN, y: 0, z: 0 } }])).toThrow()
})

test('fragmentos recusam vínculos externos e ciclos, conservando marcadores de pastas mistas', () => {
  const doc = cena(),
    f = capturar(doc)
  const invalido = structuredClone(f)
  invalido.instancias[0]!.apoio = { tipo: 'objeto', objeto: 'fora', deslocamento: 0 }
  expect(() => validarFragmento(invalido)).toThrow('Apoio ausente')
  invalido.instancias[0]!.apoio = { tipo: 'absoluto' }
  invalido.grupos[0]!.grupo = 'sub'
  expect(() => validarFragmento(invalido)).toThrow('Ciclo')
  doc.marcadores = [
    {
      id: 'm',
      nome: 'Destino',
      grupo: 'g',
      bloqueado: false,
      oculto: false,
      posicao: { x: 0, y: 0, z: 0 },
      giro: 0,
      noChao: false,
      objeto: null,
    },
  ]
  expect(capturar(doc).marcadores).toEqual(doc.marcadores)
  expect(
    () =>
      aplicar(criarDocumentoVazio('d', 'D'), [
        { tipo: 'fragmento.colar', fragmento: f, prefixo: 'p', ponto: f.ancora },
      ]).instancias[0],
  ).not.toThrow()
})
