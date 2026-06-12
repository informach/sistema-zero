import type { A1Certificate } from './cert'

/**
 * Base URLs do Sistema Nacional NFS-e. O spike SEMPRE usa a Produção Restrita
 * (homologação — nota sem validade jurídica), a menos que NFSE_AMBIENTE=producao
 * seja definido explicitamente (NÃO fazer isso no spike).
 */
export function baseUrls() {
  // basePath REAL = /SefinNacional (o /API/... da doc é só a página do redoc);
  // DANFSe e Parametrização Municipal foram MOVIDOS p/ módulos do ADN (spec oficial).
  const ambiente = process.env['NFSE_AMBIENTE'] ?? 'producao-restrita'
  if (ambiente === 'producao') {
    return {
      ambiente,
      tpAmb: '1' as const,
      sefin: 'https://sefin.nfse.gov.br/SefinNacional',
      adnDanfse: 'https://adn.nfse.gov.br/danfse',
      adnParam: 'https://adn.nfse.gov.br/parametrizacao',
      adnContrib: 'https://adn.nfse.gov.br/contribuintes',
    }
  }
  return {
    ambiente,
    tpAmb: '2' as const,
    sefin: 'https://sefin.producaorestrita.nfse.gov.br/SefinNacional',
    adnDanfse: 'https://adn.producaorestrita.nfse.gov.br/danfse',
    adnParam: 'https://adn.producaorestrita.nfse.gov.br/parametrizacao',
    adnContrib: 'https://adn.producaorestrita.nfse.gov.br/contribuintes',
  }
}

interface BunTlsFetchInit extends RequestInit {
  tls?: { cert: string; key: string }
}

/** fetch com mTLS (PEM do A1) + timeout — técnica comprovada no payments/efi.client. */
export async function mtlsFetch(
  url: string,
  cert: A1Certificate,
  init: RequestInit = {},
  timeoutMs = Number(process.env['NFSE_REQUEST_TIMEOUT_MS'] ?? 30_000),
): Promise<Response> {
  const merged: BunTlsFetchInit = {
    ...init,
    headers: { accept: 'application/json, */*', ...(init.headers ?? {}) },
    tls: { cert: cert.cert, key: cert.key },
    signal: AbortSignal.timeout(timeoutMs),
  }
  return fetch(url, merged)
}

/** Imprime status + corpo (json identado ou texto cru) — o spike é sobre APRENDER os shapes. */
export async function dumpResponse(label: string, res: Response): Promise<string> {
  const text = await res.text()
  console.log(`\n=== ${label} → HTTP ${res.status} ${res.statusText}`)
  console.log('headers:', JSON.stringify(Object.fromEntries(res.headers.entries()), null, 2))
  try {
    console.log(JSON.stringify(JSON.parse(text), null, 2))
  } catch {
    console.log(text.slice(0, 4000) || '(corpo vazio)')
  }
  return text
}

export function gzipBase64(xml: string): string {
  return Buffer.from(Bun.gzipSync(Buffer.from(xml, 'utf8'))).toString('base64')
}

export function gunzipBase64(b64: string): string {
  return Buffer.from(Bun.gunzipSync(Buffer.from(b64, 'base64'))).toString('utf8')
}
