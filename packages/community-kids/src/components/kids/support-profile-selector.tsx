'use client'

import { ImpersonationBanner } from '@sistemazero/member-shell/components/impersonation-banner'
import { UserAvatar } from '@sistemazero/member-shell/components/user-avatar'
import { useState } from 'react'
import { studyRequest } from '@/lib/study-access-client'

/** Seleção exclusiva do suporte; não cria códigos nem autorizações no navegador. */
export function SupportProfileSelector({
  profiles,
  actorName,
  familyName,
  mode,
}: {
  profiles: { id: string; name: string }[]
  actorName: string
  familyName: string
  mode: 'readonly' | 'write'
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function select(profileId: string) {
    setBusy(true)
    setError('')
    try {
      await studyRequest(`/api/profiles/${profileId}/select`, {})
      window.location.assign('/')
    } catch {
      setError('Não foi possível abrir esse perfil. Tente novamente.')
      setBusy(false)
    }
  }
  return (
    <section className="w-full space-y-6">
      <ImpersonationBanner studentName={familyName} actorName={actorName} mode={mode} />
      <h1 className="sz-display text-3xl">Escolha o perfil para conferir</h1>
      <p className="text-muted-foreground">
        Você está em uma sessão de suporte. Escolher um perfil não autoriza este aparelho para a
        família.
      </p>
      {profiles.length === 0 ? <p>Esta família ainda não tem perfis cadastrados.</p> : null}
      <ul className="kids-grade-centrada [--grade-vao:0.75rem] sm:[--grade-colunas:2]">
        {profiles.map((profile) => (
          <li key={profile.id}>
            <button
              type="button"
              disabled={busy}
              onClick={() => void select(profile.id)}
              className="kid-pop flex min-h-32 w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-border bg-card p-4 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-ring"
            >
              <UserAvatar firstName={profile.name} size="xl" />
              <strong>{profile.name}</strong>
            </button>
          </li>
        ))}
      </ul>
      {error ? (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      ) : null}
    </section>
  )
}
