'use client'
import type { LiveCatalogView } from '@sistemazero/core/live'
import { Button, Dialog } from '@sistemazero/ui'
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
  // A escolha da criança é definitiva para a vaga: confirmar antes (full review de 14/10/2026).
  const [confirming, setConfirming] = useState<{
    enrollmentId: string
    learnerId: string
    learnerName: string
    cohortTitle: string
  } | null>(null)
  async function assign(enrollmentId: string, learnerId: string) {
    setBusy(enrollmentId)
    setError(null)
    try {
      await liveRequest(`/api/parents/live/enrollments/${enrollmentId}/assign`, { learnerId })
      setConfirming(null)
      onAssigned()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível escolher a criança.')
    } finally {
      setBusy(null)
    }
  }
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
    <section className="kids-carta space-y-3 p-6">
      <h2 className="sz-display text-2xl">Quem vai participar?</h2>
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
          onSubmit={(event) => {
            event.preventDefault()
            const learnerId = String(new FormData(event.currentTarget).get('learnerId'))
            setConfirming({
              enrollmentId: enrollment.id,
              learnerId,
              learnerName: profiles.find((item) => item.id === learnerId)?.name ?? 'esta criança',
              cohortTitle:
                catalog.cohorts.find((item) => item.id === enrollment.cohortId)?.title ??
                'esta oficina',
            })
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
          <Button type="submit" className="min-h-11" disabled={busy !== null || !profiles.length}>
            Escolher esta criança
          </Button>
        </form>
      ))}
      <Link href="/pais/nova-crianca" className="inline-block font-bold text-primary underline">
        Criar um perfil para a criança
      </Link>
      <Dialog
        open={confirming !== null}
        onClose={() => setConfirming(null)}
        title={`${confirming?.learnerName ?? 'A criança'} vai participar de ${confirming?.cohortTitle ?? 'esta oficina'}?`}
        description="Depois de confirmar não dá para trocar a criança desta vaga. Se precisar, fale com o atendimento."
      >
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" className="min-h-11" onClick={() => setConfirming(null)}>
            Voltar
          </Button>
          <Button
            className="min-h-11"
            disabled={busy !== null}
            onClick={() => confirming && void assign(confirming.enrollmentId, confirming.learnerId)}
          >
            {busy ? 'Salvando…' : 'Confirmar'}
          </Button>
        </div>
      </Dialog>
    </section>
  )
}
