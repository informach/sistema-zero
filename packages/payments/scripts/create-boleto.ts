import { EfiCobrancasClient } from '../src/infrastructure/gateways/efi/efi-cobrancas.client'
import { parseOneStepResponse } from '../src/infrastructure/gateways/efi/efi-cobrancas.mapper'
import { hasFlag, readArg } from './args'

/**
 * Cria um boleto REAL no sandbox da Efí (API Cobranças) e imprime a resposta
 * CRUA — para confirmar os nomes exatos dos campos (`charge_id`, `barcode`/
 * `linha_digitavel`, `pdf.charge`/`billet_link`/`link`, `expire_at`, `total`,
 * `status`) e ajustar `efi-cobrancas.mapper.ts` se necessário.
 *
 * Diferente do Pix, boleto NÃO usa certificado — só EFI_CLIENT_ID/SECRET (ou os
 * overrides EFI_COBRANCAS_CLIENT_ID/SECRET) e EFI_SANDBOX. A aplicação Efí
 * precisa ter o escopo **Cobranças (Emissões)** habilitado.
 *
 * Uso:
 *   bun run boleto:create                 # cria com dados fictícios padrão
 *   bun run boleto:create --amount 100    # valor em centavos (default 100 = R$1,00)
 *   bun run boleto:create --detail        # após criar, faz GET /charge/:id
 */
const clientId = process.env.EFI_COBRANCAS_CLIENT_ID ?? process.env.EFI_CLIENT_ID
const clientSecret = process.env.EFI_COBRANCAS_CLIENT_SECRET ?? process.env.EFI_CLIENT_SECRET
if (!clientId || !clientSecret) {
  console.error('❌ Preencha EFI_CLIENT_ID e EFI_CLIENT_SECRET no .env antes de rodar.')
  process.exit(1)
}

const sandbox = (process.env.EFI_SANDBOX ?? 'true').toLowerCase() !== 'false'
const amountInCents = Number(readArg('amount') ?? '100')
const detail = hasFlag('detail')

const client = new EfiCobrancasClient({ clientId, clientSecret, sandbox })

// Vencimento em +3 dias (YYYY-MM-DD, UTC).
const due = new Date()
due.setUTCDate(due.getUTCDate() + 3)
const expireAt = due.toISOString().slice(0, 10)

// custom_id único por execução → o teste de lookup encontra exatamente esta cobrança.
const customId = `script-${expireAt}-${Math.floor(Math.random() * 1_000_000)}`

const body = {
  items: [{ name: 'Produto de teste (sandbox)', value: amountInCents, amount: 1 }],
  payment: {
    banking_billet: {
      customer: {
        name: 'Gorbadoc Oldbuck',
        cpf: '94271564656',
        email: 'oldbuck@efipay.com.br',
        phone_number: '5144916523',
        address: {
          street: 'Avenida Juscelino Kubitschek',
          number: '909',
          neighborhood: 'Bauxita',
          zipcode: '35400000',
          city: 'Ouro Preto',
          complement: '',
          state: 'MG',
        },
      },
      expire_at: expireAt,
    },
  },
  metadata: { custom_id: customId },
}

try {
  console.log(
    `→ POST /charge/one-step  (sandbox=${sandbox}, valor=R$ ${(amountInCents / 100).toFixed(2)})`,
  )
  const created = await client.createOneStepCharge(body)
  console.log('\n✅ Boleto criado. Resposta CRUA (confirme os nomes dos campos):')
  console.log(JSON.stringify(created, null, 2))

  // Confere que o nosso parser extrai os campos pagáveis da resposta de criação.
  console.log('\n→ parseOneStepResponse(create):')
  console.log(parseOneStepResponse(created))

  const chargeId = created?.data?.charge_id ?? created?.charge_id ?? created?.data?.id

  if (detail && chargeId != null) {
    console.log(`\n→ GET /charge/${chargeId}`)
    const detailed = await client.detailCharge(chargeId)
    // O detalhe traz os campos aninhados em payment.banking_billet — o parser
    // tolera as duas formas (criação plana × detalhe aninhado).
    console.log('→ parseOneStepResponse(detail):')
    console.log(parseOneStepResponse(detailed))
    console.log('\nDetalhe cru:')
    console.log(JSON.stringify(detailed, null, 2))
  }
} catch (error) {
  console.error('❌ Falha ao criar o boleto:')
  console.error(error)
  console.error(
    '\nDica: confirme EFI_CLIENT_ID/SECRET de HOMOLOGAÇÃO e que a aplicação Efí tem o escopo Cobranças (Emissões) habilitado.',
  )
  process.exit(1)
}
