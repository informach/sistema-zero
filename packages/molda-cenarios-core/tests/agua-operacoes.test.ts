import { expect, test } from 'bun:test'
import {
  alturaDoCampo,
  criarBuracos,
  criarCampoDeAlturas,
  criarPinturaDeChao,
  errosDaTopologiaDaAgua,
  prepararConsultaDaAgua,
} from '../src/v2'
import { prepararOperacaoDeAgua } from '../src/v2/operacoes-de-agua'

function estado(altura = 8) {
  const campo = criarCampoDeAlturas(
    { origem: { x: -32, z: -32 }, colunas: 64, linhas: 64, passo: 1, min: -20, max: 40 },
    altura,
  )
  return { campo, pintura: criarPinturaDeChao(campo, 1), buracos: criarBuracos(campo) }
}
const identidade = { id: 'a', nome: 'Água' }
test('encher uma baixada produz lago e teto de transbordo sem cavar nem alterar o estado de origem', () => {
  const e = estado()
  for (let z = 0; z <= 64; z++)
    for (let x = 0; x <= 64; x++)
      if (Math.hypot(x - 32, z - 32) < 8) e.campo.alturas[z * 65 + x] = 2
  const antes = e.campo.alturas.slice()
  const r = prepararOperacaoDeAgua(identidade, { tipo: 'lago', ponto: { x: 0, z: 0 }, nivel: 5 }, e)
  expect(r.agua.tipo).toBe('lago')
  expect(r.resumo?.vaza).toBe(false)
  expect(r.resumo?.transbordo?.nivel).toBe(8)
  expect(r.resumo?.profundidade).toBe(3)
  expect(r.regioes).toEqual({})
  expect(e.campo.alturas).toEqual(antes)
  expect(() =>
    prepararOperacaoDeAgua(identidade, { tipo: 'lago', ponto: { x: 80, z: 0 }, nivel: 5 }, e),
  ).toThrow('fora')
  expect(() =>
    prepararOperacaoDeAgua(identidade, { tipo: 'lago', ponto: { x: 0, z: 0 }, nivel: 1 }, e),
  ).toThrow('nível')
})
test('rio cava uma cópia, retorna regiões para o mesmo histórico e preserva o perfil descendente', () => {
  const e = estado()
  for (let z = 0; z <= 64; z++)
    for (let x = 0; x <= 64; x++) e.campo.alturas[z * 65 + x] = 12 - (x / 64) * 6
  const antes = e.campo.alturas.slice()
  const r = prepararOperacaoDeAgua(
    identidade,
    {
      tipo: 'rio',
      pontos: [
        { x: -20, z: 0 },
        { x: 20, z: 0 },
      ],
      largura: 4,
      profundidade: 2,
      correnteza: 1,
    },
    e,
  )
  expect(r.agua.tipo).toBe('rio')
  if (r.agua.tipo !== 'rio') throw Error('Rio esperado')
  expect(r.agua.controle).toEqual([
    { x: -20, z: 0 },
    { x: 20, z: 0 },
  ])
  expect(prepararConsultaDaAgua(r.agua).superficie?.posicoes.length).toBe(r.agua.pontos.length * 9)
  expect(r.agua.pontos.every((p, i, a) => !i || p.y <= a[i - 1]!.y)).toBe(true)
  expect(r.regioes.alturas).toBeTruthy()
  expect(alturaDoCampo(r.terreno!.campo, 0, 0)).toBeLessThan(alturaDoCampo(e.campo, 0, 0))
  expect(e.campo.alturas).toEqual(antes)
})
test('represa só levanta terreno e comunica vazamento; mar e cachoeira não exigem escultura', () => {
  const e = estado(10)
  for (let z = 0; z <= 64; z++)
    for (let x = 0; x <= 64; x++) if (Math.abs(x - 32) < 6) e.campo.alturas[z * 65 + x] = 0
  const r = prepararOperacaoDeAgua(
    identidade,
    {
      tipo: 'represa',
      de: { x: -6, z: 8 },
      ate: { x: 6, z: 8 },
      montante: { x: 0, z: 0 },
      nivel: 3,
      largura: 3,
      folga: 1,
    },
    e,
  )
  expect(r.agua.tipo).toBe('represa')
  expect(r.terreno!.campo.alturas.every((h, i) => h >= e.campo.alturas[i]!)).toBe(true)
  expect(alturaDoCampo(r.terreno!.campo, 0, 8)).toBe(4)
  expect(r.resumo?.vaza).toBe(true)
  expect(prepararOperacaoDeAgua(identidade, { tipo: 'mar', nivel: 0 }, null).agua.tipo).toBe('mar')
  expect(
    prepararOperacaoDeAgua(
      identidade,
      { tipo: 'cachoeira', topo: { x: 0, y: 5, z: 0 }, base: { x: 0, y: 0, z: 0 }, largura: 3 },
      null,
    ).regioes,
  ).toEqual({})
})

