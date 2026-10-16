import { randomUUID } from 'node:crypto'
import { setTimeout as delay } from 'node:timers/promises'
import { assetManifestSchema } from '../../../../marketing-contracts/src/assets'
import {
  type ExecutionRun,
  type Heartbeat,
  runViewSchema,
} from '../../../../marketing-contracts/src/execution'
import type { WorkspaceRequest } from '../../shared/connection'
import { mediaMetadata } from '../media/probe-image'
import type { DesktopWorkspaceManager } from '../sync/workspace-manager'
import {
  completedResultSchema,
  type ExecutionJournal,
  executionJournalSchema,
  type ProductionResult,
} from './journal'

export type ExecutionResources = Awaited<ReturnType<DesktopWorkspaceManager['resources']>>
export type ProductionExecutor = (
  run: ExecutionRun,
  resources: ExecutionResources,
  signal: AbortSignal,
  progress: (stage: string) => void,
) => Promise<ProductionResult>
export type ExecuteSelection = {
  scope: WorkspaceRequest['scope']
  projectId: string
  runId: string
  strategy: 'start' | 'resume' | 'regenerate'
}
/** Owns one heavy job per device. Every paid/subscription call requires a server lease first. */
export class ExecutionSupervisor {
  private active:
    | {
        selection: ExecuteSelection
        controller: AbortController
        flight: Promise<ExecutionRun>
        resources: Promise<ExecutionResources>
      }
    | undefined
  private paused = false
  constructor(
    private readonly manager: Pick<DesktopWorkspaceManager, 'resources'>,
    private readonly execute: ProductionExecutor,
    private readonly progress: (stage: string) => void,
  ) {}
  setPaused(value: boolean) {
    this.paused = value
  }
  get busy() {
    return Boolean(this.active)
  }
  run(selection: ExecuteSelection) {
    if (this.paused) throw new Error('Novos trabalhos estão pausados na bandeja do app')
    if (this.active) throw new Error('Já existe um trabalho em andamento neste computador')
    const controller = new AbortController()
    const resources = this.manager.resources(selection.scope, selection.projectId)
    const flight = this.perform(selection, controller, resources).finally(() => {
      this.active = undefined
    })
    this.active = { selection, controller, flight, resources }
    return flight
  }
  async stop() {
    this.active?.controller.abort(
      new Error('O app está encerrando; o resultado local será preservado'),
    )
    await this.active?.flight.catch(() => undefined)
  }
  async cancel() {
    const active = this.active
    if (!active) return
    // Local work stops immediately even when the server is unreachable. The intent is durable.
    active.controller.abort(new Error('Trabalho cancelado'))
    const resources = await active.resources
    const cancellation = resources.store.stageCancellation(
      active.selection.projectId,
      active.selection.runId,
      randomUUID(),
    )
    if (cancellation.state === 'confirmed') return
    runViewSchema.parse(
      await resources.transport.request(
        `/projects/${active.selection.projectId}/runs/${active.selection.runId}/cancel`,
        'POST',
        { operationId: cancellation.operationId },
      ),
    )
    resources.store.settleCancellation(active.selection.runId, 'confirmed')
  }
  private async perform(
    selection: ExecuteSelection,
    controller: AbortController,
    resourcesPromise: Promise<ExecutionResources>,
  ): Promise<ExecutionRun> {
    const resources = await resourcesPromise,
      { store, transport } = resources
    const route = `/projects/${selection.projectId}/runs/${selection.runId}`
    let run = runViewSchema.parse(await transport.request(route))
    controller.signal.throwIfAborted()
    if (store.cancellation(selection.runId))
      throw new Error(
        'Este trabalho foi cancelado neste computador; crie outro pedido para gerar novamente',
      )
    if ((run.request.assignedTo ?? run.createdBy) !== selection.scope.userId)
      throw new Error('Este trabalho usa a assinatura da pessoa responsável pela execução')
    if (run.state === 'succeeded') return run
    const previous = store.execution(selection.runId)
    const journal: ExecutionJournal = previous
      ? executionJournalSchema.parse(previous)
      : {
          schemaVersion: 1,
          runId: selection.runId,
          projectId: selection.projectId,
          contextHash: run.request.contextHash,
          claim: {
            operationId: randomUUID(),
            expectedEpoch: run.epoch,
            retry: selection.strategy !== 'start',
          },
          stage: 'prepared',
          result: null,
          previousResults: [],
          finish: null,
          error: null,
        }
    const persist = () =>
      store.saveExecution(
        selection.projectId,
        selection.runId,
        executionJournalSchema.parse(journal),
      )
    if (
      journal.projectId !== selection.projectId ||
      journal.contextHash !== run.request.contextHash
    )
      throw new Error('O resultado local pertence a outro contexto')
    if (previous && selection.strategy === 'start' && journal.stage !== 'prepared')
      throw new Error(
        'Há uma tentativa anterior. Escolha retomar o resultado ou solicitar uma nova geração.',
      )
    if (
      selection.strategy === 'resume' &&
      !journal.result &&
      !['render', 'transcribe', 'prepare-media'].includes(run.request.capability)
    )
      throw new Error(
        'A tentativa foi interrompida antes de salvar um resultado. Uma nova geração exige sua confirmação.',
      )
    if (selection.strategy === 'regenerate') {
      if (journal.result) journal.previousResults.push(journal.result)
      journal.result = null
      journal.finish = null
      journal.stage = 'prepared'
    }
    // Reuse a live attempt only on this very device; server checks device ownership on every heartbeat.
    const resumeLive =
      selection.strategy === 'resume' && run.state === 'running' && !run.leaseExpired
    if (!resumeLive && selection.strategy !== 'start') {
      journal.claim = { operationId: randomUUID(), expectedEpoch: run.epoch, retry: true }
      journal.finish = null
    }
    persist()
    controller.signal.throwIfAborted()
    if (!resumeLive)
      run = runViewSchema.parse(await transport.request(`${route}/claim`, 'POST', journal.claim))
    const attempt = run.attempt
    if (!attempt || run.state !== 'running')
      throw new Error('O servidor não concedeu esta tentativa')
    let checkpoint: Heartbeat['checkpoint'] = {
      ...attempt.checkpoint,
      stage: 'Preparando produção',
    }
    let heartbeat: Promise<void> | undefined
    const beat = async () => {
      const received = runViewSchema.parse(
        await transport.request(`${route}/heartbeat`, 'POST', {
          operationId: randomUUID(),
          attemptId: attempt.id,
          epoch: attempt.epoch,
          checkpoint,
        }),
      )
      if (received.state !== 'running' || received.attempt?.id !== attempt.id)
        throw new Error('A execução perdeu a autorização do servidor')
    }
    await beat()
    controller.signal.throwIfAborted()
    const renewal = setInterval(() => {
      heartbeat ??= beat()
        .catch((error) => controller.abort(error))
        .finally(() => {
          heartbeat = undefined
        })
    }, 15000)
    let computeTimeout: ReturnType<typeof setTimeout> | undefined
    try {
      if (!journal.result) {
        if (checkpoint.phase !== 'working')
          throw new Error(
            'Esta tentativa já iniciou o envio. Recupere o resultado local antes de continuar.',
          )
        journal.stage = 'generating'
        persist()
        computeTimeout = setTimeout(
          () => controller.abort(new Error('A produção atingiu o limite deste pedido')),
          run.request.limits.timeoutMs,
        )
        journal.result = completedResultSchema.parse(
          await this.execute(run, resources, controller.signal, (stage) => {
            checkpoint = { ...checkpoint, stage }
            this.progress(stage)
          }),
        )
        clearTimeout(computeTimeout)
        // Persist before transfer or any acknowledgement. Never rerun inference to repair a network failure.
        journal.stage = 'result'
        persist()
      }
      controller.signal.throwIfAborted()
      if (checkpoint.phase === 'working') {
        checkpoint = {
          ...checkpoint,
          phase: 'transferring',
          stage: 'Enviando arquivos ao acervo',
          artifactIds: journal.result.assetIds,
        }
        await heartbeat
        await beat()
      }
      journal.stage = 'transferring'
      persist()
      const transferTimeout = setTimeout(
        () =>
          controller.abort(
            new Error('O envio atingiu o limite de 30 minutos; o resultado foi preservado'),
          ),
        30 * 60 * 1000,
      )
      try {
        for (const id of journal.result.assetIds) {
          controller.signal.throwIfAborted()
          const { asset, path: assetPath } = await resources.assets.verify(id)
          const { url: _url, ...identity } = asset
          const recording = journal.result.recordingAnalysis?.find((item) =>
            item.samples.some((sample) => sample.assetId === id),
          )
          const preparation = journal.result.mediaPreparation
          const preparedRole =
            preparation?.proxyAssetId === id
              ? 'proxy'
              : preparation?.thumbnailAssetId === id
                ? 'thumbnail'
                : preparation?.waveformAssetId === id
                  ? 'waveform'
                  : undefined
          const manifest = assetManifestSchema.parse({
            ...identity,
            schemaVersion: 1,
            projectId: selection.projectId,
            role:
              journal.result.art?.variants.some((variant) => variant.finalAssetId === id) ||
              journal.result.video?.variants.some((variant) => variant.finalAssetId === id)
                ? 'final'
                : (preparedRole ?? (recording ? 'thumbnail' : 'original')),
            sourceAssetId:
              journal.result.capture?.assetId === id
                ? journal.result.capture.sourceAssetId
                : preparedRole
                  ? preparation?.sourceAssetId
                  : (recording?.assetId ?? null),
            ...(await mediaMetadata(assetPath, asset.mime, controller.signal)),
          })
          const input = store.stageTransfer({ operationId: randomUUID(), manifest })
          let view = await resources.transfer.upload(input, controller.signal, (progress) => {
            checkpoint = { ...checkpoint, progress }
            this.progress('Enviando o resultado para a equipe')
          })
          while (view.state !== 'confirmed') {
            if (view.state === 'failed')
              throw new Error(view.error ?? 'O servidor recusou o arquivo')
            await delay(1500, undefined, { signal: controller.signal })
            view = await resources.transfer.confirm(selection.projectId, id)
          }
        }
        controller.signal.throwIfAborted()
        checkpoint = {
          ...checkpoint,
          phase: 'finalizing',
          stage: 'Confirmando resultado',
          progress: 1,
        }
        await heartbeat
        await beat()
        journal.finish ??= {
          operationId: randomUUID(),
          attemptId: attempt.id,
          epoch: attempt.epoch,
          outcome: journal.result,
        }
        journal.stage = 'completing'
        persist()
        const final = runViewSchema.parse(
          await transport.request(`${route}/finish`, 'POST', journal.finish),
        )
        journal.stage = 'confirmed'
        journal.error = null
        persist()
        this.progress('Resultado sincronizado e pronto para conferir')
        return final
      } finally {
        clearTimeout(transferTimeout)
      }
    } catch (error) {
      journal.stage = 'interrupted'
      journal.error = (error instanceof Error ? error.message : 'Produção interrompida').slice(
        0,
        1000,
      )
      persist()
      if (!journal.result && !store.cancellation(selection.runId)) {
        journal.finish ??= {
          operationId: randomUUID(),
          attemptId: attempt.id,
          epoch: attempt.epoch,
          outcome: {
            status: 'failed',
            code: controller.signal.aborted ? 'TIMEOUT' : 'PROVIDER_FAILED',
            message: journal.error,
          },
        }
        persist()
        try {
          await transport.request(`${route}/finish`, 'POST', journal.finish)
        } catch {
          journal.error = `${journal.error.slice(0, 800)} A falha ainda não foi confirmada no servidor; a concessão será encerrada ao expirar.`
          persist()
        }
      }
      throw error
    } finally {
      clearTimeout(computeTimeout)
      clearInterval(renewal)
      await heartbeat
    }
  }
}
