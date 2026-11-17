import { expect, test } from 'bun:test'
import {
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
