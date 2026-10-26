'use client'
import type {
  CreatorMasteryReviewDetail,
  CreatorMasteryReviewQueue,
  MasteryReviewInput,
} from '@sistemazero/core/journey'
import { Button, buttonVariants } from '@sistemazero/ui/button'
import { Card } from '@sistemazero/ui/card'
import { Select } from '@sistemazero/ui/select'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AdminHeader } from '@/components/admin/admin-header'
import { EmptyState } from '@/components/admin/empty-state'
import { usePlatform } from '@/components/admin/platform-provider'
import { apiGet, apiSend } from '@/lib/api'
import { MasteryProjectEvidence } from './project-evidence'

type Queue = Omit<CreatorMasteryReviewQueue, 'submissions'> & {
  submissions: (CreatorMasteryReviewQueue['submissions'][number] & {
    childName: string | null
    accountName: string | null
  })[]
}
type ReviewDetail = CreatorMasteryReviewDetail & {
  childName?: string | null
  accountName?: string | null
}
/** O tom da situação: aguardando no amarelo da sala, aprovada no verde, ajustes no neutro. */
const STATUS_TONE: Record<string, string> = {
  pending: 'bg-warning-tint text-warning',
  approved: 'bg-success/15 text-success-foreground',
  'changes-requested': 'bg-muted text-foreground',
}
const labels = {
  pending: 'Aguardando revisão',
  approved: 'Entrega aprovada',
  'changes-requested': 'Ajustes pedidos',
}
const errorText = (error: unknown) =>
  error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
    ? error.message
    : 'Não foi possível concluir. Tente novamente.'

export function MasteryReviewQueue({ reviewerId }: { reviewerId: string }) {
  const platform = usePlatform()
  const [queue, setQueue] = useState<Queue | null>(null)
  const [status, setStatus] = useState('pending')
  const [offset, setOffset] = useState(0)
  const [selected, setSelected] = useState<ReviewDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const queueRequest = useRef<AbortController | null>(null)
  const detailRequest = useRef<AbortController | null>(null)
  const scope = `${platform}:${status}:${offset}`
  const activeScope = useRef(scope)
  activeScope.current = scope
  const load = useCallback(async () => {
    if (activeScope.current !== scope) return
    queueRequest.current?.abort()
    const request = new AbortController()
    queueRequest.current = request
    setError(null)
    setQueue(null)
    try {
      const result = await apiGet<Queue>(
        `/api/members/journey/masteries/submissions?audience=${platform}&status=${status}&offset=${offset}`,
        { signal: request.signal },
      )
      if (!request.signal.aborted && activeScope.current === scope) setQueue(result)
    } catch (cause) {
      if (!request.signal.aborted && activeScope.current === scope) setError(errorText(cause))
    }
  }, [platform, status, offset, scope])
  useEffect(() => {
    setSelected(null)
    setLoading(false)
    void load()
    return () => {
      queueRequest.current?.abort()
      detailRequest.current?.abort()
    }
  }, [load])
  async function open(id: string) {
    detailRequest.current?.abort()
    const request = new AbortController()
    detailRequest.current = request
    setLoading(true)
    setError(null)
    try {
      const result = await apiGet<ReviewDetail>(
        `/api/members/journey/masteries/submissions/${id}`,
        { signal: request.signal },
      )
      if (!request.signal.aborted && activeScope.current === scope) setSelected(result)
    } catch (cause) {
      if (!request.signal.aborted && activeScope.current === scope) setError(errorText(cause))
    } finally {
      if (!request.signal.aborted && activeScope.current === scope) setLoading(false)
    }
  }
  return (
    <div className="space-y-6">
      <AdminHeader
        title="Revisar Maestrias"
        description="Confira o projeto, registre o que foi demonstrado e indique o próximo passo."
        action={
          <Link
            href={
              platform === 'kids'
                ? '/admin/professor/jornada-kids'
                : '/admin/professor/jornada-adulta'
            }
            className={buttonVariants({ variant: 'outline' })}
          >
            Voltar à jornada
          </Link>
        }
      />
      {error && (
        <p
          role="alert"
          className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl bg-destructive/10 px-4 py-3 text-[15px] text-destructive"
        >
          {error}
          <button
            type="button"
            className="min-h-10 font-semibold underline"
            onClick={() => void load()}
          >
            Tentar novamente
          </button>
        </p>
      )}
      {selected ? (
        <MasteryReviewForm
          reviewerId={reviewerId}
          key={selected.submission.id}
          detail={selected}
          onBack={() => setSelected(null)}
          onSaved={() => {
            if (activeScope.current !== scope) return
            setSelected(null)
            void load()
          }}
        />
      ) : (
        <>
          <label className="flex flex-wrap items-center gap-3 font-medium text-sm">
            Mostrar
            <Select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value)
                setOffset(0)
              }}
              className="sm:w-56"
            >
              <option value="pending">Aguardando revisão</option>
              <option value="reviewed">Revisadas</option>
              <option value="all">Todas</option>
            </Select>
          </label>
          {loading && (
            <p role="status" className="text-sm text-muted-foreground">
              Abrindo a entrega…
            </p>
          )}
          {!queue && !error && (
            <p role="status" className="text-sm text-muted-foreground">
              Carregando as entregas…
            </p>
          )}
          {queue?.submissions.length === 0 && (
            <EmptyState
              title="Nenhuma entrega nesta fila"
              description="As novas entregas de Maestria aparecem aqui para avaliação pelos critérios do nível."
            />
          )}
          <div className="grid gap-4 lg:grid-cols-2">
            {queue?.submissions.map((s) => (
              <Card key={s.id} className="space-y-3 p-5">
                <p className="flex flex-wrap items-center gap-2 text-sm">
                  <span
                    className={`inline-flex h-6 items-center rounded-full px-2.5 font-semibold text-xs ${STATUS_TONE[s.status]}`}
                  >
                    {labels[s.status]}
                  </span>
                  <span className="font-semibold text-muted-foreground">Nível {s.level}</span>
                </p>
                <h2 className="font-display text-xl font-bold">{s.areaTitle}</h2>
                <p>
                  {s.childName ?? s.accountName ?? 'Estudante'} · {s.evidenceTitle}
                </p>
                <p className="text-sm text-muted-foreground">
                  Enviado em {new Date(s.submittedAt).toLocaleDateString('pt-BR')}
                </p>
                <Button disabled={loading} onClick={() => void open(s.id)}>
                  Abrir entrega
                </Button>
              </Card>
            ))}
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - 30))}
            >
              Anteriores
            </Button>
            <Button
              variant="outline"
              disabled={!queue || queue.submissions.length < 30}
              onClick={() => setOffset(offset + 30)}
            >
              Próximas
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

