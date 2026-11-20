/**
 * Casca da prévia do Clássico em outro site (lote 3.2, 19/11/2026).
 *
 * Medido em 18/11 (`docs/qa/2026-11-18-studio-isolation-linux.json`): no Firefox, o `srcdoc` com
 * sandbox que a prévia usa hoje roda na mesma thread do editor (trabalho síncrono de 5 s trava a
 * página), e o arranjo que isolou foi uma página de OUTRO site, com COOP/COEP no host, que recebe
 * o documento por mensagem e o põe num `srcdoc` interno com o mesmo sandbox. No WebKit nenhum
 * arranjo de iframe isolou.
 *
 * Esta é a página real e o contrato de mensagens. O documento do jogo não muda: nenhum byte a mais
 * nele (o teto de 790 000 do Reino Zero tem ~57 de folga). A casca só repassa mensagens:
 * - do host (origem conferida contra a lista do servidor) para o jogo, e
 * - do jogo para o host, sempre com `targetOrigin` = a origem do host que a carregou.
 *
 * ⚠️ Um `srcdoc` herda a política de conteúdo de quem o embute. A casca só manda
 * `frame-ancestors`: qualquer outra diretiva restringiria o jogo além da CSP dele próprio.
 */

export const CLASSIC_SHELL_PATH = '/v1/classic-shell/1.html'
/** O mesmo sandbox da prévia direta (`PreviewIframe`): nunca `allow-same-origin`. */
export const CLASSIC_SHELL_GAME_SANDBOX = 'allow-scripts allow-modals allow-pointer-lock'

export const CLASSIC_SHELL_READY = 'sz-shell:ready'
export const CLASSIC_SHELL_LOAD = 'sz-shell:load'
/** O jogo de dentro terminou de carregar: o mesmo instante do `load` de um `srcdoc` direto. */
export const CLASSIC_SHELL_LOADED = 'sz-shell:loaded'

export interface ClassicShellLoadMessage {
  type: typeof CLASSIC_SHELL_LOAD
  document: string
  /**
   * O número deste documento (achado E7 da revisão de 20/11). A casca o devolve no
   * `sz-shell:loaded`, e o editor ignora o aviso de um documento que já foi trocado.
   */
  seq?: number
}

function hasType(value: unknown, type: string): boolean {
  return typeof value === 'object' && value !== null && (value as { type?: unknown }).type === type
}

export function isClassicShellReady(value: unknown): boolean {
  return hasType(value, CLASSIC_SHELL_READY)
}

export function isClassicShellLoaded(value: unknown): boolean {
  return hasType(value, CLASSIC_SHELL_LOADED)
}

/**
 * O número do documento a que o `sz-shell:loaded` se refere, ou `null` quando a casca não o
 * manda (a casca publicada antes de 20/11/2026: o editor aceita o aviso como antes).
 */
export function classicShellLoadedSeq(value: unknown): number | null {
  if (!isClassicShellLoaded(value)) return null
  const seq = (value as { seq?: unknown }).seq
  return typeof seq === 'number' && Number.isSafeInteger(seq) ? seq : null
}

/** Lista de origens do editor (separadas por vírgula ou espaço); só http(s), sem caminho. */
export function parseClassicShellParentOrigins(raw: string | undefined): string[] {
  if (!raw) return []
  const origins = new Set<string>()
  for (const item of raw.split(/[\s,]+/)) {
    if (!item) continue
    let url: URL
    try {
      url = new URL(item)
    } catch {
      continue
    }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') continue
    if (url.origin !== item.replace(/\/$/, '')) continue
    origins.add(url.origin)
  }
  return [...origins]
}

