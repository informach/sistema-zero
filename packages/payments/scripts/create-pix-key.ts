import { loadEfiCertificate } from '../src/infrastructure/gateways/efi/certificate'
import { EfiClient } from '../src/infrastructure/gateways/efi/efi.client'

/**
 * Cria (ou lista) uma chave Pix ALEATÓRIA (EVP) na sua conta Efí — é a chave
 * recebedora que vai em `EFI_PIX_KEY`. Usa as credenciais do `.env`
 * (EFI_CLIENT_ID/SECRET, certificado e EFI_SANDBOX).
 *
 * Uso:  bun run pix:key
 */
const clientId = process.env.EFI_CLIENT_ID
const clientSecret = process.env.EFI_CLIENT_SECRET
if (!clientId || !clientSecret) {
  console.error('❌ Preencha EFI_CLIENT_ID e EFI_CLIENT_SECRET no .env antes de rodar.')
  process.exit(1)
}

const sandbox = (process.env.EFI_SANDBOX ?? 'true').toLowerCase() !== 'false'

const cert = loadEfiCertificate({
  path: process.env.EFI_CERTIFICATE_PATH,
  base64: process.env.EFI_CERTIFICATE_BASE64,
})
const client = new EfiClient({ clientId, clientSecret, cert: cert.cert, key: cert.key, sandbox })

try {
  const list = await client.listEvp()
  const existing: string[] = Array.isArray(list?.chaves) ? list.chaves : []

  if (existing.length > 0) {
    console.log(`✅ Você já tem ${existing.length} chave(s) Pix aleatória(s):`)
    for (const chave of existing) console.log(`   • ${chave}`)
    console.log('\n👉 Copie uma delas para EFI_PIX_KEY no .env.')
  } else {
    const created = await client.createEvp()
    console.log(`✅ Chave Pix aleatória criada (sandbox=${sandbox}):`)
    console.log(`   ${created.chave}`)
    console.log('\n👉 Copie esse valor para EFI_PIX_KEY no .env.')
  }
} catch (error) {
  console.error('❌ Falha ao criar/listar a chave Pix:')
  console.error(error)
  console.error(
    '\nDica: confirme EFI_CLIENT_ID/SECRET de HOMOLOGAÇÃO, o caminho do certificado e os escopos Pix da aplicação.',
  )
  process.exit(1)
}