export function MasteryReviewForm({
  reviewerId,
  detail,
  onBack,
  onSaved,
}: {
  reviewerId: string
  detail: ReviewDetail
  onBack: () => void
  onSaved: () => void
}) {
  const readOnly = detail.submission.status !== 'pending'
  const [criteria, setCriteria] = useState<
    Record<string, { result: '' | 'approved' | 'revise'; feedback: string }>
  >(() =>
    Object.fromEntries(
      detail.definition.rubric.criteria.map((c) => {
        const reviewed = detail.submission.criteria.find((r) => r.criterionId === c.id)
        return [c.id, { result: reviewed?.result ?? '', feedback: reviewed?.feedback ?? '' }]
      }),
    ),
  )
  const [feedback, setFeedback] = useState(detail.submission.feedback ?? '')
  const [credits, setCredits] = useState<Record<string, string>>(() =>
    Object.fromEntries(detail.submission.credits.map((c) => [c.requirementId, c.reason])),
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function save() {
    const evaluated: MasteryReviewInput['criteria'] = []
    for (const criterion of detail.definition.rubric.criteria) {
      const value = criteria[criterion.id]
      if (!value?.result || (value.result === 'revise' && !value.feedback.trim())) {
        setError('Avalie todos os critérios e explique os ajustes pedidos.')
        return
      }
      evaluated.push({ criterionId: criterion.id, result: value.result, feedback: value.feedback })
    }
    if (!feedback.trim()) {
      setError('Escreva uma devolutiva para o aluno.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await apiSend(
        `/api/members/journey/masteries/submissions/${detail.submission.id}/review`,
        'POST',
        {
          criteria: evaluated,
          feedback,
          credits: Object.entries(credits)
            .filter(([, reason]) => reason.trim())
            .map(([requirementId, reason]) => ({ requirementId, reason })),
        },
      )
      onSaved()
    } catch (cause) {
      setError(errorText(cause))
    } finally {
      setSaving(false)
    }
  }
  return (
    <div className="space-y-5">
      <Button variant="outline" onClick={onBack}>
        Voltar à fila
      </Button>
      <div>
        <p className="mb-2 font-semibold">
          {detail.childName ?? detail.accountName ?? 'Estudante'} ·{' '}
          {detail.submission.evidenceTitle}
        </p>
        <h2 className="font-display text-2xl font-bold">
          {detail.areaTitle} · Nível {detail.submission.level}
        </h2>
        <p className="text-muted-foreground">
          {detail.definition.title} · Rubrica {detail.submission.rubricVersion}
        </p>
      </div>
      {detail.submission.message && (
        <Card className="p-5">
          <h3 className="font-semibold">Recado de quem criou</h3>
          <p className="whitespace-pre-wrap">{detail.submission.message}</p>
        </Card>
      )}
      <Card className="overflow-hidden">
        <div className="border-b p-4">
          <h3 className="font-semibold">Versão enviada</h3>
          <p className="text-sm text-muted-foreground">
            Confira o jogo e a construção desta versão. A evidência enviada permanece guardada.
          </p>
        </div>
        <MasteryProjectEvidence
          payload={detail.evidence.payload}
          reviewerId={reviewerId}
          submissionId={detail.submission.id}
        />
      </Card>
      <fieldset disabled={readOnly || saving} className="space-y-4">
        <legend className="mb-3 font-display text-xl font-bold">
          O que o projeto precisa demonstrar
        </legend>
        {detail.definition.rubric.criteria.map((c, i) => (
          <Card key={c.id} className="space-y-3 p-5">
            <label className="block font-semibold" htmlFor={`criterion-${i}`}>
              {i + 1}. {c.title}
            </label>
            <select
              id={`criterion-${i}`}
              value={criteria[c.id]?.result ?? ''}
              className="w-full rounded-lg border bg-card p-3"
              onChange={(e) => {
                const result = e.target.value
                if (result === '' || result === 'approved' || result === 'revise')
                  setCriteria((previous) => ({
                    ...previous,
                    [c.id]: { feedback: previous[c.id]?.feedback ?? '', result },
                  }))
              }}
            >
              <option value="">Escolha uma avaliação</option>
              <option value="approved">Demonstrou</option>
              <option value="revise">Precisa ajustar</option>
            </select>
            <label className="block text-sm" htmlFor={`feedback-${i}`}>
              Observação sobre este critério
            </label>
            <textarea
              id={`feedback-${i}`}
              maxLength={1000}
              value={criteria[c.id]?.feedback ?? ''}
              className="min-h-20 w-full rounded-lg border bg-background p-3"
              onChange={(e) =>
                setCriteria((previous) => ({
                  ...previous,
                  [c.id]: { result: previous[c.id]?.result ?? '', feedback: e.target.value },
                }))
              }
            />
          </Card>
        ))}
        <details className="rounded-xl border p-5">
          <summary className="cursor-pointer font-semibold">
            Reconhecer conhecimentos já demonstrados
          </summary>
          <p className="my-3 text-muted-foreground">
            Use apenas quando este projeto comprovar também o núcleo ou a oficina. Registre a
            evidência concreta. O crédito é concedido junto da aprovação completa.
          </p>
          {[{ id: 'nucleus', title: 'Núcleo' }, ...detail.definition.workshops].map((w) => (
            <label key={w.id} className="my-3 block">
              {w.title}
              <textarea
                placeholder="Deixe vazio se não houver equivalência. Se houver, explique o que o projeto demonstrou."
                maxLength={1000}
                value={credits[w.id] ?? ''}
                className="mt-2 min-h-20 w-full rounded-lg border bg-background p-3"
                onChange={(e) =>
                  setCredits((previous) => ({ ...previous, [w.id]: e.target.value }))
                }
              />
            </label>
          ))}
        </details>
        <label className="block font-semibold" htmlFor="mastery-feedback">
          Devolutiva para o aluno
        </label>
        <textarea
          id="mastery-feedback"
          maxLength={4000}
          className="min-h-32 w-full rounded-lg border bg-background p-3"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
        />
      </fieldset>
      <p className="text-muted-foreground">
        A entrega aprovada conquista o selo quando núcleo, duas oficinas e nível anterior também
        estiverem concluídos ou reconhecidos.
      </p>
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
      {readOnly ? (
        <p className="rounded-lg bg-muted p-4">
          Revisão registrada. Um novo envio do aluno abrirá outra revisão.
        </p>
      ) : (
        <Button disabled={saving} onClick={() => void save()}>
          {saving ? 'Registrando…' : 'Registrar avaliação'}
        </Button>
      )}
    </div>
  )
}
