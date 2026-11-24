import { expect, test } from 'bun:test'
import { enderecoDaRota, rotaDoEndereco } from '../src/lib/cenarios-endereco'

const mundo = '11111111-1111-4111-8111-111111111111',
  cena = '22222222-2222-4222-8222-222222222222',
  conjunto = '33333333-3333-4333-8333-333333333333'
test('reabrir fonte preserva a mesma oficina e o retorno ao cenário de origem', () => {
  const rota = {
    tela: 'oficina' as const,
    mundoId: mundo,
    cenarioId: cena,
    conjuntoId: conjunto,
    retorno: { tela: 'oficina' as const, mundoId: cena, cenarioId: mundo },
  }
  expect(rotaDoEndereco(new URLSearchParams(enderecoDaRota(rota, 'equipe')))).toEqual(rota)
  expect(
    rotaDoEndereco(
      new URLSearchParams(
        enderecoDaRota(
          { tela: 'biblioteca', bibliotecaId: 'molda', voltarAoMundo: mundo },
          'equipe',
        ),
      ),
    ),
  ).toEqual({ tela: 'biblioteca', bibliotecaId: 'molda', voltarAoMundo: mundo })
})
test('consulta de retorno inválida, exagerada ou sem conjunto não injeta navegação', () => {
  for (const retorno of [
    '{',
    'null',
    '[]',
    JSON.stringify({ tela: 'oficina', mundoId: 'javascript:alert(1)', cenarioId: cena }),
    'x'.repeat(4097),
  ]) {
    const q = new URLSearchParams({ mundo, cenario: cena, conjunto, retorno })
    expect(rotaDoEndereco(q)).toEqual({
      tela: 'oficina',
      mundoId: mundo,
      cenarioId: cena,
      conjuntoId: conjunto,
    })
    q.delete('conjunto')
    expect(rotaDoEndereco(q)).toEqual({ tela: 'oficina', mundoId: mundo, cenarioId: cena })
  }
})
