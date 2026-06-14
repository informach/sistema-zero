import type { A1Certificate } from '../../certificate/a1-certificate'

export interface SefinUrls {
  sefin: string
  adnDanfse: string
}

/**
 * Bases REAIS validadas no spike: o path da Sefin é `/SefinNacional` (o
 * `/API/...` da página de docs NÃO é a API); DANFSe mora no ADN.
 */
export function sefinUrls(ambiente: 'producao' | 'producao-restrita'): SefinUrls {
  if (ambiente === 'producao') {
    return {
      sefin: 'https://sefin.nfse.gov.br/SefinNacional',
      adnDanfse: 'https://adn.nfse.gov.br/danfse',
    }
  }
  return {
    sefin: 'https://sefin.producaorestrita.nfse.gov.br/SefinNacional',
    adnDanfse: 'https://adn.producaorestrita.nfse.gov.br/danfse',
  }
}

interface BunTlsFetchInit extends RequestInit {
  tls?: { cert: string; key: string }
}

/**
 * fetch com mTLS (PEM do A1). O `timeoutMs` por chamada permite ao gateway passar
 * o ORÇAMENTO RESTANTE do ciclo de emissão (NFSE_TOTAL_RETRY_BUDGET_MS) — sem isso
 * cada round-trip teria o timeout cheio e o pior caso somaria N×timeout.
 */
export function createMtlsFetch(cert: A1Certificate, defaultTimeoutMs: number) {
  return (url: string, init: RequestInit = {}, timeoutMs = defaultTimeoutMs): Promise<Response> => {
    const merged: BunTlsFetchInit = {
      ...init,
      headers: { accept: 'application/json, */*', ...(init.headers ?? {}) },
      tls: { cert: cert.cert, key: cert.key },
      signal: AbortSignal.timeout(Math.max(1, Math.floor(timeoutMs))),
    }
    return fetch(url, merged)
  }
}

export function gzipBase64(xml: string): string {
  return Buffer.from(Bun.gzipSync(Buffer.from(xml, 'utf8'))).toString('base64')
}

export function gunzipBase64(b64: string): string {
  return Buffer.from(Bun.gunzipSync(Buffer.from(b64, 'base64'))).toString('utf8')
}
