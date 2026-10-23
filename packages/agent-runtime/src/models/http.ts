export async function boundedJson(response: Response, maxBytes = 2_000_000): Promise<unknown> {
  if (!response.ok) {
    await response.body?.cancel()
    throw new Error(`HTTP ${response.status}`)
  }
  if (!response.body) throw new Error('Response body missing')
  const chunks: Uint8Array[] = []
  let bytes = 0
  const reader = response.body.getReader()
  try {
    while (true) {
      const result = await reader.read()
      if (result.done) break
      bytes += result.value.byteLength
      if (bytes > maxBytes) throw new Error('JSON response exceeds byte limit')
      chunks.push(result.value)
    }
  } finally {
    await reader.cancel()
    reader.releaseLock()
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}
