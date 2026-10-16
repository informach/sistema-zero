'use client'
import {
  type EditorialDocument,
  type ExecutionRun,
  runViewSchema,
} from '@sistemazero/marketing-contracts'
import { timelineWebVtt } from '@sistemazero/marketing-production/data'
import { Button } from '@sistemazero/ui/button'
import { lazy, Suspense, useState } from 'react'
import { AssetPreview } from './asset-preview'
import { errorMessage, type WorkbenchPort } from './port'

const ArtPreview = lazy(() => import('./art-preview'))
const VideoPreview = lazy(() => import('./video-preview'))
function beforeValue(document: EditorialDocument | undefined, field: string) {
  if (document?.kind === 'piece' && field === 'conversationOpening')
    return document.conversation?.opening ?? ''
  if (document?.kind === 'piece' && field === 'conversationOffer')
    return document.conversation?.offer ?? ''
  return String(Object.entries(document ?? {}).find(([key]) => key === field)?.[1] ?? '')
}
export function ProposalResult({
  run,
  port,
  editable,
  onChanged,
}: {
  run: ExecutionRun
  port: WorkbenchPort
  editable: boolean
  onChanged: () => Promise<void>
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [updated, setUpdated] = useState<{ run: ExecutionRun; source: ExecutionRun } | null>(null)
  const current = updated?.source === run ? updated.run : run
  const proposal =
    run.outcome?.status === 'succeeded'
      ? (run.outcome.editorial ?? run.outcome.art ?? run.outcome.video)
      : undefined
  if (!proposal) return null
  // Results are immutable; the server identifies a chosen variant by run + ordinal.
  const variants = proposal.variants.map((variant, ordinal) => ({
    id: `${run.request.id}:variant:${ordinal}`,
    ordinal,
    variant,
    components:
      'components' in variant
        ? variant.components.map((component, componentOrdinal) => ({
            id: `${run.request.id}:variant:${ordinal}:component:${componentOrdinal}`,
            component,
          }))
        : [],
  }))
  const application = current.application
  async function act(action: 'apply' | 'undo', variantIndex?: number) {
    setBusy(true)
    setError('')
    try {
      const value = runViewSchema.parse(
        await port.request(
          `/projects/${run.request.projectId}/runs/${run.request.id}/${action}`,
          'POST',
          action === 'apply' ? { variantIndex } : {},
        ),
      )
      setUpdated({ run: value, source: run })
      await port.synchronize()
      await onChanged()
    } catch (error) {
      setError(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="mt-3 space-y-3">
      <p>{proposal.summary}</p>
      {application?.error ? (
        <p role="alert" className="text-destructive">
          O resultado foi preservado sem alterar a peça: {application.error.message}
        </p>
      ) : null}
      {application?.result?.status === 'conflict' ? (
        <p role="alert" className="text-destructive">
          A base mudou enquanto a IA trabalhava. A proposta foi preservada; confira a versão atual e
          faça um novo pedido para conciliá-las.
        </p>
      ) : null}
      {application?.result?.status === 'applied' ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg bg-muted p-3">
          <p role="status">
            {application.undo?.status === 'applied'
              ? 'Alteração desfeita por uma nova revisão.'
              : application.undo?.status === 'conflict'
                ? 'Há alterações posteriores. Desfazer não sobrescreveu o trabalho.'
                : 'Nova revisão aplicada ao rascunho.'}
          </p>
          {!application.undo && editable ? (
            <Button variant="outline" size="sm" disabled={busy} onClick={() => void act('undo')}>
              Desfazer
            </Button>
          ) : null}
        </div>
      ) : null}
      <div className="grid gap-3 md:grid-cols-2">
        {variants.map(({ id, ordinal, variant, components }) => (
          <article key={id} className="rounded-lg border p-3">
            <h5 className="font-semibold">{variant.label}</h5>
            {'changes' in variant ? (
              variant.changes.map((change) => (
                <details key={`${change.entityId}:${change.field}`} className="mt-3" open>
                  <summary className="text-xs font-medium">
                    {[run.context.source, ...run.context.selected].find(
                      (revision) => revision.entityId === change.entityId,
                    )?.document.title ?? 'Componente'}{' '}
                    ·{' '}
                    {
                      {
                        body: 'Texto',
                        title: 'Título',
                        caption: 'Legenda',
                        cta: 'Chamada para ação',
                        alt: 'Descrição acessível',
                        hypothesis: 'Hipótese para o próximo ciclo',
                        evaluationCriterion: 'Como avaliar o resultado',
                        conversationOpening: 'Abertura da conversa',
                        conversationOffer: 'Apresentação do Desafio',
                      }[change.field]
                    }
                  </summary>
                  <div className="mt-2 grid gap-3 lg:grid-cols-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Antes</p>
                      <p className="mt-1 whitespace-pre-wrap">
                        {beforeValue(
                          [run.context.source, ...run.context.selected].find(
                            (revision) => revision.entityId === change.entityId,
                          )?.document,
                          change.field,
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Proposta</p>
                      <p className="mt-1 whitespace-pre-wrap">{change.value}</p>
                    </div>
                  </div>
                </details>
              ))
            ) : 'timeline' in variant ? (
              variant.finalAssetId ? (
                <>
                  <p className="my-2 text-xs">Arquivo MP4 desta revisão</p>
                  <AssetPreview
                    port={port}
                    projectId={run.request.projectId}
                    assetId={variant.finalAssetId}
                    alt="Vídeo final desta revisão"
                    mediaType="video"
                    captionsVtt={timelineWebVtt(variant.timeline)}
                  />
                </>
              ) : (
                <Suspense fallback={<p>Carregando vídeo…</p>}>
                  <VideoPreview
                    preparations={
                      run.context.source.document.kind === 'video'
                        ? [
                            ...(run.context.source.document.preparations ?? []).filter(
                              (item) =>
                                item.sourceAssetId !==
                                (run.outcome?.status === 'succeeded'
                                  ? run.outcome.mediaPreparation?.sourceAssetId
                                  : undefined),
                            ),
                            ...(run.outcome?.status === 'succeeded' && run.outcome.mediaPreparation
                              ? [run.outcome.mediaPreparation]
                              : []),
                          ]
                        : []
                    }
                    port={port}
                    projectId={run.request.projectId}
                    timeline={variant.timeline}
                  />
                </Suspense>
              )
            ) : 'composition' in variant ? (
              <Suspense fallback={<p>Carregando prévia…</p>}>
                {variant.composition ? (
                  <ArtPreview
                    port={port}
                    projectId={run.request.projectId}
                    composition={variant.composition}
                    title={run.context.source.document.title}
                    body={
                      run.context.source.document.kind === 'component'
                        ? run.context.source.document.body
                        : ''
                    }
                  />
                ) : variant.finalAssetId ? (
                  <AssetPreview
                    port={port}
                    projectId={run.request.projectId}
                    assetId={variant.finalAssetId}
                    alt={variant.alt}
                  />
                ) : null}
                <p className="mt-2 text-xs text-muted-foreground">{variant.alt}</p>
              </Suspense>
            ) : (
              <>
                <p className="mt-2 text-xs text-muted-foreground">
                  {variant.format} · {variant.medium} · {variant.components.length} componentes
                </p>
                {components.map(({ id, component }) => (
                  <div key={id} className="mt-3">
                    <p className="font-medium">{component.title}</p>
                    <p className="whitespace-pre-wrap">{component.body}</p>
                  </div>
                ))}
              </>
            )}
            {!application && editable ? (
              <Button
                className="mt-3"
                size="sm"
                disabled={busy}
                onClick={() => void act('apply', ordinal)}
              >
                {run.request.intent === 'alternatives'
                  ? 'Usar esta alternativa'
                  : 'Aplicar proposta'}
              </Button>
            ) : null}
            {application?.variantIndex === ordinal ? (
              <p className="mt-3 text-xs font-medium">Alternativa selecionada</p>
            ) : null}
          </article>
        ))}
      </div>
      {error ? (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}
