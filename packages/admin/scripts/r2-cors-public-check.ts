// Prova o CORS pelo mesmo endpoint público usado pelo navegador da criança.
// Não usa credenciais do Railway nem do R2: o objeto-prova é instalado uma vez
// por `r2-cors-public.ts --install-probe` e este gate faz apenas uma leitura.
import {
  buildPublicObjectUrl,
  KIDS_STAGING_ORIGIN,
  PUBLIC_CORS_PROBE_BODY,
  PUBLIC_CORS_PROBE_KEY,
  provePublicCorsWithRetry,
} from './r2-cors-public-lib'

const publicBaseUrl = process.env.R2_PUBLIC_URL
const probeOrigin = process.env.R2_CORS_PROBE_ORIGIN || KIDS_STAGING_ORIGIN

if (!publicBaseUrl) {
  throw new Error('R2_PUBLIC_URL não foi configurada nas variáveis do repositório')
}

const publicObjectUrl = buildPublicObjectUrl(publicBaseUrl, PUBLIC_CORS_PROBE_KEY)

const attempt = await provePublicCorsWithRetry(
  async () => {
    const url = new URL(publicObjectUrl)
    url.searchParams.set('cors-probe', `${Date.now()}`)
    const response = await fetch(url, {
      headers: { Origin: probeOrigin, 'Cache-Control': 'no-cache' },
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    })
    return {
      status: response.status,
      allowOrigin: response.headers.get('access-control-allow-origin'),
      body: await response.text(),
    }
  },
  { origin: probeOrigin, body: PUBLIC_CORS_PROBE_BODY },
)

console.log(`✅ CORS público confirmado para ${probeOrigin} na tentativa ${attempt}`)
