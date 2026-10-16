'use client'
import { documentSchema, type EditorialDocument } from '@sistemazero/marketing-contracts'
import { Button } from '@sistemazero/ui/button'
import { Dialog } from '@sistemazero/ui/dialog'
import { Input } from '@sistemazero/ui/input'
import { Select } from '@sistemazero/ui/select'
import { Textarea } from '@sistemazero/ui/textarea'
import { useId, useState } from 'react'
import { errorMessage, type WorkbenchPort } from './port'
import type { EditorialEntry } from './projection'

export function KnowledgeForm({
  port,
  projectId,
  kind,
  entry,
  entries,
  onClose,
  onSaved,
}: {
  port: WorkbenchPort
  projectId: string
  kind: 'analysis' | 'watchlist'
  entry?: EditorialEntry
  entries: EditorialEntry[]
  onClose: () => void
  onSaved: (id: string) => void
}) {
  const id = useId(),
    doc = entry?.document
  const [entityId] = useState(() => entry?.id ?? crypto.randomUUID())
  const [title, setTitle] = useState(doc?.title ?? '')
  const [body, setBody] = useState(doc && 'body' in doc ? doc.body : '')
  const [objective, setObjective] = useState(doc && 'objective' in doc ? doc.objective : '')
  const [analysisType, setAnalysisType] = useState<'summary' | 'decision' | 'research'>(
    doc?.kind === 'analysis' ? (doc.analysisType ?? 'research') : 'decision',
  )
  const [basisIds, setBasisIds] = useState(
    doc?.kind === 'analysis' ? (doc.basis ?? []).map((source) => source.entityId) : [],
  )
  const [subjectType, setSubjectType] = useState<'profile' | 'topic'>(
    doc?.kind === 'watchlist' ? doc.subjectType : 'profile',
  )
  const [url, setUrl] = useState(doc?.kind === 'watchlist' ? (doc.url ?? '') : '')
  const [source, setSource] = useState(doc?.kind === 'watchlist' ? doc.source.label : '')
  const [enabled, setEnabled] = useState(doc?.kind === 'watchlist' ? doc.enabled : true)
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  const eligible = entries.filter(
    (item) =>
      !item.archived &&
      item.confirmed &&
      !item.pending.length &&
      item.document.kind !== 'analysis' &&
      item.document.kind !== 'comment',
  )
  return (
    <Dialog
      open
      title={kind === 'analysis' ? 'Memória do projeto' : 'Perfil ou tema para acompanhar'}
      onClose={() => {
        if (!busy) onClose()
      }}
    >
      <form
        className="space-y-4 p-5"
        onSubmit={(event) => {
          event.preventDefault()
          setBusy(true)
          setError('')
          void (async () => {
            const basis = basisIds.map((sourceId) => {
              const item = eligible.find((item) => item.id === sourceId)
              if (!item?.confirmed)
                throw new Error(
                  'Uma fonte mudou ou está pendente. Atualize a seleção antes de salvar.',
                )
              return { entityId: item.id, revisionId: item.confirmed.revisionId }
            })
            const document: EditorialDocument =
              kind === 'analysis'
                ? {
                    schemaVersion: 1,
                    kind,
                    title,
                    body,
                    objective,
                    analysisType,
                    basis,
                    evidenceIds: basisIds.filter((sourceId) =>
                      eligible.some(
                        (item) => item.id === sourceId && item.document.kind === 'evidence',
                      ),
                    ),
                    hypothesis: doc?.kind === 'analysis' ? doc.hypothesis : '',
                    ...(doc?.kind === 'analysis' && doc.evaluationCriterion !== undefined
                      ? { evaluationCriterion: doc.evaluationCriterion }
                      : {}),
                    proposedPieceId: doc?.kind === 'analysis' ? doc.proposedPieceId : null,
                  }
                : {
                    schemaVersion: 1,
                    kind,
                    title,
                    body,
                    objective,
                    subjectType,
                    url: url || null,
                    enabled,
                    source: {
                      ...(doc?.kind === 'watchlist' ? doc.source : {}),
                      label: source,
                      url: url || undefined,
                    },
                    evidenceIds: doc?.kind === 'watchlist' ? doc.evidenceIds : [],
                  }
            await port.save(
              {
                schemaVersion: 1,
                operationId: crypto.randomUUID(),
                projectId,
                entityId,
                baseRevisionId: entry?.confirmed?.revisionId ?? null,
                action: 'save',
                document: documentSchema.parse(document),
              },
              null,
            )
            onSaved(entityId)
          })()
            .catch((error) => setError(errorMessage(error)))
            .finally(() => setBusy(false))
        }}
      >
        <label htmlFor={`${id}-title`} className="block text-sm font-medium">
          Título
          <Input
            id={`${id}-title`}
            required
            maxLength={300}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label htmlFor={`${id}-objective`} className="block text-sm font-medium">
          Objetivo
          <Input
            id={`${id}-objective`}
            maxLength={2000}
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
          />
        </label>
        <label htmlFor={`${id}-body`} className="block text-sm font-medium">
          {kind === 'analysis' ? 'Resumo ou decisão e justificativa' : 'O que observar'}
          <Textarea
            id={`${id}-body`}
            required
            rows={5}
            maxLength={100000}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </label>
        {kind === 'analysis' ? (
          <>
            <label htmlFor={`${id}-type`} className="block text-sm font-medium">
              Tipo
              <Select
                id={`${id}-type`}
                value={analysisType}
                onChange={(e) => {
                  const value = e.target.value
                  if (value === 'summary' || value === 'decision' || value === 'research')
                    setAnalysisType(value)
                }}
              >
                <option value="decision">Decisão</option>
                <option value="summary">Resumo</option>
                <option value="research">Pesquisa</option>
              </Select>
            </label>
            <fieldset className="max-h-64 space-y-2 overflow-auto rounded-lg border p-3">
              <legend className="px-1 text-sm font-medium">Fontes e revisões usadas</legend>
              <p className="text-xs text-muted-foreground">
                Uma mudança nestas fontes torna o resumo ou a decisão desatualizado. Ao revisar,
                confira o texto antes de confirmar a nova base.
              </p>
              {eligible.map((item) => (
                <label key={item.id} className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={basisIds.includes(item.id)}
                    onChange={(e) =>
                      setBasisIds((old) =>
                        e.target.checked
                          ? [...old, item.id]
                          : old.filter((value) => value !== item.id),
                      )
                    }
                  />
                  {item.document.title}
                </label>
              ))}
            </fieldset>
          </>
        ) : (
          <>
            <label htmlFor={`${id}-type`} className="block text-sm font-medium">
              Acompanhar
              <Select
                id={`${id}-type`}
                value={subjectType}
                onChange={(e) => {
                  if (e.target.value === 'profile' || e.target.value === 'topic')
                    setSubjectType(e.target.value)
                }}
              >
                <option value="profile">Perfil</option>
                <option value="topic">Tema</option>
              </Select>
            </label>
            <label htmlFor={`${id}-source`} className="block text-sm font-medium">
              Origem
              <Input
                id={`${id}-source`}
                required
                maxLength={500}
                value={source}
                onChange={(e) => setSource(e.target.value)}
              />
            </label>
            <label htmlFor={`${id}-url`} className="block text-sm font-medium">
              Link público
              <Input
                id={`${id}-url`}
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </label>
            <label className="flex gap-2 text-sm">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
              />
              Manter na lista de acompanhamento
            </label>
            <p className="text-xs text-muted-foreground">
              A lista orienta pesquisas pontuais. Nenhuma coleta automática é ativada ao cadastrar.
            </p>
          </>
        )}
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <Button type="submit" disabled={busy}>
          {busy ? 'Guardando…' : 'Guardar no projeto'}
        </Button>
      </form>
    </Dialog>
  )
}
