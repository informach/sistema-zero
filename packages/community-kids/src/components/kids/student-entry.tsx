'use client'

import { UserAvatar } from '@sistemazero/member-shell/components/user-avatar'
import type { StudyProfile } from '@sistemazero/member-shell/lib/study-access'
import { Button } from '@sistemazero/ui/button'
import { Input } from '@sistemazero/ui/input'
import { Field } from '@sistemazero/ui/label'
import { ArrowLeft, KeyRound, LockKeyhole } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  CONNECTION_ERROR,
  enterStudyProfile,
  StudyRequestError,
  studyErrorMessage,
  studyRequest,
} from '@/lib/study-access-client'
import { AUTH_CARD } from './auth-card'

/** Os links do pé com alvo de toque de 44px, sem perder a cara de link. */
const FOOT_LINK = 'inline-flex min-h-11 items-center underline underline-offset-4'

/**
 * O erro que é do CÓDIGO (fica preso ao campo, com `aria-invalid`) separado do que é da conexão
 * ou do aparelho (aviso geral): "Confira as letras" não ajuda quando a internet caiu.
 */
function isCodeProblem(error: unknown): boolean {
  return (
    error instanceof StudyRequestError &&
    error.code !== CONNECTION_ERROR &&
    error.code !== 'SERVICE_UNAVAILABLE' &&
    error.code !== 'DEVICE_NOT_READY' &&
    error.code !== 'DEVICE_OTHER_FAMILY' &&
    error.code !== 'SESSION_CHANGED'
  )
}

