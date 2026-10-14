'use client'
import type { LiveRoomView } from '@sistemazero/core/live'
import { Button, Input } from '@sistemazero/ui'
import { useState } from 'react'
import { liveRequest } from '../../lib/live/client'

export function LiveReplacement({ room, onUpdated }: { room: LiveRoomView; onUpdated(): void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  return (
    <details className="rounded-2xl border bg-card p-4">
      <summary className="min-h-11 cursor-pointer font-bold">Agendar reposição</summary>
      <form
        className="mt-4 space-y-4"
        onSubmit={async (event) => {
          event.preventDefault()
          setBusy(true)
          setError(null)
          const data = new FormData(event.currentTarget)
          try {
            const extension = String(data.get('extension') ?? '')
            await liveRequest(`/api/admin/live/sessions/${room.session.id}/occurrences`, {
              expectedVersion: room.occurrence?.version,
              startsAt: new Date(String(data.get('start'))).toISOString(),
              endsAt: new Date(String(data.get('end'))).toISOString(),
              ...(extension ? { extendAccessUntil: new Date(extension).toISOString() } : {}),
            })
            onUpdated()
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Não foi possível agendar.')
          } finally {
            setBusy(false)
          }
        }}
      >
        <p className="text-sm text-muted-foreground">
          A chamada anterior fica no histórico. O acesso de cada criança permanece com o prazo
          original, a menos que você informe uma extensão. Datas no fuso deste computador:{' '}
          {Intl.DateTimeFormat().resolvedOptions().timeZone}.
        </p>
        <label className="grid gap-2 text-sm font-medium">
          Início
          <Input type="datetime-local" name="start" required disabled={busy} />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Fim da chamada
          <Input type="datetime-local" name="end" required disabled={busy} />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Novo fim de acesso (opcional)
          <Input type="datetime-local" name="extension" disabled={busy} />
        </label>
        {error ? <p role="alert">{error}</p> : null}
        <Button type="submit" disabled={busy}>
          {busy ? 'Agendando…' : 'Agendar reposição'}
        </Button>
      </form>
    </details>
  )
}
