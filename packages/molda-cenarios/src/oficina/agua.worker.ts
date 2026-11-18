import { type PedidoDeAgua, processarAgua } from './agua-processamento'
import { buffersDoEstado } from './terreno-processamento'

self.onmessage = ({ data }: MessageEvent<PedidoDeAgua>) => {
  try {
    const resultado = processarAgua(data)
    self.postMessage(
      { ok: true, resultado },
      { transfer: buffersDoEstado(resultado.terreno ?? null) },
    )
  } catch (erro) {
    self.postMessage({
      ok: false,
      erro: erro instanceof Error ? erro.message : 'Não consegui preparar esta água.',
    })
  }
}
