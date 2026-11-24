import { expect, test } from 'bun:test'
import {
  AguaSchema,
  criarDocumentoVazio,
  executarLote,
  inverterLote,
  validarDocumento,
} from '../src/v2'

const entidade = { id: 'agua', nome: 'Água', grupo: null, bloqueado: false, oculto: false }
const quadrado = (raio = 10) => [
  { x: -raio, z: -raio },
  { x: raio, z: -raio },
  { x: raio, z: raio },
  { x: -raio, z: raio },
]
const lago = () => ({
  ...entidade,
  tipo: 'lago' as const,
  modelo: null,
  centro: { x: 0, z: 0 },
  giro: 0,
  escala: 1,
  nivel: 3,
  profundidade: 2,
  contorno: quadrado(),
  recorte: quadrado(),
})

test('água conserva o lago importado e valida ilhas, material e participação no nado', () => {
  expect(AguaSchema.parse(lago())).toEqual(lago())
  const a = AguaSchema.parse({
    ...lago(),
    ilhas: [quadrado(2)],
    nado: false,
    aparencia: { corRasa: '#77ccdd', corProfunda: '#226688' },
  })
  expect(a.nado).toBe(false)
  expect(a.aparencia!.corProfunda).toBe('#226688')
  const d = criarDocumentoVazio('c', 'Lago')
  d.aguas = [a]
  expect(validarDocumento(d).aguas).toHaveLength(1)
})
test('rio registra perfil descendente, largura e correnteza; cachoeira precisa cair', () => {
  const rio = {
    ...entidade,
    tipo: 'rio',
    pontos: [
      { x: 0, y: 5, z: 0 },
      { x: 10, y: 3, z: 0 },
    ],
    largura: 4,
    profundidade: 1.2,
    correnteza: 1,
  }
  expect(AguaSchema.safeParse(rio).success).toBe(true)
  expect(AguaSchema.safeParse({ ...rio, largura: 0 }).success).toBe(false)
  expect(
    AguaSchema.safeParse({
      ...rio,
      pontos: [
        { x: 0, y: 3, z: 0 },
        { x: 10, y: 5, z: 0 },
      ],
    }).success,
  ).toBe(false)
  const cachoeira = {
    ...entidade,
    tipo: 'cachoeira',
    topo: { x: 0, y: 6, z: 0 },
    base: { x: 0, y: 1, z: 0 },
    largura: 3,
    giro: 0,
  }
  expect(AguaSchema.safeParse(cachoeira).success).toBe(true)
  expect(AguaSchema.safeParse({ ...cachoeira, base: { x: 0, y: 7, z: 0 } }).success).toBe(false)
})
test('represa tem dados verificáveis da barragem, sem aceitar uma crista abaixo da água', () => {
  const represa = {
    ...lago(),
    tipo: 'represa',
    barragem: { de: { x: -4, z: 4 }, ate: { x: 4, z: 4 }, crista: 4, largura: 3 },
  }
  expect(AguaSchema.safeParse(represa).success).toBe(true)
  expect(
    AguaSchema.safeParse({ ...represa, barragem: { ...represa.barragem, crista: 2 } }).success,
  ).toBe(false)
})
test('aparência, encaixe do GLB e orçamento de anéis recusam valores indevidos', () => {
  for (const aparencia of [
    { corRasa: 'azul' },
    { opacidadeRasa: 2 },
    { profundidadeDeCor: 0 },
    { ondas: { altura: Infinity } },
    { espuma: { intensidade: -1 } },
  ]) {
    expect(AguaSchema.safeParse({ ...lago(), aparencia }).success).toBe(false)
  }
  expect(
    AguaSchema.safeParse({
      ...lago(),
      encaixeModelo: { nivelLocal: 0, materiaisDaAgua: ['agua'], materiaisSolidos: ['cor'] },
    }).success,
  ).toBe(false)
  expect(
    AguaSchema.safeParse({ ...lago(), ilhas: Array.from({ length: 129 }, () => quadrado(2)) })
      .success,
  ).toBe(false)
})
test('o documento recusa ilha fora do contorno, água cruzada, referência ausente e dois mares', () => {
  const d = criarDocumentoVazio('c', 'Lago')
  d.aguas = [AguaSchema.parse({ ...lago(), ilhas: [quadrado(20)] })]
  expect(() => validarDocumento(d)).toThrow()
  d.aguas = [
    {
      ...lago(),
      contorno: [
        { x: -2, z: -2 },
        { x: 2, z: 2 },
        { x: -2, z: 2 },
        { x: 2, z: -2 },
      ],
    },
  ]
  expect(() => validarDocumento(d)).toThrow()
  d.aguas = [{ ...lago(), modelo: 'modelo-ausente' }]
  expect(() => validarDocumento(d)).toThrow()
  d.aguas = [
    { ...entidade, tipo: 'mar', nivel: 0 },
    { ...entidade, id: 'outro', tipo: 'mar', nivel: 1 },
  ]
  expect(() => validarDocumento(d)).toThrow('um mar')
})

test('as variantes e o material percorrem os comandos existentes e desfazem sem deixar dados extras', () => {
  const d = criarDocumentoVazio('c', 'Água'),
    a = AguaSchema.parse({
      ...lago(),
      ilhas: [quadrado(1)],
      aparencia: { ondas: { altura: 0.08 } },
    })
  const novo = executarLote(
    { documento: d, revisao: 0 },
    { revisaoEsperada: 0, comandos: [{ tipo: 'agua.definir', agua: a }] },
  )
  expect(novo.documento.aguas[0]).toEqual(a)
  const inverso = inverterLote(d, novo.documento)
  expect(
    executarLote(novo, { revisaoEsperada: novo.revisao, comandos: inverso }).documento,
  ).toEqual(d)
})
