import { loadEfiCertificate } from '../src/infrastructure/gateways/efi/certificate'
import { EfiClient } from '../src/infrastructure/gateways/efi/efi.client'
import { readArg } from './args'

/**
 * Registra o webhook de Pix na Efí, apontando para este serviço.
 *
 * A Efí ACRESCENTA `/pix` ao final da URL — portanto informe a base
 * `https://<dominio>/webhooks/efi` (a Efí chamará `/webhooks/efi/pix`, que é a
 * rota deste serviço).
 *
 * Para hosts atrás de proxy que termina TLS (Railway), o mTLS não pode ser
 * validado ponta-a-ponta; por padrão usamos `--skip-mtls` (validateMtls=false),
 * o que faz o SDK enviar `x-skip-mtls-checking`. A segurança é garantida pela
 * re-consulta da cobrança na Efí antes de confirmar o pagamento.
 *
 * Uso:
 *   bun run webhook:register --url https://seu-app.up.railway.app/webhooks/efi
 */
const url = readArg('url', 'WEBHOOK_URL')
if (!url) {
  console.error('❌ Informe a URL base: --url https://<dominio>/webhooks/efi (a Efí acrescenta /pix)')
  process.exit(1)
}

const clientId = process.env.EFI_CLIENT_ID
const clientSecret = process.env.EFI_CLIENT_SECRET
const pixKey = process.env.EFI_PIX_KEY
const missing = [
  ['EFI_CLIENT_ID', clientId],
  ['EFI_CLIENT_SECRET', clientSecret],
  ['EFI_PIX_KEY', pixKey],
].filter(([, v]) => !v)
if (missing.length > 0) {
  console.error(`❌ Variáveis ausentes: ${missing.map(([k]) => k).join(', ')}`)
  process.exit(1)
}

const sandbox = (process.env.EFI_SANDBOX ?? 'true').toLowerCase() !== 'false'
const skipMtls = (readArg('skip-mtls') ?? 'true').toLowerCase() !== 'false'

// Se EFI_WEBHOOK_SECRET estiver definido, o endpoint /webhooks/efi/pix exige
// ?token=<segredo>. A Efí ACRESCENTA `/pix` ao final da URL registrada, então
// informe a base já com o token (ex.: --url https://host/webhooks/efi?token=SEGREDO)
// se o seu setup preservar a query string; caso contrário, deixe o segredo vazio.
if (process.env.EFI_WEBHOOK_SECRET?.trim() && !url.includes('token=')) {
  console.warn(
    '⚠️ EFI_WEBHOOK_SECRET está definido, mas a --url não inclui token=. ' +
      'O endpoint recusará as notificações (401) sem o token. Inclua-o na URL registrada.',
  )
}

const cert = loadEfiCertificate({
  path: process.env.EFI_CERTIFICATE_PATH,
  base64: process.env.EFI_CERTIFICATE_BASE64,
})
const client = new EfiClient({
  clientId: clientId!,
  clientSecret: clientSecret!,
  cert: cert.cert,
  key: cert.key,
  sandbox,
})

try {
  const response = await client.configWebhook(pixKey!, url, { skipMtls })
  console.log(`✅ Webhook configurado (sandbox=${sandbox}, skipMtls=${skipMtls}).`)
  console.log(`   URL registrada: ${url}  → a Efí chamará: ${url}/pix`)
  console.log(response)
} catch (error) {
  console.error('❌ Falha ao configurar o webhook:')
  console.error(error)
  process.exit(1)
}
