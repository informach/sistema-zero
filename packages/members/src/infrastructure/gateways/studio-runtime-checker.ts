import { createHash } from 'node:crypto'
import { ValidationError } from '@sistemazero/core/errors'
import { readJsonBodyWithLimit } from '@sistemazero/core/http'
import type { ProjectCheckResponse } from '@sistemazero/core/learning'
import type { Logger } from '@sistemazero/core/logging'
import {
  createCheckScope,
  isProCheckProject,
  prepareClassicCheckDocument,
  proCheckBinaries,
  proCheckSourceFiles,
} from '@sistemazero/studio/server-check'
import {
  ProjectCheckBusyError,
  ProjectCheckUnavailableError,
} from '../../domain/learning/learning.errors'
import type {
  ProjectExecutionChecker,
  ProjectExecutionCheckInput,
  ProjectExecutionCheckOutput,
} from '../../domain/ports/project-execution-checker.port'
import { stableJson } from '../../domain/shared/stable-json'

export interface StudioRuntimeCheckerOptions {
  /** Base do `studio-runtime` (o Worker da Cloudflare). */
  runtimeUrl: string
  runtimeToken: string
  /** O teste inteiro (compilar + rodar cada objetivo). */
  timeoutMs?: number
  /** Quanto tempo um resultado vale para o MESMO projeto com as MESMAS regras. */
  cacheTtlMs?: number
  cacheMax?: number
  fetchImpl?: (input: string | URL, init?: RequestInit) => Promise<Response>
  now?: () => number
  logger?: Logger
}

interface CacheEntry {
  at: number
  value: ProjectExecutionCheckOutput
}

/**
 * O adaptador do executor (etapa 3 dos objetivos, 18/10/2026). Monta o pedido com o
 * `@sistemazero/studio/server-check` (documento de prévia no clássico, árvore e materiais no Pro),
 * chama `POST /v1/check` e devolve o resultado por objetivo.
 *
 * - Sem mudança no projeto nem nas regras, o resultado é REAPROVEITADO (cache por impressão) e
 *   dois pedidos iguais ao mesmo tempo dividem uma ida ao executor.
 * - Executor fora do ar, lento ou com resposta estranha: `ProjectCheckUnavailableError`. Nunca
 *   aprova por falha.
 */
export function createStudioRuntimeChecker(
  opts: StudioRuntimeCheckerOptions,
): ProjectExecutionChecker {
  const doFetch = opts.fetchImpl ?? fetch
  const base = opts.runtimeUrl.trim().replace(/\/$/, '')
  const timeoutMs = opts.timeoutMs ?? 150_000
  const ttl = opts.cacheTtlMs ?? 10 * 60_000
  const max = opts.cacheMax ?? 200
  const now = opts.now ?? Date.now
  const cache = new Map<string, CacheEntry>()
  const inFlight = new Map<string, Promise<ProjectExecutionCheckOutput>>()

  async function run(input: ProjectExecutionCheckInput): Promise<ProjectExecutionCheckOutput> {
    const scope = createCheckScope()
    const executionId = `check-${createHash('sha256').update(input.requester).digest('hex').slice(0, 40)}`
    let body: Record<string, unknown>
    if (input.kind === 'pro') {
      if (!isProCheckProject(input.project) || !input.templateId)
        throw new ValidationError('Este projeto não é do tipo desta parte.')
      let binaries: Record<string, { base64: string; sha256: string }>
      try {
        binaries = await proCheckBinaries(input.project)
      } catch {
        throw new ValidationError('Os materiais do projeto são inválidos.')
      }
      body = {
        mode: 'pro',
        executionId,
        scope,
        templateId: input.templateId,
        files: proCheckSourceFiles(input.project),
        ...(Object.keys(binaries).length ? { binaries } : {}),
        objectives: input.objectives,
      }
    } else {
      let document: string
      try {
        document = await prepareClassicCheckDocument(input.project, scope)
      } catch {
        throw new ValidationError('Não consegui abrir este projeto para testar.')
      }
      body = { mode: 'classic', executionId, scope, document, objectives: input.objectives }
    }
    let response: Response
    try {
      response = await doFetch(`${base}/v1/check`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${opts.runtimeToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        redirect: 'error',
        signal: AbortSignal.timeout(timeoutMs),
      })
    } catch (error) {
      opts.logger?.warn('studio-runtime check unreachable', { error: String(error) })
      throw new ProjectCheckUnavailableError()
    }
    const result = (await readJsonBodyWithLimit(response, 6_000_000).catch(
      () => null,
    )) as ProjectCheckResponse | null
    if (response.status === 429) throw new ProjectCheckBusyError()
    if (response.status === 400 && result && !result.ok)
      throw new ValidationError(result.message || 'O projeto não pode ser testado.')
    if (!response.ok || !result?.ok || !Array.isArray(result.results)) {
      opts.logger?.warn('studio-runtime check failed', { status: response.status })
      throw new ProjectCheckUnavailableError()
    }
    const byId = new Map(result.results.map((item) => [item.id, item]))
    // Cada objetivo pedido precisa voltar: resposta incompleta não aprova nada.
    if (input.objectives.some((objective) => !byId.has(objective.id)))
      throw new ProjectCheckUnavailableError()
    return {
      results: input.objectives.map((objective) => {
        const item = byId.get(objective.id)
        return {
          id: objective.id,
          passed: item?.passed === true,
          ...(typeof item?.detail === 'string' ? { detail: item.detail.slice(0, 1000) } : {}),
        }
      }),
      ...(result.screenshots ? { screenshots: result.screenshots } : {}),
    }
  }

  return {
    async check(input) {
      const key = createHash('sha256')
        .update(
          stableJson({
            kind: input.kind,
            templateId: input.templateId ?? null,
            objectives: input.objectives,
            project: input.project,
          }),
        )
        .digest('hex')
      const cached = cache.get(key)
      if (cached && now() - cached.at < ttl) return cached.value
      const pending = inFlight.get(key)
      if (pending) return pending
      const task = run(input)
        .then((value) => {
          cache.delete(key)
          cache.set(key, { at: now(), value })
          while (cache.size > max) {
            const oldest = cache.keys().next().value
            if (oldest === undefined) break
            cache.delete(oldest)
          }
          return value
        })
        .finally(() => inFlight.delete(key))
      inFlight.set(key, task)
      return task
    },
  }
}
