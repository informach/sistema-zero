import { type PedidoDeCaminho, processarCaminho } from './caminho-processamento'
import { buffersDoEstado } from './terreno-processamento'

self.onmessage = ({ data }: MessageEvent<PedidoDeCaminho>) => {
  try {
    const resultado = processarCaminho(data)
    self.postMessage(
      { ok: true, resultado },
      { transfer: buffersDoEstado(resultado.terreno ?? null) },
    )
  } catch (erro) {
    self.postMessage({
      ok: false,
      erro: erro instanceof Error ? erro.message : 'Não consegui preparar este caminho.',
    })
  }
}
