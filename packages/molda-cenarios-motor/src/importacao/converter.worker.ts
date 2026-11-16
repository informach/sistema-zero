import { converterConjunto } from './converter'

declare const self: Pick<Worker, 'onmessage' | 'postMessage'>
self.onmessage = async (e: MessageEvent<{ arquivos: { caminho: string; arquivo: File }[] }>) => {
  try {
    const resultado = await converterConjunto(e.data.arquivos, (feitos, total) =>
      self.postMessage({ tipo: 'andamento', feitos, total }),
    )
    self.postMessage(
      { tipo: 'resultado', resultado },
      resultado.modelos.map((m) => m.bytes.buffer),
    )
  } catch (e) {
    self.postMessage({
      tipo: 'erro',
      mensagem: e instanceof Error ? e.message : 'Não consegui abrir esse pacote',
    })
  }
}
