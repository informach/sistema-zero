import { PREVIEW_MAX_LOG_PART_CHARS, PREVIEW_MAX_LOG_PARTS } from '#preview'

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

/**
 * Monta o script do bridge com o `targetOrigin` do HOST embutido (via
 * JSON.stringify — nunca interpolação crua). ES5-safe e idempotente por página
 * (`__szProConsole`): o Vite pode injetar o HTML mais de uma vez em navegações.
 */
export function buildProConsoleBridgeScript(hostOrigin: string): string {
  const host = JSON.stringify(hostOrigin)
  return `(() => {
  if (window.__szProConsole) return;
  window.__szProConsole = true;
  var HOST = ${host};
  var MAX_PARTS = ${PREVIEW_MAX_LOG_PARTS};
  var MAX_CHARS = ${PREVIEW_MAX_LOG_PART_CHARS};
  var cap = function (s) {
    return s.length > MAX_CHARS ? s.slice(0, MAX_CHARS) + '… (truncado)' : s;
  };
  var fmt = function (v) {
    if (typeof v === 'string') return v;
    if (v instanceof Error) return v.stack || v.message;
    try {
      var json = JSON.stringify(v);
      if (json !== undefined) return json;
    } catch (e) {}
    return String(v);
  };
  var send = function (kind, args) {
    try {
      var parts = [];
      var total = args.length > MAX_PARTS ? MAX_PARTS : args.length;
      for (var i = 0; i < total; i++) parts.push(cap(fmt(args[i])));
      if (args.length > MAX_PARTS) parts.push('… (+' + (args.length - MAX_PARTS) + ' itens)');
      window.parent.postMessage({ source: 'sz-pro-console', kind: kind, parts: parts }, HOST);
    } catch (e) {}
  };
  ['log', 'info', 'warn', 'error', 'debug'].forEach(function (name) {
    var original = console[name] ? console[name].bind(console) : null;
    console[name] = function () {
      var args = Array.prototype.slice.call(arguments);
      send(name === 'debug' ? 'log' : name, args);
      if (original) original.apply(null, args);
    };
  });
})();`
}
