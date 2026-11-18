import {
  buffersDoEstado,
  type PedidoDeTerreno,
  type ResultadoDoTerreno,
} from './terreno-processamento'

/** Uma operação por worker: cancelar interrompe CPU e memória, não apenas sua resposta. */
export function processarTerrenoNoWorker(
  pedido: PedidoDeTerreno,
  sinal: AbortSignal,
): Promise<ResultadoDoTerreno> {
  sinal.throwIfAborted()
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./terreno.worker.ts', import.meta.url), { type: 'module' })
    const encerrar = () => {
      sinal.removeEventListener('abort', cancelar)
      worker.terminate()
    }
    const cancelar = () => {
      encerrar()
      reject(sinal.reason ?? new DOMException('Preparação cancelada', 'AbortError'))
    }
    sinal.addEventListener('abort', cancelar, { once: true })
    worker.onmessage = ({ data }) => {
      encerrar()
      if (data.ok) resolve(data.resultado)
      else reject(Error(data.erro))
    }
    worker.onerror = () => {
      encerrar()
      reject(
        Error('Não consegui iniciar o processamento do terreno. Recarregue e tente novamente.'),
      )
    }
    try {
      worker.postMessage(pedido, buffersDoEstado(pedido.estado))
    } catch (e) {
      encerrar()
      reject(e)
    }
  })
}
