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
  // Limita a quantidade de chaves de metadata (a soma do corpo ainda é limitada
  // pelo teto global de tamanho do corpo no onParse).
  metadata: t.Optional(t.Record(t.String({ maxLength: 64 }), t.Unknown(), { maxProperties: 50 })),
})
