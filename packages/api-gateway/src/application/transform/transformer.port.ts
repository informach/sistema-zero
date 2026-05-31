import type { GatewayContext } from '../pipeline/stage.port'

/**
 * Transformer (Decorator): adiciona comportamento à requisição e/ou resposta sem
 * alterar o núcleo do proxy. `transformRequest` roda antes do encaminhamento;
 * `transformResponse` roda depois (finalizer).
 */
export interface Transformer {
  readonly name: string
  transformRequest?(ctx: GatewayContext): Promise<void> | void
  transformResponse?(ctx: GatewayContext): Promise<void> | void
}

/** Fábrica de transformer a partir das opções declaradas na config. */
export type TransformerFactory = (options: Record<string, unknown>) => Transformer

/** Registro de transformers disponíveis, por `type`. */
export type TransformerRegistry = Readonly<Record<string, TransformerFactory>>
