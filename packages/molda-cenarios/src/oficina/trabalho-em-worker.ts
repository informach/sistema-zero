type RespostaDoTrabalho<T> = { ok: true; resultado: T } | { ok: false; erro: string }

/** Um trabalho por instância. Cancelar encerra o processador e remove todos os ouvintes. */
export function executarTrabalhoEmWorker<Entrada, Saida>({
  criarWorker,
  pedido,
  transferiveis,
  sinal,
  mensagemDeFalha,
}: {
  criarWorker: () => Worker
  pedido: Entrada
  transferiveis: readonly Transferable[]
  sinal: AbortSignal
  mensagemDeFalha: string
}): Promise<Saida> {
  sinal.throwIfAborted()
  return new Promise((resolve, reject) => {
    const worker = criarWorker()
    let encerrado = false
    const encerrar = () => {
      if (encerrado) return false
      encerrado = true
      sinal.removeEventListener('abort', cancelar)
      worker.onmessage = null
      worker.onerror = null
      worker.terminate()
      return true
    }
    const cancelar = () => {
      if (encerrar()) reject(sinal.reason ?? new DOMException('Preparação cancelada', 'AbortError'))
    }
    sinal.addEventListener('abort', cancelar, { once: true })
    worker.onmessage = ({ data }: MessageEvent<RespostaDoTrabalho<Saida>>) => {
      if (!encerrar()) return
      if (data.ok) resolve(data.resultado)
      else reject(new Error(data.erro))
    }
    worker.onerror = () => {
      if (encerrar()) reject(new Error(mensagemDeFalha))
    }
    try {
      worker.postMessage(pedido, [...transferiveis])
    } catch (erro) {
      if (encerrar()) reject(erro)
    }
  })
}
