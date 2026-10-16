import { PREVIEW_MAX_LOG_PARTS } from '../../preview/types'

/**
 * Ponte de console do preview PROFISSIONAL. O app do aluno roda num iframe
 * CROSS-ORIGIN (dev-server no WebContainer), então o `console.log` dele ia só
 * para o DevTools do navegador — o Console da IDE ficava mudo (só erros
 * chegavam, via `preview-message`). O script abaixo é injetado em TODA página
 * do preview pelo `setPreviewScript` do WebContainer: embrulha os métodos do
 * console e espelha cada chamada ao parent por `postMessage` — SEMPRE com
 * `targetOrigin` do host (nunca `'*'`, regra 8 do pacote).
 *
 * É uma STRING PURA (sem imports/refs externas), como o `storageBridge` do
 * preview clássico. O consumidor (ProPreview) valida origem + forma com
 * `isProConsoleMessage` antes de encaminhar ao logsStore (que ainda trunca e
 * aplica rate limit por conta própria).
 */

export const PRO_CONSOLE_MESSAGE_SOURCE = 'sz-pro-console' as const

/** Kinds aceitos do bridge (o `debug` do app vira 'log' ainda no iframe). */
const PRO_CONSOLE_KINDS: ReadonlySet<string> = new Set(['log', 'info', 'warn', 'error'])

export interface ProConsoleMessage {
  source: typeof PRO_CONSOLE_MESSAGE_SOURCE
  kind: 'log' | 'info' | 'warn' | 'error'
  parts: string[]
}

/**
 * Valida a FORMA da mensagem vinda do iframe do dev-server (código do aluno =
 * não confiável; a origem é validada pelo chamador). Tamanho de cada parte é
 * responsabilidade do logsStore (`truncatePart`) — aqui só o teto de contagem.
 */
export function isProConsoleMessage(value: unknown): value is ProConsoleMessage {
  if (typeof value !== 'object' || value === null) return false
  const raw = value as Record<string, unknown>
  if (raw.source !== PRO_CONSOLE_MESSAGE_SOURCE) return false
  if (typeof raw.kind !== 'string' || !PRO_CONSOLE_KINDS.has(raw.kind)) return false
  if (!Array.isArray(raw.parts)) return false
  // +1 = a parte-resumo "… (+N)" que o bridge anexa quando corta os args.
  if (raw.parts.length > PREVIEW_MAX_LOG_PARTS + 1) return false
  return raw.parts.every((part) => typeof part === 'string')
}

export { buildProConsoleBridgeScript } from '@sistemazero/core/studio/pro-console'
