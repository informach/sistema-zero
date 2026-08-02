import 'server-only'
import {
  ZAPPY_SOURCE_CONTENT_MAX_BYTES,
  zappySourceContentBytes,
  zappyVimeoVideoId,
} from '@sistemazero/core/zappy'
import { getEnv } from '@/lib/env'
import type { BlockView, EbookBlock, RichTextBlock, VideoBlock } from '@/lib/types'
import { type GatewayResponse, gatewayFetch } from './gateway'
import { syncVimeoTranscript } from './media'
import { r2ReadPrivateObject } from './r2'

interface PendingBase {
  courseId: string
  lessonId: string
  sourceRef: string
  expectedBlockRevision: string
}

type PendingExtraction =
  | (PendingBase & {
      sourceType: 'video-vtt'
      extraction:
        | { kind: 'stable-vtt'; location: string }
        | { kind: 'vimeo'; videoId: string }
        | { kind: 'unavailable'; error: string }
    })
  | (PendingBase & {
      sourceType: 'student-notebook'
      extraction: { kind: 'private-pdf'; location: string }
    })

function sourceRef(blockId: string): string {
  return `block:${blockId}`
}

async function postSource(input: {
  lessonId: string
  sourceType: 'video-vtt' | 'rich-text' | 'student-notebook'
  sourceRef: string
  expectedBlockRevision: string
  content?: string
  error?: string
}): Promise<void> {
  if (input.content && zappySourceContentBytes(input.content) > ZAPPY_SOURCE_CONTENT_MAX_BYTES) {
    throw new Error('Fonte do Zappy excede o tamanho máximo')
  }
  const result = await gatewayFetch('/members/admin/zappy/knowledge/sources', {
    method: 'POST',
    body: input,
  })
  if (result.status < 200 || result.status >= 300) {
    throw new Error(`Falha ao sincronizar fonte do Zappy (${result.status})`)
  }
}

function allowedVttUrl(raw: string): URL {
  const url = new URL(raw)
  const publicR2 = getEnv().R2_PUBLIC_URL
  if (!publicR2 || url.origin !== new URL(publicR2).origin) {
    throw new Error('Host da transcrição não autorizado')
  }
  return url
}

async function downloadVtt(raw: string): Promise<string> {
  const url = allowedVttUrl(raw)
  const response = await fetch(url, { signal: AbortSignal.timeout(20_000) })
  if (!response.ok) throw new Error(`Falha ao baixar VTT (${response.status})`)
  const declared = Number(response.headers.get('content-length') ?? '0')
  if (declared > ZAPPY_SOURCE_CONTENT_MAX_BYTES) throw new Error('VTT excede o tamanho máximo')
  const text = await response.text()
  if (zappySourceContentBytes(text) > ZAPPY_SOURCE_CONTENT_MAX_BYTES) {
    throw new Error('VTT excede o tamanho máximo')
  }
  return text
}

export async function extractPdfText(bytes: Uint8Array): Promise<string> {
  // Importe explicitamente o backend Node antes do PDF.js. Além de instalar os
  // globals usados no carregamento do módulo, a aresta direta faz o file tracing
  // do Next copiar o pacote e o binário opcional da plataforma para o standalone.
  const canvas = await import('@napi-rs/canvas')
  Object.assign(globalThis, {
    ...(typeof globalThis.DOMMatrix === 'undefined' ? { DOMMatrix: canvas.DOMMatrix } : {}),
    ...(typeof globalThis.ImageData === 'undefined' ? { ImageData: canvas.ImageData } : {}),
    ...(typeof globalThis.Path2D === 'undefined' ? { Path2D: canvas.Path2D } : {}),
  })
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const task = getDocument({ data: bytes, useSystemFonts: true })
  try {
    const document = await task.promise
    const pages: string[] = []
    let extractedBytes = 0
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber)
      const content = await page.getTextContent()
      const pageText = content.items
        .flatMap((item) => ('str' in item && typeof item.str === 'string' ? [item.str] : []))
        .join(' ')
      extractedBytes += zappySourceContentBytes(pageText) + 1
      if (extractedBytes > ZAPPY_SOURCE_CONTENT_MAX_BYTES) {
        throw new Error('Texto do PDF excede o tamanho máximo')
      }
      pages.push(pageText)
    }
    return pages.join('\n').replace(/\s+/g, ' ').trim()
  } finally {
    await task.destroy()
  }
}

