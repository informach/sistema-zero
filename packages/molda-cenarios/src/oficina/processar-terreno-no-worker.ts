import {
  buffersDoEstado,
  type PedidoDeTerreno,
  type ResultadoDoTerreno,
} from './terreno-processamento'
import { executarTrabalhoEmWorker } from './trabalho-em-worker'

/** Uma operação por worker: cancelar interrompe CPU e memória, não apenas sua resposta. */
export function processarTerrenoNoWorker(
  pedido: PedidoDeTerreno,
  sinal: AbortSignal,
): Promise<ResultadoDoTerreno> {
  return executarTrabalhoEmWorker<PedidoDeTerreno, ResultadoDoTerreno>({
    criarWorker: () =>
      new Worker(new URL('./terreno.worker.ts', import.meta.url), { type: 'module' }),
    pedido,
    sinal,
    transferiveis: buffersDoEstado(pedido.estado),
    mensagemDeFalha:
      'Não consegui iniciar o processamento do terreno. Recarregue e tente novamente.',
  })
}
