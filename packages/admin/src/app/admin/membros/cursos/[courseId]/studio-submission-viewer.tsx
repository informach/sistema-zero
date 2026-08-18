'use client'

/**
 * A entrega do Pinta e a do Estúdio moram na MESMA tabela (`studio_submissions`), e a linha não
 * carrega o kind do bloco. O PAYLOAD discrimina: desenho tem `kind` num dos 7 tipos do Pinta;
 * projeto do Estúdio tem `files`. A régua vem do PACOTE (`isPintaAssetLike`) — copiar a lista
 * aqui seria a terceira cópia dos mesmos 7 nomes.
 */
import { isPintaAssetLike } from '@sistemazero/pinta/assets'
import type { PintaHandle } from '@sistemazero/pinta/lesson'
import type { Project, StudioHandle } from '@sistemazero/studio'
import { Button } from '@sistemazero/ui/button'
import { Card } from '@sistemazero/ui/card'
import { Dialog } from '@sistemazero/ui/dialog'
import { Spinner } from '@sistemazero/ui/spinner'
import {
  ArrowRight,
  CheckCheck,
  Download,
  History,
  Maximize2,
  MessageSquare,
  Minimize2,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { refreshProfessorCounts } from '@/components/admin/professor-counts-store'
import { useConfirm } from '@/components/admin/use-confirm'
import { PintaEmbed } from '@/components/pinta/pinta-embed'
import { StudioEmbed } from '@/components/studio/studio-embed'
import { type ApiError, apiGet, apiSend } from '@/lib/api'
import { preparePintaDownload } from '@/lib/pinta-download'
import type { StudioSubmissionDetailView, StudioSubmissionPreviousView } from '@/lib/types'
import { TeacherThreadPanel } from './teacher-thread-panel'

/** Baixa o desenho como `.pinta.json` — o mesmo envelope que a galeria do Pinta restaura. */
function downloadPintaJson(asset: unknown): void {
  const download = preparePintaDownload(asset)
  if (!download) {
    toast.error('Esta entrega não contém um desenho Pinta válido para baixar.')
    return
  }
  const blob = new Blob([download.content], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = download.filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
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
  /**
   * "Próxima pendente" (fila global): troca a entrega SEM fechar o dialog — o
   * professor corrige a fila em sequência. Opcional (a aba por-curso não passa).
   */
  onNext?: () => void
  nextLabel?: string
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
  onNext,
  nextLabel,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [detail, setDetail] = useState<StudioSubmissionDetailView | null>(null)
  const [maximized, setMaximized] = useState(false)
  // "Já conferi": o estado vive aqui (e não só no detalhe recarregado) p/ o botão
  // responder na hora — a lista atrás só recarrega quando o professor fecha.
  const [reviewed, setReviewed] = useState(false)
  const [reviewing, setReviewing] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const { confirm, confirmDialog } = useConfirm()
  // Handle exigido pelo StudioEmbed; na inspeção é só leitura (não usamos getProject).
  const viewerRef = useRef<StudioHandle | null>(null)
  // Idem para a entrega de DESENHO (o embed exige o ref; aqui ninguém lê).
  const pintaViewerRef = useRef<PintaHandle | null>(null)

  // Extraído do effect: o "Restaurar versão anterior" recarrega o detalhe sem
  // fechar o dialog. Devolve o cancelador do padrão `active`.
  const load = useCallback(() => {
    let active = true
    setLoading(true)
    apiGet<StudioSubmissionDetailView>(
      `/api/members/blocks/${blockId}/studio-submissions/${userId}`,
    )
      .then((res) => {
        if (!active) return
        setDetail(res)
        setReviewed(res.reviewed)
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
  }, [blockId, userId])

  useEffect(() => {
    if (!open) return
    setMaximized(false)
    setDetail(null)
    return load()
  }, [open, load])

  /**
   * Carimba (ou tira) o "já conferi". É o que fecha a entrega quando o aluno NÃO
   * mandou recado — não há conversa para responder. Não manda nada para a
   * criança além do selo dela na aula.
   */
  async function toggleReviewed(): Promise<void> {
    const next = !reviewed
    setReviewing(true)
    try {
      await apiSend(`/api/members/studio-submissions/${blockId}/${userId}/review`, 'POST', {
        reviewed: next,
      })
      setReviewed(next)
      toast.success(next ? 'Entrega marcada como conferida.' : 'Marcação removida.')
      // Sem isto o número de pendentes da barra lateral mente por até 60s.
      refreshProfessorCounts()
    } catch (err) {
      toast.error((err as ApiError).message ?? 'Não foi possível marcar a entrega.')
    } finally {
      setReviewing(false)
    }
  }

  /** Baixa a versão ANTERIOR (backup do reenvio) sem trocar a atual. */
  async function downloadPrevious(): Promise<void> {
    try {
      const prev = await apiGet<StudioSubmissionPreviousView>(
        `/api/members/blocks/${blockId}/studio-submissions/${userId}/previous`,
      )
      if (isPintaAssetLike(prev.project)) downloadPintaJson(prev.project)
      else downloadProjectJson(prev.project)
    } catch (err) {
      toast.error((err as ApiError).message ?? 'Não foi possível baixar a versão anterior.')
    }
  }

  /**
   * Restaura a versão anterior (TROCA atual↔anterior — reversível: restaurar de
   * novo desfaz). É o undo do professor para o reenvio acidental do template por
   * cima da entrega boa. A correção automática é zerada; o "aprovado" da criança
   * e o carimbo de conferida ficam.
   */
  function confirmRestorePrevious(): void {
    confirm({
      title: 'Restaurar a versão anterior?',
      message: (
        <>
          A entrega atual troca de lugar com a versão anterior (dá para desfazer restaurando de
          novo). A correção automática desta entrega será zerada; a aprovação da criança e o carimbo
          de conferida ficam como estão.
        </>
      ),
      confirmText: 'Restaurar',
      onConfirm: async () => {
        setRestoring(true)
        try {
          await apiSend(
            `/api/members/studio-submissions/${blockId}/${userId}/restore-previous`,
            'POST',
          )
          toast.success('Versão anterior restaurada.')
          // O swap pode fechar a pendência na fila (submitted_at volta no tempo).
          refreshProfessorCounts()
          load()
        } catch (err) {
          toast.error((err as ApiError).message ?? 'Não foi possível restaurar.')
        } finally {
          setRestoring(false)
        }
      },
    })
  }

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
              {/* Conferir + próxima é o laço da correção em sequência. */}
              <Button
                variant={reviewed ? 'outline' : 'default'}
                size="sm"
                onClick={toggleReviewed}
                disabled={reviewing}
              >
                {reviewing ? <Spinner className="size-4" /> : <CheckCheck className="size-4" />}
                {reviewed ? 'Desmarcar' : 'Marcar como conferida'}
              </Button>
              {onNext ? (
                <Button size="sm" onClick={onNext}>
                  {nextLabel ?? 'Próxima pendente'} <ArrowRight className="size-4" />
                </Button>
              ) : null}
              <Button variant="outline" size="sm" onClick={() => setMaximized((v) => !v)}>
                {maximized ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
                {maximized ? 'Restaurar' : 'Tela cheia'}
              </Button>
              {isPintaAssetLike(detail.project) ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadPintaJson(detail.project)}
                >
                  <Download className="size-4" /> Baixar .pinta.json
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadProjectJson(detail.project)}
                >
                  <Download className="size-4" /> Baixar .szproject.json
                </Button>
              )}
            </div>
          </div>

          {/* Versão ANTERIOR (backup do último reenvio): baixar/restaurar. Só
              aparece quando o members manda o timestamp (houve reenvio). */}
          {detail.previousSubmittedAt ? (
            <Card className="flex flex-wrap items-center justify-between gap-2 p-3">
              <div className="flex items-center gap-1.5 text-sm">
                <History className="size-4" aria-hidden />
                <span>
                  Versão anterior de {new Date(detail.previousSubmittedAt).toLocaleString('pt-BR')}{' '}
                  disponível
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={downloadPrevious}>
                  <Download className="size-4" /> Baixar versão anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={confirmRestorePrevious}
                  disabled={restoring}
                >
                  {restoring ? <Spinner className="size-4" /> : <History className="size-4" />}
                  Restaurar versão anterior
                </Button>
              </div>
            </Card>
          ) : null}

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

          {/* key por aluno+bloco: remonta o editor (re-semeia) ao trocar de entrega —
              inclusive via "Próxima pendente" (mesmo aluno, bloco diferente).
              ⚠️ O professor PODE mexer no desenho/projeto aberto aqui, e isso é inócuo de
              propósito: `persistence:'none'` e ninguém captura o handle na inspeção. */}
          {isPintaAssetLike(detail.project) ? (
            <PintaEmbed
              key={`${userId}:${blockId}`}
              initialAsset={detail.project as never}
              handleRef={pintaViewerRef}
              className={maximized ? 'h-[75dvh]' : 'h-[32rem]'}
            />
          ) : (
            <StudioEmbed
              key={`${userId}:${blockId}`}
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
          )}
        </div>
      )}
      {confirmDialog}
    </Dialog>
  )
}
