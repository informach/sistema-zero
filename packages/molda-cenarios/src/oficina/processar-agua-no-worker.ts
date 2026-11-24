import type { OperacaoDeAguaPreparada } from '@sistemazero/molda-cenarios-core/v2'
import type { PedidoDeAgua } from './agua-processamento'
import { buffersDoEstado } from './terreno-processamento'
import { executarTrabalhoEmWorker } from './trabalho-em-worker'

export function processarAguaNoWorker(pedido: PedidoDeAgua, sinal: AbortSignal) {
  return executarTrabalhoEmWorker<PedidoDeAgua, OperacaoDeAguaPreparada>({
    criarWorker: () => new Worker(new URL('./agua.worker.ts', import.meta.url), { type: 'module' }),
    pedido,
    sinal,
    transferiveis: buffersDoEstado(pedido.estado),
    mensagemDeFalha: 'Não consegui iniciar o preparo da água. Recarregue e tente novamente.',
  })
}
