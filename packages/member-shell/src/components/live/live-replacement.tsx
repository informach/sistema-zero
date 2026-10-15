'use client'
import type { LiveRoomView } from '@sistemazero/core/live'
import { Button, Input } from '@sistemazero/ui'
import { useId, useState } from 'react'
import { liveRequest } from '../../lib/live/client'

/** Confere as datas da reposição antes de ir ao servidor, com a frase que a professora entende. */
export function replacementError(
  start: string,
  end: string,
  extension: string,
  now = Date.now(),
): string | null {
  const startsAt = Date.parse(start)
  const endsAt = Date.parse(end)
  if (!Number.isFinite(startsAt) || !Number.isFinite(endsAt))
    return 'Informe o início e o fim da reposição.'
  if (startsAt < now) return 'A reposição precisa começar daqui para a frente.'
  if (endsAt <= startsAt) return 'O fim da chamada precisa ser depois do início.'
  if (endsAt - startsAt > 4 * 3_600_000) return 'A reposição pode durar até quatro horas.'
  if (extension) {
    const until = Date.parse(extension)
    if (!Number.isFinite(until)) return 'Confira o novo fim de acesso.'
    if (until <= endsAt) return 'O novo fim de acesso precisa ser depois da reposição.'
  }
  return null
}

export function LiveReplacement({ room, onUpdated }: { room: LiveRoomView; onUpdated(): void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const errorId = useId()
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const cancelled = room.occurrence?.state === 'cancelled'
  return (
    <details className="rounded-xl border bg-card p-4" open={cancelled || undefined}>
      <summary className="flex min-h-11 cursor-pointer items-center font-semibold">
        Agendar reposição
      </summary>
      <form
        className="mt-4 space-y-4"
        aria-describedby={error ? errorId : undefined}
        onSubmit={async (event) => {
          event.preventDefault()
          const data = new FormData(event.currentTarget)
          const start = String(data.get('start') ?? '')
          const end = String(data.get('end') ?? '')
          const extension = String(data.get('extension') ?? '')
          const invalid = replacementError(start, end, extension)
          setDone(false)
          if (invalid) {
            setError(invalid)
            return
          }
          setBusy(true)
          setError(null)
          try {
            await liveRequest(`/api/admin/live/sessions/${room.session.id}/occurrences`, {
              expectedVersion: room.occurrence?.version,
              startsAt: new Date(start).toISOString(),
              endsAt: new Date(end).toISOString(),
              ...(extension ? { extendAccessUntil: new Date(extension).toISOString() } : {}),
            })
            setDone(true)
            onUpdated()
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Não foi possível agendar.')
          } finally {
            setBusy(false)
          }
        }}
      >
        <p className="text-sm text-muted-foreground">
          O encontro anterior fica no histórico. O acesso de cada criança continua com o prazo
          original, a menos que você informe um novo fim de acesso. Datas no fuso deste computador (
          {zone}); a turma usa o fuso {room.cohort.timeZone}.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium">
            Início
            <Input type="datetime-local" name="start" required disabled={busy} />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Fim da chamada
            <Input type="datetime-local" name="end" required disabled={busy} />
          </label>
        </div>
        <label className="grid gap-2 text-sm font-medium">
          Novo fim de acesso (opcional)
          <Input type="datetime-local" name="extension" disabled={busy} />
        </label>
        {error ? (
          <p id={errorId} role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        {done ? (
          <p role="status" className="text-sm">
            Reposição agendada. A turma vê a nova data na agenda.
          </p>
        ) : null}
        <Button className="min-h-11 px-4" type="submit" disabled={busy}>
          {busy ? 'Agendando…' : 'Agendar reposição'}
        </Button>
      </form>
    </details>
  )
}
