'use client'

import {
  STUDY_DURATIONS,
  type StudyDuration,
  type StudyGrantView,
  studyGrantSchema,
} from '@sistemazero/member-shell/lib/study-access'
import { Button } from '@sistemazero/ui/button'
import { Input } from '@sistemazero/ui/input'
import { Field } from '@sistemazero/ui/label'
import { Ban, CalendarX, Clock, Monitor, Plus, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { z } from 'zod'
import { cn } from '@/lib/cn'
import {
  CONNECTION_MESSAGE,
  StudyRequestError,
  studyErrorMessage,
  studyRequest,
} from '@/lib/study-access-client'
import {
  accessEndPreviewPhrase,
  formatAccessDate,
  formatAccessEnd,
  GRANT_STATE_LABEL,
  type GrantState,
  grantIsLive,
  grantState,
} from '@/lib/study-access-view'
import {
  DurationSelect,
  RenameAccessDialog,
  RenewAccessDialog,
  RevokeAccessDialog,
} from './study-access-dialogs'
import { AccessCodeResult, ChildJoinedNotice, CurrentDeviceReady } from './study-access-result'

type CodeView = { code: string; codeExpiresAt: string }

const STATE_STYLE: Record<GrantState, { className: string; icon: typeof ShieldCheck }> = {
  active: { className: 'bg-primary/10 text-primary', icon: ShieldCheck },
  expiring: { className: 'bg-(--band-amarelo) text-foreground', icon: Clock },
  expired: { className: 'bg-muted text-muted-foreground', icon: CalendarX },
  revoked: { className: 'bg-muted text-muted-foreground', icon: Ban },
}

export function GrantStateChip({ state }: { state: GrantState }) {
  const { className, icon: Icon } = STATE_STYLE[state]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold',
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {GRANT_STATE_LABEL[state]}
    </span>
  )
}

/** O que muda quando um código é usado (o último uso fica de fora: muda a cada entrada). */
function grantSignature(grant: StudyGrantView): string {
  return `${grant.expiresAt}|${grant.revokedAt ?? ''}`
}

function grantLine(grant: StudyGrantView, state: GrantState): string {
  if (state === 'revoked') return 'Para usar de novo, clique em Autorizar aparelho outra vez.'
  if (state === 'expired') return `O acesso terminou em ${formatAccessEnd(grant.expiresAt)}.`
  if (state === 'expiring')
    return `Pode entrar até ${formatAccessEnd(grant.expiresAt)}. Renove para não interromper.`
  return `Pode entrar até ${formatAccessEnd(grant.expiresAt)}.`
}