export function StudentEntry({
  profiles,
  unavailable = false,
  destination = '/',
}: {
  profiles: StudyProfile[]
  unavailable?: boolean
  destination?: string
}) {
  const [selected, setSelected] = useState<StudyProfile | null>(null)
  const [showCode, setShowCode] = useState(profiles.length === 0)
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [entering, setEntering] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [codeError, setCodeError] = useState('')
  const formRef = useRef<HTMLFormElement>(null)
  /** Quem abriu o campo do código: a volta para a grade devolve o foco a ele. */
  const returnFocus = useRef<string | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const prepare = useCallback(async () => {
    try {
      await studyRequest('/api/study/prepare', {})
      setReady(true)
      setError('')
    } catch {
      setError('Não conseguimos preparar o acesso. Confira a conexão e tente novamente.')
    }
  }, [])
  useEffect(() => {
    void prepare()
  }, [prepare])
  useEffect(() => {
    if (showCode && ready) formRef.current?.querySelector('input')?.focus()
  }, [showCode, ready])
  useEffect(() => {
    if (showCode || !returnFocus.current) return
    gridRef.current
      ?.querySelector<HTMLElement>(`[data-entry-focus="${returnFocus.current}"]`)
      ?.focus()
    returnFocus.current = null
  }, [showCode])
  function openCode(profile: StudyProfile | null, opener: string) {
    returnFocus.current = opener
    setSelected(profile)
    setCodeError('')
    setShowCode(true)
  }
  async function choose(profile: StudyProfile) {
    if (busy) return
    setError('')
    if (!profile.available) {
      openCode(profile, profile.id)
      return
    }
    setBusy(true)
    setEntering(profile.id)
    try {
      await enterStudyProfile(profile.id, destination)
    } catch (err) {
      setBusy(false)
      setEntering(null)
      // O prazo acabou entre abrir a página e escolher: o caminho é o código deste perfil.
      if (err instanceof StudyRequestError && err.code === 'STUDY_ACCESS_REQUIRED') {
        openCode({ ...profile, available: false }, profile.id)
        return
      }
      setError(studyErrorMessage(err))
    }
  }
  async function redeem() {
    if (busy) return
    setBusy(true)
    setError('')
    setCodeError('')
    try {
      const result = await studyRequest<{ profileId: string }>('/api/study/redeem', {
        code,
        expectedProfileId: selected?.id,
      })
      await enterStudyProfile(result.profileId, destination)
    } catch (err) {
      if (isCodeProblem(err)) setCodeError(studyErrorMessage(err))
      else setError(studyErrorMessage(err))
      setBusy(false)
    }
  }
  return (
    <section className={`${AUTH_CARD} w-full p-6 sm:p-8`} aria-labelledby="student-entry-title">
      <h1 id="student-entry-title" className="sz-display text-3xl">
        {showCode
          ? selected
            ? `Vamos entrar, ${selected.name}?`
            : 'Vamos começar?'
          : 'Quem vai criar hoje?'}
      </h1>
      {unavailable ? (
        <p role="alert" className="mt-4 text-sm">
          Não conseguimos buscar os perfis.{' '}
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex min-h-11 items-center underline"
          >
            Tentar novamente
          </button>
        </p>
      ) : null}
      {showCode ? (
        <>
          {selected ? (
            <div className="mt-4 flex items-center gap-3">
              <UserAvatar
                avatarUrl={selected.photoUrl ?? null}
                firstName={selected.name}
                size="lg"
              />
              <strong className="break-words">{selected.name}</strong>
            </div>
          ) : null}
          <p id="study-code-help" className="mt-3 text-muted-foreground">
            {selected
              ? `Digite o código para entrar como ${selected.name}. Se não tiver um, peça ao responsável.`
              : 'Peça ao seu responsável o código para entrar neste aparelho.'}{' '}
            Você só precisa dele na primeira vez, até o acesso vencer.
          </p>
          <form
            ref={formRef}
            onSubmit={(event) => {
              event.preventDefault()
              void redeem()
            }}
            className="mt-6 flex flex-col gap-4"
          >
            <Field label="Código de acesso" htmlFor="study-code" error={codeError || undefined}>
              <Input
                id="study-code"
                value={code}
                onChange={(event) => {
                  setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9 -]/g, ''))
                  setCodeError('')
                }}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                maxLength={21}
                placeholder="ABCDE-FGHJK"
                aria-describedby="study-code-help"
                className="h-14 text-center font-mono text-xl tracking-widest"
              />
            </Field>
            <Button
              type="submit"
              disabled={busy || !ready || code.replace(/[ -]/g, '').length !== 10}
              className="min-h-12 rounded-full"
            >
              {busy ? 'Entrando…' : 'Entrar para criar'}
            </Button>
          </form>
          {profiles.length > 0 ? (
            <Button
              variant="ghost"
              onClick={() => {
                setShowCode(false)
                setSelected(null)
                setCode('')
                setError('')
                setCodeError('')
              }}
              disabled={busy}
              className="mt-3 min-h-11 rounded-full"
            >
              <ArrowLeft className="size-4" />
              Voltar aos perfis
            </Button>
          ) : null}
        </>
      ) : (
        <div ref={gridRef}>
          <p className="mt-3 text-muted-foreground">Clique no seu nome para continuar.</p>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {profiles.map((profile) => (
              <li key={profile.id}>
                <button
                  type="button"
                  data-entry-focus={profile.id}
                  disabled={busy || !ready}
                  aria-busy={entering === profile.id || undefined}
                  onClick={() => void choose(profile)}
                  className="kid-pop flex min-h-32 w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-border bg-card p-4 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                >
                  <UserAvatar
                    avatarUrl={profile.photoUrl ?? null}
                    firstName={profile.name}
                    size="xl"
                  />
                  <strong className="break-words">{profile.name}</strong>
                  {profile.lastUsed ? (
                    <span className="rounded-full bg-primary/10 px-2 py-1 text-xs">
                      Último perfil usado
                    </span>
                  ) : null}
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    {entering === profile.id ? (
                      'Entrando…'
                    ) : profile.available ? (
                      'Entrar'
                    ) : (
                      <>
                        <LockKeyhole className="size-3" />
                        Pedir código
                      </>
                    )}
                  </span>
                  {profile.available &&
                  profile.expiresAt &&
                  new Date(profile.expiresAt).getTime() - Date.now() < 3 * 86400000 ? (
                    <span className="text-xs text-muted-foreground">
                      O acesso termina em{' '}
                      {new Date(profile.expiresAt).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        timeZone: 'America/Sao_Paulo',
                      })}
                      . Peça ao responsável para renovar.
                    </span>
                  ) : !profile.available && profile.expiresAt ? (
                    <span className="text-xs text-muted-foreground">
                      {profile.revoked
                        ? 'Acesso encerrado neste aparelho.'
                        : 'O prazo deste acesso terminou.'}
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
          <Button
            variant="ghost"
            data-entry-focus="code"
            className="mt-4 min-h-11 w-full rounded-full"
            onClick={() => openCode(null, 'code')}
            disabled={busy}
          >
            <KeyRound className="size-4" />
            Tenho um código
          </Button>
        </div>
      )}
      {error ? (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {!ready && error ? (
        <Button
          variant="secondary"
          className="mt-3 min-h-11 rounded-full"
          onClick={() => void prepare()}
        >
          Tentar novamente
        </Button>
      ) : null}
      <div className="mt-6 flex flex-wrap justify-center gap-x-5 text-sm">
        <Link href="/login" className={FOOT_LINK}>
          Voltar
        </Link>
        <Link href="/ajuda/entrar" className={FOOT_LINK}>
          Preciso de ajuda
        </Link>
      </div>
    </section>
  )
}
