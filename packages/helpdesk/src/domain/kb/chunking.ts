import { createHash } from 'node:crypto'
import type { KbChunk } from './kb-article'

export const KNOWLEDGE_INDEX_VERSION = 1
export function normalizeKnowledge(text: string): string {
  return text
    .normalize('NFC')
    .replace(/\r\n?/g, '\n')
    .replace(/[\t ]+$/gm, '')
    .trim()
}
export function knowledgeHash(text: string): string {
  return createHash('sha256').update(normalizeKnowledge(text)).digest('hex')
}

/** Preserva seções e conteúdo; parágrafos longos são divididos, nunca descartados. */
export function chunkKnowledge(
  revisionId: string,
  text: string,
  idGen: () => string,
  maxChars = 1600,
): KbChunk[] {
  if (!Number.isInteger(maxChars) || maxChars < 100) throw new Error('Orçamento de trecho inválido')
  const chunks: KbChunk[] = []
  let section = ''
  let buffer = ''
  const flush = () => {
    if (buffer.trim())
      chunks.push({
        id: idGen(),
        revisionId,
        position: chunks.length,
        section,
        text: buffer.trim(),
      })
    buffer = ''
  }
  for (const paragraph of normalizeKnowledge(text).split(/\n\s*\n/)) {
    if (/^#{1,6}\s/.test(paragraph)) {
      flush()
      section = (paragraph.split('\n')[0] ?? '').replace(/^#{1,6}\s+/, '').slice(0, 300)
    }
    let remaining = paragraph
    while (remaining.length > maxChars) {
      flush()
      const boundary = remaining.lastIndexOf(' ', maxChars)
      const split = boundary > maxChars / 2 ? boundary : maxChars
      buffer = remaining.slice(0, split)
      flush()
      remaining = remaining.slice(split).trimStart()
    }
    if (buffer.length + remaining.length + 2 > maxChars) flush()
    buffer += `${buffer ? '\n\n' : ''}${remaining}`
  }
  flush()
  return chunks
}
