import {
  type ExecutionObjectiveRequest,
  type ExecutionObservation,
  isExecutionObjectiveList,
  judgeExecutionObservation,
  type ProjectCheckResponse,
} from '@sistemazero/core/learning'
import { studioProTemplate } from '@sistemazero/core/studio'
import { InvalidBuildRequestError, type ProBuildRequest, parseBuildRequest } from './contracts'

/**
 * `POST /v1/check` (etapa 3 dos objetivos, 18/10/2026): roda o projeto da criança num Chromium sem
 * internet e confere os objetivos de execução. O Members manda o projeto e as regras; o Worker
 * valida tudo de novo, monta o jogo (Pro: Vite de sempre; clássico: o documento de prévia que o
 * Members montou) e devolve passou/não passou por objetivo, mais uma captura por objetivo.
 */
export const CHECK_LIMITS = {
  /** O documento clássico leva os materiais embutidos (imagens em base64). */
  maxRequestBytes: 12_000_000,
  maxDocumentChars: 11_000_000,
  /** Prazo do script no contêiner; o Worker ainda compila o Pro antes. */
  runTimeoutMs: 110_000,
  maxScreenshotBase64: 400_000,
} as const

const SCOPE = /^__sz[a-f0-9]{24}$/
const EXECUTION_ID = /^[a-z0-9][a-z0-9-]{15,95}$/
/** O arquivo de entrada que o teste acrescenta ao Pro para alcançar as funções exportadas. */
export const CHECK_ENTRY_PATH = '__sz-check-entry.js'

export type CheckRequest =
  | {
      mode: 'classic'
      executionId: string
      scope: string
      document: string
      objectives: ExecutionObjectiveRequest[]
    }
  | {
      mode: 'pro'
      executionId: string
      scope: string
      build: ProBuildRequest
      objectives: ExecutionObjectiveRequest[]
    }

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export function parseCheckRequest(value: unknown): CheckRequest {
  if (!record(value)) throw new InvalidBuildRequestError('Pedido de teste inválido.')
  const { mode, executionId, scope, objectives } = value
  if (typeof executionId !== 'string' || !EXECUTION_ID.test(executionId))
    throw new InvalidBuildRequestError('Identificador de execução inválido.')
  if (typeof scope !== 'string' || !SCOPE.test(scope))
    throw new InvalidBuildRequestError('Escopo do teste inválido.')
  if (!isExecutionObjectiveList(objectives))
    throw new InvalidBuildRequestError('Objetivos do teste inválidos.')
  if (mode === 'classic') {
    if (
      typeof value.document !== 'string' ||
      value.document.length === 0 ||
      value.document.length > CHECK_LIMITS.maxDocumentChars
    )
      throw new InvalidBuildRequestError('Documento do jogo inválido.')
    if (
      objectives.some(
        (objective) => objective.rule.type === 'functionReturns' && objective.rule.module,
      )
    )
      throw new InvalidBuildRequestError('O arquivo da função só vale no projeto Pro.')
    return { mode, executionId, scope, document: value.document, objectives }
  }
  if (mode === 'pro') {
    const build = parseBuildRequest({
      executionId,
      templateId: value.templateId,
      files: value.files,
      ...(value.binaries === undefined ? {} : { binaries: value.binaries }),
      parentOrigin: 'https://studio-check.invalid',
    })
    if (Object.hasOwn(build.files, CHECK_ENTRY_PATH))
      throw new InvalidBuildRequestError('O projeto usa um caminho reservado ao teste.')
    for (const objective of objectives) {
      const rule = objective.rule
      if (
        rule.type === 'functionReturns' &&
        (!rule.module || !Object.hasOwn(build.files, rule.module))
      )
        throw new InvalidBuildRequestError('A função precisa estar num arquivo do projeto.')
      if (rule.type === 'behavior' && rule.expect.target.kind === 'value')
        throw new InvalidBuildRequestError('Projeto Pro não confere variáveis diretamente.')
    }
    return { mode, executionId, scope, build, objectives }
  }
  throw new InvalidBuildRequestError('Tipo de projeto inválido.')
}

/** Os módulos que o teste precisa alcançar no Pro (as funções exportadas). */
export function proCheckModules(objectives: readonly ExecutionObjectiveRequest[]): string[] {
  return [
    ...new Set(
      objectives.flatMap((objective) =>
        objective.rule.type === 'functionReturns' && objective.rule.module
          ? [objective.rule.module]
          : [],
      ),
    ),
  ].sort()
}

/** A entrada extra do Pro: importa os módulos e os guarda num nome que o jogo não conhece. */
export function proCheckEntry(scope: string, modules: readonly string[]): string {
  const imports = modules.map(
    (module, index) => `import * as m${index} from ${JSON.stringify(`./${module}`)}`,
  )
  const table = modules.map((module, index) => `${JSON.stringify(module)}: m${index}`).join(', ')
  return `${imports.join('\n')}\nObject.defineProperty(globalThis, ${JSON.stringify(scope)}, { value: { modules: { ${table} } } })\n`
}

/** O `index.html` do Pro com a entrada do teste no fim do corpo. */
export function withCheckEntry(indexHtml: string): string {
  const tag = `<script type="module" src="./${CHECK_ENTRY_PATH}"></script>`
  const close = indexHtml.search(/<\/body\s*>/i)
  return close >= 0
    ? `${indexHtml.slice(0, close)}${tag}${indexHtml.slice(close)}`
    : `${indexHtml}${tag}`
}

export function isKitTemplate(templateId: unknown): boolean {
  return Boolean(studioProTemplate(templateId)?.kitVersion)
}

/** Junta o que o navegador viu com a régua do core. */
export function judgeCheck(
  objectives: readonly ExecutionObjectiveRequest[],
  observations: readonly ExecutionObservation[],
): Extract<ProjectCheckResponse, { ok: true }>['results'] {
  return objectives.map((objective) => {
    const verdict = judgeExecutionObservation(
      objective.rule,
      observations.find((observation) => observation.id === objective.id),
    )
    return {
      id: objective.id,
      passed: verdict.passed,
      ...(verdict.detail ? { detail: verdict.detail } : {}),
    }
  })
}
