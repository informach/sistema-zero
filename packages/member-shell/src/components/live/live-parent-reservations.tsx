'use client'
import type { LiveCatalogView } from '@sistemazero/core/live'
import { Button } from '@sistemazero/ui'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { liveRequest } from '../../lib/live/client'

export function LiveParentReservations({
  catalog,
  onAssigned,
}: {
  catalog: LiveCatalogView
  onAssigned(): void
}) {
  const [profiles, setProfiles] = useState<{ id: string; name: string }[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    liveRequest<{ profiles: { id: string; name: string }[] }>(
      '/api/profiles',
      undefined,
      'GET',
      controller.signal,
    )
      .then((result) => setProfiles(result.profiles))
      .catch((cause) => {
        if (!controller.signal.aborted) setError(cause.message)
      })
    return () => controller.abort()
  }, [])
  const pending = catalog.enrollments.filter((item) => item.status === 'active' && !item.learnerId)
  if (!pending.length) return null
  return (
    <section className="space-y-3 rounded-2xl border bg-card p-5">
      <h2 className="sz-display text-xl font-bold">Quem vai participar?</h2>
      <p className="text-sm text-muted-foreground">
        Escolha o perfil da criança para cada vaga reservada.
      </p>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {pending.map((enrollment) => (
        <form
          key={enrollment.id}
          className="flex flex-wrap items-end gap-3 rounded-xl border p-3"
          onSubmit={async (event) => {
            event.preventDefault()
            const learnerId = String(new FormData(event.currentTarget).get('learnerId'))
            setBusy(enrollment.id)
            setError(null)
            try {
              await liveRequest(`/api/parents/live/enrollments/${enrollment.id}/assign`, {
                learnerId,
              })
              onAssigned()
            } catch (cause) {
              setError(
                cause instanceof Error ? cause.message : 'Não foi possível vincular o perfil.',
              )
            } finally {
              setBusy(null)
            }
          }}
        >
          <label className="flex min-w-48 flex-1 flex-col gap-2 text-sm font-bold">
            {catalog.cohorts.find((item) => item.id === enrollment.cohortId)?.title ?? 'Oficina'}
            <select
              name="learnerId"
              required
              disabled={busy !== null}
              defaultValue=""
              className="min-h-11 rounded-lg border bg-background p-2"
            >
              <option value="" disabled>
                Escolha uma criança
              </option>
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name}
                </option>
              ))}
            </select>
          </label>
          <Button type="submit" disabled={busy !== null || !profiles.length}>
            {busy === enrollment.id ? 'Salvando…' : 'Confirmar participante'}
          </Button>
        </form>
      ))}
      <Link href="/pais/nova-crianca" className="inline-block font-bold text-primary underline">
        Criar um perfil para a criança
      </Link>
    </section>
  )
}
