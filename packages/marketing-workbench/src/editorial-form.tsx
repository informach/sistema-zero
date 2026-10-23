'use client'
import {
  createPieceBatch,
  documentSchema,
  type EditorialDocument,
  editorialFormatSchema,
  mediumSchema,
} from '@sistemazero/marketing-contracts'
import { Button } from '@sistemazero/ui/button'
import { Dialog } from '@sistemazero/ui/dialog'
import { Input } from '@sistemazero/ui/input'
import { Select } from '@sistemazero/ui/select'
import { Textarea } from '@sistemazero/ui/textarea'
import { useId, useState } from 'react'
import { errorMessage, type WorkbenchPort } from './port'
import type { EditorialEntry } from './projection'

export const formatLabels = {
  feed: 'Feed',
  carousel: 'Carrossel',
  story: 'Story',
  reel: 'Reel',
  'long-video': 'Vídeo longo',
  campaign: 'Campanha',
}
export function EditorialForm({
  kind,
  projectId,
  port,
  entry,
  evidence,
  initialEvidenceIds = [],
  onClose,
  onSaved,
}: {
  kind: 'piece' | 'direction' | 'evidence'
  projectId: string
  port: WorkbenchPort
  entry?: EditorialEntry
  evidence: EditorialEntry[]
  initialEvidenceIds?: string[]
  onClose: () => void
  onSaved: (id: string) => void
}) {
  const fieldId = useId()
  const doc = entry?.document
  const [evidenceIds, setEvidenceIds] = useState(
    doc?.kind === 'piece'
      ? doc.evidenceIds
      : doc?.kind === 'direction'
        ? doc.referenceIds
        : initialEvidenceIds,
  )
  const [directionStatus, setDirectionStatus] = useState<'current' | 'draft' | 'historical'>(
    doc?.kind === 'direction' ? (doc.status ?? 'current') : 'current',
  )
  const [title, setTitle] = useState(doc?.title ?? ''),
    [body, setBody] = useState(
      doc && 'body' in doc ? doc.body : doc?.kind === 'piece' ? doc.brief : '',
    )
  const [objective, setObjective] = useState(doc && 'objective' in doc ? doc.objective : ''),
    [audience, setAudience] = useState(doc?.kind === 'direction' ? doc.audience : ''),
    [voice, setVoice] = useState(doc?.kind === 'direction' ? doc.voice : '')
  const [audienceNeed, setAudienceNeed] = useState(
    doc?.kind === 'piece' ? (doc.audienceNeed ?? '') : '',
  )
  const [series, setSeries] = useState(doc?.kind === 'piece' ? (doc.series ?? '') : '')
  const [format, setFormat] = useState<
      'feed' | 'carousel' | 'story' | 'reel' | 'long-video' | 'campaign'
    >('carousel'),
    [medium, setMedium] = useState<'text' | 'image' | 'video' | 'mixed'>('image')
  const [date, setDate] = useState(doc?.kind === 'piece' ? (doc.editorialDate ?? '') : ''),
    [week, setWeek] = useState(doc?.kind === 'piece' ? String(doc.week ?? '') : ''),
    [cta, setCta] = useState(doc?.kind === 'piece' ? doc.cta : '')
  const [url, setUrl] = useState(doc?.kind === 'evidence' ? (doc.source.url ?? '') : ''),
    [source, setSource] = useState(doc?.kind === 'evidence' ? doc.source.label : '')
  const [classification, setClassification] = useState<
    Extract<EditorialDocument, { kind: 'evidence' }>['classification']
  >(doc?.kind === 'evidence' ? doc.classification : 'reference')
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  return (
    <Dialog
      open
      onClose={() => {
        if (!busy) onClose()
      }}
      title={
        entry
          ? 'Revisar informações'
          : kind === 'piece'
            ? 'Nova pauta'
            : kind === 'direction'
              ? 'Direção editorial'
              : 'Adicionar fonte'
      }
      description="As alterações ficam registradas no histórico do projeto."
    >
      <form
        className="space-y-4 p-5"
        onSubmit={(event) => {
          event.preventDefault()
          setBusy(true)
          setError('')
          void (async () => {
            if (kind === 'piece' && !entry) {
              const batch = createPieceBatch({
                projectId,
                title,
                brief: body,
                format,
                medium,
                editorialDate: date || null,
              })
              const piece = batch.changes[0]
              if (piece?.document?.kind !== 'piece') throw new Error('A pauta não foi criada')
              piece.document = {
                ...piece.document,
                objective,
                cta,
                audienceNeed,
                series,
                week: week ? Number(week) : null,
                evidenceIds,
              }
              await port.saveBatch(batch)
              onSaved(piece.entityId)
            } else {
              const id = entry?.id ?? crypto.randomUUID()
              let document: EditorialDocument
              if (kind === 'direction')
                document = {
                  schemaVersion: 1,
                  kind,
                  title,
                  body,
                  objective,
                  audience,
                  voice,
                  protectedTerms: doc?.kind === 'direction' ? doc.protectedTerms : [],
                  referenceIds: evidenceIds,
                  status: directionStatus,
                }
              else if (kind === 'evidence')
                document = {
                  schemaVersion: 1,
                  kind,
                  title,
                  body,
                  classification,
                  source: {
                    ...(doc?.kind === 'evidence' ? doc.source : {}),
                    label: source,
                    url: url || undefined,
                  },
                  product: doc?.kind === 'evidence' ? doc.product : '',
                  validity: doc?.kind === 'evidence' ? doc.validity : 'unverified',
                  tags: doc?.kind === 'evidence' ? doc.tags : [],
                  assetIds: doc?.kind === 'evidence' ? doc.assetIds : undefined,
                  observation: doc?.kind === 'evidence' ? doc.observation : undefined,
                }
              else if (doc?.kind === 'piece')
                document = {
                  ...doc,
                  title,
                  brief: body,
                  objective,
                  cta,
                  audienceNeed,
                  series,
                  editorialDate: date || null,
                  week: week ? Number(week) : null,
                  evidenceIds,
                }
              else throw new Error('Selecione uma pauta para revisar')
              await port.save(
                {
                  schemaVersion: 1,
                  operationId: crypto.randomUUID(),
                  projectId,
                  entityId: id,
                  baseRevisionId: entry?.confirmed?.revisionId ?? null,
                  action: 'save',
                  document: documentSchema.parse(document),
                },
                null,
              )
              onSaved(id)
            }
          })()
            .catch((error) => setError(errorMessage(error)))
            .finally(() => setBusy(false))
        }}
      >
        <label htmlFor={`${fieldId}-1`} className="block space-y-1 text-sm font-medium">
          Título
          <Input
            id={`${fieldId}-1`}
            required
            maxLength={300}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>
        <label htmlFor={`${fieldId}-2`} className="block space-y-1 text-sm font-medium">
          {kind === 'piece'
            ? 'Briefing'
            : kind === 'direction'
              ? 'Posicionamento e decisões'
              : 'Trecho, observação ou referência'}
          <Textarea
            id={`${fieldId}-2`}
            required
            rows={5}
            maxLength={100000}
            value={body}
            onChange={(event) => setBody(event.target.value)}
          />
        </label>
        {kind !== 'evidence' ? (
          <label htmlFor={`${fieldId}-3`} className="block space-y-1 text-sm font-medium">
            Objetivo
            <Input
              id={`${fieldId}-3`}
              maxLength={2000}
              value={objective}
              onChange={(event) => setObjective(event.target.value)}
            />
          </label>
        ) : null}
        {kind === 'piece' ? (
          <>
            <label htmlFor={`${fieldId}-need`} className="block space-y-1 text-sm font-medium">
              Necessidade do público
              <Input
                id={`${fieldId}-need`}
                maxLength={1000}
                value={audienceNeed}
                onChange={(event) => setAudienceNeed(event.target.value)}
                placeholder="Ex.: encontrar uma atividade para começar"
              />
            </label>
            <label htmlFor={`${fieldId}-series`} className="block space-y-1 text-sm font-medium">
              Série editorial
              <Input
                id={`${fieldId}-series`}
                maxLength={300}
                value={series}
                onChange={(event) => setSeries(event.target.value)}
                placeholder="Ex.: Primeira criação"
              />
            </label>
          </>
        ) : null}
        {kind === 'direction' ? (
          <>
            <label htmlFor={`${fieldId}-status`} className="block space-y-1 text-sm font-medium">
              Uso no projeto
              <Select
                id={`${fieldId}-status`}
                value={directionStatus}
                onChange={(event) => {
                  const value = event.target.value
                  if (value === 'current' || value === 'draft' || value === 'historical')
                    setDirectionStatus(value)
                }}
              >
                <option value="current">Direção vigente</option>
                <option value="draft">Proposta em revisão</option>
                <option value="historical">Referência histórica</option>
              </Select>
            </label>
            <label htmlFor={`${fieldId}-4`} className="block space-y-1 text-sm font-medium">
              Público
              <Input
                id={`${fieldId}-4`}
                maxLength={2000}
                value={audience}
                onChange={(event) => setAudience(event.target.value)}
              />
            </label>
            <label htmlFor={`${fieldId}-5`} className="block space-y-1 text-sm font-medium">
              Tom de voz
              <Textarea
                id={`${fieldId}-5`}
                maxLength={4000}
                value={voice}
                onChange={(event) => setVoice(event.target.value)}
              />
            </label>
          </>
        ) : null}
        {kind === 'piece' ? (
          <>
            {!entry ? (
              <div className="grid grid-cols-2 gap-3">
                <label htmlFor={`${fieldId}-6`} className="space-y-1 text-sm font-medium">
                  Formato
                  <Select
                    id={`${fieldId}-6`}
                    value={format}
                    onChange={(event) => setFormat(editorialFormatSchema.parse(event.target.value))}
                  >
                    {editorialFormatSchema.options.map((value) => (
                      <option key={value} value={value}>
                        {formatLabels[value]}
                      </option>
                    ))}
                  </Select>
                </label>
                <label htmlFor={`${fieldId}-7`} className="space-y-1 text-sm font-medium">
                  Mídia
                  <Select
                    id={`${fieldId}-7`}
                    value={medium}
                    onChange={(event) => setMedium(mediumSchema.parse(event.target.value))}
                  >
                    <option value="image">Imagem</option>
                    <option value="text">Texto</option>
                    <option value="video">Vídeo</option>
                    <option value="mixed">Composição híbrida</option>
                  </Select>
                </label>
              </div>
            ) : null}
            <div className="grid grid-cols-2 gap-3">
              <label htmlFor={`${fieldId}-8`} className="space-y-1 text-sm font-medium">
                Data editorial
                <Input
                  id={`${fieldId}-8`}
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                />
              </label>
              <label htmlFor={`${fieldId}-9`} className="space-y-1 text-sm font-medium">
                Semana do plano
                <Input
                  id={`${fieldId}-9`}
                  type="number"
                  min={1}
                  max={104}
                  value={week}
                  onChange={(event) => setWeek(event.target.value)}
                />
              </label>
            </div>
            <p className="text-xs text-muted-foreground">
              Planejar uma data não agenda a publicação.
            </p>
            <label htmlFor={`${fieldId}-10`} className="block space-y-1 text-sm font-medium">
              Chamada para ação
              <Input
                id={`${fieldId}-10`}
                maxLength={2000}
                value={cta}
                onChange={(event) => setCta(event.target.value)}
              />
            </label>
          </>
        ) : null}
        {kind === 'evidence' ? (
          <>
            <label htmlFor={`${fieldId}-11`} className="block space-y-1 text-sm font-medium">
              Natureza
              <Select
                id={`${fieldId}-11`}
                value={classification}
                onChange={(event) => {
                  const value = event.target.value
                  if (
                    value === 'fact' ||
                    value === 'interpretation' ||
                    value === 'hypothesis' ||
                    value === 'reference'
                  )
                    setClassification(value)
                }}
              >
                <option value="reference">Referência</option>
                <option value="fact">Fato documentado</option>
                <option value="interpretation">Interpretação</option>
                <option value="hypothesis">Hipótese a testar</option>
              </Select>
            </label>
            <label htmlFor={`${fieldId}-12`} className="block space-y-1 text-sm font-medium">
              Origem
              <Input
                id={`${fieldId}-12`}
                required
                maxLength={500}
                value={source}
                onChange={(event) => setSource(event.target.value)}
                placeholder="Autor, documento ou perfil"
              />
            </label>
            <label htmlFor={`${fieldId}-13`} className="block space-y-1 text-sm font-medium">
              Endereço da fonte
              <Input
                id={`${fieldId}-13`}
                type="url"
                maxLength={4000}
                value={url}
                onChange={(event) => setUrl(event.target.value)}
              />
            </label>
          </>
        ) : null}
        {kind !== 'evidence' && evidence.length ? (
          <fieldset className="space-y-2 rounded-lg border p-3">
            <legend className="px-1 text-sm font-medium">Fontes usadas neste trabalho</legend>
            {evidence.map((item) => (
              <label key={item.id} className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={evidenceIds.includes(item.id)}
                  disabled={Boolean(item.pending.length)}
                  onChange={(event) =>
                    setEvidenceIds((previous) =>
                      event.target.checked
                        ? [...previous, item.id]
                        : previous.filter((id) => id !== item.id),
                    )
                  }
                />
                <span>{item.document.title}</span>
              </label>
            ))}
          </fieldset>
        ) : null}
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button variant="outline" disabled={busy} onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? 'Guardando…' : 'Guardar no projeto'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
