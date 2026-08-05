'use client'

import { Card } from '@sistemazero/ui/card'
import { Spinner } from '@sistemazero/ui/spinner'
import { Backpack, Download } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/cn'
import { friendlyFileType } from '@/lib/format'
import type { LessonAttachmentView } from '@/lib/types'

/**
 * "Materiais da aula" KIDS — fork de APRESENTAÇÃO do
 * member-shell/lesson-attachments (mesma mecânica: download NA MESMA página
 * via fetch — a marca d'água demora segundos e `target="_blank"` deixava guia
 * morta; blob → âncora programática; anexo EXTERNO cai no fallback de nova
 * guia quando o fetch morre no CORS do 302).
 */
export function KidsLessonAttachments({
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
      window.open(url, '_blank', 'noopener,noreferrer')
    } finally {
      setDownloading(null)
    }
  }

  return (
    <Card className="kids-unit-cyan flex flex-col gap-3 border-2 p-5 shadow-[0_4px_0_var(--border)]">
      <h2 className="sz-display inline-flex items-center gap-2 text-lg">
        <Backpack className="size-5 text-(--unit)" />
        Materiais da aula
      </h2>
      <ul className="flex flex-col gap-2">
        {[...attachments]
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((file) => {
            const isDownloading = downloading === file.id
            const fileType = friendlyFileType(file.fileType)
            return (
              <li key={file.id}>
                <button
                  type="button"
                  onClick={() => download(file)}
                  disabled={downloading !== null}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-2xl border-2 border-border bg-background px-4 py-3 text-left font-semibold text-sm',
                    'shadow-[0_3px_0_var(--border)] transition-[border-color,box-shadow,transform] hover:border-ring/60',
                    'active:translate-y-[2px] active:shadow-[0_1px_0_var(--border)]',
                    'disabled:pointer-events-none disabled:opacity-60',
                  )}
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-full [background-image:var(--sz-gradient)] text-(--sz-primary-fg)">
                    {isDownloading ? (
                      <Spinner className="size-4" />
                    ) : (
                      <Download className="size-4" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{file.label}</span>
                  {isDownloading ? (
                    <span className="shrink-0 text-muted-foreground text-xs">
                      Preparando o download…
                    </span>
                  ) : fileType ? (
                    <span className="shrink-0 rounded-full border border-border px-2 py-0.5 font-bold text-[0.65rem] text-muted-foreground uppercase [font-family:var(--font-display)]">
                      {fileType}
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
