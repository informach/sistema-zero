import { describe, expect, test } from 'bun:test'
import type {
  ComandoSessaoTempo,
  RespostaSessaoTempo,
  ServicoDoJogo,
} from '@sistemazero/arquipelago-contracts'
import { criarSessaoTempo } from '../src/sistemas/sessao-tempo'

const resposta = (situacao: RespostaSessaoTempo['situacao'], usado = 0): RespostaSessaoTempo => ({
  situacao,
  usadoHojeSegundos: usado,
  limiteDiarioMinutos: 30,
  servidorEm: '2026-10-27T12:00:00.000Z',
  vencimento: situacao === 'ativa' ? '2026-10-27T12:00:20.000Z' : null,
})

describe('concessão de tempo no jogo', () => {
  test('desconta a latência da validade e usa um relógio monotônico', async () => {
    let tempo = 1_000
    const servico: ServicoDoJogo = {
      async buscar() {
        tempo += 2_000
        return { status: 200, corpo: resposta('ativa') }
      },
    }
    const sessao = criarSessaoTempo({
      servico,
      aoConfirmar: () => {},
      relogio: () => tempo,
      novaId: () => 'id',
    })
    await sessao.iniciar()
    expect(sessao.valida()).toBe(true)
    tempo += 17_999
    expect(sessao.valida()).toBe(true)
    tempo += 1
    expect(sessao.valida()).toBe(false)
  })

  test('uma resposta perdida é repetida com a mesma sequência, sem continuar jogando', async () => {
    const comandos: ComandoSessaoTempo[] = []
    let perder = true
    const confirmados: RespostaSessaoTempo[] = []
    const servico: ServicoDoJogo = {
      async buscar(_caminho, opcoes) {
        const comando = opcoes?.corpo as ComandoSessaoTempo
        comandos.push(comando)
        if (comando.acao === 'pulsar' && perder) {
          perder = false
          throw new Error('resposta perdida depois de gravar')
        }
        return { status: 200, corpo: resposta('ativa', comando.sequencia * 10) }
      },
    }
    const sessao = criarSessaoTempo({
      servico,
      aoConfirmar: (r) => confirmados.push(r),
      relogio: () => 0,
      novaId: () => 'id',
    })
    await sessao.iniciar()
    await expect(sessao.pulsar()).rejects.toThrow()
    expect(sessao.valida()).toBe(false)
    await sessao.recuperar()
    expect(sessao.valida()).toBe(true)
    expect(comandos).toEqual([
      { sessaoId: 'id', sequencia: 0, acao: 'iniciar' },
      { sessaoId: 'id', sequencia: 1, acao: 'pulsar' },
      { sessaoId: 'id', sequencia: 1, acao: 'pulsar' },
    ])
    expect(confirmados.at(-1)?.usadoHojeSegundos).toBe(10)
  })

  test('um pulso em trânsito não interrompe o jogo enquanto a concessão continua válida', async () => {
    let liberar!: (value: { status: number; corpo: RespostaSessaoTempo }) => void
    let avisarInicio!: () => void
    const iniciado = new Promise<void>((resolve) => {
      avisarInicio = resolve
    })
    const servico: ServicoDoJogo = {
      async buscar(_caminho, opcoes) {
        if ((opcoes?.corpo as ComandoSessaoTempo).acao === 'iniciar')
          return { status: 200, corpo: resposta('ativa') }
        avisarInicio()
        return new Promise((resolve) => {
          liberar = resolve
        })
      },
    }
    const sessao = criarSessaoTempo({
      servico,
      aoConfirmar: () => {},
      relogio: () => 0,
      novaId: () => 'id',
    })
    await sessao.iniciar()
    const pulso = sessao.pulsar()
    await iniciado
    expect(sessao.valida()).toBe(true)
    liberar({ status: 200, corpo: resposta('ativa', 10) })
    await pulso
    expect(sessao.valida()).toBe(true)
  })

  test('pausar resolve um início de resposta perdida antes de encerrar a concessão', async () => {
    const comandos: ComandoSessaoTempo[] = []
    let perder = true
    const servico: ServicoDoJogo = {
      async buscar(_caminho, opcoes) {
        const comando = opcoes?.corpo as ComandoSessaoTempo
        comandos.push(comando)
        if (perder) {
          perder = false
          throw new Error('resposta perdida')
        }
        return { status: 200, corpo: resposta(comando.acao === 'pausar' ? 'encerrada' : 'ativa') }
      },
    }
    const sessao = criarSessaoTempo({
      servico,
      aoConfirmar: () => {},
      relogio: () => 0,
      novaId: () => 'id',
    })
    await expect(sessao.iniciar()).rejects.toThrow()
    expect((await sessao.pausar())?.situacao).toBe('encerrada')
    expect(sessao.valida()).toBe(false)
    expect(comandos.map((c) => [c.acao, c.sequencia])).toEqual([
      ['iniciar', 0],
      ['iniciar', 0],
      ['pausar', 1],
    ])
  })

  test('não aceita concessão expirada durante o trânsito da resposta', async () => {
    let tempo = 0
    const servico: ServicoDoJogo = {
      async buscar() {
        tempo += 20_001
        return { status: 200, corpo: resposta('ativa') }
      },
    }
    const sessao = criarSessaoTempo({
      servico,
      aoConfirmar: () => {},
      relogio: () => tempo,
      novaId: () => 'id',
    })
    await expect(sessao.iniciar()).rejects.toThrow('expirada')
    expect(sessao.valida()).toBe(false)
  })
})
