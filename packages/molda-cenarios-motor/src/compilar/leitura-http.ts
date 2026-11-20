import { LIMITES_DA_EXPORTACAO } from '@sistemazero/molda-cenarios-core/compilar'

/** Apenas a chamada HTTP; transportes de teste não precisam das extensões globais do Bun. */
export type BuscarArquivoCompilado = (url: URL, opcoes: RequestInit) => Promise<Response>

export async function lerBytesDoCenario(
  url: URL,
  maximo: number,
  sinal: AbortSignal,
  buscar: BuscarArquivoCompilado = fetch,
): Promise<Uint8Array> {
  sinal.throwIfAborted()
  if (!Number.isSafeInteger(maximo) || maximo <= 0 || maximo > LIMITES_DA_EXPORTACAO.bytesDoPacote)
    throw Error('O limite de leitura do cenário é inválido.')
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.hash)
    throw Error('O endereço do arquivo de cenário é inválido.')
  const r = await buscar(url, { signal: sinal, credentials: 'omit', redirect: 'error' })
  if (sinal.aborted) {
    await r.body?.cancel().catch(() => {})
    sinal.throwIfAborted()
  }
  if (!r.ok || !r.body) {
    await r.body?.cancel()
    throw Error(`Não consegui ler o arquivo do cenário (${r.status}).`)
  }
  const tamanho = r.headers.get('content-length')
  if (tamanho !== null && (!/^\d+$/.test(tamanho) || Number(tamanho) > maximo)) {
    await r.body.cancel()
    throw Error('O arquivo do cenário excede o tamanho permitido.')
  }
  const leitor = r.body.getReader(),
    blocos: Uint8Array[] = []
  const cancelar = () => {
    void leitor.cancel(sinal.reason).catch(() => {})
  }
  sinal.addEventListener('abort', cancelar, { once: true })
  let bytes = 0
  try {
    for (;;) {
      sinal.throwIfAborted()
      const { done, value } = await leitor.read()
      if (done) break
      bytes += value.byteLength
      if (bytes > maximo) throw Error('O arquivo do cenário excede o tamanho permitido.')
      blocos.push(value)
    }
  } catch (erro) {
    await leitor.cancel().catch(() => {})
    throw erro
  } finally {
    sinal.removeEventListener('abort', cancelar)
    leitor.releaseLock()
  }
  sinal.throwIfAborted()
  const dados = new Uint8Array(bytes)
  let offset = 0
  for (const b of blocos) {
    dados.set(b, offset)
    offset += b.length
  }
  return dados
}
