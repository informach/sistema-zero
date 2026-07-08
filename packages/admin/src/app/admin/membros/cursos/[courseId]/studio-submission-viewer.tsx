'use client'

import type { Project, StudioHandle } from '@sistemazero/studio'
import { Button } from '@sistemazero/ui/button'
import { Card } from '@sistemazero/ui/card'
import { Dialog } from '@sistemazero/ui/dialog'
import { Spinner } from '@sistemazero/ui/spinner'
import { Download, Maximize2, MessageSquare, Minimize2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { StudioEmbed } from '@/components/studio/studio-embed'
import { type ApiError, apiGet } from '@/lib/api'
import type { StudioSubmissionDetailView } from '@/lib/types'
import { TeacherThreadPanel } from './teacher-thread-panel'

function downloadProjectJson(project: Project): void {
  const name = (project as { name?: string }).name ?? 'projeto'
  const safe = name.replace(/[^\w.-]+/g, '-').slice(0, 60) || 'projeto'
  const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${safe}.szproject.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

interface Props {
  open: boolean
  onClose: () => void
  /** Bloco + aluno da entrega — o detalhe vem do endpoint por-bloco existente. */
  blockId: string
  userId: string
  /** Rótulos já resolvidos na lista (evita re-hidratar identidade no viewer). */
  studentName: string
  responsible?: string | null
  /** Contexto p/ o canal de RETORNO (conversa com o aluno). */
  audience: 'adult' | 'kids'
  courseId: string
  lessonId: string
  lessonTitle: string
}

/**
 * Viewer de UMA entrega do Estúdio, compartilhado pela aba "Entregas" por curso.
 * Busca o projeto pelo endpoint por-bloco (`/blocks/:blockId/studio-submissions/:userId`)
 * e o abre num Estúdio embutido (read-only). Tem um botão **maximizar/restaurar**
 * (overlay CSS — o modal ocupa quase a tela p/ o professor ter espaço; mais confiável
 * que a Fullscreen API do browser com o iframe do preview).
 */
export function StudioSubmissionViewer({
  open,
  onClose,
  blockId,
  userId,
  studentName,
  responsible,
  audience,
  courseId,
  lessonId,
  lessonTitle,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [detail, setDetail] = useState<StudioSubmissionDetailView | null>(null)
  const [maximized, setMaximized] = useState(false)
  // Handle exigido pelo StudioEmbed; na inspeção é só leitura (não usamos getProject).
  const viewerRef = useRef<StudioHandle | null>(null)

  useEffect(() => {
    if (!open) return
    setMaximized(false)
    setDetail(null)
    let active = true
    setLoading(true)
    apiGet<StudioSubmissionDetailView>(
      `/api/members/blocks/${blockId}/studio-submissions/${userId}`,
    )
      .then((res) => {
        if (active) setDetail(res)
      })
      .catch((err) => {
        if (active) toast.error((err as ApiError).message ?? 'Falha ao abrir a entrega.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [open, blockId, userId])

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Entrega de ${studentName}`}
      // Maximizado: quase tela cheia (mais espaço p/ o Estúdio); normal: modal largo.
      className={maximized ? 'h-[96dvh] max-h-[96dvh] w-[98vw] max-w-none' : 'max-w-7xl'}
    >
      {loading || !detail ? (
        <Card className="py-8 text-center text-muted-foreground">
          <Spinner className="mx-auto" />
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground">
              <p>Enviado em {new Date(detail.submittedAt).toLocaleString('pt-BR')}</p>
              {responsible ? <p>Responsável: {responsible}</p> : null}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setMaximized((v) => !v)}>
                {maximized ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
                {maximized ? 'Restaurar' : 'Tela cheia'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadProjectJson(detail.project)}
              >
                <Download className="size-4" /> Baixar .szproject.json
              </Button>
            </div>
          </div>

          {/* Recado opcional que o aluno escreveu ao enviar o projeto. */}
          {detail.message ? (
            <Card className="space-y-1 p-3">
              <div className="flex items-center gap-1.5 font-medium text-sm">
                <MessageSquare className="size-4" /> Recado do aluno
              </div>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{detail.message}</p>
            </Card>
          ) : null}

          {/* Canal de RETORNO: responder ao aluno (erro/correção/"resolvido"). */}
          <TeacherThreadPanel
            userId={userId}
            blockId={blockId}
            audience={audience}
            courseId={courseId}
            lessonId={lessonId}
            title={lessonTitle}
            studentName={studentName}
          />

          {/* Correção automática (atividade). Sem atividade → score null, omite. */}
          {detail.score !== null ? (
            <Card className="space-y-2 p-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <span>Correção automática: {detail.score}/100</span>
                <span className={detail.passed ? 'text-success' : 'text-destructive'}>
                  {detail.passed ? '· aprovado' : '· não aprovado'}
                </span>
              </div>
              {detail.results?.length ? (
                <ul className="flex flex-col gap-1">
                  {detail.results.map((r) => (
                    <li key={r.checkId} className="flex items-start gap-2 text-xs">
                      <span className={r.passed ? 'text-success' : 'text-destructive'} aria-hidden>
                        {r.passed ? '✓' : '✗'}
                      </span>
                      <span className="min-w-0 flex-1">
                        {r.checkId}
                        {r.message ? ` — ${r.message}` : ''}
                      </span>
                      <span className="shrink-0 text-muted-foreground">
                        {r.verifiedBy === 'server' ? 'servidor' : 'cliente'}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </Card>
          ) : null}

          {/* key por aluno: remonta o editor (re-semeia) ao trocar de entrega. */}
          <StudioEmbed
            key={userId}
            initialProject={detail.project}
            handleRef={viewerRef}
            className={maximized ? 'h-[75dvh]' : 'h-[32rem]'}
            features={{
              terminal: false,
              ai: false,
              professional: false,
              export: false,
              extensions: false,
            }}
          />
        </div>
      )}
    </Dialog>
  )
}
