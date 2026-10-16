'use client'
import {
  parseRevisionHistoryPage,
  type RevisionHistoryPage,
  type TeamMember,
} from '@sistemazero/marketing-contracts'
import { Button } from '@sistemazero/ui/button'
import { Dialog } from '@sistemazero/ui/dialog'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AssetPreview } from './asset-preview'
import { documentText, restoreContent } from './document-text'
import { errorMessage, type WorkbenchPort } from './port'
import type { EditorialEntry } from './projection'

export function RevisionHistory({
  port,
  projectId,
  target,
  entries,
  team,
  editable,
  onClose,
  onRestored,
}: {
  port: WorkbenchPort
  projectId: string
  target: EditorialEntry
  entries: EditorialEntry[]
  team: TeamMember[]
  editable: boolean
  onClose: () => void
  onRestored: () => Promise<void>
}) {
  const [page, setPage] = useState<RevisionHistoryPage | null>(null)
  const [media, setMedia] = useState<{ revisionId: string; assetId: string } | null>(null)
  const [loading, setLoading] = useState(false),
    [saving, setSaving] = useState(false),
    [error, setError] = useState('')
  const generation = useRef(0)
  const load = useCallback(
    async (before: string | null) => {
      const request = ++generation.current
      setLoading(true)
      setError('')
      try {
        const result = parseRevisionHistoryPage(
          await port.request(
            `/projects/${projectId}/items/${target.id}/history-page${before ? `?before=${before}` : ''}`,
          ),
          projectId,
          target.id,
          before,
        )
        if (generation.current !== request) return
        setPage((previous) =>
          before && previous ? { ...result, items: [...previous.items, ...result.items] } : result,
        )
      } catch (error) {
        if (generation.current === request) setError(errorMessage(error))
      } finally {
        if (generation.current === request) setLoading(false)
      }
    },
    [port, projectId, target.id],
  )
  useEffect(() => {
    void load(null)
    return () => {
      generation.current++
    }
  }, [load])
  return (
    <Dialog
      open
      onClose={() => {
        if (!saving) onClose()
      }}
      title="Histórico de revisões"
    >
      <div className="space-y-4 p-5">
        {page?.items.map((revision) => (
          <article key={revision.id} className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">
              {new Date(revision.createdAt).toLocaleString('pt-BR')} · {revision.id.slice(0, 8)}
            </p>
            <h3 className="mt-2 font-medium">{revision.document.title}</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Autor:{' '}
              {team.find((member) => member.id === revision.createdBy)?.name ?? 'Conta da equipe'}
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm">{documentText(revision.document)}</p>
            {(revision.document.kind === 'component' || revision.document.kind === 'video') &&
            revision.document.assetIds?.length ? (
              <div className="mt-3 space-y-3">
                <div className="flex flex-wrap gap-2">
                  {[...new Set(revision.document.assetIds)].map((assetId, index) => (
                    <Button
                      key={assetId}
                      size="sm"
                      variant="outline"
                      onClick={() => setMedia({ revisionId: revision.id, assetId })}
                    >
                      Conferir arquivo {index + 1} desta revisão
                    </Button>
                  ))}
                </div>
                {media?.revisionId === revision.id ? (
                  <AssetPreview
                    port={port}
                    projectId={projectId}
                    assetId={media.assetId}
                    mediaType="auto"
                    alt={
                      'alt' in revision.document
                        ? (revision.document.alt ?? revision.document.title)
                        : revision.document.title
                    }
                  />
                ) : null}
              </div>
            ) : null}
            {entries
              .filter(
                (entry) =>
                  entry.document.kind === 'comment' &&
                  entry.document.revisionId === revision.id &&
                  !entry.archived,
              )
              .map((comment) => (
                <div key={comment.id} className="mt-3 rounded border p-3 text-sm">
                  <p className="text-xs text-muted-foreground">
                    Comentário de{' '}
                    {team.find((member) => member.id === comment.confirmed?.authorId)?.name ??
                      'Pessoa da equipe'}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap">
                    {comment.document.kind === 'comment' ? comment.document.body : ''}
                  </p>
                </div>
              ))}
            {editable && target.confirmed && revision.id !== target.confirmed.revisionId ? (
              <Button
                className="mt-3"
                size="sm"
                variant="outline"
                disabled={saving || Boolean(target.pending.length)}
                onClick={() => {
                  setSaving(true)
                  setError('')
                  void port
                    .save(
                      {
                        schemaVersion: 1,
                        operationId: crypto.randomUUID(),
                        projectId,
                        entityId: target.id,
                        baseRevisionId: target.confirmed?.revisionId ?? null,
                        action: 'save',
                        document: restoreContent(revision.document, target.document),
                      },
                      null,
                    )
                    .then(async () => {
                      await onRestored()
                      onClose()
                    })
                    .catch((error) => setError(errorMessage(error)))
                    .finally(() => setSaving(false))
                }}
              >
                Restaurar conteúdo como nova revisão
              </Button>
            ) : null}
          </article>
        ))}
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        {loading ? (
          <p role="status" className="text-sm text-muted-foreground">
            Carregando revisões…
          </p>
        ) : null}
        {!loading && !page && error ? (
          <Button variant="outline" onClick={() => void load(null)}>
            Tentar novamente
          </Button>
        ) : null}
        {page?.nextBefore ? (
          <Button
            variant="outline"
            disabled={loading || saving}
            onClick={() => void load(page.nextBefore)}
          >
            Carregar revisões anteriores
          </Button>
        ) : null}
        {page && !page.nextBefore ? (
          <p className="text-xs text-muted-foreground">
            {page.items.length ? 'Início do histórico.' : 'Ainda não há revisões confirmadas.'}
          </p>
        ) : null}
      </div>
    </Dialog>
  )
}
