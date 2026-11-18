import { expect, test } from 'bun:test'
import { CaminhoSchema, criarDocumentoVazio, executarLote, validarDocumento } from '../src/v2'

const comum = {
  id: 'c',
  nome: 'Caminho',
  grupo: null,
  oculto: false,
  bloqueado: false,
  pontos: [
    { x: 0, z: 0 },
    { x: 10, z: 0 },
  ],
  largura: 2.5,
  acabamento: null,
}
test('contrato preserva trilha/praça existentes e admite as seis ferramentas com parâmetros limitados', () => {
  expect(CaminhoSchema.parse({ ...comum, tipo: 'trilha' })).toEqual({ ...comum, tipo: 'trilha' })
  const praca = { ...comum, tipo: 'praca' as const, pontos: [...comum.pontos, { x: 5, z: 5 }] }
  expect(CaminhoSchema.parse(praca)).toEqual(praca)
  for (const tipo of ['estrada', 'cerca', 'muro', 'ponte'] as const) {
    const c = CaminhoSchema.parse({ ...comum, tipo })
    expect(c.tipo).toBe(tipo)
    expect(
      validarDocumento({ ...criarDocumentoVazio('d', 'D'), caminhos: [c] }).caminhos[0]!.tipo,
    ).toBe(tipo)
  }
})
test('parâmetros autorais de material, módulos, estrada e ponte são dados explícitos', () => {
  expect(
    CaminhoSchema.parse({
      ...comum,
      tipo: 'estrada',
      suave: true,
      molde: { borda: 2, deslocamento: -0.25, suavizacao: 8 },
      aparencia: { cor: '#b89163' },
    }),
  ).toMatchObject({ molde: { borda: 2, deslocamento: -0.25, suavizacao: 8 } })
  expect(
    CaminhoSchema.parse({
      ...comum,
      tipo: 'cerca',
      acabamento: 'modelo',
      altura: 1.2,
      comprimentoDoModulo: 2,
      fechada: false,
      encaixeModelo: { eixo: 'z', baseLocal: -0.2 },
    }),
  ).toMatchObject({ altura: 1.2, encaixeModelo: { eixo: 'z', baseLocal: -0.2 } })
  expect(
    CaminhoSchema.parse({
      ...comum,
      tipo: 'ponte',
      cotas: { de: 3, ate: 4 },
      espessura: 0.2,
      guardas: true,
      alturaDaGuarda: 0.7,
      pilares: { espacamento: 4, largura: 0.4 },
    }),
  ).toMatchObject({ cotas: { de: 3, ate: 4 }, pilares: { espacamento: 4, largura: 0.4 } })
})

test('material referencia a tabela de texturas e encaixe não existe sem modelo', () => {
  const d = criarDocumentoVazio('d', 'D')
  const c = CaminhoSchema.parse({
    ...comum,
    tipo: 'trilha',
    aparencia: { textura: { id: 'ausente', repeticaoMetros: 2 } },
  })
  expect(() => validarDocumento({ ...d, caminhos: [c] })).toThrow('Textura')
  expect(
    CaminhoSchema.safeParse({ ...comum, tipo: 'trilha', encaixeModelo: { eixo: 'x' } }).success,
  ).toBe(false)
  expect(CaminhoSchema.safeParse({ ...comum, tipo: 'cerca', fechada: true }).success).toBe(false)
})

test('textura de caminho respeita uso e trava ao remover ou substituir a referência', () => {
  const doc = criarDocumentoVazio('d', 'D')
  const textura = { id: 't', biblioteca: 'b', textura: 'asset', digest: 'a'.repeat(64) }
  doc.texturas = [textura]
  doc.caminhos = [
    CaminhoSchema.parse({
      ...comum,
      tipo: 'trilha',
      bloqueado: true,
      aparencia: { textura: { id: 't', repeticaoMetros: 2 } },
    }),
  ]
  expect(() =>
    executarLote(
      { documento: doc, revisao: 0 },
      { revisaoEsperada: 0, comandos: [{ tipo: 'textura.remover', id: 't' }] },
    ),
  ).toThrow('Textura em uso')
  expect(() =>
    executarLote(
      { documento: doc, revisao: 0 },
      {
        revisaoEsperada: 0,
        comandos: [{ tipo: 'textura.definir', textura: { ...textura, digest: 'b'.repeat(64) } }],
      },
    ),
  ).toThrow('bloquead')
})
test('ponte tem duas cabeceiras; praça tem contorno; medidas não finitas e campos de outro tipo são recusados', () => {
  for (const valor of [
    { ...comum, tipo: 'ponte', pontos: [...comum.pontos, { x: 5, z: 2 }] },
    { ...comum, tipo: 'praca' },
    { ...comum, tipo: 'estrada', molde: { borda: Infinity } },
    { ...comum, tipo: 'cerca', altura: 0 },
    { ...comum, tipo: 'muro', comprimentoDoModulo: NaN },
    { ...comum, tipo: 'trilha', cotas: { de: 0, ate: 3 } },
    { ...comum, tipo: 'ponte', espessura: -1 },
  ])
    expect(CaminhoSchema.safeParse(valor).success).toBe(false)
})
test('ponte de GLB exige medida explícita do piso local e referências continuam verificadas', () => {
  const ponte = { ...comum, tipo: 'ponte', acabamento: 'modelo' }
  expect(CaminhoSchema.safeParse(ponte).success).toBe(false)
  const c = CaminhoSchema.parse({ ...ponte, encaixeModelo: { eixo: 'x', pisoLocal: 1.2 } })
  expect(() => validarDocumento({ ...criarDocumentoVazio('d', 'D'), caminhos: [c] })).toThrow(
    'Acabamento',
  )
})
