'use client'

import {
  STUDY_DURATIONS,
  type StudyDuration,
  type StudyGrantView,
  studyGrantSchema,
} from '@sistemazero/member-shell/lib/study-access'
import { Input } from '@sistemazero/ui/input'
import { Field } from '@sistemazero/ui/label'
import {
  Ban,
  CalendarX,
  ChevronRight,
  Clock,
  Monitor,
  Pencil,
  Plus,
  ShieldCheck,
  Smartphone,
} from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { z } from 'zod'
import {
  OptionsMenu,
  PRIMARY_ACTION,
  SECONDARY_ACTION,
  StatusChip,
} from '@/app/pais/_components/parent-ui'
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
  DurationChips,
  RenameAccessDialog,
  RenewAccessDialog,
  RevokeAccessDialog,
} from './study-access-dialogs'
import { AccessCodeResult, ChildJoinedNotice, CurrentDeviceReady } from './study-access-result'

type CodeView = { code: string; codeExpiresAt: string }

const STATE_STYLE: Record<
  GrantState,
  { tone: 'ok' | 'attention' | 'neutral'; icon: typeof ShieldCheck }
> = {
  active: { tone: 'ok', icon: ShieldCheck },
  expiring: { tone: 'attention', icon: Clock },
  expired: { tone: 'neutral', icon: CalendarX },
  revoked: { tone: 'neutral', icon: Ban },
}

/** Onde a criança vai criar: dois cartões com ícone (os rádios continuam nativos por dentro). */
const MODE_OPTIONS = [
  {
    value: 'code',
    title: 'Em outro aparelho',
    text: 'Você gera um código e a criança digita lá.',
    icon: Smartphone,
  },
  {
    value: 'current',
    title: 'Neste aparelho',
    text: 'A criança vai usar este navegador.',
    icon: Monitor,
  },
] as const

