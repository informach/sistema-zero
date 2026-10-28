import { expect, test } from 'bun:test'
import { jogoPausado, type SinaisDePausa } from '../src/sistemas/pausa'

const livre: SinaisDePausa = {
  menuAberto: false,
  painelAberto: null,
  ferramentaAberta: false,
  tempoAcabou: false,
  tempoPausado: false,
  tempoSincronizando: false,
  resultado: null,
}
test('percurso e personagem respeitam todas as interrupções de controle', () => {
  expect(jogoPausado(livre)).toBe(false)
  for (const key of [
    'menuAberto',
    'ferramentaAberta',
    'tempoAcabou',
    'tempoPausado',
    'tempoSincronizando',
  ] as const) {
    expect(jogoPausado({ ...livre, [key]: true })).toBe(true)
  }
  expect(jogoPausado({ ...livre, painelAberto: 'quadro:bosque' })).toBe(true)
  expect(jogoPausado({ ...livre, resultado: {} })).toBe(true)
  expect(jogoPausado({ ...livre, salvamentoSituacao: 'conflito' })).toBe(true)
  expect(jogoPausado({ ...livre, salvamentoSituacao: 'erro-local' })).toBe(true)
  expect(jogoPausado({ ...livre, salvamentoSituacao: 'recusado' })).toBe(true)
  expect(jogoPausado({ ...livre, salvamentoSituacao: 'offline' })).toBe(false)
})
