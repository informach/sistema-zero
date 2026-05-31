/**
 * `Result<T, E>` — resultado explícito para operações que podem falhar de forma
 * esperada, sem usar exceções para fluxo de controle. Mantém o tipo do erro
 * visível na assinatura (melhor que `throw` para a camada de aplicação).
 */
export type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E }

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value })

export const err = <E>(error: E): Result<never, E> => ({ ok: false, error })

export const isOk = <T, E>(r: Result<T, E>): r is { ok: true; value: T } => r.ok

export const isErr = <T, E>(r: Result<T, E>): r is { ok: false; error: E } => !r.ok
