import { expect, test } from 'bun:test'
import {
  abrirEdicaoDeTerreno,
  arquivosDoDocumento,
  BaseDeTerrenoSchema,
  baseComPecasEditadas,
  chaveDaBase,
  codificarPecaDeAlturas,
  codificarPecaDePintura,
  codificarRecursoDeBuracos,
  conferirMetadadosDoTerreno,
  criarBuracos,
  criarCampoDeAlturas,
  criarDocumentoVazio,
  criarPinturaDeChao,
  elevarTerreno,
  executarLote,
  inverterLote,
  lerRecursoDeTerreno,
  metadadosDoTerrenoCorrespondem,
  pintarChao,
  prepararPecasEditadas,
  reamostrarTerreno,
  referenciasDoTerreno,
  validarDocumento,
} from '../src/v2'

const digest = 'a'.repeat(64)
const base = {
  tipo: 'terreno' as const,
  origem: { x: 0, z: 0 },
  passo: 1,
  colunas: 64,
  linhas: 64,
  min: -10,
  max: 100,
  fundo: 0,
  pecas: [],
  solo: { camadas: [{ id: 'grama', nome: 'Grama', cor: '#80b65a' }], pecas: [] },
  buracos: [{ coluna: 0, linha: 0, digest }],
}

test('a base guarda pintura e buracos por peça sem confundir camadas de organização', () => {
  expect(BaseDeTerrenoSchema.parse(base)).toEqual(base)
})

test('identidade da base inclui solo e buracos e independe da ordem das propriedades recebidas', () => {
  const terreno = BaseDeTerrenoSchema.parse(base)
  const chave = chaveDaBase(terreno)
  expect(chaveDaBase({ ...terreno, buracos: [] })).not.toBe(chave)
  expect(
    chaveDaBase({
      ...terreno,
      solo: { ...terreno.solo!, camadas: [{ ...terreno.solo!.camadas[0]!, cor: '#654321' }] },
    }),
  ).not.toBe(chave)
  expect(
    chaveDaBase({
      ...terreno,
      solo: { ...terreno.solo!, pecas: [{ coluna: 0, linha: 0, digest }] },
    }),
  ).not.toBe(chave)
  const invertido = (valor: unknown): unknown =>
    Array.isArray(valor)
      ? valor.map(invertido)
      : valor && typeof valor === 'object'
        ? Object.fromEntries(
            Object.entries(valor)
              .reverse()
              .map(([k, v]) => [k, invertido(v)]),
          )
        : valor
  expect(chaveDaBase(BaseDeTerrenoSchema.parse(invertido(terreno)))).toBe(chave)
})

test('edição serializa as duas bordas tocadas, conserva outros hashes e devolve fundo sem arquivo', () => {
  const terreno = BaseDeTerrenoSchema.parse({
    ...base,
    colunas: 192,
    buracos: [],
    solo: {
      ...base.solo,
      camadas: [base.solo.camadas[0], { id: 'terra', nome: 'Terra', cor: '#907050' }],
    },
  })
  const estado = abrirEdicaoDeTerreno(terreno, new Map())
  const regiao = elevarTerreno(estado.campo, { x: 64, z: 30, raio: 5, forca: 1 }, 4)
  const partes = prepararPecasEditadas(terreno, estado, { alturas: regiao })
  expect(partes.map((p) => p.coluna)).toEqual([0, 1])
  const recursos = new Map<string, ReturnType<typeof lerRecursoDeTerreno>>()
  const gravadas = partes.map((p) => {
    const bytes = p.conteudo!
    const hash = new Bun.CryptoHasher('sha256').update(bytes).digest('hex')
    recursos.set(hash, lerRecursoDeTerreno(bytes))
    return { ...p, digest: hash }
  })
  const nova = baseComPecasEditadas(terreno, gravadas)
  expect(baseComPecasEditadas(nova, gravadas)).toBe(nova)
  expect(nova.pecas).toHaveLength(2)
  const reaberto = abrirEdicaoDeTerreno(nova, recursos)
  expect(reaberto.campo.alturas[30 * 193 + 64]).toBeCloseTo(4, 2)
  expect(() => abrirEdicaoDeTerreno(nova, new Map())).toThrow()
  const pintura = pintarChao(estado.campo, estado.pintura, { x: 10, z: 10, raio: 3, forca: 1 }, 1)
  expect(prepararPecasEditadas(terreno, estado, { pintura })[0]?.conteudo).not.toBeNull()
  estado.campo.alturas.fill(0)
  expect(
    prepararPecasEditadas(nova, estado, { alturas: regiao }).every((p) => p.conteudo === null),
  ).toBe(true)
  expect(
    baseComPecasEditadas(
      nova,
      gravadas.map((p) => ({ ...p, digest: null })),
    ).pecas,
  ).toHaveLength(0)
})

