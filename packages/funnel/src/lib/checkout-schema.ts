// Schemas de checkout (cartão/boleto) — client-safe: importa APENAS `zod`, sem
// env nem server. Fonte única de verdade usada pelas ilhas (validação no browser)
// e pelos handlers `startBoleto`/`startCard` (validação no servidor). Espelha o
// DTO do payments (`AddressSchema`, customer.document, card).

import { z } from 'zod'
import { CARD_BRANDS, luhnCheck } from './card-utils'

// Reexporta o achatador de erros do contato (mesma utilidade nos forms de checkout).
export { fieldErrors } from './contact-schema'

/**
 * Achata os erros do `safeParse` em um mapa caminho-completo → mensagem
 * (ex.: `address.street`). Necessário para os forms com endereço aninhado.
 */
export function pathErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path.join('.')
    if (key && !out[key]) out[key] = issue.message
  }
  return out
}

/** Valida CPF (dígitos verificadores). Portado de `payments/.../value-objects/document.ts`. */
export function isValidCpf(raw: string): boolean {
  const cpf = (raw ?? '').replace(/\D/g, '')
  if (cpf.length !== 11) return false
  if (/^(\d)\1{10}$/.test(cpf)) return false
  const nums = cpf.split('').map(Number)
  const calc = (len: number): number => {
    let sum = 0
    for (let i = 0; i < len; i++) sum += nums[i]! * (len + 1 - i)
    const rest = (sum * 10) % 11
    return rest === 10 ? 0 : rest
  }
  return calc(9) === nums[9]! && calc(10) === nums[10]!
}

export const CpfSchema = z
  .string()
  .trim()
  .min(1, 'Informe seu CPF.')
  .refine((v) => isValidCpf(v), 'CPF inválido.')

/** Espelha o `AddressSchema` do payments (limites idênticos). */
export const AddressSchema = z.object({
  street: z.string().trim().min(1, 'Informe o endereço.').max(200, 'Endereço muito longo.'),
  number: z.string().trim().min(1, 'Informe o número.').max(20, 'Número inválido.'),
  neighborhood: z.string().trim().min(1, 'Informe o bairro.').max(120, 'Bairro muito longo.'),
  zipcode: z.string().trim().min(1, 'Informe o CEP.').max(16, 'CEP inválido.'),
  city: z.string().trim().min(1, 'Informe a cidade.').max(120, 'Cidade muito longa.'),
  state: z.string().trim().length(2, 'UF deve ter 2 letras.'),
  complement: z.string().trim().max(120, 'Complemento muito longo.').optional(),
})

/** Cupom de desconto (opcional) aplicado no checkout. */
export const CouponCodeSchema = z.string().trim().max(60).optional()

/** Form do boleto (browser) E corpo de `POST /api/checkout/boleto` (servidor). */
export const BoletoFormSchema = z.object({
  cpf: CpfSchema,
  address: AddressSchema,
  couponCode: CouponCodeSchema,
})

/**
 * Form do cartão NO BROWSER. Os dados sensíveis (PAN/cvv/validade) são validados
 * só aqui e tokenizados via `payment-token-efi` — NUNCA são enviados ao servidor.
 * As regras que dependem da BANDEIRA (comprimento exato do PAN, CVV 3×4) e de
 * `now` (validade no passado) ficam no componente — o schema não as conhece.
 */
export const CardFormSchema = z.object({
  number: z
    .string()
    .trim()
    .transform((v) => v.replace(/\s+/g, ''))
    .pipe(
      z
        .string()
        .regex(/^\d{13,19}$/, 'Número do cartão inválido.')
        .refine(luhnCheck, 'Número do cartão inválido.'),
    ),
  holderName: z
    .string()
    .trim()
    .min(2, 'Informe o nome impresso no cartão.')
    .max(100, 'Nome muito longo.'),
  expirationMonth: z
    .string()
    .trim()
    .regex(/^(0[1-9]|1[0-2])$/, 'Mês inválido (MM).'),
  expirationYear: z
    .string()
    .trim()
    .regex(/^\d{4}$/, 'Ano inválido (AAAA).'),
  cvv: z
    .string()
    .trim()
    .regex(/^\d{3,4}$/, 'CVV inválido.'),
  cpf: CpfSchema,
  installments: z.coerce.number().int().min(1).max(12),
  // Endereço de cobrança OPCIONAL — a Efí aceita cartão sem billing_address.
  address: AddressSchema.optional(),
})

/**
 * Corpo de `POST /api/checkout/card` (servidor), APÓS a tokenização no browser.
 * Sem PAN/cvv/validade (PCI). `last4` vem do `card_mask`. `attemptId` é um nonce
 * por tentativa → permite re-tentar após recusa sem colidir a Idempotency-Key.
 */
export const CardChargeSchema = z.object({
  token: z.string().trim().min(1).max(255),
  brand: z.enum(CARD_BRANDS, { error: 'Bandeira do cartão inválida.' }),
  last4: z
    .string()
    .trim()
    .regex(/^\d{4}$/, 'last4 inválido.'),
  installments: z.coerce.number().int().min(1).max(12),
  attemptId: z.string().trim().min(1).max(64),
  couponCode: CouponCodeSchema,
  customer: z.object({
    document: CpfSchema,
    // Endereço de cobrança OPCIONAL — a Efí aceita cartão sem billing_address.
    address: AddressSchema.optional(),
  }),
})

export type AddressFormInput = z.infer<typeof AddressSchema>
export type BoletoFormInput = z.infer<typeof BoletoFormSchema>
export type CardFormInput = z.infer<typeof CardFormSchema>
export type CardChargeInput = z.infer<typeof CardChargeSchema>