export function StudyDeviceManager({
  profileId,
  name,
  accountId,
  onGrants,
  studentDestination,
}: {
  profileId: string
  name: string
  accountId: string
  /** A lista real a cada leitura: o cartão da criança e o guia dos pais seguem ela. */
  onGrants: (profileId: string, grants: StudyGrantView[]) => void
  /** Entrada do aluno depois da troca segura (com o `next` de uma fase, quando houver). */
  studentDestination?: string
}) {
  const [grants, setGrants] = useState<StudyGrantView[] | null>(null)
  const [adding, setAdding] = useState(false)
  const [mode, setMode] = useState<'current' | 'code'>('code')
  const [label, setLabel] = useState('Computador de casa')
  const [duration, setDuration] = useState<StudyDuration>(90)
  const [prepared, setPrepared] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [reauth, setReauth] = useState(false)
  const [code, setCode] = useState<CodeView | null>(null)
  const [codeExpired, setCodeExpired] = useState(false)
  const [checkedWithoutEntry, setCheckedWithoutEntry] = useState(false)
  const [joined, setJoined] = useState<StudyGrantView | null>(null)
  const [currentReady, setCurrentReady] = useState<StudyGrantView | null>(null)
  const [revoking, setRevoking] = useState<StudyGrantView | null>(null)
  const [renewing, setRenewing] = useState<StudyGrantView | null>(null)
  const [renaming, setRenaming] = useState<StudyGrantView | null>(null)
  /**
   * Como estavam as autorizações quando o código foi gerado. A da criança é a que aparece OU
   * muda de prazo: reautorizar o mesmo perfil no mesmo navegador conserva o id no Auth.
   */
  const codeBaseline = useRef<Map<string, string> | null>(null)
  const draftKey = `sz:access-draft:${accountId}:${profileId}`
  const clearDraft = useCallback(() => {
    try {
      sessionStorage.removeItem(draftKey)
    } catch {
      /* Não contém segredos. */
    }
  }, [draftKey])
  const load = useCallback(async () => {
    const result = await studyRequest<unknown>(
      `/api/study/grants?profileId=${profileId}`,
      undefined,
      'GET',
    )
    const view = z.object({ grants: z.array(studyGrantSchema) }).safeParse(result)
    if (!view.success) throw new StudyRequestError('INVALID_RESPONSE', CONNECTION_MESSAGE)
    setGrants(view.data.grants)
    onGrants(profileId, view.data.grants)
    const baseline = codeBaseline.current
    if (!baseline) return false
    const entered = view.data.grants.find(
      (grant) => grantIsLive(grant) && baseline.get(grant.id) !== grantSignature(grant),
    )
    if (!entered) return false
    // A criança entrou: o código já foi usado e sai da tela.
    codeBaseline.current = null
    setCode(null)
    setCheckedWithoutEntry(false)
    setJoined(entered)
    return true
  }, [profileId, onGrants])
  useEffect(() => {
    let cancelled = false
    void Promise.all([load(), studyRequest('/api/study/prepare', {})])
      .then(() => {
        if (!cancelled) setPrepared(true)
      })
      .catch(() => {
        if (!cancelled) setError('Não conseguimos buscar os aparelhos. Tente novamente.')
      })
    try {
      // O rascunho existe para sobreviver ao "entre novamente como responsável".
      const draft = z
        .object({
          mode: z.enum(['current', 'code']),
          label: z.string(),
          duration: z.union([z.literal(0), z.literal(7), z.literal(30), z.literal(90)]),
        })
        .safeParse(JSON.parse(sessionStorage.getItem(draftKey) ?? 'null'))
      if (draft.success) {
        setMode(draft.data.mode)
        setLabel(draft.data.label)
        setDuration(draft.data.duration)
        setAdding(true)
      }
    } catch {
      /* Rascunho opcional, sem códigos nem credenciais. */
    }
    return () => {
      cancelled = true
    }
  }, [draftKey, load])
  useEffect(() => {
    if (!code) return
    const check = () => setCodeExpired(Date.now() >= new Date(code.codeExpiresAt).getTime())
    check()
    const timer = window.setInterval(check, 1_000)
    return () => window.clearInterval(timer)
  }, [code])
  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError('')
    setReauth(false)
    try {
      await action()
    } catch (err) {
      setRevoking(null)
      setRenewing(null)
      setRenaming(null)
      setError(studyErrorMessage(err))
      setReauth(err instanceof StudyRequestError && err.code === 'PARENT_REAUTH_REQUIRED')
    } finally {
      setBusy(false)
    }
  }
  async function create() {
    try {
      sessionStorage.setItem(draftKey, JSON.stringify({ mode, label, duration }))
    } catch {
      /* Sem storage, o formulário atual continua disponível. */
    }
    await run(async () => {
      const result = await studyRequest<{
        code?: string
        codeExpiresAt?: string
        grant?: StudyGrantView
      }>('/api/study/grants', { profileId, label, durationDays: duration, mode })
      setJoined(null)
      setCheckedWithoutEntry(false)
      if (result.code && result.codeExpiresAt) {
        codeBaseline.current = new Map(
          (grants ?? []).map((grant) => [grant.id, grantSignature(grant)]),
        )
        setCode({ code: result.code, codeExpiresAt: result.codeExpiresAt })
        setCurrentReady(null)
      }
      if (result.grant) {
        codeBaseline.current = null
        setCode(null)
        setAdding(false)
        setCurrentReady(result.grant)
      }
      clearDraft()
      await load()
    })
  }
  function change(grant: StudyGrantView, body: Record<string, unknown>, after: () => void) {
    void run(async () => {
      await studyRequest(`/api/study/grants/${grant.id}`, body, 'PATCH')
      after()
      setCurrentReady(null)
      await load()
    })
  }
  const durationLabel = STUDY_DURATIONS.find((option) => option.value === duration)?.label ?? ''
  const endPhrase = accessEndPreviewPhrase(duration)
  const liveCount = grants?.filter((grant) => grantIsLive(grant)).length ?? 0
  return (
    <section
      className="w-full space-y-5 [&_button]:min-h-11 [&_button]:rounded-full"
      aria-labelledby="device-title"
    >
      <div>
        <h2 id="device-title" tabIndex={-1} className="sz-display text-2xl outline-none">
          Acesso de {name} nos aparelhos
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Escolha onde e por quanto tempo {name} pode entrar sem pedir sua senha ou o código do seu
          e-mail.
        </p>
      </div>
      {grants === null && !error ? <p role="status">Buscando aparelhos…</p> : null}
      {grants?.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border p-5">
          <Monitor className="mb-2 size-6 text-muted-foreground" aria-hidden="true" />
          <p>Ainda não há aparelho autorizado para {name}.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Seu filho já tem perfil. Falta preparar onde ele vai estudar.
          </p>
        </div>
      ) : null}
      <ul className="space-y-3">
        {grants?.map((grant) => {
          const state = grantState(grant)
          return (
            <li key={grant.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="break-words font-bold">{grant.label}</h3>
                  {grant.isCurrentDevice ? (
                    <p className="text-sm text-muted-foreground">Este navegador</p>
                  ) : null}
                </div>
                <GrantStateChip state={state} />
              </div>
              <p className="mt-3 text-sm">{grantLine(grant, state)}</p>
              {grant.lastUsedAt ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Último uso: {formatAccessDate(grant.lastUsedAt)}
                </p>
              ) : null}
              {state !== 'revoked' ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button variant="secondary" disabled={busy} onClick={() => setRenewing(grant)}>
                    Renovar prazo
                  </Button>
                  <Button variant="ghost" disabled={busy} onClick={() => setRenaming(grant)}>
                    Mudar nome
                  </Button>
                  <Button variant="ghost" disabled={busy} onClick={() => setRevoking(grant)}>
                    Encerrar acesso
                  </Button>
                </div>
              ) : null}
            </li>
          )
        })}
      </ul>
      {joined ? <ChildJoinedNotice name={name} label={joined.label} /> : null}
      {currentReady ? (
        <CurrentDeviceReady
          name={name}
          grant={currentReady}
          studentDestination={studentDestination}
        />
      ) : null}
      {!adding ? (
        <Button
          disabled={!prepared || busy}
          onClick={() => {
            setAdding(true)
            setCode(null)
            setJoined(null)
            setCurrentReady(null)
          }}
        >
          <Plus className="size-4" />
          Autorizar aparelho
        </Button>
      ) : (
        <form
          className="space-y-5 rounded-2xl border-2 border-primary bg-card p-5"
          onSubmit={(event) => {
            event.preventDefault()
            void create()
          }}
        >
          <fieldset disabled={busy}>
            <legend className="mb-2 font-bold">Onde {name} vai estudar?</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {(
                [
                  {
                    value: 'code',
                    title: 'Em outro aparelho',
                    text: 'Vou passar um código para a criança.',
                  },
                  {
                    value: 'current',
                    title: 'Neste aparelho',
                    text: 'A criança vai usar este navegador.',
                  },
                ] as const
              ).map((option) => (
                <label
                  key={option.value}
                  className={`cursor-pointer rounded-xl border-2 p-3 ${mode === option.value ? 'border-primary bg-primary/5' : 'border-border'}`}
                >
                  <span className="flex min-h-6 items-center gap-2">
                    <input
                      type="radio"
                      name="device-mode"
                      value={option.value}
                      checked={mode === option.value}
                      className="size-5"
                      onChange={() => {
                        setMode(option.value)
                        setCode(null)
                      }}
                    />
                    <strong className="text-sm">{option.title}</strong>
                  </span>
                  <span className="mt-1 block text-sm text-muted-foreground">{option.text}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <Field label="Nome do aparelho" htmlFor="device-label">
            <Input
              id="device-label"
              value={label}
              maxLength={60}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="Ex.: notebook da sala"
              disabled={busy}
              className="min-h-11"
            />
          </Field>
          <Field label="Por quanto tempo?" htmlFor="device-duration">
            <DurationSelect
              id="device-duration"
              value={duration}
              onChange={setDuration}
              disabled={busy}
              describedBy="device-end"
            />
          </Field>
          <p id="device-end" className="text-sm font-bold">
            {mode === 'code'
              ? `Se o código for usado hoje, termina ${endPhrase}.`
              : `Termina ${endPhrase}.`}
          </p>
          <p className="text-sm text-muted-foreground">
            No computador de casa, 90 dias evita novos pedidos de ajuda por mais tempo. Em um
            aparelho emprestado, prefira somente hoje. Você pode encerrar antes.
          </p>
          <div className="rounded-xl bg-(--band-creme) p-4 text-sm" aria-live="polite">
            <p className="font-bold">Resumo</p>
            <dl className="mt-2 grid gap-1 sm:grid-cols-[auto_1fr] sm:gap-x-4">
              <dt className="text-muted-foreground">Criança</dt>
              <dd>{name}</dd>
              <dt className="text-muted-foreground">Aparelho</dt>
              <dd className="break-words">{label.trim() || 'Sem nome ainda'}</dd>
              <dt className="text-muted-foreground">Prazo</dt>
              <dd>
                {durationLabel}, termina {endPhrase}
                {mode === 'code' ? ' (contando a partir do uso do código)' : ''}
              </dd>
            </dl>
          </div>
          <div className="flex flex-wrap gap-2 [&_button]:px-4">
            <Button type="submit" disabled={busy || !prepared || label.trim().length < 2}>
              {busy
                ? 'Preparando…'
                : mode === 'code'
                  ? code
                    ? 'Gerar outro código'
                    : 'Gerar código'
                  : 'Autorizar este aparelho'}
            </Button>
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => {
                // Cancelar descarta o rascunho: ele não pode reabrir o formulário depois.
                clearDraft()
                codeBaseline.current = null
                setAdding(false)
                setCode(null)
                setCheckedWithoutEntry(false)
              }}
            >
              Cancelar
            </Button>
          </div>
        </form>
      )}
      {code ? (
        <AccessCodeResult
          name={name}
          code={code.code}
          expired={codeExpired}
          busy={busy}
          checkedWithoutEntry={checkedWithoutEntry}
          onCopyFailed={() => setError('Não deu para copiar sozinho. Selecione o texto e copie.')}
          onCheck={() =>
            void run(async () => {
              setCheckedWithoutEntry(!(await load()))
            })
          }
        />
      ) : null}
      {liveCount > 0 ? (
        <p className="flex items-start gap-2 text-sm">
          <ShieldCheck className="size-5 shrink-0 text-primary" aria-hidden="true" />
          Acesso preparado. No aparelho autorizado, {name} escolhe Eu sou criador(a) e clica no
          próprio perfil para continuar até o prazo terminar.
        </p>
      ) : null}
      <p className="text-xs text-muted-foreground">
        Cada navegador conta como um aparelho. Limpar os cookies ou usar uma janela anônima pode
        exigir outro código. A autorização deste filho não libera os irmãos.
      </p>
      <p className="text-xs text-muted-foreground">
        Este prazo permite entrar sem pedir um código. Ele não altera a validade dos cursos ou da
        assinatura.
      </p>
      {error ? (
        <div role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm">
          <p>{error}</p>
          {reauth ? (
            <Link
              href={`/login/responsavel?child=${profileId}`}
              className="mt-2 inline-flex min-h-11 items-center font-bold underline"
            >
              Entrar novamente como responsável
            </Link>
          ) : !prepared || grants === null ? (
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await Promise.all([load(), studyRequest('/api/study/prepare', {})])
                  setPrepared(true)
                })
              }
            >
              Tentar novamente
            </Button>
          ) : null}
        </div>
      ) : null}
      <RevokeAccessDialog
        grant={revoking}
        name={name}
        busy={busy}
        onCancel={() => setRevoking(null)}
        onConfirm={() => {
          if (revoking) change(revoking, { action: 'revoke' }, () => setRevoking(null))
        }}
      />
      <RenewAccessDialog
        key={`renew-${renewing?.id ?? 'none'}`}
        grant={renewing}
        name={name}
        busy={busy}
        onCancel={() => setRenewing(null)}
        onConfirm={(durationDays) => {
          if (renewing) change(renewing, { action: 'renew', durationDays }, () => setRenewing(null))
        }}
      />
      <RenameAccessDialog
        key={`rename-${renaming?.id ?? 'none'}`}
        grant={renaming}
        busy={busy}
        onCancel={() => setRenaming(null)}
        onConfirm={(newLabel) => {
          if (renaming)
            change(renaming, { action: 'rename', label: newLabel }, () => setRenaming(null))
        }}
      />
    </section>
  )
}
