'use client'
import { liveRequest } from '@sistemazero/member-shell/lib/live/client'
import { Button, Input } from '@sistemazero/ui'
import { useEffect, useState } from 'react'

type Choice = {
  id: string
  accountId: string
  learnerId: string | null
  name: string
  description: string
}
export function EnrollmentPicker({
  busy,
  onEnroll,
  accountId,
}: {
  busy: boolean
  accountId?: string
  onEnroll(value: {
    accountId: string
    learnerId: string | null
    learnerName: string
  }): Promise<boolean>
}) {
  const [mode, setMode] = useState<'child' | 'reservation'>('child')
  const [query, setQuery] = useState('')
  const [choices, setChoices] = useState<Choice[]>([])
  const [selected, setSelected] = useState<Choice | null>(null)
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    setChoices([])
    setSelected(null)
    setError(null)
    if (query.trim().length < 2) {
      setLoading(false)
      return () => controller.abort()
    }
    setLoading(true)
    const timer = setTimeout(async () => {
      try {
        if (mode === 'child') {
          const response = await liveRequest<{
            items: {
              profileId: string
              name: string
              account: { id: string; email: string; firstName: string; lastName: string } | null
            }[]
          }>(
            `/api/admin/children?q=${encodeURIComponent(query)}&limit=10`,
            undefined,
            'GET',
            controller.signal,
          )
          if (!controller.signal.aborted)
            setChoices(
              response.items
                .filter((item) => item.account && (!accountId || item.account.id === accountId))
                .map((item) => ({
                  id: item.profileId,
                  accountId: item.account!.id,
                  learnerId: item.profileId,
                  name: item.name,
                  description: `${item.account!.firstName} ${item.account!.lastName} · ${item.account!.email}`,
                })),
            )
        } else {
          const response = await liveRequest<{
            items: { id: string; email: string; firstName: string; lastName: string }[]
          }>(
            `/api/admin/users?q=${encodeURIComponent(query)}&limit=10&status=active`,
            undefined,
            'GET',
            controller.signal,
          )
          if (!controller.signal.aborted)
            setChoices(
              response.items.map((item) => ({
                id: item.id,
                accountId: item.id,
                learnerId: null,
                name: `${item.firstName} ${item.lastName}`,
                description: item.email,
              })),
            )
        }
      } catch (cause) {
        if (!controller.signal.aborted)
          setError(cause instanceof Error ? cause.message : 'Não foi possível buscar a família.')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, 300)
    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  }, [query, mode, accountId])
  return (
    <form
      className="space-y-3 border-t pt-4"
      onSubmit={async (event) => {
        event.preventDefault()
        if (
          selected &&
          (await onEnroll({
            accountId: selected.accountId,
            learnerId: selected.learnerId,
            learnerName: mode === 'child' ? selected.name : name.trim(),
          }))
        ) {
          setQuery('')
          setSelected(null)
          setName('')
        }
      }}
    >
      <h3 className="font-medium">Inscrever uma criança</h3>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Tipo de inscrição
        <select
          className="min-h-10 rounded-lg border bg-background p-2"
          value={mode}
          disabled={busy}
          onChange={(event) => setMode(event.target.value as 'child' | 'reservation')}
        >
          <option value="child">Criança com perfil</option>
          {!accountId ? <option value="reservation">Reservar para uma família</option> : null}
        </select>
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        {mode === 'child' ? 'Busque a criança ou seu responsável' : 'Busque o responsável'}
        <Input
          placeholder="Nome ou e-mail"
          value={query}
          disabled={busy}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      {loading ? (
        <p role="status" className="text-sm">
          Buscando…
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {query.trim().length >= 2 && !loading && !choices.length && !error ? (
        <p className="text-sm text-muted-foreground">
          Nenhum resultado. Confira o nome ou e-mail da família.
        </p>
      ) : null}
      <ul className="max-h-64 space-y-2 overflow-y-auto">
        {choices.map((choice) => (
          <li key={choice.id}>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3">
              <input
                type="radio"
                name="live-enrollment-child"
                value={choice.id}
                checked={selected?.id === choice.id}
                disabled={busy}
                onChange={() => setSelected(choice)}
                className="mt-1"
              />
              <span>
                <span className="block text-sm font-medium">{choice.name}</span>
                <span className="block text-xs text-muted-foreground">{choice.description}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>
      {mode === 'reservation' ? (
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Nome da criança
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            maxLength={100}
          />
          <span className="text-xs text-muted-foreground">
            A reserva já ocupa uma vaga. O perfil será vinculado antes do encontro.
          </span>
        </label>
      ) : null}
      <Button
        type="submit"
        disabled={busy || !selected || (mode === 'reservation' && !name.trim())}
      >
        {busy ? 'Inscrevendo…' : 'Adicionar inscrição'}
      </Button>
    </form>
  )
}