async function syncPending(input: PendingExtraction): Promise<void> {
  try {
    let content: string
    if (input.extraction.kind === 'stable-vtt') {
      content = await downloadVtt(input.extraction.location)
    } else if (input.extraction.kind === 'vimeo') {
      const transcript = await syncVimeoTranscript(input.extraction.videoId)
      if (!transcript) throw new Error('Vimeo ainda não disponibilizou transcrição')
      content = transcript.content
    } else if (input.extraction.kind === 'private-pdf') {
      content = await extractPdfText(await r2ReadPrivateObject(input.extraction.location))
    } else {
      throw new Error(input.extraction.error)
    }
    await postSource({
      lessonId: input.lessonId,
      sourceType: input.sourceType,
      sourceRef: input.sourceRef,
      expectedBlockRevision: input.expectedBlockRevision,
      content,
      ...(content ? {} : { error: 'Fonte sem texto selecionável' }),
    })
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Falha desconhecida na extração'
    await postSource({
      lessonId: input.lessonId,
      sourceType: input.sourceType,
      sourceRef: input.sourceRef,
      expectedBlockRevision: input.expectedBlockRevision,
      error: message,
    })
    throw cause instanceof Error ? cause : new Error(message)
  }
}

/** Sincroniza a fonte correspondente ao bloco recém-salvo. */
export async function syncZappyKnowledgeForBlock(block: BlockView): Promise<void> {
  const ref = sourceRef(block.id)
  if (block.content.kind === 'rich_text') {
    const content = block.content as RichTextBlock
    await postSource({
      lessonId: block.lessonId,
      sourceType: 'rich-text',
      sourceRef: ref,
      expectedBlockRevision: block.blockRevision,
      content: content.markdown ?? content.html ?? '',
    })
    return
  }
  if (block.content.kind === 'video') {
    const content = block.content as VideoBlock
    const location = content.captions?.[0]?.url
    const videoId = zappyVimeoVideoId(content.provider, content.src)
    await syncPending({
      courseId: '',
      lessonId: block.lessonId,
      sourceType: 'video-vtt',
      sourceRef: ref,
      expectedBlockRevision: block.blockRevision,
      extraction: location
        ? { kind: 'stable-vtt', location }
        : videoId
          ? { kind: 'vimeo', videoId }
          : { kind: 'unavailable', error: 'Vídeo publicado sem transcrição compatível' },
    })
    return
  }
  if (block.content.kind === 'ebook') {
    const content = block.content as EbookBlock
    if (content.zappyStudentNotebook) {
      await syncPending({
        courseId: '',
        lessonId: block.lessonId,
        sourceType: 'student-notebook',
        sourceRef: ref,
        expectedBlockRevision: block.blockRevision,
        extraction: { kind: 'private-pdf', location: content.url },
      })
      return
    }
  }
  await deleteZappyKnowledgeForBlock(block.id)
}

export async function deleteZappyKnowledgeForBlock(blockId: string): Promise<void> {
  const result = await gatewayFetch(
    `/members/admin/zappy/knowledge/sources/${encodeURIComponent(sourceRef(blockId))}`,
    { method: 'DELETE' },
  )
  if (result.status !== 200 && result.status !== 404) {
    throw new Error(`Falha ao remover fonte do Zappy (${result.status})`)
  }
}

export function getZappyKnowledgeReport(): Promise<GatewayResponse<unknown>> {
  return gatewayFetch('/members/admin/zappy/knowledge/report')
}

export function getZappyMetrics(month: string): Promise<GatewayResponse<unknown>> {
  return gatewayFetch('/members/admin/zappy/metrics', { query: { month } })
}

const BACKFILL_BATCH_SIZE = 3

export async function backfillZappyKnowledge(
  input: { cursor?: string } = {},
): Promise<GatewayResponse<unknown>> {
  const result = await gatewayFetch<{
    indexed: number
    deleted: number
    pending: PendingExtraction[]
    nextCursor: string | null
    done: boolean
  }>('/members/admin/zappy/knowledge/backfill', {
    method: 'POST',
    body: { ...(input.cursor ? { cursor: input.cursor } : {}), limit: BACKFILL_BATCH_SIZE },
  })
  if (result.status !== 200 || !result.body) return result
  let cursor = 0
  let extracted = 0
  let failed = 0
  const failures: Array<{
    sourceRef: string
    sourceType: PendingExtraction['sourceType']
    error: string
  }> = []
  const workers = Array.from({ length: Math.min(3, result.body.pending.length) }, async () => {
    while (cursor < result.body!.pending.length) {
      const pending = result.body!.pending[cursor]
      cursor += 1
      if (!pending) continue
      try {
        await syncPending(pending)
        extracted += 1
      } catch (cause) {
        failed += 1
        failures.push({
          sourceRef: pending.sourceRef,
          sourceType: pending.sourceType,
          error: cause instanceof Error ? cause.message : 'Falha desconhecida na extração',
        })
      }
    }
  })
  await Promise.all(workers)
  return {
    status: failed > 0 ? 207 : 200,
    body: {
      indexed: result.body.indexed,
      deleted: result.body.deleted,
      extracted,
      failed,
      failures,
      nextCursor: result.body.nextCursor,
      done: result.body.done,
    },
  }
}
