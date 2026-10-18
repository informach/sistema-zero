import type {
  ExecutionObjectiveRequest,
  ExecutionObjectiveResult,
} from '@sistemazero/core/learning'

/**
 * Quem RODA o projeto para conferir os objetivos de execução (etapa 3 dos objetivos, 18/10/2026).
 * A implementação de produção chama o `studio-runtime` (`StudioRuntimeChecker`); a decisão do que
 * passou continua no domínio (o resultado volta por objetivo).
 */
export interface ProjectExecutionCheckInput {
  /** Quem pediu (só para o limite de frequência do executor; nunca vai ao jogo). */
  requester: string
  project: unknown
  /** O tipo e o modelo vêm do bloco AUTORADO, nunca do projeto enviado pela criança. */
  kind: 'classic' | 'pro'
  templateId?: string
  objectives: ExecutionObjectiveRequest[]
  /** Pedir a captura da tela (só o "Testar agora" da equipe): nunca guardada no cache. */
  screenshots?: boolean
}

export interface ProjectExecutionCheckOutput {
  results: ExecutionObjectiveResult[]
  /** Captura da tela final por objetivo (JPEG em base64). Só a equipe vê. */
  screenshots?: Record<string, string>
}

export interface ProjectExecutionChecker {
  check(input: ProjectExecutionCheckInput): Promise<ProjectExecutionCheckOutput>
}
