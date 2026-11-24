import { buffersDoEstado, type PedidoDeTerreno, processarTerreno } from './terreno-processamento'

self.onmessage = async ({ data }: MessageEvent<PedidoDeTerreno>) => {
  try {
    const resultado = await processarTerreno(data)
    self.postMessage(
      { ok: true, resultado },
      {
        transfer:
          resultado.tipo === 'png'
            ? [resultado.bytes.buffer]
            : buffersDoEstado(resultado.edicao.estado),
      },
    )
  } catch (e) {
    self.postMessage({
      ok: false,
      erro: e instanceof Error ? e.message : 'Não consegui processar o terreno.',
    })
  }
}
