'use client'
import type { TeamMember } from '@sistemazero/marketing-contracts'
import { Button } from '@sistemazero/ui/button'
import { Textarea } from '@sistemazero/ui/textarea'
import { useId, useState } from 'react'
import { errorMessage, type WorkbenchPort } from './port'
import type { EditorialEntry } from './projection'
export function RevisionComments({
  port,
  projectId,
  target,
  entries,
  editable,
  onChanged,
  team,
}: {
  port: WorkbenchPort
  projectId: string
  target: EditorialEntry
  entries: EditorialEntry[]
  editable: boolean
  onChanged: () => Promise<void>
  team: TeamMember[]
}) {
  const id = useId(),
    [body, setBody] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  const comments = entries.filter(
    (item) =>
      !item.archived &&
      item.document.kind === 'comment' &&
      item.document.revisionId === target.confirmed?.revisionId,
  )
  return (
    <section className="rounded-xl border bg-card p-5">
      <h3 className="font-semibold">Comentários desta revisão</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Os comentários ficam ligados à versão conferida, mesmo depois de uma nova edição.
      </p>
      <div className="my-4 space-y-3">
        {comments.map((item) => (
          <article key={item.id} className="rounded-lg border p-3 text-sm">
            <p className="whitespace-pre-wrap">
              {item.document.kind === 'comment' ? item.document.body : ''}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {team.find((member) => member.id === item.confirmed?.authorId)?.name ??
                'Pessoa da equipe'}{' '}
              ·{' '}
              {item.confirmed
                ? new Date(item.confirmed.updatedAt).toLocaleString('pt-BR')
                : 'Aguardando sincronização'}
            </p>
          </article>
        ))}
      </div>
      {editable && target.confirmed && !target.pending.length ? (
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault()
            setBusy(true)
            setError('')
            const revisionId = target.confirmed?.revisionId
            if (!revisionId) {
              setBusy(false)
              return
            }
            void port
              .save(
                {
                  schemaVersion: 1,
                  operationId: crypto.randomUUID(),
                  projectId,
                  entityId: crypto.randomUUID(),
                  baseRevisionId: null,
                  action: 'save',
                  document: {
                    schemaVersion: 1,
                    kind: 'comment',
                    title: `Comentário: ${target.document.title}`.slice(0, 300),
                    revisionId,
                    body,
                  },
                },
                null,
              )
              .then(async () => {
                setBody('')
                await onChanged()
              })
              .catch((error) => setError(errorMessage(error)))
              .finally(() => setBusy(false))
          }}
        >
          <label htmlFor={id} className="block text-sm font-medium">
            Comentário
            <Textarea
              id={id}
              required
              maxLength={10000}
              rows={2}
              value={body}
              onChange={(event) => setBody(event.target.value)}
            />
          </label>
          <Button type="submit" size="sm" disabled={busy || !body.trim()}>
            Guardar comentário
          </Button>
        </form>
      ) : null}
      {error ? (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </section>
  )
}
