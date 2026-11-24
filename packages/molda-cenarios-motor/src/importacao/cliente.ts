import type { ImportacaoConvertida } from './converter'
export type EntradaDeImportacao = File | { caminho: string; arquivo: File }

type Resposta =
  | { tipo: 'resultado'; resultado: ImportacaoConvertida }
  | { tipo: 'erro'; mensagem: string }
  | { tipo: 'andamento'; feitos: number; total: number }
/** Um worker por pacote, encerrado em sucesso, falha, timeout ou cancelamento. */
export function converterArquivos(
  arquivos: readonly EntradaDeImportacao[],
  andamento?: (feitos: number, total: number) => void,
  sinal?: AbortSignal,
): Promise<ImportacaoConvertida> {
  return new Promise((resolve, reject) => {
    if (sinal?.aborted) {
      reject(new DOMException('Importação cancelada', 'AbortError'))
      return
    }
    const worker = new Worker(new URL('./converter.worker.ts', import.meta.url), {
        type: 'module',
      }),
      timer = setTimeout(
        () => falhar(Error('A conversão demorou demais. Traga o pacote em partes menores')),
        120_000,
      )
    const limpar = () => {
      clearTimeout(timer)
      worker.terminate()
      sinal?.removeEventListener('abort', cancelar)
    }
    const falhar = (e: unknown) => {
      limpar()
      reject(e)
    }
    const cancelar = () => falhar(new DOMException('Importação cancelada', 'AbortError'))
    sinal?.addEventListener('abort', cancelar, { once: true })
    worker.onmessage = (e: MessageEvent<Resposta>) => {
      const r = e.data
      if (r.tipo === 'andamento') andamento?.(r.feitos, r.total)
      else if (r.tipo === 'erro') falhar(Error(r.mensagem))
      else if (r.tipo === 'resultado') {
        limpar()
        resolve(r.resultado)
      }
    }
    worker.onerror = (e) => {
      e.preventDefault()
      falhar(Error(e.message || 'Não consegui converter este pacote'))
    }
    worker.onmessageerror = () => falhar(Error('Não consegui ler a resposta da conversão'))
    try {
      worker.postMessage({
        arquivos: arquivos.map((entrada) =>
          'arquivo' in entrada
            ? entrada
            : {
                caminho: entrada.webkitRelativePath || entrada.name,
                arquivo: entrada,
              },
        ),
      })
    } catch (e) {
      falhar(e)
    }
  })
}
