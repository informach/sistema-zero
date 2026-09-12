'use client'

import { Button } from '@sistemazero/ui/button'
import { BookOpen, Download } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'
import type { EbookBlock } from '../../lib/types'
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
  const [error, setError] = useState('')
  const [downloading, setDownloading] = useState(false)
  const [accessed, setAccessed] = useState(player?.materialAccessed ?? false)
  const [accessSaveFailed, setAccessSaveFailed] = useState(false)
  const recording = useRef(false)
  const accessMethod = useRef<'opened' | 'downloaded'>('opened')
  const downloadUrl = useRef<string | null>(null)
  useEffect(
    () => () => {
      if (downloadUrl.current) URL.revokeObjectURL(downloadUrl.current)
    },
    [],
  )
  if (!player)
    return (
      <div className="space-y-3 rounded-2xl border border-dashed p-6">
        <BookOpen aria-hidden className="size-10 text-primary" />
        <p className="font-medium">{content.title ?? 'Material do curso'}</p>
        <p className="text-sm text-muted-foreground">
          Prévia do material. O livro 3D e o download do PDF ficam disponíveis na aula publicada.
        </p>
      </div>
    )

  const pdfUrl = `/api/cursos/${encodeURIComponent(player.courseSlug)}/aulas/${encodeURIComponent(
    player.lessonId,
  )}/blocos/${encodeURIComponent(blockId)}/ebook`

  async function recordAccess(method: 'opened' | 'downloaded') {
    if (!player?.onMaterialAccess || accessed || player.materialAccessed || recording.current)
      return
    accessMethod.current = method
    recording.current = true
    try {
      await player.onMaterialAccess(method)
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
  async function download() {
    setDownloading(true)
    setError('')
    try {
      const response = await fetch(pdfUrl)
      if (!response.ok) throw new Error('Download indisponível')
      const blob = await response.blob()
      if (
        !blob.size ||
        (blob.type && !['application/pdf', 'application/octet-stream'].includes(blob.type))
      )
        throw new Error('Arquivo inválido')
      if (downloadUrl.current) URL.revokeObjectURL(downloadUrl.current)
      downloadUrl.current = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = downloadUrl.current
      anchor.download = `${(content.title ?? 'Material da aula').replace(/[<>:"/\\|?*]/g, '-')}.pdf`
      document.body.append(anchor)
      anchor.click()
      anchor.remove()
      await recordAccess('downloaded')
    } catch {
      setError('Não foi possível baixar o PDF. Confira sua conexão e tente novamente.')
    } finally {
      setDownloading(false)
    }
  }
  return (
    <div className="space-y-3">
      <EbookBook
        pdfUrl={pdfUrl}
        title={content.title ?? null}
        onOpened={() => {
          void recordAccess('opened')
        }}
      />
      <Button
        type="button"
        variant="outline"
        disabled={downloading}
        onClick={() => {
          void download()
        }}
      >
        <Download className="size-4" />
        {downloading ? 'Preparando PDF…' : 'Baixar PDF'}
      </Button>
      {player.onMaterialAccess && (
        <p className="text-sm text-muted-foreground">
          {accessed || player.materialAccessed
            ? 'Material acessado. Você pode continuar!'
            : 'Abra o livro ou baixe o PDF para concluir esta etapa.'}
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
                void recordAccess(accessMethod.current)
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
