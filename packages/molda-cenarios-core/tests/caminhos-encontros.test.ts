import { expect, test } from 'bun:test'
import { CaminhoSchema, prepararEncontrosDosCaminhos } from '../src/v2'

const comum = {
  nome: 'Piso',
  grupo: null,
  oculto: false,
  bloqueado: false,
  acabamento: null,
  largura: 2,
}

test('praça recebe a trilha independentemente da ordem e ocultar remove sua precedência', () => {
  const trilha = CaminhoSchema.parse({
      ...comum,
      id: 't',
      tipo: 'trilha',
      pontos: [
        { x: -8, z: 0 },
        { x: 8, z: 0 },
      ],
    }),
    praca = CaminhoSchema.parse({
      ...comum,
      id: 'p',
      tipo: 'praca',
      pontos: [
        { x: -2, z: -2 },
        { x: 2, z: -2 },
        { x: 2, z: 2 },
        { x: -2, z: 2 },
      ],
    })
  for (const ordem of [
    [trilha, praca],
    [praca, trilha],
  ]) {
    const e = prepararEncontrosDosCaminhos(ordem)
    expect(e.falhas.size).toBe(0)
    expect(e.exclusoes.get('p')).toEqual([])
    expect(e.exclusoes.get('t')).toHaveLength(1)
    expect(prepararEncontrosDosCaminhos(ordem, new Set(['p'])).exclusoes.get('t')).toEqual([])
  }
})

test('circuito fechado não transforma o interior vazio em recorte de outra trilha', () => {
  const circuito = CaminhoSchema.parse({
      ...comum,
      id: 'anel',
      tipo: 'trilha',
      fechada: true,
      pontos: [
        { x: -4, z: -4 },
        { x: 4, z: -4 },
        { x: 4, z: 4 },
        { x: -4, z: 4 },
      ],
    }),
    interior = CaminhoSchema.parse({
      ...comum,
      id: 'interno',
      tipo: 'trilha',
      largura: 1,
      pontos: [
        { x: -1, z: 0 },
        { x: 1, z: 0 },
      ],
    }),
    e = prepararEncontrosDosCaminhos([circuito, interior])
  expect(e.falhas.size).toBe(0)
  expect(e.exclusoes.get('interno')).toEqual([])
})

test('curva inválida gera falha individual e não elimina a geometria dos outros caminhos', () => {
  const invalida = CaminhoSchema.parse({
      ...comum,
      id: 'erro',
      tipo: 'trilha',
      pontos: [
        { x: 0, z: 0 },
        { x: 0, z: 0 },
      ],
    }),
    valida = CaminhoSchema.parse({
      ...comum,
      id: 'ok',
      tipo: 'trilha',
      pontos: [
        { x: -1, z: 0 },
        { x: 1, z: 0 },
      ],
    }),
    e = prepararEncontrosDosCaminhos([invalida, valida])
  expect(e.falhas.has('erro')).toBe(true)
  expect(e.exclusoes.get('ok')).toEqual([])
})
