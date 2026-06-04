'use client'

import dynamic from 'next/dynamic'
import type { EbookBlock } from '@/lib/types'
import { useLessonPlayer } from '../lesson-player-context'

/**
 * Livro 3D (three.js + pdf.js, ~700KB) só entra no bundle quando a aula tem um
 * bloco e-book — `ssr:false` também evita o three no server (sem WebGL lá).
 */
const EbookBook = dynamic(() => import('./ebook-book.impl'), {
  ssr: false,
  loading: () => (
    <div className="flex aspect-video w-full items-center justify-center rounded-lg border border-border bg-muted/30 text-sm text-muted-foreground">
      Carregando o livro 3D…
    </div>
  ),
})

/**
 * Bloco e-book: monta a URL autenticada do PDF (o BFF resolve a localização real
 * no members e aplica a marca d'água do aluno) e renderiza o livro 3D interativo.
 * O bloco member-facing NÃO traz a localização do arquivo — só o `blockId`.
 */
export function EbookBlockView({ blockId, content }: { blockId: string; content: EbookBlock }) {
  const player = useLessonPlayer()
  if (!player) return null // fora do player de aula não há como resolver o PDF

  const pdfUrl = `/api/cursos/${encodeURIComponent(player.courseSlug)}/aulas/${encodeURIComponent(
    player.lessonId,
  )}/blocos/${encodeURIComponent(blockId)}/ebook`

  return <EbookBook pdfUrl={pdfUrl} title={content.title ?? null} />
}
