import { expect, test } from 'bun:test'
import { RespostaSessaoTempoSchema } from '@sistemazero/arquipelago-contracts'
import { criarPlataformaFalsa } from '../src/plataforma/falsa'

test('o playground oferece sessão de tempo com pausa e repetição seguras', async () => {
  let agora = new Date('2026-10-27T12:00:00Z')
  const plataforma = criarPlataformaFalsa({ agora: () => agora })
  const sessaoId = crypto.randomUUID()
  const enviar = (acao: 'iniciar' | 'pulsar' | 'pausar', sequencia: number) =>
    plataforma.servico.buscar('/tempo/sessao', {
      metodo: 'POST',
      corpo: { sessaoId, acao, sequencia },
    })
  expect(RespostaSessaoTempoSchema.parse((await enviar('iniciar', 0)).corpo).situacao).toBe('ativa')
  agora = new Date(agora.getTime() + 10_000)
  expect(RespostaSessaoTempoSchema.parse((await enviar('pulsar', 1)).corpo).usadoHojeSegundos).toBe(
    10,
  )
  expect(RespostaSessaoTempoSchema.parse((await enviar('pulsar', 1)).corpo).usadoHojeSegundos).toBe(
    10,
  )
  agora = new Date(agora.getTime() + 5_000)
  expect(RespostaSessaoTempoSchema.parse((await enviar('pausar', 2)).corpo)).toMatchObject({
    situacao: 'encerrada',
    usadoHojeSegundos: 15,
  })
  expect(RespostaSessaoTempoSchema.parse((await enviar('pausar', 2)).corpo)).toMatchObject({
    situacao: 'encerrada',
    usadoHojeSegundos: 15,
  })
})
