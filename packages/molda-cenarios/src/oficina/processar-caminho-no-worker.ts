import type { OperacaoDeCaminhoPreparada } from '@sistemazero/molda-cenarios-core/v2'
import type { PedidoDeCaminho } from './caminho-processamento'
import { buffersDoEstado } from './terreno-processamento'
import { executarTrabalhoEmWorker } from './trabalho-em-worker'

export function processarCaminhoNoWorker(pedido: PedidoDeCaminho, sinal: AbortSignal) {
  return executarTrabalhoEmWorker<PedidoDeCaminho, OperacaoDeCaminhoPreparada>({
    criarWorker: () =>
      new Worker(new URL('./caminho.worker.ts', import.meta.url), { type: 'module' }),
    pedido,
    sinal,
    transferiveis: buffersDoEstado(pedido.estado),
    mensagemDeFalha: 'Não consegui iniciar o preparo do caminho. Recarregue e tente novamente.',
  })
}
