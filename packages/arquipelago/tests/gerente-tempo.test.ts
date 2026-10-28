import { expect, test } from 'bun:test'
import type {
  ComandoSessaoTempo,
  RespostaSessaoTempo,
  ServicoDoJogo,
} from '@sistemazero/arquipelago-contracts'
import { criarGerenteTempo } from '../src/sistemas/gerente-tempo'
import { criarSessaoTempo } from '../src/sistemas/sessao-tempo'

function resposta(situacao: 'ativa' | 'encerrada'): RespostaSessaoTempo {
  return {
    situacao,
    usadoHojeSegundos: 0,
    limiteDiarioMinutos: 30,
    servidorEm: '2026-10-27T12:00:00.000Z',
    vencimento: situacao === 'ativa' ? '2026-10-27T12:00:20.000Z' : null,
  }
}

test('não inicia a contagem enquanto o jogo ainda não está visível', async () => {
  const comandos: ComandoSessaoTempo[] = []
  let liberar!: () => void
  const iniciou = new Promise<void>((resolve) => {
    liberar = resolve
  })
  const sessao = criarSessaoTempo({
    servico: {
      async buscar(_caminho, opcoes) {
        comandos.push(opcoes?.corpo as ComandoSessaoTempo)
        return { status: 200, corpo: resposta('ativa') }
      },
    },
    aoConfirmar: () => {},
    relogio: () => 0,
    novaId: () => 'id1',
  })
  const gerente = criarGerenteTempo({
    sessao,
    inicialmenteAtivo: false,
    sincronizando: (valor) => {
      if (!valor) liberar()
    },
    aoErro: (erro) => {
      throw erro
    },
  })
  gerente.atualizar(false)
  expect(comandos).toEqual([])
  gerente.atualizar(true)
  await iniciou
  expect(comandos.map((c) => c.acao)).toEqual(['iniciar'])
})

test('fechar o menu antes de concluir a pausa não libera o jogo antes de iniciar outra sessão', async () => {
  const comandos: ComandoSessaoTempo[] = []
  let liberar!: (v: { status: number; corpo: RespostaSessaoTempo }) => void
  let avisarInicio!: () => void
  const pausaIniciada = new Promise<void>((r) => {
    avisarInicio = r
  })
  let avisarFim!: () => void
  const retomada = new Promise<void>((r) => {
    avisarFim = r
  })
  const estados: boolean[] = []
  const erros: unknown[] = []
  const servico: ServicoDoJogo = {
    async buscar(_caminho, opcoes) {
      const comando = opcoes?.corpo as ComandoSessaoTempo
      comandos.push(comando)
      if (comando.acao === 'pausar') {
        avisarInicio()
        return new Promise((resolve) => {
          liberar = resolve
        })
      }
      return { status: 200, corpo: resposta('ativa') }
    },
  }
  let numero = 0
  const sessao = criarSessaoTempo({
    servico,
    aoConfirmar: () => {},
    relogio: () => 0,
    novaId: () => `id${++numero}`,
  })
  await sessao.iniciar()
  const gerente = criarGerenteTempo({
    sessao,
    sincronizando(valor) {
      estados.push(valor)
      if (!valor) avisarFim()
    },
    aoErro: (erro) => erros.push(erro),
  })
  gerente.atualizar(false)
  await pausaIniciada
  gerente.atualizar(true)
  expect(estados).toEqual([true])
  liberar({ status: 200, corpo: resposta('encerrada') })
  await retomada
  expect(estados).toEqual([true, false])
  expect(comandos.map((c) => [c.sessaoId, c.acao, c.sequencia])).toEqual([
    ['id1', 'iniciar', 0],
    ['id1', 'pausar', 1],
    ['id2', 'iniciar', 0],
  ])
  expect(erros).toEqual([])
  expect(gerente.valida()).toBe(true)
})
