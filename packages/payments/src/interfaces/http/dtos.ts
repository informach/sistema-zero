import { t } from 'elysia'

const AddressSchema = t.Object({
  street: t.String({ minLength: 1, maxLength: 200 }),
  number: t.String({ minLength: 1, maxLength: 20 }),
  neighborhood: t.String({ minLength: 1, maxLength: 120 }),
  zipcode: t.String({ minLength: 1, maxLength: 16 }),
  city: t.String({ minLength: 1, maxLength: 120 }),
  state: t.String({ minLength: 2, maxLength: 2 }),
  complement: t.Optional(t.String({ maxLength: 120 })),
})

/**
 * Corpo de `POST /payments`. Validação de formato na borda (TypeBox), com
 * limites superiores explícitos para evitar valores absurdos / abuso.
 */
export const ProcessPaymentBody = t.Object({
  // Máximo ~R$ 10.000.000,00 — teto de sanidade contra valores absurdos.
  amountInCents: t.Integer({
    minimum: 1,
    maximum: 1_000_000_000,
    description: 'Valor em centavos',
  }),
  method: t.Union([t.Literal('PIX'), t.Literal('BOLETO'), t.Literal('CREDIT_CARD')]),
  description: t.Optional(t.String({ maxLength: 200 })),
  payerMessage: t.Optional(t.String({ maxLength: 140 })),
  expiresInSeconds: t.Optional(t.Integer({ minimum: 60, maximum: 86_400 })),
  customer: t.Optional(
    t.Object({
      name: t.String({ minLength: 1, maxLength: 200 }),
      email: t.String({ minLength: 3, maxLength: 320, pattern: '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$' }),
      document: t.String({ minLength: 11, maxLength: 18 }),
      phone: t.Optional(t.String({ maxLength: 20 })),
      address: t.Optional(AddressSchema),
      // Exigido pela Efí no cartão de crédito; obrigatoriedade aplicada na camada de aplicação.
      birth: t.Optional(t.String({ pattern: '^\\d{4}-\\d{2}-\\d{2}$' })),
    }),
  ),
  card: t.Optional(
    t.Object({
      token: t.String({ minLength: 1, maxLength: 255 }),
      brand: t.String({ minLength: 1, maxLength: 40 }),
      last4: t.String({ minLength: 4, maxLength: 4 }),
      installments: t.Integer({ minimum: 1, maximum: 12 }),
    }),
  ),
  // Parâmetros específicos de boleto (API Cobranças). O pagador completo
  // (customer + endereço) é exigido na camada de aplicação para BOLETO.
  boleto: t.Optional(
    t.Object({
      dueDate: t.Optional(t.String({ pattern: '^\\d{4}-\\d{2}-\\d{2}$' })),
      expiresInDays: t.Optional(t.Integer({ minimum: 1, maximum: 365 })),
      fine: t.Optional(t.Integer({ minimum: 0, maximum: 10_000 })),
      interest: t.Optional(t.Integer({ minimum: 0, maximum: 10_000 })),
      discount: t.Optional(t.Integer({ minimum: 0, maximum: 1_000_000_000 })),
      message: t.Optional(t.String({ maxLength: 400 })),
      daysToWriteOff: t.Optional(t.Integer({ minimum: 0, maximum: 120 })),
    }),
  ),
  // Limita a quantidade de chaves de metadata (a soma do corpo ainda é limitada
  // pelo teto global de tamanho do corpo no onParse).
  metadata: t.Optional(t.Record(t.String({ maxLength: 64 }), t.Unknown(), { maxProperties: 50 })),
})

/**
 * Corpo de `POST /subscriptions` (assinatura de cartão, recorrência). O pagador
 * completo (documento + telefone + nascimento + endereço) é exigido na camada de
 * aplicação (→ 422). `card` (sem parcelas — cada ciclo é uma cobrança) é obrigatório.
 */
