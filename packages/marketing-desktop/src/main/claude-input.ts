import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { z } from 'zod'
import { probeImage } from './media/probe-image'
import { MAX_VISUAL_IMAGES } from './visual-input-limits'

export function claudeResult(raw: string, streaming: boolean): unknown {
  if (!raw.trim()) return undefined
  if (!streaming) return JSON.parse(raw)
  const envelope = z.object({ type: z.string() }).passthrough()
  const results = raw
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line) => envelope.parse(JSON.parse(line)))
    .filter((message) => message.type === 'result')
  if (results.length > 1) throw new Error('O cliente retornou mais de uma resposta para o pedido')
  return results[0]
}

/** Official Claude Code streaming input, retaining authentication in the native client. */
export async function claudeInput(prompt: string, files: string[], signal: AbortSignal) {
  if (files.length > MAX_VISUAL_IMAGES)
    throw new Error(`A análise visual aceita até ${MAX_VISUAL_IMAGES} imagens por pedido`)
  const content: Array<
    | { type: 'text'; text: string }
    | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }
  > = [{ type: 'text', text: prompt }]
  let total = 0
  for (const file of files) {
    signal.throwIfAborted()
    const size = (await stat(file)).size
    total += size
    if (size > 4_000_000 || total > 24_000_000)
      throw new Error('As referências visuais excedem o limite deste pedido')
    const mime = (
      {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.webp': 'image/webp',
      } as Record<string, string>
    )[path.extname(file).toLowerCase()]
    if (!mime) throw new Error('A referência visual precisa ser PNG, JPEG ou WebP')
    await probeImage(file, mime)
    content.push({
      type: 'image',
      source: { type: 'base64', media_type: mime, data: (await readFile(file)).toString('base64') },
    })
  }
  signal.throwIfAborted()
  return `${JSON.stringify({ type: 'user', message: { role: 'user', content }, parent_tool_use_id: null })}\n`
}
