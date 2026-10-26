'use client'

import { useRouter } from 'next/navigation'
import { useId, useState } from 'react'
import { type ApiError, apiSend } from '../lib/api'
import type { CreatorJourneySkin } from '../lib/creator-journey-presentation'
import type { CreatorMasteryEvidenceResponse, CreatorMasterySubmission } from '../lib/mastery'

export function MasterySubmission({
  areaId,
  level,
  evidence,
  evidenceUnavailable = false,
  current,
  hasAccess,
  available = true,
  skin,
}: {
  areaId: string
  level: number
  evidence: CreatorMasteryEvidenceResponse['evidence']
  evidenceUnavailable?: boolean
  current: CreatorMasterySubmission | null
  hasAccess: boolean
  available?: boolean
  skin: CreatorJourneySkin
}) {
  const router = useRouter()
  const inputId = useId()
  const [evidenceId, setEvidenceId] = useState('')
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)
  const [sentId, setSentId] = useState<string | null>(null)
  const [reviewedEvidenceIds, setReviewedEvidenceIds] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const availableEvidence = evidence.filter(
    (item) => item.id !== current?.evidenceId && !reviewedEvidenceIds.includes(item.id),
  )
  const selectionAvailable = availableEvidence.some((item) => item.id === evidenceId)
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!selectionAvailable || pending || !hasAccess || !available) return
    setPending(true)
    setError(null)
    try {
      const response = await apiSend<CreatorMasterySubmission>(
        `/api/members/journey/masteries/${encodeURIComponent(areaId)}/levels/${level}/submissions`,
        'POST',
        { evidenceId, ...(message.trim() ? { message: message.trim() } : {}) },
      )
      if (response?.status === 'pending') {
        setSentId(response.id)
      } else if (response?.status === 'approved' || response?.status === 'changes-requested') {
        setReviewedEvidenceIds((ids) => [...ids, evidenceId])
        setEvidenceId('')
        setError(
          response.status === 'approved'
            ? 'Esta versão já foi aprovada. Para uma nova avaliação, salve e escolha outra versão do projeto.'
            : 'Esta versão já foi avaliada. Faça os ajustes, salve uma nova versão e escolha essa nova versão para enviar.',
        )
      } else {
        throw new Error(
          'Não foi possível confirmar o envio. Consulte a página antes de tentar novamente.',
        )
      }
      router.refresh()
    } catch (cause) {
      setError(
        (cause as ApiError).message ||
          'Não foi possível enviar agora. Sua seleção continua aqui para tentar novamente.',
      )
    } finally {
      setPending(false)
    }
  }
  return (
    <div className="space-y-5 border-t border-border pt-5">
      {current ? (
        <section className="space-y-3" aria-label="Última entrega">
          <p className="font-bold">
            {current.status === 'approved'
              ? 'Projeto aprovado'
              : current.status === 'changes-requested'
                ? 'Ajustes pedidos pela equipe'
                : 'Sua entrega está com a equipe'}
          </p>
          <p className="text-sm text-muted-foreground">
            {current.evidenceTitle} · enviado em{' '}
            {new Date(current.submittedAt).toLocaleDateString('pt-BR', {
              timeZone: 'America/Sao_Paulo',
            })}
          </p>
          {current.feedback ? <p className="whitespace-pre-wrap">{current.feedback}</p> : null}
          {current.criteria
            .filter((criterion) => criterion.feedback)
            .map((criterion) => (
              <p key={criterion.criterionId} className="text-sm">
                <strong>{criterion.result === 'approved' ? 'Aprovado: ' : 'Para revisar: '}</strong>
                {criterion.feedback}
              </p>
            ))}
          {current.credits.length ? (
            <p className="text-sm text-muted-foreground">
              A equipe registrou créditos por conhecimentos demonstrados neste projeto. Eles
              aparecem no progresso acima.
            </p>
          ) : null}
        </section>
      ) : null}
      {sentId && (current?.id !== sentId || current.status === 'pending') ? (
        <p role="status" className="font-semibold text-primary">
          Versão enviada. A equipe vai avaliar o projeto pelos critérios deste nível.
        </p>
      ) : !hasAccess ? (
        <p role="status">O envio de projetos precisa de acesso ativo à comunidade.</p>
      ) : !available ? (
        <p role="status">
          Conclua o par de entrada e o nível anterior desta área para enviar um projeto deste nível.
        </p>
      ) : current?.status === 'pending' ? (
        <p className="text-sm text-muted-foreground">
          Você pode continuar aprendendo enquanto aguarda o retorno.
        </p>
      ) : evidenceUnavailable ? (
        <p role="status">
          Não foi possível consultar suas versões salvas agora. Reabra esta página para tentar
          novamente.
        </p>
      ) : availableEvidence.length === 0 ? (
        <div className="space-y-2">
          <p className="font-semibold">
            {current || reviewedEvidenceIds.length
              ? 'Salve uma nova versão para enviar novamente.'
              : 'Seu projeto será enviado por uma versão salva.'}
          </p>
          <p className="text-sm text-muted-foreground">
            {current || reviewedEvidenceIds.length
              ? 'Volte ao projeto nas aulas, faça os ajustes e registre outra versão. Mudar apenas o recado não cria uma nova entrega.'
              : 'Conclua uma parte prática com projeto nas aulas para registrar uma evidência. Depois volte aqui para escolher a versão que quer apresentar.'}
          </p>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <label className="grid gap-2 font-semibold" htmlFor={inputId}>
            Escolha uma versão salva do seu projeto
            <select
              id={inputId}
              required
              disabled={pending}
              value={evidenceId}
              onChange={(event) => {
                setEvidenceId(event.target.value)
                setError(null)
              }}
              className="min-h-12 w-full rounded-xl border border-border bg-background px-3 py-2 font-normal text-foreground"
            >
              <option value="">Selecione o projeto e a data</option>
              {availableEvidence.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title} ·{' '}
                  {new Date(item.createdAt).toLocaleString('pt-BR', {
                    timeZone: 'America/Sao_Paulo',
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 font-semibold">
            O que você quer mostrar à equipe?{' '}
            <span className="text-sm font-normal text-muted-foreground">
              Opcional. Explique suas escolhas ou peça validação do que você já sabe.
            </span>
            <textarea
              value={message}
              maxLength={1000}
              disabled={pending}
              onChange={(event) => setMessage(event.target.value)}
              rows={3}
              className="w-full resize-y rounded-xl border border-border bg-background p-3 font-normal text-foreground"
            />
          </label>
          <p className="text-sm text-muted-foreground">
            O envio guarda esta versão. Alterar o jogo depois não modifica a entrega. Uma nova
            versão pode ser enviada após o retorno da equipe.
          </p>
          <button
            type="submit"
            disabled={pending || !selectionAvailable}
            className={`${skin === 'kids' ? 'sz-btn-gradient px-6' : 'sz-btn'} disabled:cursor-not-allowed disabled:opacity-60`}
          >
            {pending
              ? 'Enviando versão…'
              : current
                ? 'Enviar nova versão'
                : 'Enviar projeto para avaliação'}
          </button>
        </form>
      )}
      {error ? (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}
