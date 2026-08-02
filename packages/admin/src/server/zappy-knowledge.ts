import 'server-only'
import { getEnv } from '@/lib/env'
import type { BlockView, EbookBlock, RichTextBlock, VideoBlock } from '@/lib/types'
import { type GatewayResponse, gatewayFetch } from './gateway'
import { r2ReadPrivateObject } from './r2'

interface PendingExtraction {
  courseId: string
  lessonId: string
  sourceType: 'video-vtt' | 'student-notebook'
  sourceRef: string
  location: string
}

const MAX_VTT_BYTES = 5 * 1024 * 1024

function sourceRef(blockId: string): string {
  return `block:${blockId}`
}

async function postSource(input: {
  lessonId: string
  sourceType: 'video-vtt' | 'rich-text' | 'student-notebook'
  sourceRef: string
  content?: string
  error?: string
}): Promise<void> {
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
  if (declared > MAX_VTT_BYTES) throw new Error('VTT excede o tamanho máximo')
  const text = await response.text()
  if (Buffer.byteLength(text, 'utf8') > MAX_VTT_BYTES) {
    throw new Error('VTT excede o tamanho máximo')
  }
  return text
}

export async function extractPdfText(bytes: Uint8Array): Promise<string> {
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const task = getDocument({ data: bytes })
  try {
    const document = await task.promise
    const pages: string[] = []
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber)
      const content = await page.getTextContent()
      pages.push(
        content.items
          .flatMap((item) => ('str' in item && typeof item.str === 'string' ? [item.str] : []))
          .join(' '),
      )
    }
    return pages.join('\n').replace(/\s+/g, ' ').trim()
  } finally {
    await task.destroy()
  }
}

async function syncPending(input: PendingExtraction): Promise<void> {
  try {
    const content =
      input.sourceType === 'video-vtt'
        ? await downloadVtt(input.location)
        : await extractPdfText(await r2ReadPrivateObject(input.location))
    await postSource({
      lessonId: input.lessonId,
      sourceType: input.sourceType,
      sourceRef: input.sourceRef,
      content,
      ...(content ? {} : { error: 'Fonte sem texto selecionável' }),
    })
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Falha desconhecida na extração'
    await postSource({
      lessonId: input.lessonId,
      sourceType: input.sourceType,
      sourceRef: input.sourceRef,
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
      content: content.markdown ?? content.html ?? '',
    })
    return
  }
  if (block.content.kind === 'video') {
    const content = block.content as VideoBlock
    const location = content.captions?.[0]?.url
    if (location) {
      await syncPending({
        courseId: '',
        lessonId: block.lessonId,
        sourceType: 'video-vtt',
        sourceRef: ref,
        location,
      })
    } else {
      await postSource({
        lessonId: block.lessonId,
        sourceType: 'video-vtt',
        sourceRef: ref,
        error: 'Vídeo publicado sem transcrição',
      })
    }
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
        location: content.url,
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

export async function backfillZappyKnowledge(): Promise<GatewayResponse<unknown>> {
  const result = await gatewayFetch<{
    indexed: number
    pending: PendingExtraction[]
  }>('/members/admin/zappy/knowledge/backfill', { method: 'POST', body: {} })
  if (result.status !== 200 || !result.body) return result
  let cursor = 0
  let extracted = 0
  let failed = 0
  const workers = Array.from({ length: Math.min(3, result.body.pending.length) }, async () => {
    while (cursor < result.body!.pending.length) {
      const pending = result.body!.pending[cursor]
      cursor += 1
      if (!pending) continue
      try {
        await syncPending(pending)
        extracted += 1
      } catch {
        failed += 1
      }
    }
  })
  await Promise.all(workers)
  return {
    status: 200,
    body: {
      indexed: result.body.indexed,
      extracted,
      failed,
    },
  }
}
