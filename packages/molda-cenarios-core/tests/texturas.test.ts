import { expect, test } from 'bun:test'
import {
  aplicarTexturaAosObjetos,
  arquivosDoDocumento,
  arquivosDosComandos,
  type ComandoDeCenario,
  criarDocumentoVazio,
  executarLote,
  inverterLote,
  type TexturaDoCenario,
  validarDocumento,
} from '../src/v2'

const textura: TexturaDoCenario = {
  id: 'terra',
  biblioteca: 'b',
  textura: 't',
  digest: 'a'.repeat(64),
  nome: 'Terra',
}
function cena() {
  const d = criarDocumentoVazio('d', 'Materiais')
  d.formas = [{ id: 'f', nome: 'Caixa', tipo: 'caixa', largura: 2, altura: 1, comprimento: 2 }]
  d.instancias = [
    {
      id: 'o',
      nome: 'Caixa',
      modelo: 'f',
      grupo: null,
      bloqueado: false,
      oculto: false,
      aparencia: { cor: '#dd8844' },
      colisao: 'malha',
      apoio: { tipo: 'terreno', deslocamento: 0, inclinar: false, referencia: 'volume' },
      transformacao: {
        posicao: { x: 0, y: 0, z: 0 },
        rotacao: { x: 0, y: 0, z: 0 },
        escala: { x: 1, y: 1, z: 1 },
      },
    },
  ]
  return d
}
function aplicar(d: ReturnType<typeof cena>, comandos: ComandoDeCenario[]) {
  return executarLote({ documento: d, revisao: 0 }, { revisaoEsperada: 0, comandos }).documento
}
function porTextura(d: ReturnType<typeof cena>): ComandoDeCenario[] {
  return [
    { tipo: 'textura.definir', textura },
    {
      tipo: 'instancia.atualizar',
      id: 'o',
      alteracoes: {
        aparencia: {
          ...d.instancias[0]!.aparencia,
          textura: { id: textura.id, repeticaoMetros: 2 },
        },
      },
    },
  ]
}

test('referência fixada e repetição física entram no mesmo lote, preservando cor, origem e undo', () => {
  const d = cena(),
    antes = structuredClone(d),
    depois = aplicar(d, porTextura(d))
  expect(depois.texturas).toEqual([textura])
  expect(depois.instancias[0]!.aparencia).toEqual({
    cor: '#dd8844',
    textura: { id: 'terra', repeticaoMetros: 2 },
  })
  expect(d).toEqual(antes)
  expect(aplicar(depois, inverterLote(d, depois))).toEqual(d)
  expect(() => aplicar(depois, [{ tipo: 'textura.remover', id: 'terra' }])).toThrow('em uso')
  expect(() =>
    validarDocumento({ ...depois, texturas: [{ ...textura, url: 'https://invalid.local/a' }] }),
  ).toThrow()
})

test('texturas ausentes, repetidas, sem autorização ou repetição inválida não são aplicadas parcialmente', () => {
  const d = cena(),
    antes = structuredClone(d)
  expect(() => aplicar(d, porTextura(d).slice(1))).toThrow('fora da tabela')
  expect(() =>
    executarLote(
      { documento: d, revisao: 0 },
      { revisaoEsperada: 0, comandos: porTextura(d) },
      { texturaExiste: () => false },
    ),
  ).toThrow('Textura ausente')
  const depois = aplicar(d, porTextura(d))
  expect(() => validarDocumento({ ...depois, texturas: [textura, textura] })).toThrow('duplicada')
  for (const repeticaoMetros of [0, -1, 101, NaN, Infinity]) {
    expect(() =>
      aplicar(depois, [
        {
          tipo: 'instancia.atualizar',
          id: 'o',
          alteracoes: { aparencia: { textura: { id: 'terra', repeticaoMetros } } },
        },
      ]),
    ).toThrow()
  }
  expect(d).toEqual(antes)
})

test('redefinir material de objeto bloqueado é recusado; inversão conserva os cadeados herdados', () => {
  const d = aplicar(cena(), porTextura(cena()))
  d.grupos = [{ id: 'g', nome: 'Grupo', grupo: null, bloqueado: true, oculto: false }]
  d.instancias[0]!.grupo = 'g'
  d.instancias[0]!.bloqueado = true
  expect(() =>
    aplicar(d, [{ tipo: 'textura.definir', textura: { ...textura, digest: 'b'.repeat(64) } }]),
  ).toThrow('bloqueado')
  const restaurado = structuredClone(d)
  restaurado.texturas![0]!.digest = 'b'.repeat(64)
  expect(aplicar(restaurado, inverterLote(d, restaurado))).toEqual(d)
})

