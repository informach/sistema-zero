'use client'

import { BookOpenText } from 'lucide-react'
import { lessonAttachmentUrl } from '../../lib/attachment-download'
import type { MaterialItem, MaterialsBlock } from '../../lib/types'
import { useLessonPlayer } from '../lesson-player-context'
import { PdfBookView } from './pdf-book-view'

function firstPdf(content: MaterialsBlock): Extract<MaterialItem, { kind: 'file' }> | undefined {
  return content.items.find(
    (item): item is Extract<MaterialItem, { kind: 'file' }> =>
      item.kind === 'file' &&
      (item.fileType?.toLowerCase().split(';')[0] === 'application/pdf' ||
        item.label?.toLowerCase().endsWith('.pdf') === true),
  )
}

/** Leitura do mesmo anexo PDF oferecido para download no bloco de materiais. */
export function MaterialsBookPreview({ content }: { content: MaterialsBlock }) {
  const player = useLessonPlayer()
  const pdf = firstPdf(content)
  return (
    <div className="sz-lesson-block space-y-3 scroll-mt-6">
      <h3 className="flex items-center gap-2 font-semibold">
        <BookOpenText aria-hidden className="size-5" />
        Folheie o caderno
      </h3>
      {pdf && player ? (
        <PdfBookView
          pdfUrl={lessonAttachmentUrl(player.courseSlug, player.lessonId, pdf.attachmentId)}
          title={content.title ?? 'Caderno do Aluno'}
        />
      ) : (
        <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
          {pdf
            ? 'O livro fica disponível na aula publicada.'
            : player
              ? 'O caderno ainda não está disponível nesta aula. Você pode continuar.'
              : 'Vincule um PDF a este bloco de materiais para mostrar o caderno aqui.'}
        </p>
      )}
    </div>
  )
}