export const CreateSubscriptionBody = t.Object({
  amountInCents: t.Integer({
    minimum: 1,
    maximum: 1_000_000_000,
    description: 'Valor por ciclo, em centavos',
  }),
  intervalMonths: t.Integer({
    minimum: 1,
    maximum: 60,
    description: 'Intervalo entre cobranças, em meses',
  }),
  // null = ilimitada; ausente também = ilimitada.
  repeats: t.Optional(t.Union([t.Integer({ minimum: 1, maximum: 120 }), t.Null()])),
  description: t.Optional(t.String({ maxLength: 200 })),
  customer: t.Optional(
    t.Object({
      name: t.String({ minLength: 1, maxLength: 200 }),
      email: t.String({ minLength: 3, maxLength: 320, pattern: '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$' }),
      document: t.String({ minLength: 11, maxLength: 18 }),
      phone: t.Optional(t.String({ maxLength: 20 })),
      address: t.Optional(AddressSchema),
      birth: t.Optional(t.String({ pattern: '^\\d{4}-\\d{2}-\\d{2}$' })),
    }),
  ),
  card: t.Object({
    token: t.String({ minLength: 1, maxLength: 255 }),
    brand: t.String({ minLength: 1, maxLength: 40 }),
    last4: t.String({ minLength: 4, maxLength: 4 }),
  }),
  metadata: t.Optional(t.Record(t.String({ maxLength: 64 }), t.Unknown(), { maxProperties: 50 })),
})

// ── Admin (painel @sistemazero/admin): leitura paginada + filtros. `t.Numeric`
// coage a string da query para número; o handler ainda capa o `limit` (defesa).
// As datas chegam como string ISO e são parseadas no handler (guarda contra NaN). ──
const PAYMENT_STATUS = t.Union([
  t.Literal('PENDING'),
  t.Literal('AUTHORIZED'),
  t.Literal('PAID'),
  t.Literal('FAILED'),
  t.Literal('EXPIRED'),
  t.Literal('CANCELED'),
  t.Literal('REFUNDED'),
])
const PAYMENT_METHOD = t.Union([t.Literal('PIX'), t.Literal('BOLETO'), t.Literal('CREDIT_CARD')])
const SUBSCRIPTION_STATUS = t.Union([
  t.Literal('PENDING'),
  t.Literal('ACTIVE'),
  t.Literal('CANCELED'),
  t.Literal('EXPIRED'),
])
const ADMIN_Q = t.Optional(t.String({ minLength: 1, maxLength: 120 }))
const ADMIN_CONSUMER = t.Optional(t.String({ minLength: 1, maxLength: 120 }))
const ADMIN_LIMIT = t.Optional(t.Numeric({ minimum: 1, maximum: 100 }))
const ADMIN_OFFSET = t.Optional(t.Numeric({ minimum: 0, maximum: 1_000_000 }))
const ADMIN_DATE = t.Optional(t.String({ minLength: 1, maxLength: 40 }))

/** Query de `GET /payments/admin/payments`. */
export const ListPaymentsQuery = t.Object({
  q: ADMIN_Q,
  status: t.Optional(PAYMENT_STATUS),
  method: t.Optional(PAYMENT_METHOD),
  consumerId: ADMIN_CONSUMER,
  from: ADMIN_DATE,
  to: ADMIN_DATE,
  limit: ADMIN_LIMIT,
  offset: ADMIN_OFFSET,
})

/** Query de `GET /payments/admin/subscriptions`. */
export const ListSubscriptionsQuery = t.Object({
  q: ADMIN_Q,
  status: t.Optional(SUBSCRIPTION_STATUS),
  consumerId: ADMIN_CONSUMER,
  limit: ADMIN_LIMIT,
  offset: ADMIN_OFFSET,
})

/** Query de `GET /payments/admin/stats`. */
export const PaymentsStatsQuery = t.Object({
  from: ADMIN_DATE,
  to: ADMIN_DATE,
})

/** Param `:id` (UUID) das rotas admin — valida o formato p/ não virar 500 na coluna uuid. */
export const AdminIdParam = t.Object({
  id: t.String({
    pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
  }),
})

/** Query de `GET /payments/my` ("minhas compras" — self-service do comprador). */
export const MyPaymentsQuery = t.Object({
  limit: ADMIN_LIMIT,
  offset: ADMIN_OFFSET,
})
