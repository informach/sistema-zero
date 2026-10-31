import { expect, test } from 'bun:test'
import type { DesafioNaLista, DesafiosDoJogador } from '@sistemazero/arquipelago-contracts'
import {
  estadoDoPedidoDoEstudio,
  pedidoDoEstudio,
  placaDoPedidoAcesa,
  TEXTOS_DO_PEDIDO_DO_ESTUDIO,
} from '../src/sistemas/pedido-do-estudio'

/** O pedido do morador no Estúdio (§6.28, A23). */
const d = (id: string, over: Partial<DesafioNaLista>): DesafioNaLista => ({
  id,
  revisao: 1,
  ilha: 'sua-ilha',
  tipo: 'pedido-de-morador',
  quadro: null,
  ordem: 80,
  titulo: `Pedido ${id.slice(-1)}`,
  situacao: 'disponivel',
  faltam: [],
  recompensa: { cor: false, moedas: 20, moedasExtra: 10 },
  recompensaVista: false,
  ...over,
})
const lista = (desafios: DesafioNaLista[]): DesafiosDoJogador => ({
  versao: 1,
  ilhas: [],
  desafios,
  doDia: null,
})

test('o morador oferece o primeiro pedido por fazer da ilha dele; só pedidos de morador', () => {
  const um = d('00000000-0000-4000-8000-000000000001', { situacao: 'concluido', ordem: 80 })
  const dois = d('00000000-0000-4000-8000-000000000002', { ordem: 90 })
  const quadro = d('00000000-0000-4000-8000-000000000003', { tipo: 'quadro-das-cores', quadro: 1 })
  const doRecife = d('00000000-0000-4000-8000-000000000004', { ilha: 'recife' })
  const dados = lista([dois, quadro, um, doRecife])
  expect(pedidoDoEstudio(dados, 'sua-ilha')?.id).toBe(dois.id)
  expect(pedidoDoEstudio(lista([um]), 'sua-ilha')?.id).toBe(um.id)
  expect(pedidoDoEstudio(lista([quadro]), 'sua-ilha')).toBeNull()
  expect(pedidoDoEstudio(null, 'sua-ilha')).toBeNull()
  expect(pedidoDoEstudio(dados, 'recife')?.id).toBe(doRecife.id)
})

test('a placa acende só depois de um pedido feito; o cartão diz a situação', () => {
  const feito = d('00000000-0000-4000-8000-000000000001', { situacao: 'concluido' })
  const porFazer = d('00000000-0000-4000-8000-000000000002', {})
  expect(placaDoPedidoAcesa(lista([porFazer]), 'sua-ilha')).toBe(false)
  expect(placaDoPedidoAcesa(lista([porFazer, feito]), 'sua-ilha')).toBe(true)
  expect(placaDoPedidoAcesa(lista([feito]), 'recife')).toBe(false)
  expect(estadoDoPedidoDoEstudio(feito)).toBe(TEXTOS_DO_PEDIDO_DO_ESTUDIO.feito)
  expect(estadoDoPedidoDoEstudio(porFazer)).toBe(TEXTOS_DO_PEDIDO_DO_ESTUDIO.pronto)
  expect(estadoDoPedidoDoEstudio({ ...porFazer, situacao: 'faltam-blocos' })).toBe(
    TEXTOS_DO_PEDIDO_DO_ESTUDIO.trancado,
  )
  for (const t of Object.values(TEXTOS_DO_PEDIDO_DO_ESTUDIO)) expect(t).not.toMatch(/[—!]/)
})
