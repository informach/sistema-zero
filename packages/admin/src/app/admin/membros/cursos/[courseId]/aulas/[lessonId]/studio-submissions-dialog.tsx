'use client'

import type { Project, StudioHandle } from '@sistemazero/studio'
import { Button } from '@sistemazero/ui/button'
import { Card } from '@sistemazero/ui/card'
import { Dialog } from '@sistemazero/ui/dialog'
import { Spinner } from '@sistemazero/ui/spinner'
import { ArrowLeft, Download, MessageSquare } from 'lucide-react'
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
  const [selected, setSelected] = useState<{
    row: StudioSubmissionRow
    detail: StudioSubmissionDetailView
  } | null>(null)
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
        setSelected({ row, detail: res })
      } catch (err) {
        toast.error((err as ApiError).message ?? 'Falha ao abrir a entrega.')
      } finally {
        setOpening(null)
      }
    },
    [blockId],
  )

  // Mostra a CRIANÇA (perfil) quando a entrega veio de um perfil; senão a conta.
  // Sem nenhuma identidade hidratada (conta apagada / hidratação degradada) cai num
  // rótulo neutro — NUNCA expõe o uuid cru como "nome do aluno".
  const studentName = (r: StudioSubmissionRow) =>
    r.childName ?? r.accountName ?? r.accountEmail ?? 'Aluno sem identificação'
  // "Responsável: Nome · email" (só quando há criança/perfil por trás da entrega).
  const responsibleLabel = (r: StudioSubmissionRow) =>
    [r.accountName, r.accountEmail].filter(Boolean).join(' · ') || '—'

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={selected ? `Entrega de ${studentName(selected.row)}` : 'Entregas do Estúdio'}
      onBack={selected ? () => setSelected(null) : undefined}
      // Ao inspecionar a entrega, o Estúdio embutido precisa de largura (igual ao modal
      // de config do bloco); a lista de entregas fica num tamanho confortável de leitura.
      className={selected ? 'max-w-7xl' : 'max-w-2xl'}
    >
      {selected ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground">
              <p>Enviado em {new Date(selected.row.submittedAt).toLocaleString('pt-BR')}</p>
              {selected.row.childName ? <p>Responsável: {responsibleLabel(selected.row)}</p> : null}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadProjectJson(selected.detail.project)}
            >
              <Download className="size-4" /> Baixar .szproject.json
            </Button>
          </div>

          {/* Recado opcional que o aluno escreveu ao enviar o projeto. */}
          {selected.detail.message ? (
            <Card className="space-y-1 p-3">
              <div className="flex items-center gap-1.5 font-medium text-sm">
                <MessageSquare className="size-4" /> Recado do aluno
              </div>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                {selected.detail.message}
              </p>
            </Card>
          ) : null}

          {/* Correção automática (atividade). Sem atividade → score null, omite. */}
          {selected.detail.score !== null ? (
            <Card className="space-y-2 p-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <span>Correção automática: {selected.detail.score}/100</span>
                <span className={selected.detail.passed ? 'text-success' : 'text-destructive'}>
                  {selected.detail.passed ? '· aprovado' : '· não aprovado'}
                </span>
              </div>
              {selected.detail.results?.length ? (
                <ul className="flex flex-col gap-1">
                  {selected.detail.results.map((r) => (
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
            key={selected.row.userId}
            initialProject={selected.detail.project}
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
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">{studentName(r)}</span>
                  {r.score !== null ? (
                    <span
                      className={`shrink-0 rounded px-1.5 py-0.5 text-xs ${
                        r.passed
                          ? 'bg-success/15 text-success-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {r.score}/100
                    </span>
                  ) : null}
                </div>
                {r.childName ? (
                  <div className="truncate text-xs text-muted-foreground">
                    Responsável: {responsibleLabel(r)}
                  </div>
                ) : null}
                <div className="truncate text-xs text-muted-foreground">
                  Enviado em {new Date(r.submittedAt).toLocaleString('pt-BR')}
                </div>
                {r.message ? (
                  <div className="mt-0.5 flex items-center gap-1 text-foreground text-xs">
                    <MessageSquare className="size-3 shrink-0" /> Deixou um recado
                  </div>
                ) : null}
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