test('busca de arquivos inclui a tabela e os comandos que sobrevivem no histórico', () => {
  const d = aplicar(cena(), porTextura(cena()))
  expect(arquivosDoDocumento(d)).toEqual([{ tipo: 'textura', digest: textura.digest }])
  expect(arquivosDosComandos([{ tipo: 'textura.definir', textura }])).toEqual(
    arquivosDoDocumento(d),
  )
  expect(arquivosDosComandos([{ tipo: 'cenario.restaurar', documento: d }])).toEqual(
    arquivosDoDocumento(d),
  )
  expect(arquivosDosComandos([{ tipo: 'instancia.remover', id: 'o' }])).toEqual([])
})

test('escolha substitui apenas a seleção, resolve colisão de IDs e desfaz a remoção de referências sem uso', () => {
  const d = aplicar(cena(), porTextura(cena()))
  d.instancias.push({ ...structuredClone(d.instancias[0]!), id: 'vizinho', nome: 'Vizinho' })
  const nova = { ...textura, digest: 'b'.repeat(64) }
  const outro = aplicar(d, aplicarTexturaAosObjetos(d, ['o', 'o'], nova, 3))
  expect(outro.instancias[0]!.aparencia!.textura!.id).not.toBe('terra')
  expect(outro.instancias[1]!.aparencia!.textura!.id).toBe('terra')
  expect(outro.texturas).toHaveLength(2)
  expect(outro.instancias[0]!.aparencia!.cor).toBe('#dd8844')
  const ref = outro.texturas!.find((t) => t.digest === nova.digest)!
  const ambos = aplicar(outro, aplicarTexturaAosObjetos(outro, ['o', 'vizinho'], ref, 1.5))
  expect(ambos.texturas).toHaveLength(1)
  expect(ambos.texturas![0]).toEqual(ref)
  expect(ambos.instancias.every((o) => o.aparencia!.textura!.repeticaoMetros === 1.5)).toBe(true)
  const desfeito = aplicar(ambos, inverterLote(outro, ambos))
  // A ordem da tabela não tem significado no contrato autoral.
  expect({
    ...desfeito,
    texturas: desfeito.texturas?.slice().sort((a, b) => a.id.localeCompare(b.id)),
  }).toEqual({
    ...outro,
    texturas: outro.texturas?.slice().sort((a, b) => a.id.localeCompare(b.id)),
  })
  const limpo = aplicar(ambos, aplicarTexturaAosObjetos(ambos, ['o', 'vizinho'], null))
  expect(limpo.texturas).toBeUndefined()
  expect(limpo.instancias[0]!.aparencia).toEqual({ cor: '#dd8844' })
  expect(aplicar(limpo, inverterLote(ambos, limpo))).toEqual(ambos)
  expect(() => aplicarTexturaAosObjetos(d, ['ausente'], nova)).toThrow()
  expect(() => aplicarTexturaAosObjetos(d, ['o'], nova, NaN)).toThrow()
  d.instancias[0]!.bloqueado = true
  expect(() => aplicar(d, aplicarTexturaAosObjetos(d, ['o'], nova))).toThrow('bloqueado')
})

test('restaurar o material de um objeto conserva a textura ainda usada por um caminho', () => {
  const d = aplicar(cena(), porTextura(cena()))
  d.caminhos = [
    {
      id: 'c',
      nome: 'Trilha',
      grupo: null,
      oculto: false,
      bloqueado: false,
      tipo: 'trilha',
      acabamento: null,
      largura: 2.5,
      pontos: [
        { x: 0, z: 0 },
        { x: 8, z: 0 },
      ],
      aparencia: { textura: { id: textura.id, repeticaoMetros: 2 } },
    },
  ]
  const depois = aplicar(d, aplicarTexturaAosObjetos(d, ['o'], null))
  expect(depois.texturas).toEqual([textura])
  expect(depois.caminhos[0]!.aparencia).toEqual(d.caminhos[0]!.aparencia)
  expect(depois.instancias[0]!.aparencia?.textura).toBeUndefined()
})
