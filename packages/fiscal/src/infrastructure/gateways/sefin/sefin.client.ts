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

/** fetch com mTLS (PEM do A1) + timeout por tentativa — técnica do payments/efi. */
export function createMtlsFetch(cert: A1Certificate, timeoutMs: number) {
  return (url: string, init: RequestInit = {}): Promise<Response> => {
    const merged: BunTlsFetchInit = {
      ...init,
      headers: { accept: 'application/json, */*', ...(init.headers ?? {}) },
      tls: { cert: cert.cert, key: cert.key },
      signal: AbortSignal.timeout(timeoutMs),
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
