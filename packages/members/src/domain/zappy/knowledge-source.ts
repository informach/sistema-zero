import { createHash } from 'node:crypto'
import { ValidationError } from '@sistemazero/core/errors'
import { ZAPPY_SOURCE_CONTENT_MAX_BYTES, zappySourceContentBytes } from '@sistemazero/core/zappy'
import type {
  ZappyKnowledgeSourceInput,
  ZappyKnowledgeSourceType,
} from '../ports/zappy-knowledge-repository.port'

const MAX_SOURCE_CHARS = ZAPPY_SOURCE_CONTENT_MAX_BYTES
const CHUNK_CHARS = 1_500
const CHUNK_OVERLAP = 180

export function normalizeZappyText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Converte VTT em texto sem timestamps, ids de cue ou metadados. */
export function vttToText(vtt: string): string {
  const spoken: string[] = []
  let skippingMetadataBlock = false
  for (const line of vtt.replace(/^\uFEFF?WEBVTT[^\n]*\n?/i, '').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed) {
      skippingMetadataBlock = false
      continue
    }
    if (/^(NOTE|STYLE|REGION)(?:\s|$)/.test(trimmed)) {
      skippingMetadataBlock = true
      continue
    }
    if (skippingMetadataBlock || /^\d+$/.test(trimmed) || /-->/.test(trimmed)) continue
    spoken.push(trimmed)
  }
  return spoken
    .join(' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;!?])/g, '$1')
    .trim()
}

export function richTextToText(value: string): string {
  return value
    .replace(/```[\s\S]*?```/g, (match) => match.replace(/```[^\n]*\n?/g, ' '))
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)(?:\{[^}]*\})?/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

function chunksFor(text: string): Array<{ content: string; normalizedText: string }> {
  const safe = text.slice(0, MAX_SOURCE_CHARS).replace(/\s+/g, ' ').trim()
  if (!safe) return []
  const chunks: Array<{ content: string; normalizedText: string }> = []
  let start = 0
  while (start < safe.length) {
    let end = Math.min(safe.length, start + CHUNK_CHARS)
    if (end < safe.length) {
      const boundary = safe.lastIndexOf(' ', end)
      if (boundary > start + CHUNK_CHARS / 2) end = boundary
    }
    const content = safe.slice(start, end).trim()
    if (content) chunks.push({ content, normalizedText: normalizeZappyText(content) })
    if (end >= safe.length) break
    start = Math.max(start + 1, end - CHUNK_OVERLAP)
  }
  return chunks
}

export function prepareZappyKnowledgeSource(
  sourceType: ZappyKnowledgeSourceType,
  content?: string,
  error?: string,
): Pick<ZappyKnowledgeSourceInput, 'contentHash' | 'status' | 'error' | 'chunks'> {
  const raw = content ?? ''
  if (zappySourceContentBytes(raw) > ZAPPY_SOURCE_CONTENT_MAX_BYTES)
    throw new ValidationError('Fonte do Zappy excede o tamanho máximo')
  const text = sourceType === 'video-vtt' ? vttToText(raw) : richTextToText(raw)
  const chunks = chunksFor(text)
  const status = error ? 'error' : chunks.length > 0 ? 'ready' : raw ? 'empty' : 'pending'
  return {
    contentHash: createHash('sha256').update(raw).digest('hex'),
    status,
    error: error?.slice(0, 2000) ?? (status === 'empty' ? 'Fonte sem texto selecionável' : null),
    chunks,
  }
}
