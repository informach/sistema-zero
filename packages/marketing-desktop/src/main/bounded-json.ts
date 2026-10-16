/** Stop reading as soon as the byte budget is exceeded, including chunked replies. */
export async function readBoundedJson(response: Response, maxBytes = 16_000_000): Promise<unknown> {
  const declared = Number(response.headers.get('content-length') ?? 0)
  if (declared > maxBytes) {
    await response.body?.cancel()
    throw new Error('Resposta acima do limite de sincronização')
  }
  const reader = response.body?.getReader()
  if (!reader) throw new Error('Resposta vazia do servidor')
  const decoder = new TextDecoder('utf-8', { fatal: true })
  let bytes = 0,
    text = ''
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      bytes += value.byteLength
      if (bytes > maxBytes) {
        await reader.cancel()
        throw new Error('Resposta acima do limite de sincronização')
      }
      text += decoder.decode(value, { stream: true })
    }
    text += decoder.decode()
  } finally {
    reader.releaseLock()
  }
  try {
    return JSON.parse(text)
  } catch {
    throw new Error('O servidor devolveu uma resposta inválida')
  }
}
