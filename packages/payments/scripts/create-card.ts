import { EfiCobrancasClient } from '../src/infrastructure/gateways/efi/efi-cobrancas.client'
import {
  parseCardDetailCharge,
  parseOneStepCardResponse,
} from '../src/infrastructure/gateways/efi/efi-cobrancas.mapper'
import { hasFlag, readArg } from './args'

/**
 * Cria uma cobrança de CARTÃO real no sandbox da Efí (API Cobranças, `one-step`)
 * e imprime a resposta CRUA — para confirmar os nomes exatos dos campos
 * (`charge_id`, `status`, `total`, `installments`) e a semântica de `approved`/
 * `waiting`/`unpaid`, ajustando `efi-cobrancas.mapper.ts` se necessário.
 *
 * ⚠️ O `payment_token` é gerado no BROWSER (compliance PCI — o PAN nunca toca o
 * backend) e tem VIDA CURTA. Este script NÃO consegue gerar o token: passe um
 * token de teste do sandbox da Efí via `--token`. Gere-o pela página/SDK de
 * tokenização da Efí (identificador de conta do sandbox + cartão de teste).
 *
 * Como o boleto, NÃO usa certificado — só EFI_CLIENT_ID/SECRET (ou os overrides
 * EFI_COBRANCAS_CLIENT_ID/SECRET) e EFI_SANDBOX. A aplicação Efí precisa ter o
 * escopo **Cobranças (Emissões)** habilitado.
 *
 * Uso:
 *   bun run card:create --token <payment_token>                 # 1x, R$1,00
 *   bun run card:create --token <payment_token> --amount 3700   # valor em centavos
 *   bun run card:create --token <payment_token> --installments 3
 *   bun run card:create --token <payment_token> --detail        # após criar, GET /charge/:id
 */
const clientId = process.env.EFI_COBRANCAS_CLIENT_ID ?? process.env.EFI_CLIENT_ID
const clientSecret = process.env.EFI_COBRANCAS_CLIENT_SECRET ?? process.env.EFI_CLIENT_SECRET
if (!clientId || !clientSecret) {
  console.error('❌ Preencha EFI_CLIENT_ID e EFI_CLIENT_SECRET no .env antes de rodar.')
  process.exit(1)
}

const paymentToken = readArg('token', 'EFI_CARD_PAYMENT_TOKEN')
if (!paymentToken) {
  console.error(
    '❌ Informe o payment_token: --token <payment_token> (gerado no browser pela tokenização da Efí; é de vida curta).',
  )
  process.exit(1)
}

const sandbox = (process.env.EFI_SANDBOX ?? 'true').toLowerCase() !== 'false'
const amountInCents = Number(readArg('amount') ?? '100')
const installments = Number(readArg('installments') ?? '1')
const detail = hasFlag('detail')

const client = new EfiCobrancasClient({ clientId, clientSecret, sandbox })

const customId = `card-script-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`

const body = {
  items: [{ name: 'Produto de teste (sandbox)', value: amountInCents, amount: 1 }],
  payment: {
    credit_card: {
      installments,
      payment_token: paymentToken,
      billing_address: {
        street: 'Avenida Juscelino Kubitschek',
        number: '909',
        neighborhood: 'Bauxita',
        zipcode: '35400000',
        city: 'Ouro Preto',
        state: 'MG',
      },
      customer: {
        name: 'Gorbadoc Oldbuck',
        email: 'oldbuck@efipay.com.br',
        cpf: '94271564656',
        birth: '1977-01-15',
        phone_number: '5144916523',
      },
    },
  },
  metadata: { custom_id: customId },
}

try {
  console.log(
    `→ POST /charge/one-step (cartão)  (sandbox=${sandbox}, valor=R$ ${(amountInCents / 100).toFixed(2)}, ${installments}x)`,
  )
  const created = await client.createOneStepCharge(body)
  console.log('\n✅ Cobrança de cartão criada. Resposta CRUA (confirme os nomes dos campos):')
  console.log(JSON.stringify(created, null, 2))

  console.log('\n→ parseOneStepCardResponse(create):')
  console.log(parseOneStepCardResponse(created))

  const chargeId = created?.data?.charge_id ?? created?.charge_id ?? created?.data?.id

  if (detail && chargeId != null) {
    console.log(`\n→ GET /charge/${chargeId}`)
    const detailed = await client.detailCharge(chargeId)
    console.log('→ parseCardDetailCharge(detail):')
    console.log(parseCardDetailCharge(detailed, String(chargeId)))
    console.log('\nDetalhe cru:')
    console.log(JSON.stringify(detailed, null, 2))
  }
} catch (error) {
  console.error('❌ Falha ao criar a cobrança de cartão:')
  console.error(error)
  console.error(
    '\nDica: confirme EFI_CLIENT_ID/SECRET de HOMOLOGAÇÃO, o escopo Cobranças (Emissões), e que o --token é válido e recente (tokens de cartão expiram em minutos).',
  )
  process.exit(1)
}
