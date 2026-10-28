import { describe, expect, test } from 'bun:test'
import {
  acertarSessaoDeTempo,
  DURACAO_DA_CONCESSAO_MS,
  iniciarSessaoDeTempo,
} from '../../src/domain/sessao-de-tempo'

describe('sessão de tempo calculada pelo serviço', () => {
  const inicio = new Date('2026-10-28T02:59:50.250Z')

  test('um pulso contabiliza o intervalo e renova a concessão', () => {
    const sessao = iniciarSessaoDeTempo('sessao', inicio)
    const agora = new Date(inicio.getTime() + 10_500)
    const resultado = acertarSessaoDeTempo(sessao, agora, 'pulsar')
    expect(resultado).toEqual({
      situacao: 'ativa',
      parcelas: [{ dia: '2026-10-27', segundos: 10 }],
      sessao: {
        id: 'sessao',
        cursor: new Date(inicio.getTime() + 10_000),
        vencimento: new Date(agora.getTime() + DURACAO_DA_CONCESSAO_MS),
      },
    })
  })

  test('a pausa encerra a sessão e separa a virada do dia', () => {
    const resultado = acertarSessaoDeTempo(
      iniciarSessaoDeTempo('sessao', inicio),
      new Date('2026-10-28T03:00:04.250Z'),
      'pausar',
    )
    expect(resultado).toEqual({
      situacao: 'encerrada',
      parcelas: [
        { dia: '2026-10-27', segundos: 10 },
        { dia: '2026-10-28', segundos: 4 },
      ],
    })
  })

  test('uma sessão sem pulso expira e nunca cobra além da concessão', () => {
    const resultado = acertarSessaoDeTempo(
      iniciarSessaoDeTempo('sessao', inicio),
      new Date(inicio.getTime() + 60_000),
      'pulsar',
    )
    expect(resultado).toEqual({
      situacao: 'expirada',
      parcelas: [
        { dia: '2026-10-27', segundos: 10 },
        { dia: '2026-10-28', segundos: 10 },
      ],
    })
  })
})
