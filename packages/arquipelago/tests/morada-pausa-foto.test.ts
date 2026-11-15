import { expect, test } from 'bun:test'
import { podeEntrarNaFoto } from '../src/sistemas/modo-foto'
import { jogoPausadoNaMorada } from '../src/sistemas/pausa'

const living = {
  menuAberto: false,
  painelAberto: 'casa-morada',
  ferramentaAberta: false,
  tempoAcabou: false,
  tempoPausado: false,
  tempoSincronizando: false,
  resultado: null,
}

test('casa Viver normaliza somente seu painel e respeita todos os bloqueios comuns', () => {
  expect(jogoPausadoNaMorada(living)).toBe(false)
  for (const salvamentoSituacao of ['conflito', 'erro-local', 'recusado', 'confirmando'])
    expect(jogoPausadoNaMorada({ ...living, salvamentoSituacao })).toBe(true)
  expect(jogoPausadoNaMorada({ ...living, cochilando: true })).toBe(true)
  expect(jogoPausadoNaMorada({ ...living, resultado: {} })).toBe(true)
  expect(jogoPausadoNaMorada({ ...living, painelAberto: 'objeto:forno' })).toBe(true)
  expect(jogoPausadoNaMorada({ ...living, painelAberto: 'foto' })).toBe(true)
})

test('foto funciona na casa em Viver, sem autorizar editor, outros painéis ou conciliação', () => {
  expect(podeEntrarNaFoto(living)).toBe(true)
  expect(podeEntrarNaFoto(living, true)).toBe(false)
  expect(podeEntrarNaFoto({ ...living, painelAberto: 'construir' })).toBe(false)
  expect(podeEntrarNaFoto({ ...living, painelAberto: 'objeto:forno' })).toBe(false)
  expect(podeEntrarNaFoto({ ...living, salvamentoSituacao: 'conflito' })).toBe(false)
})
