'use client'
import {
  ART_RECIPES,
  type ArtRecipeId,
  type AssetManifest,
  artRecipeIdSchema,
  compositionSceneError,
  contextRequestSchema,
  DEMONSTRATION_RECIPES,
  type ExecutionContext,
  type ExecutionRequest,
  type ExecutionRun,
  executionContextSchema,
  type Handoff,
  hashSchema,
  type ImageRegion,
  imageRegionSchema,
  type Project,
  runCreateSchema,
  runPageSchema,
  runViewSchema,
  type TeamMember,
  uploadViewSchema,
  videoAssetIds,
} from '@sistemazero/marketing-contracts'
import { Button } from '@sistemazero/ui/button'
import { Select } from '@sistemazero/ui/select'
import { Textarea } from '@sistemazero/ui/textarea'
import { useEffect, useId, useRef, useState } from 'react'
import { z } from 'zod'
import { executionStateLabels } from './execution-labels'
import { ImageRegionPicker } from './image-region'
import { memoryOperation } from './memory-operation'
import { errorMessage, type WorkbenchPort } from './port'
import type { EditorialEntry } from './projection'
import { ProposalResult } from './proposal-result'
import { preserveInvalidRequest } from './request-recovery'
import { researchBatch } from './research-batch'
import { ResearchReadout } from './research-result'