export function GrantStateChip({ state }: { state: GrantState }) {
  const { tone, icon } = STATE_STYLE[state]
  return (
    <StatusChip tone={tone} icon={icon}>
      {GRANT_STATE_LABEL[state]}
    </StatusChip>
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
      className="grid w-full gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]"
      aria-labelledby="device-title"
    >
      <div className="flex min-w-0 flex-col gap-4">
        <div>
          <h2 id="device-title" tabIndex={-1} className="sz-display text-[1.375rem] outline-none">
            Acesso de {name} nos aparelhos
          </h2>
          <p className="mt-1 text-muted-foreground text-sm">
            Escolha onde e por quanto tempo {name} pode entrar sem pedir sua senha ou o código do
            seu e-mail.
          </p>
        </div>
        {grants === null && !error ? (
          <p role="status" className="text-muted-foreground text-sm">
            Buscando aparelhos…
          </p>
        ) : null}
        {grants?.length === 0 ? (
          <div className="flex flex-col items-start gap-2 rounded-(--raio-carta) border-2 border-(--linha-carta) border-dashed p-6">
            <Monitor className="size-7 text-muted-foreground" aria-hidden="true" />
            <p className="font-extrabold">Ainda não há aparelho autorizado para {name}.</p>
            <p className="text-muted-foreground text-sm">
              Seu filho já tem perfil. Falta preparar onde ele vai criar.
            </p>
          </div>
        ) : null}
        {grants?.length ? (
          <ul className="flex flex-col gap-3">
            {grants.map((grant) => {
              const state = grantState(grant)
              const used = [
                grant.isCurrentDevice ? 'Este navegador' : null,
                grant.lastUsedAt ? `Último uso: ${formatAccessDate(grant.lastUsedAt)}` : null,
              ].filter(Boolean)
              return (
                <li key={grant.id} className="kids-carta flex flex-col gap-3 p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="flex min-w-0 flex-1 items-center gap-4">
                      <span
                        className={cn(
                          'flex size-12 shrink-0 items-center justify-center rounded-2xl',
                          state === 'revoked' || state === 'expired'
                            ? 'bg-muted text-muted-foreground'
                            : 'bg-(--band-ceu) text-primary',
                        )}
                      >
                        <Monitor className="size-6" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="break-words font-extrabold">{grant.label}</h3>
                        <p className="text-muted-foreground text-xs">
                          {used.length ? used.join(' · ') : 'Ainda não usado'}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <GrantStateChip state={state} />
                      {state !== 'revoked' ? (
                        <div className="ml-auto flex items-center gap-1">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => setRenewing(grant)}
                            className={SECONDARY_ACTION}
                          >
                            Renovar prazo
                          </button>
                          <OptionsMenu
                            label={`Mais opções de ${grant.label}`}
                            items={[
                              {
                                label: 'Mudar nome',
                                icon: Pencil,
                                disabled: busy,
                                onSelect: () => setRenaming(grant),
                              },
                              {
                                label: 'Encerrar acesso',
                                icon: Ban,
                                tone: 'danger',
                                disabled: busy,
                                onSelect: () => setRevoking(grant),
                              },
                            ]}
                          />
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <p className="text-sm">{grantLine(grant, state)}</p>
                </li>
              )
            })}
          </ul>
        ) : null}
        {joined ? <ChildJoinedNotice name={name} label={joined.label} /> : null}
        {currentReady ? (
          <CurrentDeviceReady
            name={name}
            grant={currentReady}
            studentDestination={studentDestination}
          />
        ) : null}
        {!adding ? (
          <button
            type="button"
            className={`${PRIMARY_ACTION} self-start`}
            disabled={!prepared || busy}
            onClick={() => {
              setAdding(true)
              setCode(null)
              setJoined(null)
              setCurrentReady(null)
            }}
          >
            <Plus className="size-4" aria-hidden="true" />
            Autorizar aparelho
          </button>
        ) : (
          <form
            className="kids-carta flex flex-col gap-5 border-2 border-primary p-6"
            onSubmit={(event) => {
              event.preventDefault()
              void create()
            }}
          >
            <h3 className="sz-display text-xl">Autorizar um aparelho</h3>
            <fieldset disabled={busy}>
              <legend className="mb-2 font-bold text-sm">Onde {name} vai criar?</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {MODE_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className={cn(
                      'flex cursor-pointer flex-col gap-2 rounded-2xl border-2 p-4 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary has-[:focus-visible]:outline-offset-2',
                      mode === option.value
                        ? 'border-primary bg-(--band-ceu)'
                        : 'border-(--linha-carta) hover:border-primary/50',
                    )}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <option.icon
                        className={cn(
                          'size-7',
                          mode === option.value ? 'text-primary' : 'text-muted-foreground',
                        )}
                        aria-hidden="true"
                      />
                      <input
                        type="radio"
                        name="device-mode"
                        value={option.value}
                        checked={mode === option.value}
                        className="size-5 accent-[color:var(--primary)]"
                        onChange={() => {
                          setMode(option.value)
                          setCode(null)
                        }}
                      />
                    </span>
                    <strong>{option.title}</strong>
                    <span className="text-muted-foreground text-sm">{option.text}</span>
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
                className="min-h-11 rounded-full px-4"
              />
            </Field>
            <DurationChips
              legend="Por quanto tempo?"
              value={duration}
              onChange={setDuration}
              disabled={busy}
              describedBy="device-end"
            />
            <p id="device-end" className="font-bold text-sm">
              {mode === 'code'
                ? `Se o código for usado hoje, termina ${endPhrase}.`
                : `Termina ${endPhrase}.`}
            </p>
            <p className="text-muted-foreground text-sm">
              No computador de casa, 90 dias evita novos pedidos de ajuda por mais tempo. Em um
              aparelho emprestado, prefira somente hoje. Você pode encerrar antes.
            </p>
            <div className="rounded-2xl bg-(--band-creme) p-4 text-sm" aria-live="polite">
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
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                className={PRIMARY_ACTION}
                disabled={busy || !prepared || label.trim().length < 2}
              >
                {busy
                  ? 'Preparando…'
                  : mode === 'code'
                    ? code
                      ? 'Gerar outro código'
                      : 'Gerar código'
                    : 'Autorizar este aparelho'}
              </button>
              <button
                type="button"
                className={SECONDARY_ACTION}
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
              </button>
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
        {error ? (
          <div role="alert" className="rounded-2xl bg-destructive/10 p-4 text-sm">
            <p>{error}</p>
            {reauth ? (
              <Link
                href={`/login/responsavel?next=${encodeURIComponent(`/pais/crianca/${profileId}`)}`}
                className="mt-2 inline-flex min-h-11 items-center font-bold underline"
              >
                Entrar novamente como responsável
              </Link>
            ) : !prepared || grants === null ? (
              <button
                type="button"
                className={`${SECONDARY_ACTION} mt-2`}
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    await Promise.all([load(), studyRequest('/api/study/prepare', {})])
                    setPrepared(true)
                  })
                }
              >
                Tentar novamente
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
      <aside className="flex flex-col gap-4">
        {liveCount > 0 ? (
          <section className="flex gap-3 rounded-(--raio-carta) bg-(--band-menta) p-5 text-sm">
            <ShieldCheck
              className="mt-0.5 size-5 shrink-0 text-(--success-foreground)"
              aria-hidden="true"
            />
            <p>
              <strong>Acesso preparado.</strong> No aparelho autorizado, {name} escolhe Eu sou
              criador(a) e clica no próprio perfil para continuar até o prazo terminar.
            </p>
          </section>
        ) : null}
        <section className="kids-carta flex flex-col gap-2 p-5 text-sm">
          <h3 className="font-extrabold">Bom saber</h3>
          <p className="text-muted-foreground">
            Cada navegador conta como um aparelho. Limpar os cookies ou usar uma janela anônima pode
            exigir outro código. A autorização deste filho não libera os irmãos.
          </p>
          <p className="text-muted-foreground">
            Este prazo permite entrar sem pedir um código. Ele não altera a validade dos cursos ou
            da assinatura.
          </p>
          <Link
            href="/pais/ajuda"
            className="mt-1 inline-flex min-h-11 items-center gap-1 self-start font-bold text-primary"
          >
            Precisa de ajuda? <ChevronRight className="size-4" aria-hidden="true" />
          </Link>
        </section>
      </aside>
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
