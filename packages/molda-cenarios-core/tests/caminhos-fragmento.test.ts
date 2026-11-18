import { expect, test } from 'bun:test'
import {
  arquivosDosComandos,
  CaminhoSchema,
  capturarConteudoDeConjunto,
  capturarFragmento,
  criarDocumentoVazio,
  executarLote,
  idsDoFragmento,
  inverterLote,
  validarFragmento,
} from '../src/v2'

function cena() {
  const d = criarDocumentoVazio('a', 'Caminhos')
  d.grupos = [{ id: 'g', nome: 'Passeio', grupo: null, bloqueado: false, oculto: false }]
  d.camadas = [{ id: 'c', nome: 'Circulação', bloqueado: false, oculto: false }]
  d.modelos = [
    {
      id: 'm',
      modelo: 'modulo',
      biblioteca: 'acervo',
      digest: 'a'.repeat(64),
      volume: { min: { x: -1, y: 0, z: -1 }, max: { x: 1, y: 1, z: 1 } },
    },
  ]
  d.texturas = [{ id: 't', textura: 'terra', biblioteca: 'acervo', digest: 'b'.repeat(64) }]
  d.caminhos = ['trilha', 'praca', 'estrada', 'cerca', 'muro', 'ponte'].map((tipo, i) =>
    CaminhoSchema.parse({
      id: `via${i}`,
      nome: tipo,
      tipo,
      grupo: 'g',
      camada: 'c',
      bloqueado: false,
      oculto: false,
      acabamento: 'm',
      encaixeModelo: {
        eixo: 'x',
        pisoLocal: 0.3,
        inicioLocal: -0.8,
        fimLocal: 0.8,
        centroTransversalLocal: 0.1,
      },
      largura: 3,
      aparencia: { cor: '#bbaacc', textura: { id: 't', repeticaoMetros: 2 } },
      pontos:
        tipo === 'praca'
          ? [
              { x: 0, z: 0 },
              { x: 8, z: 0 },
              { x: 4, z: 4 },
            ]
          : [
              { x: 0, z: i * 8 },
              { x: 8, z: i * 8 },
            ],
      ...(tipo === 'ponte' ? { cotas: { de: 4, ate: 5 } } : {}),
    }),
  )
  return d
}

test('caminho isolado é raiz válida com seus recursos e ancestrais, sem copiar vizinhos', () => {
  const d = cena(),
    antes = structuredClone(d),
    f = capturarFragmento(d, ['via0'], 'e')
  expect(f.caminhos?.map((c) => c.id)).toEqual(['via0'])
  expect(f.modelos).toEqual(d.modelos)
  expect(f.texturas).toEqual(d.texturas ?? [])
  expect(f.camadas).toEqual(d.camadas ?? [])
  expect(f.grupos).toEqual(d.grupos)
  expect(idsDoFragmento(f, 'p').raizes).toEqual(['p/caminho/0'])
  expect(validarFragmento(JSON.stringify(f))).toEqual(f)
  expect(d).toEqual(antes)
})

test('pasta com seis variantes cola em uma revisão com aliases e desfaz sem alterar origem ou relevo', () => {
  const d = cena(),
    f = capturarFragmento(d, ['g'], 'e'),
    destino = criarDocumentoVazio('b', 'Destino'),
    ponto = { x: f.ancora.x + 20, y: f.ancora.y + 7, z: f.ancora.z - 10 },
    comando = { tipo: 'fragmento.colar' as const, fragmento: f, prefixo: 'novo', ponto },
    novo = executarLote(
      { documento: destino, revisao: 0 },
      { revisaoEsperada: 0, comandos: [comando] },
    ).documento
  expect(novo.caminhos).toHaveLength(6)
  for (const [i, c] of novo.caminhos.entries()) {
    expect(c.pontos[0]).toEqual({ x: 20, z: d.caminhos[i]!.pontos[0]!.z - 10 })
    expect(c.acabamento).toBe('novo/modelo/0')
    expect(c.encaixeModelo).toEqual(d.caminhos[i]!.encaixeModelo)
    expect(c.aparencia?.textura?.id).toBe('novo/textura/0')
    expect(c.camada).toBe('novo/camada/0')
    expect(c.grupo).toBe('novo/grupo/0')
    if (c.tipo === 'ponte') expect(c.cotas).toEqual({ de: 11, ate: 12 })
  }
  expect(novo.base).toEqual(destino.base)
  expect(arquivosDosComandos([comando])).toEqual([
    { digest: 'a'.repeat(64), tipo: 'modelo' },
    { digest: 'b'.repeat(64), tipo: 'textura' },
  ])
  expect(
    executarLote(
      { documento: novo, revisao: 1 },
      { revisaoEsperada: 1, comandos: inverterLote(destino, novo) },
    ).documento,
  ).toEqual(destino)
  expect(() =>
    executarLote({ documento: novo, revisao: 1 }, { revisaoEsperada: 1, comandos: [comando] }),
  ).toThrow('já foi usado')
  expect(d).toEqual(cena())
})

test('colar ponte de cabeceiras automáticas conserva seu vínculo ao chão do destino', () => {
  const d = cena(),
    ponte = d.caminhos[5]!
  if (ponte.tipo === 'ponte') delete ponte.cotas
  const f = capturarFragmento(d, ['via5'], 'e'),
    destino = criarDocumentoVazio('b', 'B'),
    novo = executarLote(
      { documento: destino, revisao: 0 },
      {
        revisaoEsperada: 0,
        comandos: [
          { tipo: 'fragmento.colar', fragmento: f, prefixo: 'p', ponto: { ...f.ancora, y: 100 } },
        ],
      },
    ).documento
  expect(novo.caminhos[0]).not.toHaveProperty('cotas')
})

test('fragmento não descarta caminhos ao salvar conjunto nem aceita recursos ou raízes ausentes', () => {
  const d = cena(),
    f = capturarFragmento(d, ['g'], 'e')
  expect(() => capturarConteudoDeConjunto(d, ['g'], 'e')).toThrow('conjunto de objetos')
  expect(() => validarFragmento({ ...f, modelos: [] })).toThrow('Acabamento')
  expect(() => validarFragmento({ ...f, texturas: [] })).toThrow('Textura')
  expect(() => validarFragmento({ ...f, raizes: ['ausente'] })).toThrow('raiz ausente')
})
