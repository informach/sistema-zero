/**
 * Defesa em profundidade anti-CSRF (PURA, unit-testável) — além do `SameSite=Lax`
 * dos cookies de sessão. No domínio definitivo o app divide o eTLD+1 com
 * funil/community/cdn: um subdomínio irmão comprometido dispara requisições
 * **same-site** que LEVAM os cookies do helpdesk-app (`Lax` não barra same-site).
 * Por isso TODA mutação precisa ser **same-origin**:
 *
 *  - `Sec-Fetch-Site` é enviado por todo browser moderno e é um header PROIBIDO
 *    (não-forjável por JS de página): só `same-origin` passa; `same-site` (irmão)
 *    e `cross-site` barram, e `none` (POST sem site iniciador) também — nossas
 *    mutações são sempre `fetch()` das próprias telas (same-origin).
 *  - Browser antigo sem `Sec-Fetch-*`: cai na comparação de `Origin` × host.
 *  - SEM nenhum dos dois = cliente não-browser (curl/healthcheck/S2S) → não há
 *    vetor de CSRF (exige um browser carregando cookie) → libera.
 */

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

/** Só métodos que mutam estado precisam da checagem (GET/HEAD/OPTIONS são seguros). */
export function requiresOriginCheck(method: string): boolean {
  return !SAFE_METHODS.has(method.toUpperCase())
}

export interface OriginSignals {
  /** Header `Sec-Fetch-Site` (ou null). */
  secFetchSite: string | null
  /** Header `Origin` (ou null). */
  origin: string | null
  /** Host efetivo do request (preferir `X-Forwarded-Host` atrás de proxy). */
  host: string | null
}

/**
 * `true` quando a requisição é same-origin OU indeterminada-não-browser (sem
 * sinais → sem vetor de CSRF). `false` só quando há sinal POSITIVO de origem
 * cruzada (same-site/cross-site/none, ou `Origin` de outro host).
 */
export function isSameOriginRequest({ secFetchSite, origin, host }: OriginSignals): boolean {
  if (secFetchSite) return secFetchSite === 'same-origin'
  if (origin) {
    try {
      return new URL(origin).host === host
    } catch {
      return false
    }
  }
  return true
}
