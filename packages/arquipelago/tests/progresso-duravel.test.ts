import { expect, test } from 'bun:test'
import {
  criarSalvamentoInicial,
  migrarSalvamento,
  type Salvamento,
} from '@sistemazero/arquipelago-contracts'
import { criarLoja } from '../src/estado/loja'
import { conciliarSalvamento } from '../src/sistemas/conciliar-salvamento'

const inicial = () => criarSalvamentoInicial(new Date('2026-10-29T12:00:00Z'))
function montar(salvamento = inicial(), somenteLeitura = false) {
  const gravados: Salvamento[] = []
  const loja = criarLoja({
    salvamento,
    jornada: 8,
    quarto: { theme: 'padrao', placedItems: [], pet: null },
    avatar: { slots: {} },
    acesso: {
      liberado: true,
      motivo: null,
      limiteDiarioMinutos: null,
      usadoHojeSegundos: 0,
      contabilizaTempo: false,
      somenteLeitura,
    },
    aoMudar: (s) => gravados.push(s),
  })
  return { loja, gravados }
}

test('constelações e clima passam pela fila e voltam numa nova loja', () => {
  const { loja, gravados } = montar()
  loja.getState().acharConstelacao(0)
  loja.getState().acharConstelacao(5)
  loja.getState().escolherClima('chuva')
  for (const i of [0, 5, -1, 6, 1.5]) loja.getState().acharConstelacao(i)
  loja.getState().escolherClima('chuva')
  expect(gravados).toHaveLength(3)
  const salvo = migrarSalvamento(JSON.parse(JSON.stringify(gravados.at(-1))))
  if (!salvo) throw new Error('O salvamento durável não passou pelo contrato')
  const reaberta = montar(salvo).loja
  expect(reaberta.getState().salvamento.nuvens.constelacoes).toBe(33)
  expect(reaberta.getState().salvamento.clima).toBe('chuva')
  const remoto = {
    ...salvo,
    clima: 'nublado' as const,
    nuvens: { constelacoes: 63 },
    farol: { pagina: true, concluido: true, galeria: [] },
  }
  reaberta.getState().adotar({ salvamento: remoto, revisao: 3, atualizadoEm: salvo.criadoEm })
  expect(reaberta.getState().salvamento).toEqual(remoto)
})

test('suporte, visita e conflito de salvamento não gravam novas conquistas', () => {
  for (const modo of ['suporte', 'visita', 'conflito']) {
    const { loja, gravados } = montar(inicial(), modo === 'suporte')
    if (modo === 'visita')
      loja.getState().visitar({
        perfilId: 'irmao',
        nome: 'Perfil',
        obra: null,
        horta: [],
        completos: [],
        quarto: null,
      })
    if (modo === 'conflito') loja.getState().definirSituacaoSalvamento('conflito')
    loja.getState().acharConstelacao(3)
    loja.getState().escolherClima('chuva')
    expect(gravados).toHaveLength(0)
    expect(loja.getState().salvamento).toEqual(inicial())
  }
})

test('duas sessões unem descobertas e estrelas das Nuvens, sem perder o melhor tempo', () => {
  const base = inicial()
  const local = {
    ...base,
    nuvens: { constelacoes: 1 },
    farol: { pagina: true, concluido: false, galeria: [] },
    percursos: {
      'nuvens-balao': {
        estrelas: { chegada: true, tempo: false, vagalumes: true },
        melhorTempoMs: 60000,
      },
    },
  }
  const remoto = {
    ...base,
    nuvens: { constelacoes: 2 },
    farol: { pagina: true, concluido: true, galeria: [] },
    percursos: {
      'nuvens-balao': {
        estrelas: { chegada: true, tempo: true, vagalumes: false },
        melhorTempoMs: 50000,
      },
    },
  }
  const combinado = conciliarSalvamento(base, local, remoto)
  expect(combinado?.nuvens.constelacoes).toBe(3)
  expect(combinado?.farol).toEqual({ pagina: true, concluido: true, galeria: [] })
  expect(combinado?.percursos['nuvens-balao']).toEqual({
    estrelas: { chegada: true, tempo: true, vagalumes: true },
    melhorTempoMs: 50000,
  })
  expect(migrarSalvamento(combinado)).toEqual(combinado)
  const comClima = conciliarSalvamento(
    base,
    { ...local, clima: 'chuva' },
    { ...remoto, inventario: { milho: 3 } },
  )
  expect(comClima?.clima).toBe('chuva')
  expect(comClima?.inventario).toEqual({ milho: 3 })
  expect(
    conciliarSalvamento(base, { ...local, clima: 'chuva' }, { ...remoto, clima: 'nublado' }),
  ).toBeNull()
})
