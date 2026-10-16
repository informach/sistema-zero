'use client'
import { batchResultSchema, type EditorialItem } from '@sistemazero/marketing-contracts'
import { Button } from '@sistemazero/ui/button'
import { Dialog } from '@sistemazero/ui/dialog'
import { Input } from '@sistemazero/ui/input'
import { Select } from '@sistemazero/ui/select'
import { Textarea } from '@sistemazero/ui/textarea'
import { useId, useState } from 'react'
import { workspaceAction } from './action-journal'
import { formatLabels } from './editorial-form'
import { errorMessage, type WorkbenchPort } from './port'

export function AnalysisNextPiece({
  port,
  analysis,
  onOpenPiece,
}: {
  port: WorkbenchPort
  analysis: EditorialItem
  onOpenPiece: (id: string) => Promise<void>
}) {
  const doc = analysis.document
  const id = useId(),
    [opened, setOpened] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  const [title, setTitle] = useState(`Próximo ciclo · ${doc.title}`.slice(0, 300))
  const [brief, setBrief] = useState(doc.kind === 'analysis' ? doc.body : '')
  const [hypothesis, setHypothesis] = useState(doc.kind === 'analysis' ? doc.hypothesis : '')
  const [objective, setObjective] = useState(doc.kind === 'analysis' ? doc.objective : '')
  const [criterion, setCriterion] = useState(''),
    [format, setFormat] = useState('carousel'),
    [medium, setMedium] = useState('image')
  if (doc.kind !== 'analysis') return null
  const existing = doc.proposedPieceId
  return (
    <>
      <Button
        variant="outline"
        disabled={busy}
        onClick={() => {
          if (!existing) {
            setOpened(true)
            return
          }
          setBusy(true)
          void onOpenPiece(existing)
            .catch((error) => setError(errorMessage(error)))
            .finally(() => setBusy(false))
        }}
      >
        {existing ? 'Abrir pauta proposta' : 'Preparar próxima pauta'}
      </Button>
      {error && !opened ? <p role="alert">{error}</p> : null}
      {opened ? (
        <Dialog
          open
          title="Próxima pauta a partir da análise"
          onClose={() => {
            if (!busy) setOpened(false)
          }}
        >
          <form
            className="space-y-4 p-5"
            onSubmit={(event) => {
              event.preventDefault()
              if (brief.length > 80000) {
                setError(
                  'Resuma o briefing para até 80.000 caracteres. A análise completa permanece vinculada.',
                )
                return
              }
              setBusy(true)
              setError('')
              void (async () => {
                const result = await workspaceAction(
                  port,
                  `/projects/${analysis.projectId}/learning-pieces`,
                  {
                    schemaVersion: 1,
                    analysisId: analysis.id,
                    expectedRevisionId: analysis.revisionId,
                    title,
                    brief,
                    hypothesis,
                    criterion,
                    objective,
                    format,
                    medium,
                  },
                  batchResultSchema,
                )
                if (result.status !== 'applied')
                  throw new Error('A análise mudou. Confira a versão atual antes de criar a pauta.')
                const piece = result.items.find((item) => item.document.kind === 'piece')
                if (!piece) throw new Error('A pauta não foi confirmada')
                await onOpenPiece(piece.id)
                setOpened(false)
              })()
                .catch((error) => setError(errorMessage(error)))
                .finally(() => setBusy(false))
            }}
          >
            <p className="text-sm text-muted-foreground">
              O texto da análise já está no briefing. Confira a hipótese e como avaliar o próximo
              ciclo; a IA continua a produção na nova pauta. A revisão analisada e suas evidências
              ficam vinculadas.
            </p>
            <label className="block text-sm font-medium" htmlFor={`${id}-title`}>
              Título
              <Input
                id={`${id}-title`}
                className="mt-1"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
                maxLength={300}
              />
            </label>
            <label className="block text-sm font-medium" htmlFor={`${id}-brief`}>
              Briefing
              <Textarea
                id={`${id}-brief`}
                className="mt-1"
                value={brief}
                onChange={(event) => setBrief(event.target.value)}
                rows={5}
                required
                maxLength={80000}
              />
            </label>
            <label className="block text-sm font-medium" htmlFor={`${id}-hypothesis`}>
              Hipótese a testar
              <Textarea
                id={`${id}-hypothesis`}
                className="mt-1"
                value={hypothesis}
                onChange={(event) => setHypothesis(event.target.value)}
                rows={2}
                required
                maxLength={6000}
              />
            </label>
            <label className="block text-sm font-medium" htmlFor={`${id}-criterion`}>
              Como avaliar o resultado
              <Textarea
                id={`${id}-criterion`}
                className="mt-1"
                value={criterion}
                onChange={(event) => setCriterion(event.target.value)}
                rows={2}
                required
                maxLength={2000}
              />
            </label>
            <label className="block text-sm font-medium" htmlFor={`${id}-objective`}>
              Objetivo
              <Input
                id={`${id}-objective`}
                className="mt-1"
                value={objective}
                onChange={(event) => setObjective(event.target.value)}
                required
                maxLength={2000}
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-medium" htmlFor={`${id}-format`}>
                Formato
                <Select
                  id={`${id}-format`}
                  className="mt-1"
                  value={format}
                  onChange={(event) => setFormat(event.target.value)}
                >
                  {Object.entries(formatLabels).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="text-sm font-medium" htmlFor={`${id}-medium`}>
                Mídia
                <Select
                  id={`${id}-medium`}
                  className="mt-1"
                  value={medium}
                  onChange={(event) => setMedium(event.target.value)}
                >
                  <option value="image">Imagem</option>
                  <option value="video">Vídeo</option>
                  <option value="text">Texto</option>
                  <option value="mixed">Mista</option>
                </Select>
              </label>
            </div>
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <Button type="submit" disabled={busy}>
              {busy ? 'Criando pauta…' : 'Criar pauta em rascunho'}
            </Button>
          </form>
        </Dialog>
      ) : null}
    </>
  )
}