test('reamostragem conserva metros, pesos e pequenos buracos ao reduzir a resolução', () => {
  const forma = {
    origem: { x: 0, z: 0 },
    passo: 1,
    colunas: 128,
    linhas: 128,
    min: -10,
    max: 100,
    fundo: 0,
  }
  const campo = criarCampoDeAlturas(forma),
    pintura = criarPinturaDeChao(forma, 2),
    buracos = criarBuracos(forma)
  for (let z = 0; z <= 128; z++)
    for (let x = 0; x <= 128; x++) {
      const i = z * 129 + x
      campo.alturas[i] = x / 2 + z / 8
      pintura.pesos[i * 2] = x
      pintura.pesos[i * 2 + 1] = 255 - x
    }
  buracos.celulas[5 * 128 + 5] = 1
  const nova = reamostrarTerreno(
    { campo, pintura, buracos },
    { ...forma, colunas: 64, linhas: 64, passo: 2 },
  )
  expect(nova.campo.alturas[20 * 65 + 10]).toBeCloseTo(15, 5)
  expect(nova.pintura.pesos[2 * (20 * 65 + 10)]).toBe(20)
  expect(nova.buracos.celulas[2 * 64 + 2]).toBe(1)
  for (let i = 0; i < nova.pintura.pesos.length; i += 2)
    expect(nova.pintura.pesos[i]! + nova.pintura.pesos[i + 1]!).toBe(255)
  const ampliada = reamostrarTerreno(
    { campo, pintura, buracos },
    { ...forma, origem: { x: -64, z: -64 }, fundo: -4 },
  )
  expect(ampliada.campo.alturas[0]).toBe(-4)
  expect(ampliada.pintura.pesos[0]).toBe(255)
  expect(() =>
    reamostrarTerreno({ campo, pintura, buracos }, { ...forma, passo: Infinity }),
  ).toThrow()
})

test('campos recusam medidas não finitas e regravar hashes iguais conserva a base original', () => {
  const forma = { origem: { x: 0, z: 0 }, passo: 1, colunas: 64, linhas: 64, min: -10, max: 100 }
  for (const alteracao of [{ passo: Infinity }, { min: -Infinity }, { origem: { x: NaN, z: 0 } }])
    expect(() => criarCampoDeAlturas({ ...forma, ...alteracao })).toThrow()
  expect(() => criarCampoDeAlturas(forma, NaN)).toThrow()
  const terreno = BaseDeTerrenoSchema.parse({
    ...base,
    colunas: 128,
    buracos: [],
    pecas: [
      { coluna: 1, linha: 0, digest },
      { coluna: 0, linha: 0, digest: 'b'.repeat(64) },
    ],
  })
  expect(
    baseComPecasEditadas(terreno, [
      { papel: 'alturas', coluna: 0, linha: 0, digest: 'b'.repeat(64) },
    ]),
  ).toBe(terreno)
})

test('o formato canônico distingue altura, pintura e buracos mesmo com tamanho semelhante', () => {
  const altura = codificarPecaDeAlturas(new Float64Array(65 * 65), -10, 100)
  const pintura = codificarPecaDePintura(criarPinturaDeChao({ colunas: 64, linhas: 64 }, 2), 0, 0)
  const buracos = codificarRecursoDeBuracos(new Uint8Array(512).fill(127))
  for (const [bytes, tipo] of [
    [altura, 'alturas'],
    [pintura, 'pintura'],
    [buracos, 'buracos'],
  ] as const) {
    const lido = lerRecursoDeTerreno(bytes)
    expect(lido.tipo).toBe(tipo)
    expect(conferirMetadadosDoTerreno(lido.metadados, bytes.byteLength)).toBe(true)
    expect(() => lerRecursoDeTerreno(bytes.slice(1))).toThrow()
  }
  const a = lerRecursoDeTerreno(altura),
    p = lerRecursoDeTerreno(pintura)
  expect(metadadosDoTerrenoCorrespondem(p.metadados, a.metadados)).toBe(false)
  expect(metadadosDoTerrenoCorrespondem(p.metadados, { tipo: 'pintura', camadas: 3 })).toBe(false)
  expect(metadadosDoTerrenoCorrespondem(a.metadados, { min: -10, max: 200 })).toBe(false)
  expect(conferirMetadadosDoTerreno({ min: -10, max: 100 }, pintura.byteLength)).toBe(false)
  buracos[7] = 1
  expect(() => lerRecursoDeTerreno(buracos)).toThrow()
  pintura[8] = 0
  expect(() => lerRecursoDeTerreno(pintura)).toThrow()
})

