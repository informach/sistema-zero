'use client'

import { Card } from '@sistemazero/ui/card'
import { Spinner } from '@sistemazero/ui/spinner'
import { Download } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { friendlyFileType } from '@/lib/format'
import type { LessonAttachmentView } from '@/lib/types'

/**
 * "Materiais da aula" com download NA MESMA página: a rota autenticada demora
 * alguns segundos aplicando a marca d'água, então `target="_blank"` deixava uma
 * guia em branco "morta" até o download começar. Aqui o arquivo é baixado via
 * fetch com estado de loading por item (link desabilitado + spinner) e salvo
 * por âncora programática — o aluno nunca sai da aula.
 */
export function LessonAttachments({
  courseSlug,
  lessonId,
  attachments,
}: {
  courseSlug: string
  lessonId: string
  attachments: LessonAttachmentView[]
}) {
  const [downloading, setDownloading] = useState<string | null>(null)

  async function download(file: LessonAttachmentView) {
    if (downloading) return
    const url = `/api/cursos/${encodeURIComponent(courseSlug)}/aulas/${encodeURIComponent(
      lessonId,
    )}/anexos/${encodeURIComponent(file.id)}`
    setDownloading(file.id)
    try {
      const res = await fetch(url)
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: { message?: string }
        } | null
        toast.error(body?.error?.message ?? 'Não foi possível baixar o material.')
        return
      }
      const blob = await res.blob()
      saveBlob(blob, filenameFrom(res.headers.get('content-disposition')) ?? file.label)
    } catch {
      // Anexo EXTERNO (URL colada pelo admin): a rota responde 302 p/ outro
      // domínio e o fetch morre no CORS — abre em nova guia (comportamento antigo).
      window.open(url, '_blank', 'noopener,noreferrer')
    } finally {
      setDownloading(null)
    }
  }

  return (
    <Card className="flex flex-col gap-2 p-4">
      <h2 className="text-sm font-semibold">Materiais da aula</h2>
      <ul className="flex flex-col gap-1">
        {[...attachments]
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((file) => {
            const isDownloading = downloading === file.id
            return (
              <li key={file.id}>
                <button
                  type="button"
                  onClick={() => download(file)}
                  disabled={downloading !== null}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-interactive transition-colors hover:bg-muted/60 hover:text-interactive-hover disabled:pointer-events-none disabled:opacity-60"
                >
                  {isDownloading ? <Spinner className="size-4" /> : <Download className="size-4" />}
                  {file.label}
                  {isDownloading ? (
                    <span className="text-xs text-muted-foreground">Preparando o download…</span>
                  ) : friendlyFileType(file.fileType) ? (
                    <span className="text-xs uppercase text-muted-foreground">
                      {friendlyFileType(file.fileType)}
                    </span>
                  ) : null}
                </button>
              </li>
            )
          })}
      </ul>
    </Card>
  )
}

/** Extrai o filename do Content-Disposition (a rota o monta com a extensão real). */
function filenameFrom(disposition: string | null): string | null {
  const m = disposition?.match(/filename="([^"]+)"/)
  return m?.[1] ?? null
}

/** Salva o blob via âncora programática (sem navegar/abrir guia). */
function saveBlob(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = objectUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(objectUrl)
}
