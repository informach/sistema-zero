'use client'

import { BookOpen } from 'lucide-react'
import { useRef, useState } from 'react'
import type { EbookBlock } from '../../lib/types'
import { useLessonCopy } from '../lesson-copy-context'
import { useLessonPlayer } from '../lesson-player-context'
import { PdfBookView } from './pdf-book-view'

/**
 * Bloco e-book: monta a URL autenticada do PDF (o BFF resolve a localização real
 * no members e aplica a marca d'água do aluno) e renderiza o livro 3D interativo.
 * O bloco member-facing NÃO traz a localização do arquivo — só o `blockId`.
 * ⚠️ É só para LER (decisão da dona, 19/10/2026): o botão "Baixar PDF" saiu, nos dois
 * apps. Quem quer o arquivo baixa pelo bloco de materiais da aula.
 */
export function EbookBlockView({ blockId, content }: { blockId: string; content: EbookBlock }) {
  const player = useLessonPlayer()
  const { material } = useLessonCopy()
  const [error, setError] = useState('')
  const [accessed, setAccessed] = useState(player?.materialAccessed ?? false)
  const [accessSaveFailed, setAccessSaveFailed] = useState(false)
  const recording = useRef(false)
  if (!player)
    return (
      <div className="space-y-3 rounded-2xl border border-dashed p-6">
        <BookOpen aria-hidden className="size-10 text-primary" />
        <p className="font-medium">{content.title ?? material.tituloDoLivro}</p>
        <p className="text-sm text-muted-foreground">{material.previaDoLivro}</p>
      </div>
    )

  const pdfUrl = `/api/cursos/${encodeURIComponent(player.courseSlug)}/aulas/${encodeURIComponent(
    player.lessonId,
  )}/blocos/${encodeURIComponent(blockId)}/ebook`

  async function recordAccess() {
    if (!player?.onMaterialAccess || accessed || player.materialAccessed || recording.current)
      return
    recording.current = true
    try {
      await player.onMaterialAccess('opened')
      setAccessed(true)
      setAccessSaveFailed(false)
      setError('')
    } catch {
      setAccessSaveFailed(true)
      setError('Seu material abriu, mas não conseguimos salvar esse acesso.')
    } finally {
      recording.current = false
    }
  }
  return (
    <div className="space-y-3">
      <PdfBookView
        pdfUrl={pdfUrl}
        title={content.title ?? null}
        onOpened={() => {
          void recordAccess()
        }}
      />
      {player.onMaterialAccess && (
        <p className="text-sm text-muted-foreground">
          {accessed || player.materialAccessed
            ? 'Material acessado. Você pode continuar!'
            : material.paraConcluir}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm">
          {error}{' '}
          {accessSaveFailed && (
            <button
              type="button"
              className="min-h-11 underline"
              onClick={() => {
                void recordAccess()
              }}
            >
              Tentar salvar novamente
            </button>
          )}
        </p>
      )}
    </div>
  )
}
