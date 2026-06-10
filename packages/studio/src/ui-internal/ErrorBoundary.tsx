import { Component, type ErrorInfo, type ReactNode } from 'react'

export interface ErrorBoundaryFallbackProps {
  /** Erro capturado durante o render da subárvore. */
  error: Error
  /** Limpa o estado de erro e tenta renderizar os filhos de novo. */
  reset: () => void
}

export interface ErrorBoundaryProps {
  children: ReactNode
  /** UI mostrada quando um erro é capturado. Recebe o erro e um `reset`. */
  fallback: (props: ErrorBoundaryFallbackProps) => ReactNode
  /**
   * Sempre que qualquer valor desta lista mudar (comparação rasa), o boundary
   * se reseta automaticamente. Útil para limpar o erro ao trocar de modo/projeto
   * sem o usuário precisar clicar em "tentar de novo".
   */
  resetKeys?: readonly unknown[]
  /** Rótulo opcional incluído no log (ex.: "modo Código"). */
  label?: string
  /** Callback de telemetria/observabilidade. Roda em `componentDidCatch`. */
  onError?: (error: Error, info: ErrorInfo) => void
}

interface ErrorBoundaryState {
  error: Error | null
}

function resetKeysChanged(a: readonly unknown[] = [], b: readonly unknown[] = []): boolean {
  if (a.length !== b.length) return true
  for (let i = 0; i < a.length; i += 1) {
    if (!Object.is(a[i], b[i])) return true
  }
  return false
}

/**
 * Error boundary genérico (class component — única forma suportada pelo React).
 * Captura erros de render da subárvore, inclusive a rejeição de `React.lazy`
 * quando o chunk falha ao baixar, evitando que a aplicação inteira vá a tela
 * branca. A UI de fallback é injetada via render prop para manter o tema.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  override componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    if (this.state.error && resetKeysChanged(prevProps.resetKeys, this.props.resetKeys)) {
      this.setState({ error: null })
    }
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    const tag = this.props.label ? `[ErrorBoundary: ${this.props.label}]` : '[ErrorBoundary]'
    console.error(tag, error, info.componentStack)
    this.props.onError?.(error, info)
  }

  private readonly reset = (): void => {
    this.setState({ error: null })
  }

  override render(): ReactNode {
    if (this.state.error) {
      return this.props.fallback({ error: this.state.error, reset: this.reset })
    }
    return this.props.children
  }
}
