import 'server-only'
import type { StudioAiActor, StudioAiRunRequest } from '@sistemazero/core/ai-credits'
import { awaitWithSignal } from '@sistemazero/core/http'
import {
  applyStudioProChange,
  isStudioProTemplateId,
  STUDIO_PRO_BUILDER_LIMITS,
  type StudioProBuilderCommand,
  type StudioProBuilderJob,
  type StudioProBuilderResult,
  studioProChangeScopeIssue,
} from '@sistemazero/core/studio'
import { z } from 'zod'
import type { MembersClient } from './clients'
import { completePensaJson, PensaLlmError } from './pensa-llm'
import { createStudioAiTransport } from './studio-ai-transport'
import type { StudioBuilderRuntimeOptions } from './studio-builder-runtime'
import {
  inspectStudioBuilder,
  prepareStudioBuilderContext,
  proposeStudioBuilder,
  studioBuilderAnswerSchema,
  studioBuilderSystem,
} from './studio-builder-tools'
import {
  prepareStudioProDependencies,
  requestStudioProBuild,
  StudioProRuntimeUpstreamError,
} from './studio-pro-runtime'
import { runStudioPythonBuilderValidation } from './studio-python-builder'
import { redactZappySensitiveText } from './zappy-safety'

function javaScriptRuntime(input: StudioBuilderRuntimeOptions) {
  if (!input.runtimeUrl || !input.runtimeToken)
    throw new Error('O serviço JavaScript está indisponível neste ambiente.')
  return { runtimeUrl: input.runtimeUrl, runtimeToken: input.runtimeToken }
}

export function studioBuilderBudget(job: StudioProBuilderJob): StudioAiRunRequest {
  return {
    runId: job.id,
    projectId: job.projectId,
    purpose: 'builder',
    model: job.model,
    inputBytes: 98_304,
    maxOutputTokens: 8_000,
    maxAttempts: STUDIO_PRO_BUILDER_LIMITS.maxModelCalls,
  }
}

