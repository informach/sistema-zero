import { expect, test } from 'bun:test'
import {
  AguaSchema,
  AMOSTRAS_DA_PECA,
  CaminhoSchema,
  codificarPecaDeAlturas,
  criarDocumentoVazio,
  lerRecursoDeTerreno,
} from '@sistemazero/molda-cenarios-core/v2'
import { Vector3 } from 'three'
import { montarSuperficiesDaCompilacao } from '../src/compilar/superficies'
import { MundoDoTeste } from '../src/teste/colisoes'

const semRecurso = () => null,
  contexto = { equipe: true, bibliotecas: [] },
  comum = { id: 'c', nome: 'Trilha', grupo: null, oculto: false, bloqueado: false }
function exemplo() {
  const d = criarDocumentoVazio('cena', 'Região'),
    digest = 'a'.repeat(64),
    recurso = lerRecursoDeTerreno(
      codificarPecaDeAlturas(
        Float64Array.from({ length: AMOSTRAS_DA_PECA }, (_, i) => (i % 65) / 16),
        -10,
        20,
      ),
    )
  d.base = {
    tipo: 'terreno',
    cobertura: 'grade',
    origem: { x: -32, z: -32 },
    passo: 1,
    colunas: 128,
    linhas: 64,
    min: -10,
    max: 20,
    fundo: 0,
    pecas: [{ coluna: 0, linha: 0, digest }],
  }
  d.caminhos = [
    CaminhoSchema.parse({
      ...comum,
      tipo: 'trilha',
      acabamento: null,
      largura: 2,
      pontos: [
        { x: -24, z: 0 },
        { x: 24, z: 0 },
      ],
    }),
  ]
  const contorno = [
    { x: -2, z: -2 },
    { x: 2, z: -2 },
    { x: 2, z: 2 },
    { x: -2, z: 2 },
  ]
  d.aguas = [
    AguaSchema.parse({
      ...comum,
      id: 'a',
      nome: 'Lago',
      tipo: 'lago',
      modelo: null,
      centro: { x: 6, z: 12 },
      giro: 0,
      escala: 1,
      nivel: 5,
      profundidade: 3,
      contorno,
      recorte: contorno,
    }),
  ]
  return { d, recursos: new Map([[digest, recurso]]) }
}
test('materialização usa todo o relevo e a mesma física, caminhos e água sem câmera', () => {
  const { d, recursos } = exemplo(),
    antes = JSON.stringify(d),
    s = montarSuperficiesDaCompilacao(
      d,
      { cenario: d.id, revisao: 2 },
      contexto,
      recursos,
      semRecurso,
      semRecurso,
    ),
    fisica = new MundoDoTeste(s.terreno!.fontesDoTeste())
  try {
    expect(s.preparada.fonte.revisao).toBe(2)
    expect(s.terreno!.fontesDoTeste()).toHaveLength(2)
    const altura = s.alturas(-16, 0),
      hit = fisica.rastrear(new Vector3(-16, 10, 0), new Vector3(-16, -10, 0))
    expect(altura).toBeCloseTo(1, 3)
    expect(hit!.ponto.y).toBeCloseTo(altura, 5)
    expect(s.caminhos.superficies().length).toBeGreaterThan(0)
    expect(s.aguas.consultasDoTeste().get('a')!.em(6, 12, s.alturas)?.nivel).toBe(5)
    expect(JSON.stringify(d)).toBe(antes)
  } finally {
    fisica.descartar()
    s.descartar()
    s.descartar()
  }
})
test('recurso ausente recusa a compilação inteira, sem publicar terreno plano de reserva', () => {
  const { d } = exemplo()
  expect(() =>
    montarSuperficiesDaCompilacao(
      d,
      { cenario: d.id, revisao: 0 },
      contexto,
      new Map(),
      semRecurso,
      semRecurso,
    ),
  ).toThrow()
})
test('caminho invisível não exige um GLB ocioso e falha de caminho visível é explícita', () => {
  const d = criarDocumentoVazio('cena', 'Escondido')
  d.modelos = [{ id: 'm', biblioteca: 'b', modelo: 'm', digest: 'a'.repeat(64) }]
  d.caminhos = [
    CaminhoSchema.parse({
      ...comum,
      tipo: 'trilha',
      oculto: true,
      acabamento: 'm',
      largura: 2,
      pontos: [
        { x: 0, z: 0 },
        { x: 10, z: 0 },
      ],
    }),
  ]
  const s = montarSuperficiesDaCompilacao(
    d,
    { cenario: d.id, revisao: 0 },
    contexto,
    new Map(),
    semRecurso,
    semRecurso,
  )
  try {
    expect(s.preparada.modelos).toHaveLength(0)
    expect(s.caminhos.superficies()).toHaveLength(0)
  } finally {
    s.descartar()
  }
  d.caminhos[0]!.oculto = false
  expect(() =>
    montarSuperficiesDaCompilacao(
      d,
      { cenario: d.id, revisao: 0 },
      { equipe: true, bibliotecas: [{ id: 'b', nome: 'Pack', licenca: 'livre' }] },
      new Map(),
      semRecurso,
      semRecurso,
    ),
  ).toThrow(/todos os modelos/)
})