function shellScript(parentOrigins: readonly string[]): string {
  return `(() => {
  'use strict';
  const allowed = new Set(${JSON.stringify(parentOrigins)});
  let host = null;
  let frame = null;
  const mount = (doc, seq) => {
    if (frame) frame.remove();
    frame = document.createElement('iframe');
    frame.setAttribute('sandbox', ${JSON.stringify(CLASSIC_SHELL_GAME_SANDBOX)});
    frame.setAttribute('allow', 'fullscreen');
    frame.setAttribute('title', 'Jogo');
    const mounted = frame;
    mounted.addEventListener('load', () => {
      if (mounted !== frame || host === null) return;
      parent.postMessage(seq === null ? { type: ${JSON.stringify(CLASSIC_SHELL_LOADED)} } : { type: ${JSON.stringify(CLASSIC_SHELL_LOADED)}, seq }, host);
    });
    mounted.srcdoc = doc;
    document.body.append(mounted);
  };
  addEventListener('message', (event) => {
    if (event.source === parent) {
      if (!allowed.has(event.origin) || (host !== null && event.origin !== host)) return;
      host = event.origin;
      const data = event.data;
      if (data && data.type === ${JSON.stringify(CLASSIC_SHELL_LOAD)} && typeof data.document === 'string') {
        mount(data.document, typeof data.seq === 'number' && Number.isSafeInteger(data.seq) ? data.seq : null);
        return;
      }
      if (frame && frame.contentWindow) frame.contentWindow.postMessage(data, '*');
      return;
    }
    if (!frame || host === null || event.source !== frame.contentWindow) return;
    const relayed = event.data;
    // O jogo não fala pela casca: um aviso 'sz-shell:*' vindo dele não passa.
    if (relayed && typeof relayed.type === 'string' && relayed.type.indexOf('sz-shell:') === 0) return;
    parent.postMessage(relayed, host);
  });
  addEventListener('focus', () => {
    try { if (frame && frame.contentWindow) frame.contentWindow.focus(); } catch (_) {}
  });
  for (const origin of allowed) parent.postMessage({ type: ${JSON.stringify(CLASSIC_SHELL_READY)} }, origin);
})();`
}

/** A página da casca. Sem a lista de origens, a página não conversa com ninguém. */
export function buildClassicShellPage(parentOrigins: readonly string[]): string {
  const script = shellScript(parentOrigins).replaceAll('<', '\\u003c')
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="referrer" content="no-referrer"><title>Prévia</title><style>html,body{margin:0;height:100%;overflow:hidden;background:#fff}iframe{border:0;display:block;width:100%;height:100%}</style></head><body><script>${script}</script></body></html>`
}

/**
 * Cabeçalhos da casca. COEP `credentialless` (não `require-corp`): o `srcdoc` interno carrega
 * imagens e fontes `https:` passivas que não mandam CORP. CORP `cross-origin` deixa o host com
 * COEP embutir a casca.
 */
export function classicShellHeaders(parentOrigins: readonly string[]): Record<string, string> {
  return {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'no-store',
    'content-security-policy': `frame-ancestors ${parentOrigins.length ? parentOrigins.join(' ') : "'none'"}`,
    'cross-origin-opener-policy': 'same-origin',
    'cross-origin-embedder-policy': 'credentialless',
    'cross-origin-resource-policy': 'cross-origin',
    'referrer-policy': 'no-referrer',
    'x-content-type-options': 'nosniff',
  }
}

/**
 * A URL da casca quando o host a ligou. Só com `STUDIO_CLASSIC_SHELL_ENABLED=1` E o endereço do
 * runtime (`STUDIO_PRO_RUNTIME_URL`): sem a chave, nada muda, inclusive em produção, onde a rota
 * da casca responde 404 enquanto o runtime não conhece as origens dos apps. HTTPS, salvo o
 * computador local. O layout raiz dos dois apps entrega esta URL ao Estúdio; o `frame-src` já
 * libera a origem do runtime pelo `withStudioPublishedProCsp` (travado em
 * `community-kids/tests/classic-shell-csp.test.ts`).
 */
export function classicShellUrlFromEnv(env: Record<string, string | undefined>): string | null {
  if (env.STUDIO_CLASSIC_SHELL_ENABLED?.trim() !== '1') return null
  const runtime = env.STUDIO_PRO_RUNTIME_URL?.trim().replace(/\/+$/, '')
  if (!runtime) return null
  try {
    const url = new URL(`${runtime}${CLASSIC_SHELL_PATH}`)
    const local = url.hostname === '127.0.0.1' || url.hostname === 'localhost'
    if (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) return null
    if (url.username || url.password || url.search || url.hash) return null
    return url.href
  } catch {
    return null
  }
}