/** One durable lease does exactly one model call OR one validation. Replaying never redispatches. */
export async function advanceStudioBuilder(
  input: {
    members: Pick<MembersClient, 'studioAiUsage' | 'studioBuilder'>
    actor: StudioAiActor
    id: string
    projectId: string
    parentOrigin: string
    signal?: AbortSignal
  } & StudioBuilderRuntimeOptions,
): Promise<StudioProBuilderJob | null> {
  const call = async (command: StudioProBuilderCommand, operationSignal = input.signal) => {
    operationSignal?.throwIfAborted()
    const response = operationSignal
      ? await awaitWithSignal(
          () => input.members.studioBuilder(input.actor, command, operationSignal),
          operationSignal,
        )
      : await input.members.studioBuilder(input.actor, command)
    operationSignal?.throwIfAborted()
    if (response.status !== 200 || !response.body)
      throw new Error(
        'A execução persistida mudou ou está indisponível. Consulte seu estado antes de continuar.',
      )
    return response.body.state
  }
  const claimed = await call({ operation: 'claim', id: input.id, projectId: input.projectId })
  if (!claimed) return null
  const { job, token } = claimed
  const python = job.base.version === 2 && job.base.configuration.programmingLanguage === 'python'
  const finish = async () => {
    try {
      const response = await input.members.studioAiUsage(input.actor, {
        operation: 'finish',
        runId: job.id,
      })
      if (response.status !== 200)
        console.error('[studio-builder] ledger closure pending', {
          jobId: job.id,
          status: response.status,
        })
    } catch {
      console.error('[studio-builder] ledger closure pending', { jobId: job.id })
    }
  }
  if (!token) {
    if (['review', 'failed', 'cancelled'].includes(job.phase) && job.modelCalls > 0) await finish()
    return job
  }
  const leaseRemaining = new Date(job.leaseUntil!).getTime() - Date.now() - 1000
  const deadline = AbortSignal.timeout(Math.max(1, leaseRemaining))
  const signal = input.signal ? AbortSignal.any([input.signal, deadline]) : deadline
  const checkpoint = async (
    phase: 'queued' | 'validating' | 'review' | 'failed',
    result: StudioProBuilderResult | null,
    error: string | null,
    notes = job.notes,
  ) => {
    const state = await call(
      {
        operation: 'checkpoint',
        id: job.id,
        projectId: job.projectId,
        token,
        version: job.version,
        phase,
        result,
        error,
        cost: job.cost,
        notes: notes.slice(-6),
      },
      signal,
    )
    if (phase === 'review' || phase === 'failed') await finish()
    return state?.job ?? null
  }
  const repairOrFail = (message: string, result = job.result, retryable = true) => {
    const safe = redactZappySensitiveText(message).text.slice(0, 16000)
    const retry =
      retryable &&
      !signal.aborted &&
      job.modelCalls < STUDIO_PRO_BUILDER_LIMITS.maxModelCalls &&
      new Date(job.deadlineAt).getTime() - Date.now() > 30_000
    return checkpoint(retry ? 'queued' : 'failed', result, safe.slice(0, 2000), [
      ...job.notes,
      `Verificação do sistema: ${safe}`.slice(0, 16000),
    ])
  }
  if ((python && !input.pythonRuntime) || (!python && (!input.runtimeUrl || !input.runtimeToken)))
    return checkpoint(
      'failed',
      job.result,
      'O serviço desta linguagem está indisponível. Seu projeto foi preservado.',
    )
  if (job.phase === 'generating') {
    const request = studioBuilderBudget(job)
    let responseReceived = false
    try {
      const reserved = await input.members.studioAiUsage(input.actor, {
        operation: 'reserve',
        request,
      })
      const reservation = reserved.status === 200 ? reserved.body?.reservation : undefined
      if (!reservation?.allowed)
        return checkpoint(
          'failed',
          job.result,
          reservation && !reservation.allowed
            ? `Não foi possível reservar o uso de IA (${reservation.scope}). Confira os limites e a conexão na área da família.`
            : 'O registro de consumo está indisponível. Nenhuma chamada ao modelo foi enviada.',
        )
      const execution = createStudioAiTransport({
        members: input.members,
        actor: input.actor,
        request,
        reservation,
        completedAttempts: job.modelCalls - 1,
        signal,
      })
      const context = await prepareStudioBuilderContext(job)
      const answer = await completePensaJson({
        system: studioBuilderSystem(job.base),
        user: JSON.stringify(context),
        schema: studioBuilderAnswerSchema,
        jsonSchema: z.toJSONSchema(studioBuilderAnswerSchema),
        schemaName: 'studio_pro_builder',
        model: job.model,
        maxTokens: request.maxOutputTokens,
        maxAttempts: 1,
        temperature: 0.2,
        bodyTimeoutMs: 60_000,
        transport: async (...args) => {
          const data = await execution.transport(...args)
          responseReceived = true
          return data
        },
        signal,
      })
      if (answer.action === 'inspect') {
        if (job.modelCalls >= STUDIO_PRO_BUILDER_LIMITS.maxModelCalls)
          return checkpoint(
            'failed',
            job.result,
            'O limite de consultas terminou antes de uma proposta. Seus arquivos estão preservados.',
          )
        const note = await inspectStudioBuilder(job, answer)
        return checkpoint('queued', job.result, null, [...job.notes, note])
      }
      const result = await proposeStudioBuilder(
        job,
        answer,
        python
          ? undefined
          : (packageJson) =>
              prepareStudioProDependencies({
                packageJson,
                executionId: `builder-${job.id.replaceAll('-', '')}`,
                ...javaScriptRuntime(input),
                signal,
              }),
      )
      const scopeIssue = studioProChangeScopeIssue(
        job.assistance?.request,
        job.base.files,
        result.change,
      )
      if (scopeIssue) return repairOrFail(scopeIssue, null)
      return checkpoint('validating', result, null)
    } catch (error) {
      // Ambiguous transport errors never cause another model call. Valid JSON/tool failures can repair.
      return repairOrFail(
        error instanceof Error ? error.message : 'Falha ao preparar a proposta.',
        job.result,
        responseReceived && (!(error instanceof PensaLlmError) || error.retryable),
      )
    }
  }
  if (
    job.phase !== 'validating' ||
    !job.result ||
    !claimed.binaries ||
    (!python && !isStudioProTemplateId(job.base.templateId))
  )
    return checkpoint('failed', job.result, 'A revisão atual está incompleta.')
  try {
    const { revision } = await applyStudioProChange(job.base, job.result.change)
    if (python) {
      if (!input.pythonRuntime) throw new Error('O serviço Python não está disponível.')
      const result = job.result
      const validated = await runStudioPythonBuilderValidation({
        members: input.members,
        actor: input.actor,
        job,
        token,
        revision,
        binaries: claimed.binaries,
        parentOrigin: input.parentOrigin,
        runtime: input.pythonRuntime,
        signal,
        accept: (outcome) =>
          checkpoint(
            'review',
            {
              ...result,
              preview: outcome.preview,
              evidence: outcome.evidence,
            },
            null,
          ),
      })
      if (validated.status === 'checkpointed') return validated.job
      return repairOrFail(
        validated.outcome.detail,
        { ...result, evidence: validated.outcome.evidence },
        validated.outcome.status === 'failed',
      )
    }
    if (!isStudioProTemplateId(job.base.templateId)) throw new Error('Modelo JavaScript inválido.')
    const built = await requestStudioProBuild({
      files: revision.files,
      binaries: claimed.binaries,
      templateId: job.base.templateId,
      executionId: `builder-${job.id.replaceAll('-', '')}`,
      parentOrigin: input.parentOrigin,
      ...javaScriptRuntime(input),
      validate: true,
      signal,
    })
    if (!built.evidence || !built.validation)
      throw new Error('A verificação não devolveu evidências identificadas.')
    return checkpoint(
      'review',
      {
        ...job.result,
        evidence: built.evidence,
        preview: {
          artifact: built.artifact,
          revisionHash: revision.hash,
          validation: built.validation,
        },
      },
      null,
    )
  } catch (error) {
    if (error instanceof StudioProRuntimeUpstreamError && error.status === 422) {
      const kind =
        error.code === 'TYPECHECK_FAILED'
          ? 'types'
          : error.code === 'PLAYTEST_FAILED'
            ? 'playtest'
            : 'build'
      return repairOrFail(`${error.message}\n${error.output ?? ''}`, {
        ...job.result,
        evidence: [
          {
            kind,
            status: 'failed',
            detail: redactZappySensitiveText(error.message).text.slice(0, 2000),
          },
        ],
      })
    }
    return repairOrFail(
      error instanceof Error ? error.message : 'A validação está indisponível.',
      job.result,
      false,
    )
  }
}

