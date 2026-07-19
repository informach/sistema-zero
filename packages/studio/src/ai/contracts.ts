import type { IDEMode } from '#core'
import type { SZIR, SZIRInput } from '#ir'

export interface ProjectContext {
  projectName: string
  mode: IDEMode
  ir: SZIRInput | null
  installedExtensions: string[]
}

export type AIChallengeLevel = 'iniciante' | 'intermediario'

export interface AIChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AIFreeFormRequest {
  /** Mensagem do aluno. */
  question: string
  /** Contexto resumido do projeto atual para conversa livre. */
  context?: ProjectContext
  /** Sistema/contexto que o provider real pode usar. Mock ignora. */
  systemHint?: string
  /** Callback recebendo cada token vindo do stream. Opcional. */
  onToken?: (token: string) => void
  /** Cancela a request em andamento quando a UI dispara outra ação. */
  signal?: AbortSignal
  /** Limite máximo de tokens de saída. Providers podem aplicar default próprio. */
  maxTokens?: number
}

export interface AIRequestOptions {
  signal?: AbortSignal
  maxTokens?: number
}

export interface AIProvider {
  explainSelectedBlock(
    blockJson: object,
    mode: IDEMode,
    options?: AIRequestOptions,
  ): Promise<string>
  explainSelectedCode(
    code: string,
    lang: 'html' | 'css' | 'js',
    mode: IDEMode,
    options?: AIRequestOptions,
  ): Promise<string>
  explainError(
    err: { message: string; stack?: string },
    options?: AIRequestOptions,
  ): Promise<string>
  suggestNextStep(context: ProjectContext, options?: AIRequestOptions): Promise<string>
  generateChallenge(level: AIChallengeLevel, options?: AIRequestOptions): Promise<string>
  refactorCode(
    code: string,
    lang: 'html' | 'css' | 'js',
    options?: AIRequestOptions,
  ): Promise<string>
  convertIdeaToBlocks(idea: string, options?: AIRequestOptions): Promise<SZIR>
  /** Conversa livre — opcional; implementações reais devem suportar streaming. */
  ask(req: AIFreeFormRequest): Promise<string>
}
