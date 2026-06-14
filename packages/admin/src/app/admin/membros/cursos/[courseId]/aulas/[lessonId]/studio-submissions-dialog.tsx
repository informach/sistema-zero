'use client'

import type { Project, StudioHandle } from '@sistemazero/studio'
import { Button } from '@sistemazero/ui/button'
import { Card } from '@sistemazero/ui/card'
import { Dialog } from '@sistemazero/ui/dialog'
import { Spinner } from '@sistemazero/ui/spinner'
import { ArrowLeft, Download } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { StudioEmbed } from '@/components/studio/studio-embed'
import { type ApiError, apiGet } from '@/lib/api'
import type { StudioSubmissionDetailView, StudioSubmissionRow } from '@/lib/types'

interface Props {
  blockId: string
  open: boolean
  onClose: () => void
}

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

/**
 * Acompanhamento das entregas do bloco Estúdio: lista quem entregou (+ quando) e
 * abre o projeto de cada aluno num Estúdio embutido para inspecionar — ou baixa o
 * `.szproject.json` (importável em qualquer Estúdio). Sem nota (decisão do produto).
 */
export function StudioSubmissionsDialog({ blockId, open, onClose }: Props) {
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<StudioSubmissionRow[]>([])
  const [selected, setSelected] = useState<{ row: StudioSubmissionRow; project: Project } | null>(
    null,
  )
  const [opening, setOpening] = useState<string | null>(null)
  // Handle exigido pelo StudioEmbed; na inspeção é só leitura (não usamos getProject).
  const viewerRef = useRef<StudioHandle | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiGet<{ submissions: StudioSubmissionRow[] }>(
        `/api/members/blocks/${blockId}/studio-submissions`,
      )
      setRows(res.submissions)
    } catch (err) {
      toast.error((err as ApiError).message ?? 'Falha ao carregar as entregas.')
    } finally {
      setLoading(false)
    }
  }, [blockId])

  useEffect(() => {
    if (open) {
      setSelected(null)
      void load()
    }
  }, [open, load])

  const openSubmission = useCallback(
    async (row: StudioSubmissionRow) => {
      setOpening(row.userId)
      try {
        const res = await apiGet<StudioSubmissionDetailView>(
          `/api/members/blocks/${blockId}/studio-submissions/${row.userId}`,
        )
        setSelected({ row, project: res.project })
      } catch (err) {
        toast.error((err as ApiError).message ?? 'Falha ao abrir a entrega.')
      } finally {
        setOpening(null)
      }
    },
    [blockId],
  )

  const studentName = (r: StudioSubmissionRow) => r.name ?? r.email ?? r.userId

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={selected ? `Entrega de ${studentName(selected.row)}` : 'Entregas do Estúdio'}
      onBack={selected ? () => setSelected(null) : undefined}
    >
      {selected ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Enviado em {new Date(selected.row.submittedAt).toLocaleString('pt-BR')}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadProjectJson(selected.project)}
            >
              <Download className="size-4" /> Baixar .szproject.json
            </Button>
          </div>
          {/* key por aluno: remonta o editor (re-semeia) ao trocar de entrega. */}
          <StudioEmbed
            key={selected.row.userId}
            initialProject={selected.project}
            handleRef={viewerRef}
            features={{
              terminal: false,
              ai: false,
              professional: false,
              export: false,
              extensions: false,
            }}
          />
        </div>
      ) : loading ? (
        <Card className="py-8 text-center text-muted-foreground">
          <Spinner className="mx-auto" />
        </Card>
      ) : rows.length === 0 ? (
        <Card className="py-8 text-center text-sm text-muted-foreground">
          Nenhum aluno enviou o projeto desta atividade ainda.
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((r) => (
            <Card key={r.userId} className="flex items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{studentName(r)}</div>
                <div className="truncate text-xs text-muted-foreground">
                  Enviado em {new Date(r.submittedAt).toLocaleString('pt-BR')}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => openSubmission(r)}
                disabled={opening !== null}
              >
                {opening === r.userId ? <Spinner /> : <ArrowLeft className="size-4 rotate-180" />}
                Abrir no estúdio
              </Button>
            </Card>
          ))}
        </div>
      )}
    </Dialog>
  )
}
