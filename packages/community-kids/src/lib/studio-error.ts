import { reportClientError } from './report-error'

/**
 * Erro que o Estúdio CONTEVE sozinho vira telemetria (o mesmo beacon das error
 * boundaries do app → Sentry, com redação de PII). O `kind` distingue a falha
 * de persistência do crash de render segurado por uma boundary de seção.
 */
export function reportStudioError(
  error:
    | { kind: 'persistence'; message: string }
    | { kind: 'render'; area: string; message: string; stack?: string },
): void {
  const failure = new Error(
    error.kind === 'render' ? `[studio:${error.area}] ${error.message}` : error.message,
  )
  failure.name = error.kind === 'render' ? 'StudioRenderError' : 'StudioPersistenceError'
  if (error.kind === 'render' && error.stack) failure.stack = error.stack
  reportClientError(failure)
}