test('cavar rio não preenche uma vala existente nem esconde o limite inferior da grade', () => {
  const e = estado(10)
  for (let z = 0; z <= 64; z++)
    for (let x = 0; x <= 64; x++) if (Math.abs(x - 32) < 2) e.campo.alturas[z * 65 + x] = -5
  const entrada = {
    tipo: 'rio',
    pontos: [
      { x: -20, z: 0 },
      { x: 20, z: 0 },
    ],
    largura: 4,
    profundidade: 2,
  }
  const r = prepararOperacaoDeAgua(identidade, entrada, e)
  expect(r.terreno!.campo.alturas.every((h, i) => h <= e.campo.alturas[i]! + 1e-9)).toBe(true)
  expect(r.agua.tipo === 'rio' && r.agua.profundidade).toBeCloseTo(1.4, 8)
  const minimo = estado(-20)
  expect(() => prepararOperacaoDeAgua(identidade, entrada, minimo)).toThrow('mínima')
  expect(minimo.campo.alturas.every((h) => h === -20)).toBe(true)
})

test('lago com ilha conserva topologia, coordenadas locais e resultado determinístico', () => {
  const e = estado()
  for (let z = 0; z <= 64; z++)
    for (let x = 0; x <= 64; x++) {
      const d = Math.hypot(x - 32, z - 32)
      if (d < 12 && d > 3) e.campo.alturas[z * 65 + x] = 0
    }
  const entrada = { tipo: 'lago', ponto: { x: 6, z: 0 }, nivel: 4 }
  const r = prepararOperacaoDeAgua(identidade, entrada, e)
  expect(r).toEqual(prepararOperacaoDeAgua(identidade, entrada, e))
  expect(errosDaTopologiaDaAgua(r.agua)).toEqual([])
  if (r.agua.tipo !== 'lago') throw Error('Lago esperado')
  expect(r.agua.ilhas).toHaveLength(1)
  expect(r.agua.origemPreenchimento).toEqual({ x: 0, z: 0 })
  const consulta = prepararConsultaDaAgua(r.agua)
  expect(consulta.em(0, 0)).toBeNull()
  expect(consulta.em(6, 0)?.nivel).toBe(4)
})

test('limites de trabalho recusam rio excessivo antes de escavar a origem', () => {
  const campo = criarCampoDeAlturas(
    { origem: { x: 0, z: 0 }, colunas: 256, linhas: 256, passo: 1, min: -20, max: 40 },
    10,
  )
  const e = { campo, pintura: criarPinturaDeChao(campo, 1), buracos: criarBuracos(campo) }
  expect(() =>
    prepararOperacaoDeAgua(
      identidade,
      {
        tipo: 'rio',
        pontos: [
          { x: 0, z: 128 },
          { x: 256, z: 128 },
        ],
        largura: 200,
        profundidade: 2,
      },
      e,
    ),
  ).toThrow('amostras demais')
  expect(campo.alturas.every((h) => h === 10)).toBe(true)
  expect(() =>
    prepararOperacaoDeAgua(
      identidade,
      {
        tipo: 'rio',
        pontos: [
          { x: 1, z: 1 },
          { x: 1, z: 1 },
        ],
        largura: 4,
        profundidade: 2,
      },
      e,
    ),
  ).toThrow('pontos diferentes')
  expect(() =>
    prepararOperacaoDeAgua(
      { id: 'inválido com espaço', nome: 'Água' },
      { tipo: 'mar', nivel: 0 },
      null,
    ),
  ).toThrow()
})

test('preenchimento usa a altura real do clique entre vértices, sem alagar um ponto seco por arredondamento', () => {
  const e = estado(8)
  e.campo.alturas[32 * 65 + 32] = 0
  expect(() =>
    prepararOperacaoDeAgua(identidade, { tipo: 'lago', ponto: { x: 0.49, z: 0 }, nivel: 2 }, e),
  ).toThrow('acima do chão')
  const r = prepararOperacaoDeAgua(
    identidade,
    { tipo: 'lago', ponto: { x: 0.6, z: 0 }, nivel: 5 },
    e,
  )
  expect(r.agua.tipo).toBe('lago')
  expect(prepararConsultaDaAgua(r.agua).em(0.6, 0)?.nivel).toBe(5)
})