test('abrir e regravar uma peça conserva Uint16 mesmo em faixa estreita e altura elevada', () => {
  const amostras = Float64Array.from(
    { length: 65 * 65 },
    (_, i) => 9990 + (((i * 17) % 65536) / 65535) * 10,
  )
  const bytes = codificarPecaDeAlturas(amostras, 9990, 10000)
  const recurso = lerRecursoDeTerreno(bytes)
  const terreno = BaseDeTerrenoSchema.parse({
    ...base,
    min: 9990,
    max: 10000,
    fundo: 9990,
    buracos: [],
    pecas: [{ coluna: 0, linha: 0, digest }],
  })
  const estado = abrirEdicaoDeTerreno(terreno, new Map([[digest, recurso]]))
  const [peca] = prepararPecasEditadas(terreno, estado, {
    alturas: { x0: 0, z0: 0, x1: 64, z1: 64 },
  })
  expect(peca?.conteudo).toEqual(bytes)
})

test('cabeça, comandos e inversos preservam referências e texturas do solo', () => {
  const antes = criarDocumentoVazio('qa', 'Solo')
  const terreno = BaseDeTerrenoSchema.parse({
    ...base,
    pecas: [{ coluna: 0, linha: 0, digest: 'b'.repeat(64) }],
    solo: {
      camadas: [{ ...base.solo.camadas[0], textura: { id: 'terra', repeticaoMetros: 2 } }],
      pecas: [{ coluna: 0, linha: 0, digest: 'c'.repeat(64) }],
    },
  })
  const comandos = [
    {
      tipo: 'textura.definir' as const,
      textura: { id: 'terra', biblioteca: 'qa', textura: 'terra', digest },
    },
    { tipo: 'base.definir' as const, base: terreno },
  ]
  const { documento: depois } = executarLote(
    { documento: antes, revisao: 0 },
    { revisaoEsperada: 0, comandos },
  )
  expect(referenciasDoTerreno(terreno)).toHaveLength(3)
  expect(arquivosDoDocumento(depois).filter((r) => r.tipo === 'terreno')).toHaveLength(3)
  expect(() =>
    executarLote(
      { documento: depois, revisao: 1 },
      { revisaoEsperada: 1, comandos: [{ tipo: 'textura.remover', id: 'terra' }] },
    ),
  ).toThrow()
  const inversos = inverterLote(antes, depois)
  const { documento: restaurado } = executarLote(
    { documento: depois, revisao: 1 },
    { revisaoEsperada: 1, comandos: inversos },
  )
  expect(restaurado).toEqual(antes)
})
test('camadas e referências do terreno têm identidades, limites e posições válidas', () => {
  expect(
    BaseDeTerrenoSchema.safeParse({
      ...base,
      solo: { ...base.solo, camadas: Array(9).fill(base.solo.camadas[0]) },
    }).success,
  ).toBe(false)
  expect(
    BaseDeTerrenoSchema.safeParse({
      ...base,
      solo: { ...base.solo, camadas: Array(2).fill(base.solo.camadas[0]) },
    }).success,
  ).toBe(false)
  expect(
    BaseDeTerrenoSchema.safeParse({ ...base, buracos: [{ coluna: 1, linha: 0, digest }] }).success,
  ).toBe(false)
  expect(
    BaseDeTerrenoSchema.safeParse({ ...base, buracos: [base.buracos[0], base.buracos[0]] }).success,
  ).toBe(false)
})
test('a textura de uma camada precisa pertencer à tabela do cenário', () => {
  const documento = criarDocumentoVazio('qa', 'Solo')
  const comTextura = {
    ...base,
    solo: {
      camadas: [{ ...base.solo.camadas[0], textura: { id: 'terra', repeticaoMetros: 2 } }],
      pecas: [],
    },
  }
  expect(() => validarDocumento({ ...documento, base: comTextura })).toThrow()
  expect(() =>
    validarDocumento({
      ...documento,
      base: comTextura,
      texturas: [{ id: 'terra', biblioteca: 'qa', textura: 'terra', digest }],
    }),
  ).not.toThrow()
})