/** Rebuilds retained candidate sources with fresh evidence. It never calls the model or its ledger. */
export async function refreshStudioBuilderPreview(
  input: {
    members: Pick<MembersClient, 'studioBuilder'>
    actor: StudioAiActor
    id: string
    projectId: string
    parentOrigin: string
    signal?: AbortSignal
  } & StudioBuilderRuntimeOptions,
): Promise<StudioProBuilderJob | null> {
  const call = async (command: StudioProBuilderCommand, operationSignal = input.signal) => {
    operationSignal?.throwIfAborted()
    const response = operationSignal
      ? await awaitWithSignal(
          () => input.members.studioBuilder(input.actor, command, operationSignal),
          operationSignal,
        )
      : await input.members.studioBuilder(input.actor, command)
    operationSignal?.throwIfAborted()
    if (response.status !== 200 || !response.body)
      throw new Error(
        'Não foi possível recuperar a proposta. Consulte o estado antes de tentar novamente.',
      )
    return response.body.state
  }
  const claimed = await call({
    operation: 'preview-claim',
    id: input.id,
    projectId: input.projectId,
  })
  if (!claimed) return null
  if (!claimed.token) return claimed.job
  const { job, token, binaries } = claimed
  const signal = AbortSignal.any([
    ...(input.signal ? [input.signal] : []),
    AbortSignal.timeout(Math.max(1, Date.parse(job.leaseUntil ?? '') - Date.now() - 1000)),
  ])
  try {
    const python = job.base.version === 2 && job.base.configuration.programmingLanguage === 'python'
    if (!job.result || !binaries || (!python && !isStudioProTemplateId(job.base.templateId)))
      throw new Error('As fontes ou materiais desta proposta não estão mais disponíveis.')
    const { revision } = await applyStudioProChange(job.base, job.result.change)
    if (python) {
      if (!input.pythonRuntime) throw new Error('O serviço Python não está disponível.')
      const validated = await runStudioPythonBuilderValidation({
        members: input.members,
        actor: input.actor,
        job,
        token,
        revision,
        binaries,
        parentOrigin: input.parentOrigin,
        runtime: input.pythonRuntime,
        signal,
        accept: async (outcome) =>
          (
            await call(
              {
                operation: 'preview-checkpoint',
                id: job.id,
                projectId: job.projectId,
                token,
                version: job.version,
                preview: outcome.preview,
                evidence: outcome.evidence,
              },
              signal,
            )
          )?.job ?? null,
      })
      if (validated.status === 'checkpointed') return validated.job
      throw new Error(validated.outcome.detail)
    }
    if (!isStudioProTemplateId(job.base.templateId)) throw new Error('Modelo JavaScript inválido.')
    const built = await requestStudioProBuild({
      files: revision.files,
      binaries,
      templateId: job.base.templateId,
      executionId: `preview-${job.id.replaceAll('-', '')}-${job.assistance?.previewRefreshes ?? 0}`,
      parentOrigin: input.parentOrigin,
      ...javaScriptRuntime(input),
      validate: true,
      signal,
    })
    if (!built.evidence || !built.validation)
      throw new Error('A nova prévia não devolveu evidências identificadas.')
    return (
      (
        await call({
          operation: 'preview-checkpoint',
          id: job.id,
          projectId: job.projectId,
          token,
          version: job.version,
          preview: {
            artifact: built.artifact,
            revisionHash: revision.hash,
            validation: built.validation,
          },
          evidence: built.evidence,
        })
      )?.job ?? null
    )
  } catch (cause) {
    const message = redactZappySensitiveText(
      cause instanceof Error ? cause.message : 'A prévia não pôde ser recriada.',
    ).text.slice(0, 2000)
    // Cancellation/discard may already have invalidated this lease; a failed checkpoint must stay visible.
    await call({
      operation: 'preview-release',
      id: job.id,
      projectId: job.projectId,
      token,
      version: job.version,
      error: message,
    })
    throw new Error(message)
  }
}
