import { EfiCobrancasClient } from '../src/infrastructure/gateways/efi/efi-cobrancas.client'
import {
  parseCreatePlanResponse,
  parseCreateSubscriptionResponse,
  parseSubscriptionDetail,
} from '../src/infrastructure/gateways/efi/efi-cobrancas.mapper'
import { hasFlag, readArg } from './args'

/**
 * Cria um PLANO + uma ASSINATURA de cartão real no sandbox da Efí (API Cobranças,
 * `one-step`) e imprime as respostas CRUAS — para confirmar os nomes exatos dos
 * campos (`plan_id`, `subscription_id`, `status`, a 1ª cobrança, e
 * `identifiers.subscription_id` na notificação), ajustando
 * `efi-cobrancas.mapper.ts` se necessário.
 *
 * ⚠️ O `payment_token` é gerado no BROWSER (compliance PCI) e tem VIDA CURTA. Este
 * script NÃO consegue gerá-lo: passe um token de teste do sandbox via `--token`.
 * Os ciclos 2/3 rodam no agendador real da Efí ao longo do tempo (não dá para
 * forçar numa única sessão) — o caminho de notificação recorrente é coberto por
 * fakes + teste de integração.
 *
 * Como o cartão avulso, NÃO usa certificado — só EFI_CLIENT_ID/SECRET (ou os
 * overrides EFI_COBRANCAS_CLIENT_ID/SECRET) e EFI_SANDBOX. A aplicação Efí precisa
 * ter o escopo **Cobranças (Emissões)** habilitado.
 *
 * Uso:
 *   bun run subscription:create --token <payment_token>                      # mensal, R$1,00
 *   bun run subscription:create --token <payment_token> --interval 1 --amount 1990
 *   bun run subscription:create --token <payment_token> --repeats 12         # 12 ciclos
 *   bun run subscription:create --token <payment_token> --detail             # GET /subscription/:id
 *   bun run subscription:create --token <payment_token> --cancel             # cancela ao final
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
const intervalMonths = Number(readArg('interval') ?? '1')
const repeatsArg = readArg('repeats')
const repeats = repeatsArg ? Number(repeatsArg) : null
const detail = hasFlag('detail')
const cancel = hasFlag('cancel')

const client = new EfiCobrancasClient({ clientId, clientSecret, sandbox })

const notificationUrl = process.env.EFI_BOLETO_NOTIFICATION_URL
const customId = `sub-script-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`

try {
  console.log(
    `→ POST /plan  (sandbox=${sandbox}, intervalo=${intervalMonths} mês(es), repetições=${repeats ?? 'ilimitado'})`,
  )
  const planRaw = await client.createPlan({
    name: `Assinatura de teste (${intervalMonths}m)`,
    interval: intervalMonths,
    repeats,
  })
  console.log('\n✅ Plano criado. Resposta CRUA:')
  console.log(JSON.stringify(planRaw, null, 2))
  const { planId } = parseCreatePlanResponse(planRaw)
  console.log(`→ plan_id = ${planId}`)

  const body = {
    items: [{ name: 'Assinatura de teste (sandbox)', value: amountInCents, amount: 1 }],
    payment: {
      credit_card: {
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
    metadata: {
      custom_id: customId,
      ...(notificationUrl ? { notification_url: notificationUrl } : {}),
    },
  }

  console.log(
    `\n→ POST /plan/${planId}/subscription/one-step  (valor=R$ ${(amountInCents / 100).toFixed(2)})`,
  )
  const created = await client.createOneStepSubscription(planId, body)
  console.log('\n✅ Assinatura criada. Resposta CRUA (confirme os nomes dos campos):')
  console.log(JSON.stringify(created, null, 2))

  console.log('\n→ parseCreateSubscriptionResponse(create):')
  console.log(parseCreateSubscriptionResponse(created))

  const subscriptionId =
    created?.data?.subscription_id ?? created?.subscription_id ?? created?.data?.id

  if (detail && subscriptionId != null) {
    console.log(`\n→ GET /subscription/${subscriptionId}`)
    const detailed = await client.detailSubscription(subscriptionId)
    console.log('→ parseSubscriptionDetail(detail):')
    console.log(parseSubscriptionDetail(detailed, String(subscriptionId)))
    console.log('\nDetalhe cru:')
    console.log(JSON.stringify(detailed, null, 2))
  }

  if (cancel && subscriptionId != null) {
    console.log(`\n→ PUT /subscription/${subscriptionId}/cancel`)
    const canceled = await client.cancelSubscription(subscriptionId)
    console.log('✅ Cancelada. Resposta CRUA:')
    console.log(JSON.stringify(canceled, null, 2))
  }
} catch (error) {
  console.error('❌ Falha ao criar a assinatura:')
  console.error(error)
  console.error(
    '\nDica: confirme EFI_CLIENT_ID/SECRET de HOMOLOGAÇÃO, o escopo Cobranças (Emissões), e que o --token é válido e recente (tokens de cartão expiram em minutos).',
  )
  process.exit(1)
}
