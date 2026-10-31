import { expect, test } from 'bun:test'
import {
  criarSalvamentoInicial,
  ROUPAS_DA_AMIZADE,
  VESTUARIO_DAS_FESTAS,
} from '@sistemazero/arquipelago-contracts'
import { createLogger } from '@sistemazero/core/logging'
import { PlataformaIndisponivelError, SomenteLeituraError } from '../../src/application/erros'
import { ServicoDasRoupas } from '../../src/application/servico-das-roupas'
import { AvatarIndisponivelError, type PortaDoAvatar } from '../../src/domain/avatar.port'

/** As roupas do jogo (§6.28, A21): o serviço confere pelo salvamento guardado e pede ao Members. */

const politica = {
  modo: 'aberto' as const,
  publicos: new Set(['kids' as const, 'adulto' as const]),
  lista: new Set<string>(),
}
const jogador = {
  id: '00000000-0000-4000-8000-000000000001',
  contaId: '00000000-0000-4000-8000-000000000002',
  publico: 'kids' as const,
  equipe: false,
  somenteLeitura: false,
}
function com(amizadeDaJade: number) {
  const s = criarSalvamentoInicial(new Date('2026-10-31T12:00:00Z'))
  s.moradores.jade.amizade = amizadeDaJade
  return { revisao: 3, dados: s, atualizadoEm: new Date() }
}
function servico(salvo: ReturnType<typeof com> | null, avatar: PortaDoAvatar | null, dia: string) {
  return new ServicoDasRoupas({
    jogo: { lerSalvamento: async () => salvo },
    avatar,
    politica,
    logger: createLogger({ level: 'error' }),
    agora: () => new Date(`${dia}T15:00:00Z`),
  })
}

test('pede ao Members só o que o salvamento guardado conquistou, com a festa do dia', async () => {
  const pedidos: unknown[] = []
  const avatar: PortaDoAvatar = {
    conceder: async (p) => {
      pedidos.push(p)
      return { situacao: 'concedido', concedidas: p.pecas.slice(0, 1) }
    },
  }
  expect(await servico(com(299), avatar, '2026-10-31').sincronizar(jogador)).toEqual({
    versao: 1,
    novas: [],
  })
  expect(pedidos).toEqual([])
  const r = await servico(com(300), avatar, '2026-06-10').sincronizar(jogador)
  expect(pedidos).toEqual([
    {
      userId: jogador.id,
      accountId: jogador.contaId,
      audience: 'kids',
      pecas: [ROUPAS_DA_AMIZADE.jade, ...VESTUARIO_DAS_FESTAS.junina.pecas].sort(),
    },
  ])
  expect(r.novas).toHaveLength(1)
  expect(await servico(null, avatar, '2026-06-10').sincronizar(jogador)).toEqual({
    versao: 1,
    novas: [],
  })
})

test('somente leitura recusa; Members fora do ar fica para a próxima vez; recusa vai ao log', async () => {
  const fora: PortaDoAvatar = {
    conceder: async () => {
      throw new AvatarIndisponivelError(502)
    },
  }
  await expect(
    servico(com(300), fora, '2026-10-31').sincronizar({ ...jogador, somenteLeitura: true }),
  ).rejects.toBeInstanceOf(SomenteLeituraError)
  await expect(servico(com(300), fora, '2026-10-31').sincronizar(jogador)).rejects.toBeInstanceOf(
    PlataformaIndisponivelError,
  )
  await expect(servico(com(300), null, '2026-10-31').sincronizar(jogador)).rejects.toBeInstanceOf(
    PlataformaIndisponivelError,
  )
  const recusa: PortaDoAvatar = {
    conceder: async () => ({ situacao: 'recusado', codigo: 'OWNER_MISMATCH' }),
  }
  expect(await servico(com(300), recusa, '2026-10-31').sincronizar(jogador)).toEqual({
    versao: 1,
    novas: [],
  })
})