const availableCapabilities = z.enum([
  'copy',
  'research',
  'layout',
  'image',
  'image-edit',
  'render',
  'capture',
  'video-edit',
  'composition',
  'video-adapt',
  'transcribe',
  'prepare-media',
])
const draftSchema = z.object({
  instruction: z.string().max(12000),
  provider: z.enum(['codex', 'claude']),
  intent: z.enum(['adjust', 'alternatives', 'adapt']),
  request: runCreateSchema.nullable(),
  capability: availableCapabilities.default('copy'),
  protectedIds: z.array(z.string().uuid()).max(100).default([]),
  assignedTo: z.string().uuid().optional(),
  visualLayerId: z.string().uuid().optional(),
  imageRegion: imageRegionSchema.optional(),
  sourceAssetId: z.string().uuid().optional(),
  captionSourceAssetId: z.string().uuid().optional(),
  artRecipeId: artRecipeIdSchema.optional(),
  imageFormat: runCreateSchema.shape.imageFormat,
  reviseCaptions: z.boolean().optional(),
  videoTarget: runCreateSchema.shape.videoTarget,
})
export function RequestPanel({
  port,
  project,
  target,
  handoff,
  onChanged,
  entries,
  team,
}: {
  port: WorkbenchPort
  project: Project
  target: EditorialEntry
  handoff: Handoff | null
  onChanged: () => Promise<void>
  entries: EditorialEntry[]
  team: TeamMember[]
}) {
  const fieldId = useId()
  const [capability, setCapability] = useState<z.infer<typeof availableCapabilities>>(
    target.document.kind === 'video'
      ? 'video-edit'
      : target.document.kind === 'watchlist'
        ? 'research'
        : 'copy',
  )
  const [visualLayerId, setVisualLayerId] = useState<string | undefined>()
  const [artRecipeId, setArtRecipeId] = useState<ArtRecipeId | undefined>()
  const [imageFormat, setImageFormat] = useState<'png' | 'jpeg'>(
    target.document.kind === 'component' && !target.document.composition ? 'jpeg' : 'png',
  )
  const [reviseCaptions, setReviseCaptions] = useState(false)
  const [videoTarget, setVideoTarget] = useState<ExecutionRequest['videoTarget']>()
  const [imageRegion, setImageRegion] = useState<ImageRegion | undefined>()
  const [sourceAssetId, setSourceAssetId] = useState<string | undefined>(),
    [captureSources, setCaptureSources] = useState<AssetManifest[]>([])
  const [captionSourceAssetId, setCaptionSourceAssetId] = useState<string | undefined>(),
    [captionFiles, setCaptionFiles] = useState<AssetManifest[]>([])
  const referenceKey = JSON.stringify(
    target.document.kind === 'component'
      ? [...new Set([...target.document.assetIds, ...(target.document.referenceAssetIds ?? [])])]
      : target.document.kind === 'video'
        ? [
            ...new Set([
              ...videoAssetIds(target.document.timeline),
              ...(target.document.referenceAssetIds ?? []),
            ]),
          ]
        : [],
  )
  useEffect(() => {
    if (
      ![
        'capture',
        'image-edit',
        'transcribe',
        'video-edit',
        'video-adapt',
        'prepare-media',
        'render',
      ].includes(capability)
    )
      return
    let live = true
    const ids = z.array(z.string().uuid()).parse(JSON.parse(referenceKey))
    void Promise.all(
      ids.map(async (id) =>
        uploadViewSchema.parse(await port.request(`/projects/${project.id}/assets/${id}`)),
      ),
    )
      .then((views) => {
        if (live)
          setCaptionFiles(
            views
              .filter(
                (view) =>
                  view.state === 'confirmed' &&
                  view.manifest.mime === 'text/plain' &&
                  view.manifest.size <= 2_000_000,
              )
              .map((view) => view.manifest),
          )
        if (live)
          setCaptureSources(
            views
              .filter(
                (view) =>
                  view.state === 'confirmed' &&
                  (['transcribe', 'video-edit', 'prepare-media'].includes(capability)
                    ? view.manifest.mime.startsWith('video/') ||
                      view.manifest.mime.startsWith('audio/')
                    : capability === 'capture'
                      ? view.manifest.mime === 'application/json'
                      : view.manifest.mime.startsWith('image/')),
              )
              .map((view) => view.manifest),
          )
      })
      .catch((error) => {
        if (live) setError(errorMessage(error))
      })
    return () => {
      live = false
    }
  }, [port, project.id, referenceKey, capability])
  const [protectedIds, setProtectedIds] = useState<string[]>([])
  const [assignedTo, setAssignedTo] = useState(port.userId)
  const [moreCursor, setMoreCursor] = useState<string | null>(null)
  const [recovery, setRecovery] = useState<string[]>([])
  const loadedOlder = useRef(false)
  const [instruction, setInstruction] = useState(
      target.document.kind === 'analysis'
        ? 'Analise as evidências e as revisões de origem conforme o objetivo registrado. Separe dados observados, limitações e hipóteses. Não invente métricas, conversões nem causalidade. Proponha um próximo experimento com variável, critério de avaliação e uma sugestão de pauta.'
        : target.document.kind === 'watchlist'
          ? 'Pesquise fontes públicas sobre este perfil ou tema conforme o objetivo e as orientações do registro. Informe URLs, datas da publicação e da consulta, novidades e limitações de cobertura. Não confunda conteúdo antigo recém-encontrado com notícia nova nem invente métricas.'
          : '',
    ),
    [provider, setProvider] = useState<'codex' | 'claude'>('codex'),
    [intent, setIntent] = useState<'adjust' | 'alternatives' | 'adapt'>('adjust')
  const [prepared, setPrepared] = useState<ExecutionRequest | null>(null),
    [runs, setRuns] = useState<ExecutionRun[]>([]),
    [context, setContext] = useState<ExecutionContext | null>(null)
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [restored, setRestored] = useState(false)
  const key = `marketing-request:${port.identity}:${project.id}:${target.id}`
  const preferenceKey = `marketing-provider:${port.identity}`
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key)
      setRecovery([
        ...new Set(
          Object.keys(localStorage)
            .filter((name) => name.startsWith(`${key}:recovery:`))
            .map((name) => localStorage.getItem(name) ?? ''),
        ),
      ])
      const preference = localStorage.getItem(preferenceKey)
      if (preference === 'codex' || preference === 'claude') setProvider(preference)
      if (raw) {
        const value = draftSchema.parse(JSON.parse(raw))
        setInstruction(value.instruction)
        setProvider(value.provider)
        setIntent(value.intent)
        setPrepared(value.request)
        setCapability(value.capability)
        setProtectedIds(value.protectedIds)
        setAssignedTo(value.assignedTo ?? port.userId)
        setVisualLayerId(value.visualLayerId)
        setImageRegion(value.imageRegion)
        setSourceAssetId(value.sourceAssetId)
        setCaptionSourceAssetId(value.captionSourceAssetId)
        setArtRecipeId(value.artRecipeId)
        setImageFormat(value.imageFormat ?? 'png')
        setReviseCaptions(value.reviseCaptions ?? false)
        setVideoTarget(value.videoTarget)
      }
      setRestored(true)
    } catch (error) {
      setError(`Não foi possível recuperar o pedido local: ${errorMessage(error)}`)
    }
  }, [key, preferenceKey, port.userId])
  useEffect(() => {
    if (!restored) return
    try {
      localStorage.setItem(
        key,
        JSON.stringify({
          instruction,
          provider,
          intent,
          capability,
          protectedIds,
          assignedTo,
          visualLayerId,
          imageRegion,
          sourceAssetId,
          captionSourceAssetId,
          artRecipeId,
          imageFormat,
          reviseCaptions,
          videoTarget,
          request: prepared,
        }),
      )
    } catch (error) {
      setError(`O navegador não conseguiu guardar seu pedido: ${errorMessage(error)}`)
    }
  }, [
    key,
    instruction,
    provider,
    intent,
    capability,
    protectedIds,
    assignedTo,
    visualLayerId,
    imageRegion,
    sourceAssetId,
    captionSourceAssetId,
    artRecipeId,
    imageFormat,
    reviseCaptions,
    videoTarget,
    prepared,
    restored,
  ])
  useEffect(() => {
    let live = true,
      running = false
    const refresh = async () => {
      if (running) return
      running = true
      try {
        const page = runPageSchema.parse(
          await port.request(`/projects/${project.id}/runs?entityId=${target.id}`),
        )
        if (live) {
          setRuns((old) => [
            ...page.items,
            ...old.filter((run) => !page.items.some((item) => item.request.id === run.request.id)),
          ])
          if (!loadedOlder.current) setMoreCursor(page.nextCursor)
        }
      } catch (error) {
        if (live) setError(errorMessage(error))
      } finally {
        running = false
      }
    }
    void refresh()
    const timer = setInterval(() => void refresh(), 3000)
    return () => {
      live = false
      clearInterval(timer)
    }
  }, [port, project.id, target.id])
  useEffect(() => {
    if (!handoff?.runId || handoff.entityId !== target.id) return
    let live = true
    void port
      .request(`/projects/${project.id}/runs/${handoff.runId}`)
      .then((value) => {
        if (!live) return
        const run = runViewSchema.parse(value)
        setPrepared(run.request)
        setAssignedTo(run.request.assignedTo ?? run.createdBy)
        setInstruction(run.request.instruction)
        setProvider(run.request.provider)
        setIntent(run.request.intent)
        setProtectedIds(run.request.protectedIds)
        const capability = availableCapabilities.safeParse(run.request.capability)
        if (capability.success) setCapability(capability.data)
        setVisualLayerId(run.request.visualLayerId)
        setImageRegion(run.request.imageRegion)
        setSourceAssetId(run.request.sourceAssetId)
        setCaptionSourceAssetId(run.request.captionSourceAssetId)
        setArtRecipeId(run.request.artRecipeId)
        setImageFormat(run.request.imageFormat ?? 'png')
        setReviseCaptions(run.request.reviseCaptions ?? false)
        setVideoTarget(run.request.videoTarget)
      })
      .catch((error) => {
        if (live) setError(errorMessage(error))
      })
    return () => {
      live = false
    }
  }, [handoff, port, project.id, target.id])
  const ready = Boolean(
    target.confirmed &&
      !target.pending.length &&
      !target.conflict &&
      project.permissions.includes('execute'),
  )
  async function input() {
    if (!target.confirmed || !ready)
      throw new Error('Confirme o rascunho no servidor antes de iniciar a produção')
    return contextRequestSchema.parse({
      schemaVersion: 1,
      projectId: project.id,
      entityId: target.id,
      revisionId: target.confirmed.revisionId,
      intent,
      capability,
      provider,
      instruction:
        capability === 'render'
          ? target.document.kind === 'component' && !target.document.composition
            ? 'Converter a imagem desta revisão para JPEG, mantendo suas dimensões e usando fundo branco nas transparências.'
            : 'Renderizar a composição desta revisão, sem modificar a copy nem as camadas.'
          : capability === 'transcribe'
            ? 'Transcrever a gravação selecionada, preservando legendas já corrigidas.'
            : capability === 'prepare-media'
              ? 'Preparar prévia, miniatura e forma de onda da gravação selecionada para a equipe.'
              : instruction.trim() || 'Confira o contexto desta peça',
      selection: [],
      protectedIds,
      assignedTo,
      ...(visualLayerId && ['image', 'image-edit', 'capture'].includes(capability)
        ? { visualLayerId }
        : {}),
      ...(imageRegion && capability === 'image-edit' ? { imageRegion } : {}),
      ...(sourceAssetId &&
      [
        'capture',
        'image-edit',
        'transcribe',
        'video-edit',
        'video-adapt',
        'prepare-media',
      ].includes(capability)
        ? { sourceAssetId }
        : {}),
      ...(sourceAssetId &&
      capability === 'render' &&
      target.document.kind === 'component' &&
      !target.document.composition
        ? { sourceAssetId }
        : {}),
      ...(captionSourceAssetId && capability === 'transcribe' ? { captionSourceAssetId } : {}),
      ...(artRecipeId && capability === 'layout' ? { artRecipeId } : {}),
      ...(capability === 'render' && target.document.kind === 'component' ? { imageFormat } : {}),
      ...(capability === 'video-edit' && reviseCaptions ? { reviseCaptions: true } : {}),
      ...(['video-edit', 'composition'].includes(capability) && videoTarget ? { videoTarget } : {}),
      limits: {
        timeoutMs: ['render', 'transcribe', 'prepare-media', 'composition'].includes(capability)
          ? 1800000
          : 360000,
        maxCalls: 1,
        maxVariants: intent === 'alternatives' ? 3 : 1,
        maxRepairs: 0,
      },
    })
  }
  async function task() {
    if (['research', 'image', 'image-edit'].includes(capability) && provider !== 'codex')
      throw new Error('Selecione Codex para usar esta capacidade com sua assinatura')
    const base = await input()
    let request = prepared
    if (
      !request ||
      runs.some(
        (run) => run.request.id === request?.id && ['succeeded', 'canceled'].includes(run.state),
      ) ||
      request.revisionId !== base.revisionId ||
      request.instruction !== base.instruction ||
      request.provider !== base.provider ||
      request.capability !== base.capability ||
      request.intent !== base.intent ||
      request.assignedTo !== base.assignedTo ||
      request.visualLayerId !== base.visualLayerId ||
      request.sourceAssetId !== base.sourceAssetId ||
      request.captionSourceAssetId !== base.captionSourceAssetId ||
      request.artRecipeId !== base.artRecipeId ||
      request.imageFormat !== base.imageFormat ||
      request.reviseCaptions !== base.reviseCaptions ||
      JSON.stringify(request.videoTarget) !== JSON.stringify(base.videoTarget) ||
      JSON.stringify(request.imageRegion) !== JSON.stringify(base.imageRegion) ||
      JSON.stringify(request.protectedIds) !== JSON.stringify(base.protectedIds)
    ) {
      const response = z
        .object({ context: executionContextSchema, hash: hashSchema })
        .parse(await port.request('/context', 'POST', base))
      setContext(response.context)
      request = runCreateSchema.parse({
        ...base,
        id: crypto.randomUUID(),
        operationId: crypto.randomUUID(),
        contextHash: response.hash,
      })
      // Persist exact create identity before sending. A lost response can be retried without another job.
      localStorage.setItem(
        key,
        JSON.stringify({
          instruction,
          provider,
          intent,
          capability,
          protectedIds,
          assignedTo,
          visualLayerId,
          imageRegion,
          sourceAssetId,
          captionSourceAssetId,
          artRecipeId,
          imageFormat,
          reviseCaptions,
          videoTarget,
          request,
        }),
      )
      setPrepared(request)
    }
    const run = runViewSchema.parse(await port.request('/runs', 'POST', request))
    if (assignedTo !== port.userId) {
      await onChanged()
      return
    }
    if (port.location === 'web') {
      await port.openDesktop({
        schemaVersion: 1,
        projectId: project.id,
        entityId: target.id,
        revisionId: request.revisionId,
        selection: request.selection,
        intent,
        runId: request.id,
      })
    } else if (port.execute) {
      const completed = await port.execute(project.id, run.request.id, 'start')
      setRuns((values) => [
        completed,
        ...values.filter((value) => value.request.id !== completed.request.id),
      ])
    }
    await onChanged()
  }
  async function work(operation: () => Promise<void>) {
    setBusy(true)
    setError('')
    try {
      await operation()
    } catch (error) {
      setError(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }
  const targetDoc = target.document
  const imageLayers =
    targetDoc.kind === 'component'
      ? (targetDoc.composition?.layers.filter((layer) => layer.kind === 'image') ?? [])
      : []
  const chosenImage = visualLayerId
    ? imageLayers.find((layer) => layer.id === visualLayerId)
    : imageLayers.length === 1
      ? imageLayers[0]
      : undefined
  const imageSource =
    chosenImage?.assetId ??
    (targetDoc.kind === 'component' && !targetDoc.composition
      ? (sourceAssetId ??
        (captureSources.length === 1
          ? captureSources[0]?.id
          : targetDoc.assetIds.length === 1
            ? targetDoc.assetIds[0]
            : undefined))
      : undefined)
  const formatIds =
    targetDoc.kind === 'piece'
      ? targetDoc.representationIds
      : targetDoc.kind === 'representation'
        ? [target.id]
        : []
  const protectedCandidates = entries.filter(
    (entry) =>
      entry.document.kind === 'component' && formatIds.includes(entry.document.representationId),
  )
  return (
    <section
      id={`request-${target.id}`}
      className="rounded-xl border bg-card p-5"
      aria-label="Pedido de revisão"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">O que você quer mudar?</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            O pedido usa a revisão selecionada e a direção do projeto.
          </p>
        </div>
        {!['render', 'transcribe', 'prepare-media'].includes(capability) ? (
          <label htmlFor={`${fieldId}-1`} className="text-xs font-medium">
            Sua assinatura
            <Select
              id={`${fieldId}-1`}
              className="mt-1"
              value={provider}
              disabled={busy}
              onChange={(event) => {
                if (event.target.value === 'codex' || event.target.value === 'claude') {
                  setProvider(event.target.value)
                  try {
                    localStorage.setItem(preferenceKey, event.target.value)
                  } catch (error) {
                    setError(`Não foi possível guardar a preferência: ${errorMessage(error)}`)
                  }
                }
              }}
            >
              <option value="codex">Codex</option>
              <option
                value="claude"
                disabled={['research', 'image', 'image-edit'].includes(capability)}
              >
                Claude Code
              </option>
            </Select>
          </label>
        ) : (
          <p className="text-xs text-muted-foreground">Render local · sem consumo de IA</p>
        )}
      </div>
      <label htmlFor={`${fieldId}-assignee`} className="mt-4 block text-xs font-medium">
        Responsável pela execução
        <Select
          id={`${fieldId}-assignee`}
          value={assignedTo}
          disabled={busy}
          onChange={(event) => setAssignedTo(event.target.value)}
          className="mt-1"
        >
          <option value={port.userId}>Eu, com minha assinatura</option>
          {team
            .filter(
              (member) =>
                member.id !== port.userId &&
                member.active &&
                member.permissions.includes('execute'),
            )
            .map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
        </Select>
      </label>
      {assignedTo !== port.userId ? (
        <p className="mt-2 text-xs text-muted-foreground">
          O pedido ficará no projeto para essa pessoa iniciar no próprio desktop, com sua assinatura
          e o contexto registrado aqui.
        </p>
      ) : null}
      <label htmlFor={`${fieldId}-capability`} className="mt-4 block text-xs font-medium">
        Tipo de trabalho
        <Select
          id={`${fieldId}-capability`}
          className="mt-1"
          value={capability}
          disabled={busy}
          onChange={(event) => {
            const value = availableCapabilities.safeParse(event.target.value)
            if (value.success) {
              setCapability(value.data)
              setVisualLayerId(undefined)
              setSourceAssetId(undefined)
              setImageRegion(undefined)
              setArtRecipeId(undefined)
              setCaptionSourceAssetId(undefined)
              setReviseCaptions(false)
              setVideoTarget(undefined)
              if (
                value.data === 'render' &&
                targetDoc.kind === 'component' &&
                !targetDoc.composition
              )
                setImageFormat('jpeg')
              if (value.data === 'video-adapt') setIntent('adapt')
              else if (
                ['render', 'capture', 'transcribe', 'prepare-media'].includes(value.data) ||
                (value.data !== 'copy' && intent === 'adapt')
              )
                setIntent('adjust')
            }
          }}
        >
          <option value="copy" disabled={targetDoc.kind === 'video'}>
            Produzir ou revisar texto
          </option>
          <option value="research">Pesquisar fontes públicas com Codex</option>
          {targetDoc.kind === 'video' ? (
            <>
              <option value="video-edit">Editar montagem, áudio e legendas com IA</option>
              <option value="composition">Criar ou ajustar animação com IA</option>
              <option value="transcribe">Transcrever gravação neste computador</option>
              <option value="prepare-media">Preparar prévia da gravação para a equipe</option>
              <option value="render" disabled={!targetDoc.timeline.clips.length}>
                Exportar vídeo final no computador
              </option>
            </>
          ) : null}
          {targetDoc.kind === 'component' ? (
            <>
              <option value="layout">Criar ou ajustar a montagem da arte</option>
              <option value="image">Gerar imagem com Codex</option>
              <option value="image-edit">Editar imagem com Codex</option>
              <option value="capture">Capturar projeto real do Studio</option>
              <option value="video-adapt">Transformar este item em vídeo com IA</option>
              <option
                value="render"
                disabled={!targetDoc.composition && !targetDoc.assetIds.length}
              >
                Renderizar arte final no computador
              </option>
            </>
          ) : null}
        </Select>
      </label>
      {capability === 'render' && targetDoc.kind === 'component' ? (
        <label htmlFor={`${fieldId}-image-format`} className="mt-3 block text-sm">
          Formato da arte final
          <Select
            id={`${fieldId}-image-format`}
            value={imageFormat}
            onChange={(event) => {
              const value = runCreateSchema.shape.imageFormat.parse(event.target.value)
              if (value) setImageFormat(value)
            }}
          >
            {targetDoc.composition ? <option value="png">PNG — sem perda</option> : null}
            <option value="jpeg">JPEG — para publicação automática no Instagram</option>
          </Select>
          <span className="text-muted-foreground">
            A exportação cria uma versão para conferir e aprovar. A edição anterior fica no
            histórico.
            {!targetDoc.composition
              ? ' A imagem será convertida inteira, sem reconstruir camadas. Transparências receberão fundo branco.'
              : ''}
          </span>
        </label>
      ) : null}
      {(capability === 'video-adapt' ||
        (capability === 'render' && targetDoc.kind === 'component' && !targetDoc.composition)) &&
      targetDoc.kind === 'component' ? (
        <div className="mt-3 text-sm">
          {capability === 'video-adapt' ? (
            <p>
              Somente este item da sequência será transformado. A copy e a arte serão preservadas;
              você poderá desfazer a troca pelo histórico do pedido.
            </p>
          ) : null}
          {!targetDoc.composition ? (
            <label htmlFor={`${fieldId}-animate-image`} className="mt-2 block">
              Imagem final para {capability === 'video-adapt' ? 'animar' : 'converter'}
              <Select
                id={`${fieldId}-animate-image`}
                value={sourceAssetId ?? ''}
                disabled={busy}
                onChange={(event) => setSourceAssetId(event.target.value || undefined)}
              >
                <option value="">Usar a imagem final, quando houver uma só</option>
                {captureSources
                  .filter((asset) => targetDoc.assetIds.includes(asset.id))
                  .map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.name}
                    </option>
                  ))}
              </Select>
              <span className="mt-1 block text-xs text-muted-foreground">
                Este arquivo será usado como imagem. Para editar textos separadamente, crie primeiro
                uma montagem com camadas.
              </span>
            </label>
          ) : null}
        </div>
      ) : null}
      {['video-edit', 'composition'].includes(capability) ? (
        <div>
          <div className="mt-3 rounded-lg border p-3 text-sm">
            <p>Demonstre uma decisão com capturas vinculadas às fontes da pauta.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {Object.values(DEMONSTRATION_RECIPES).map((recipe) => (
                <Button
                  key={recipe.label}
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => {
                    const next = [
                      instruction.trim(),
                      `Use a demonstração “${recipe.label}” com as fontes factuais disponíveis. Preserve os fatos, a copy protegida e o CTA; não invente uma gravação a partir de imagens.`,
                    ]
                      .filter(Boolean)
                      .join('\n\n')
                    if (next.length > 12000)
                      setError(
                        'O pedido atingiu o limite; reduza o texto antes de acrescentar um exemplo.',
                      )
                    else setInstruction(next)
                  }}
                >
                  {recipe.label}
                </Button>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              O exemplo só preenche o pedido. Confira as imagens e as evidências antes de produzir;
              você também pode descrever livremente o que quer mostrar.
            </p>
          </div>
          {capability === 'composition' ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Descreva a animação ou o detalhe que deseja mudar. A IA cria a cena no desktop; a
              prévia e o histórico ficam disponíveis para a equipe no web e no desktop. Gravações,
              áudio e outras cenas permanecem na montagem.
            </p>
          ) : null}
          {targetDoc.kind === 'video' ? (
            <>
              <label htmlFor={`${fieldId}-video-scene`} className="mt-3 block text-sm">
                Parte da montagem
                <Select
                  id={`${fieldId}-video-scene`}
                  value={videoTarget?.clipId ?? ''}
                  disabled={busy}
                  onChange={(event) =>
                    setVideoTarget(
                      event.target.value
                        ? { clipId: event.target.value, part: 'scene' }
                        : undefined,
                    )
                  }
                >
                  <option value="">
                    {capability === 'composition' ? 'Escolha uma cena gráfica' : 'Montagem inteira'}
                  </option>
                  {targetDoc.timeline.clips.map((clip, index) => (
                    <option
                      key={clip.id}
                      value={clip.id}
                      disabled={
                        capability === 'composition' &&
                        Boolean(compositionSceneError(targetDoc.timeline, clip))
                      }
                    >
                      Cena {index + 1}:{' '}
                      {clip.demonstration?.headline ??
                        (clip.generated?.input.title ||
                          clip.generated?.input.body.slice(0, 60) ||
                          clip.text?.slice(0, 60)) ??
                        clip.art?.title ??
                        (clip.kind === 'audio' ? 'Áudio' : 'Imagem ou vídeo')}
                      {capability === 'composition' &&
                      compositionSceneError(targetDoc.timeline, clip)
                        ? ` · ${compositionSceneError(targetDoc.timeline, clip)}`
                        : ''}
                    </option>
                  ))}
                </Select>
              </label>
              {videoTarget ? (
                <label htmlFor={`${fieldId}-video-part`} className="mt-3 block text-sm">
                  O que pode mudar nesta cena
                  <Select
                    id={`${fieldId}-video-part`}
                    value={videoTarget.part}
                    disabled={busy}
                    onChange={(event) => {
                      const part = z.enum(['scene', 'text', 'effect']).parse(event.target.value)
                      setVideoTarget({ ...videoTarget, part })
                    }}
                  >
                    <option value="scene">Cena selecionada</option>
                    <option
                      value="text"
                      disabled={
                        !targetDoc.timeline.clips.find(
                          (clip) =>
                            clip.id === videoTarget.clipId &&
                            (capability === 'composition'
                              ? Boolean(clip.generated)
                              : clip.kind === 'text' || Boolean(clip.demonstration)),
                        )
                      }
                    >
                      Somente o texto
                    </option>
                    <option value="effect">
                      {capability === 'composition'
                        ? 'Animação, preservando o texto'
                        : 'Somente o efeito'}
                    </option>
                  </Select>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    As demais cenas, as legendas e a duração da montagem ficam preservadas. Para
                    reorganizar cortes ou tempos, use Editar montagem.
                  </span>
                </label>
              ) : null}
            </>
          ) : null}
          {capability === 'video-edit' ? (
            <>
              <label htmlFor={`${fieldId}-analysis-source`} className="mt-3 block text-sm">
                Gravação para analisar neste pedido
                <Select
                  id={`${fieldId}-analysis-source`}
                  disabled={busy}
                  value={sourceAssetId ?? ''}
                  onChange={(event) => setSourceAssetId(event.target.value || undefined)}
                >
                  <option value="">Analisar as primeiras três gravações vinculadas</option>
                  {captureSources.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.name}
                    </option>
                  ))}
                </Select>
                <span className="mt-1 block text-xs text-muted-foreground">
                  A IA recebe pausas e seis imagens de cada vídeo analisado. As demais mídias
                  continuam disponíveis na montagem; selecione uma gravação para analisar seus
                  trechos.
                </span>
              </label>
              <label className="mt-3 flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={reviseCaptions}
                  onChange={(event) => setReviseCaptions(event.target.checked)}
                />
                Revisar também as legendas já corrigidas, conforme o pedido
              </label>
            </>
          ) : null}
        </div>
      ) : null}
      {capability === 'layout' ? (
        <label htmlFor={`${fieldId}-recipe`} className="mt-3 block text-sm">
          Padrão visual
          <Select
            id={`${fieldId}-recipe`}
            disabled={busy}
            value={artRecipeId ?? ''}
            onChange={(event) =>
              setArtRecipeId(
                event.target.value ? artRecipeIdSchema.parse(event.target.value) : undefined,
              )
            }
          >
            <option value="">Manter direção e montagem atuais</option>
            {artRecipeIdSchema.options.map((recipe) => (
              <option key={recipe} value={recipe}>
                {ART_RECIPES[recipe].label}
              </option>
            ))}
          </Select>
          {artRecipeId ? (
            <span className="mt-1 block text-xs text-muted-foreground">
              {ART_RECIPES[artRecipeId].guidance}
            </span>
          ) : null}
        </label>
      ) : null}
      {['transcribe', 'prepare-media'].includes(capability) ? (
        <>
          <label htmlFor={`${fieldId}-recording`} className="mt-3 block text-sm">
            {capability === 'transcribe' ? 'Gravação para transcrever' : 'Gravação para preparar'}
            <Select
              id={`${fieldId}-recording`}
              className="mt-1"
              value={sourceAssetId ?? ''}
              onChange={(event) => setSourceAssetId(event.target.value || undefined)}
            >
              <option value="">Escolha uma gravação vinculada</option>
              {captureSources.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.name}
                </option>
              ))}
            </Select>
            <span className="mt-1 block text-xs text-muted-foreground">
              {capability === 'transcribe'
                ? 'Instale a transcrição local nas ferramentas do app desktop. As legendas acompanham os cortes.'
                : 'A preparação acontece no desktop. A prévia compatível, a miniatura e a forma de onda serão sincronizadas para a equipe.'}
            </span>
          </label>
          {capability === 'transcribe' ? (
            <label htmlFor={`${fieldId}-srt`} className="mt-3 block text-sm">
              Origem das legendas
              <Select
                id={`${fieldId}-srt`}
                className="mt-1"
                value={captionSourceAssetId ?? ''}
                onChange={(event) => setCaptionSourceAssetId(event.target.value || undefined)}
              >
                <option value="">Transcrever áudio com IA local</option>
                {captionFiles.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    Usar SRT: {asset.name}
                  </option>
                ))}
              </Select>
            </label>
          ) : null}
        </>
      ) : null}
      {capability === 'capture' ? (
        <label htmlFor={`${fieldId}-capture`} className="mt-3 block text-sm">
          Projeto de origem
          <Select
            id={`${fieldId}-capture`}
            disabled={busy}
            value={sourceAssetId ?? ''}
            onChange={(event) => setSourceAssetId(event.target.value || undefined)}
          >
            <option value="">Selecione um projeto Studio</option>
            {captureSources.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.name}
              </option>
            ))}
          </Select>
          <span className="mt-1 block text-xs text-muted-foreground">
            Em Arquivos do projeto, envie o JSON exportado pelo Studio e use “Usar como referência”
            neste componente. Peça a tela ou os blocos e descreva o estado desejado.
          </span>
        </label>
      ) : null}
      {capability === 'image-edit' && targetDoc.kind === 'component' && !targetDoc.composition ? (
        <label htmlFor={`${fieldId}-source-image`} className="mt-3 block text-sm">
          Imagem de origem
          <Select
            id={`${fieldId}-source-image`}
            value={sourceAssetId ?? ''}
            disabled={busy}
            onChange={(event) => {
              setSourceAssetId(event.target.value || undefined)
              setImageRegion(undefined)
            }}
          >
            <option value="">Selecione a referência da peça</option>
            {captureSources.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.name}
              </option>
            ))}
          </Select>
        </label>
      ) : null}
      {targetDoc.kind === 'component' &&
      !targetDoc.composition &&
      targetDoc.assetIds.length > 0 &&
      ['image-edit', 'layout'].includes(capability) ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Este arquivo ainda não tem camadas editáveis. Editar imagem modifica o raster; para
          separar a copy, use “Criar ou ajustar a montagem” e peça uma reconstrução. O original
          permanece no histórico. Confira a fidelidade e os textos antes de usar a nova arte.
        </p>
      ) : null}
      {['image', 'image-edit', 'capture'].includes(capability) &&
      targetDoc.kind === 'component' &&
      targetDoc.composition ? (
        <label htmlFor={`${fieldId}-image`} className="mt-3 block text-sm">
          Imagem da montagem
          <Select
            id={`${fieldId}-image`}
            value={visualLayerId ?? ''}
            onChange={(event) => {
              setVisualLayerId(event.target.value || undefined)
              setImageRegion(undefined)
            }}
          >
            <option value="">Selecionar automaticamente quando houver uma imagem</option>
            {targetDoc.composition.layers
              .filter((layer) => layer.kind === 'image')
              .map((layer, index) => (
                <option key={layer.id} value={layer.id} disabled={layer.protected}>
                  Imagem {index + 1}
                  {layer.protected ? ' · protegida' : ''}
                </option>
              ))}
          </Select>
        </label>
      ) : null}
      {protectedCandidates.length ? (
        <details className="mt-3 rounded-lg border p-3">
          <summary className="cursor-pointer text-sm font-medium">
            Preservar componentes neste pedido
          </summary>
          <div className="mt-3 space-y-2">
            {protectedCandidates.map((entry) => (
              <label key={entry.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={protectedIds.includes(entry.id)}
                  disabled={busy}
                  onChange={(event) =>
                    setProtectedIds((old) =>
                      event.target.checked
                        ? [...old, entry.id]
                        : old.filter((id) => id !== entry.id),
                    )
                  }
                />
                {entry.document.title}
              </label>
            ))}
          </div>
        </details>
      ) : null}
      {capability === 'image-edit' && imageSource ? (
        <ImageRegionPicker
          key={imageSource}
          port={port}
          projectId={project.id}
          assetId={imageSource}
          value={imageRegion}
          onChange={setImageRegion}
          disabled={busy}
        />
      ) : null}
      <div className="my-4 flex flex-wrap gap-2">
        {(
          [
            { id: 'adjust', label: 'Ajustar' },
            { id: 'alternatives', label: 'Gerar alternativas' },
            { id: 'adapt', label: 'Adaptar formato' },
          ] as const
        ).map((value) => (
          <Button
            key={value.id}
            size="sm"
            disabled={
              busy ||
              (value.id === 'adapt' && target.document.kind === 'analysis') ||
              (value.id === 'adapt' && !['copy', 'video-adapt'].includes(capability)) ||
              (capability === 'video-adapt' && value.id !== 'adapt') ||
              (['render', 'capture', 'transcribe', 'prepare-media'].includes(capability) &&
                value.id !== 'adjust')
            }
            aria-pressed={intent === value.id}
            variant={intent === value.id ? 'secondary' : 'ghost'}
            onClick={() => setIntent(value.id)}
          >
            {value.label}
          </Button>
        ))}
      </div>
      {!['render', 'transcribe', 'prepare-media'].includes(capability) ? (
        <label htmlFor={`${fieldId}-2`} className="block text-sm font-medium">
          Pedido
          <Textarea
            id={`${fieldId}-2`}
            className="mt-2"
            rows={4}
            maxLength={12000}
            value={instruction}
            disabled={busy}
            onChange={(event) => setInstruction(event.target.value)}
            placeholder="Ex.: deixe a abertura mais direta e preserve a chamada para ação."
          />
        </label>
      ) : (
        <p className="text-sm text-muted-foreground">
          {capability === 'render'
            ? targetDoc.kind === 'video'
              ? 'Exportar esta revisão em MP4, com as mídias e o áudio da montagem.'
              : `Exportar esta revisão em ${imageFormat.toUpperCase()}. Se a copy não couber, o app pedirá um ajuste na montagem.`
            : capability === 'transcribe'
              ? 'Criar legendas para a gravação selecionada, preservando as correções anteriores.'
              : 'Preparar prévia, miniatura e forma de onda da gravação para a equipe.'}
        </p>
      )}
      {!ready ? (
        <p className="mt-3 text-xs text-muted-foreground">
          A produção fica disponível quando o rascunho estiver confirmado e sua conta tiver
          permissão de execução.
        </p>
      ) : null}
      {port.location === 'web' ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Requer app desktop. O pedido e a revisão serão abertos no Electron; o resultado volta para
          este projeto.
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap justify-between gap-2">
        <Button
          variant="ghost"
          disabled={!ready || busy}
          onClick={() =>
            void work(async () => {
              const response = z
                .object({ context: executionContextSchema, hash: hashSchema })
                .parse(await port.request('/context', 'POST', await input()))
              setContext(response.context)
            })
          }
        >
          Ver contexto usado
        </Button>
        <Button
          disabled={
            !ready ||
            busy ||
            (!['render', 'transcribe', 'prepare-media'].includes(capability) &&
              !instruction.trim()) ||
            (['transcribe', 'prepare-media'].includes(capability) && !sourceAssetId) ||
            (capability === 'composition' && !videoTarget) ||
            !restored
          }
          onClick={() => void work(task)}
        >
          {busy
            ? 'Processando pedido…'
            : assignedTo !== port.userId
              ? 'Encaminhar pedido à pessoa'
              : port.location === 'web'
                ? 'Abrir pedido no desktop'
                : 'Executar pedido'}
        </Button>
      </div>
      {error ? (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {!restored ? (
        <Button
          className="mt-3"
          variant="outline"
          disabled={busy}
          onClick={() => {
            try {
              const original = preserveInvalidRequest(localStorage, key)
              if (original !== null)
                setRecovery((previous) => [...new Set([...previous, original])])
              setInstruction('')
              setPrepared(null)
              setProtectedIds([])
              setRestored(true)
              setError('')
            } catch (error) {
              setError(errorMessage(error))
            }
          }}
        >
          Preservar pedido anterior e começar outro
        </Button>
      ) : null}
      {recovery.length ? (
        <details className="mt-3 rounded-lg border p-3">
          <summary className="cursor-pointer text-sm">
            Pedidos locais recuperados · {recovery.length}
          </summary>
          <p className="my-2 text-xs text-muted-foreground">
            O conteúdo original foi preservado. Copie o trecho que deseja usar em um novo pedido.
          </p>
          {recovery.map((value, index) => (
            <Textarea
              key={value}
              aria-label={`Pedido recuperado ${index + 1}`}
              readOnly
              rows={4}
              value={value}
              className="mt-2"
            />
          ))}
        </details>
      ) : null}
      {context ? (
        <details className="mt-4 rounded-lg border p-3" open>
          <summary className="cursor-pointer text-sm font-medium">
            Contexto confirmado · {context.directions.length} direções · {context.evidence.length}{' '}
            fontes · {context.memory.length} resumos ou decisões
          </summary>
          <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
            {[
              ...new Map(
                [
                  context.source,
                  ...context.ancestors,
                  ...context.directions,
                  ...context.evidence,
                  ...context.memory,
                ].map((revision) => [revision.id, revision]),
              ).values(),
            ].map((item) => (
              <li key={item.id}>
                {item.document.title} · revisão {item.id.slice(0, 8)}
                {'source' in item.document ? ` · ${item.document.source.label}` : ''}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
      {runs.length ? (
        <div className="mt-5 space-y-3 border-t pt-4">
          <h4 className="text-sm font-semibold">Pedidos e resultados</h4>
          {runs.map((run) => (
            <article key={run.request.id} className="rounded-lg border p-3 text-sm">
              <div className="flex justify-between gap-3">
                <p className="font-medium">{run.request.instruction}</p>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {executionStateLabels[run.state]}
                </span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Responsável:{' '}
                {team.find((member) => member.id === (run.request.assignedTo ?? run.createdBy))
                  ?.name ?? 'Conta da equipe'}{' '}
                · {run.request.provider === 'codex' ? 'Codex' : 'Claude Code'}
              </p>
              {run.attempt?.checkpoint.stage && run.state === 'running' ? (
                <p className="mt-2 text-xs text-muted-foreground">{run.attempt.checkpoint.stage}</p>
              ) : null}
              {run.outcome?.status === 'succeeded' ? (
                run.outcome.editorial || run.outcome.art || run.outcome.video ? (
                  <ProposalResult
                    run={run}
                    port={port}
                    editable={project.permissions.includes('edit')}
                    onChanged={onChanged}
                  />
                ) : run.outcome.research ? (
                  <>
                    <ResearchReadout evidence={run.outcome.research} />
                    {project.permissions.includes('edit') ? (
                      <Button
                        className="mt-3"
                        variant="outline"
                        disabled={busy}
                        onClick={() =>
                          void work(async () => {
                            await port.saveBatch(await researchBatch(run))
                            await onChanged()
                          })
                        }
                      >
                        Guardar pesquisa no projeto
                      </Button>
                    ) : null}
                  </>
                ) : (
                  <>
                    <p className="mt-3 whitespace-pre-wrap leading-relaxed">{run.outcome.text}</p>
                    {project.permissions.includes('edit') ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(['summary', 'decision'] as const).map((type) => (
                          <Button
                            key={type}
                            variant="outline"
                            size="sm"
                            disabled={busy}
                            onClick={() =>
                              void work(async () => {
                                await port.save(await memoryOperation(run, type), null)
                                await onChanged()
                              })
                            }
                          >
                            {type === 'summary' ? 'Guardar como resumo' : 'Registrar como decisão'}
                          </Button>
                        ))}
                      </div>
                    ) : null}
                  </>
                )
              ) : run.outcome ? (
                <p role="status" className="mt-2 text-destructive">
                  {run.outcome.message}
                </p>
              ) : null}
              {port.execute &&
              (run.request.assignedTo ?? run.createdBy) === port.userId &&
              run.state === 'queued' ? (
                <Button
                  className="mt-3"
                  size="sm"
                  disabled={busy}
                  onClick={() =>
                    void work(async () => {
                      await port.execute?.(project.id, run.request.id, 'start')
                      await onChanged()
                    })
                  }
                >
                  Executar no computador
                </Button>
              ) : null}
              {port.execute &&
              (run.request.assignedTo ?? run.createdBy) === port.userId &&
              (run.state === 'failed' || run.state === 'waiting' || run.leaseExpired) ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() =>
                      void work(async () => {
                        await port.execute?.(project.id, run.request.id, 'resume')
                        await onChanged()
                      })
                    }
                  >
                    Retomar resultado local
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() =>
                      void work(async () => {
                        await port.execute?.(project.id, run.request.id, 'regenerate')
                        await onChanged()
                      })
                    }
                  >
                    Solicitar nova geração
                  </Button>
                </div>
              ) : null}
            </article>
          ))}
          {moreCursor ? (
            <Button
              variant="outline"
              disabled={busy}
              onClick={() =>
                void work(async () => {
                  const page = runPageSchema.parse(
                    await port.request(
                      `/projects/${project.id}/runs?entityId=${target.id}&before=${moreCursor}`,
                    ),
                  )
                  setRuns((old) => [
                    ...old,
                    ...page.items.filter(
                      (item) => !old.some((run) => run.request.id === item.request.id),
                    ),
                  ])
                  loadedOlder.current = true
                  setMoreCursor(page.nextCursor)
                })
              }
            >
              Carregar pedidos anteriores
            </Button>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
