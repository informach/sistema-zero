// Schemas de checkout (Pix/cartão/boleto) — client-safe: importa APENAS `zod`,
// sem env nem server. Fonte única de verdade usada pelas ilhas (validação no
// browser) e pelos handlers `startPix`/`startCard`/`startBoleto` (validação no
// servidor). Espelha o DTO do payments (`AddressSchema`, customer, card).

import { z } from 'zod'
import { CARD_BRANDS, luhnCheck } from './card-utils'
import { ContactSchema } from './contact-schema'

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

/**
 * Dados pessoais do checkout ("Dados pessoais", estilo Hotmart): compartilhados
 * entre Pix e cartão. Vão no corpo de `POST /api/checkout/{pix,card,subscription}`
 * — o handler atualiza o lead e monta o `customer` da cobrança (Pix vira `devedor`
 * na Efí). O **telefone** é OBRIGATÓRIO aqui (a Efí exige na assinatura de cartão e
 * ele alimenta a conta do comprador): a FONTE DA VERDADE é o formulário do checkout,
 * não o lead — o handler usa `contact.telefone` e grava no lead (não o contrário).
 * A CONFIRMAÇÃO de e-mail é validação só do browser (não vai ao servidor).
 */
export const CheckoutContactSchema = z.object({
  nome: ContactSchema.shape.nome,
  email: ContactSchema.shape.email,
  cpf: CpfSchema,
  telefone: ContactSchema.shape.telefone,
})

/**
 * Slug da oferta ESCOLHIDA no alternador mensal↔anual (opcional; ausente = a
 * oferta principal do funil). O servidor VALIDA contra `{principal, altOffer}`
 * do catálogo — slug forjado → 400 (nunca cobra uma oferta não linkada).
 */
export const ChosenOfferSchema = z
  .string()
  .trim()
  .min(1)
  .max(140)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Oferta inválida.')
  .optional()

/**
 * Corpo de `POST /api/checkout/pix`. O Pix NÃO é gerado sem os dados pessoais
 * completos (regra do produto: enviar nome/e-mail/CPF à Efí e não criar
 * transação à toa) — o botão "Gerar código Pix" só habilita com tudo válido.
 */
export const PixChargeSchema = z.object({
  contact: CheckoutContactSchema,
  couponCode: CouponCodeSchema,
  offerSlug: ChosenOfferSchema,
})

/** Form do boleto (browser) E corpo de `POST /api/checkout/boleto` (servidor). */
export const BoletoFormSchema = z.object({
  cpf: CpfSchema,
  address: AddressSchema,
  couponCode: CouponCodeSchema,
  offerSlug: ChosenOfferSchema,
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
  // Dados pessoais compartilhados (CPF veio do form de cartão p/ cá no redesign).
  contact: CheckoutContactSchema,
  // Endereço de cobrança OPCIONAL — a Efí aceita cartão sem billing_address.
  address: AddressSchema.optional(),
  offerSlug: ChosenOfferSchema,
})

/** Nascimento AAAA-MM-DD (a Efí exige na assinatura de cartão). */
export const BirthSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de nascimento inválida (AAAA-MM-DD).')
  .refine((v) => {
    const [y, m, d] = v.split('-').map(Number)
    const date = new Date(Date.UTC(y!, m! - 1, d!))
    const valid =
      date.getUTCFullYear() === y && date.getUTCMonth() === m! - 1 && date.getUTCDate() === d
    return valid && y! >= 1900 && date.getTime() < Date.now()
  }, 'Data de nascimento inválida.')

/**
 * Corpo de `POST /api/checkout/subscription` (servidor), APÓS a tokenização no
 * browser. ASSINATURA de cartão: SEM parcelas (a Efí cobra 1x por ciclo) e SEM
 * cupom (o valor cotado vira o plano p/ TODOS os ciclos — desconto seria
 * perpétuo silencioso). A Efí exige o pagador completo: nascimento + endereço.
 */
export const SubscriptionChargeSchema = z.object({
  token: z.string().trim().min(1).max(255),
  brand: z.enum(CARD_BRANDS, { error: 'Bandeira do cartão inválida.' }),
  last4: z
    .string()
    .trim()
    .regex(/^\d{4}$/, 'last4 inválido.'),
  attemptId: z.string().trim().min(1).max(64),
  contact: CheckoutContactSchema,
  birth: BirthSchema,
  address: AddressSchema,
  offerSlug: ChosenOfferSchema,
})

export type AddressFormInput = z.infer<typeof AddressSchema>
export type BoletoFormInput = z.infer<typeof BoletoFormSchema>
export type CardFormInput = z.infer<typeof CardFormSchema>
export type CardChargeInput = z.infer<typeof CardChargeSchema>
export type CheckoutContactInput = z.infer<typeof CheckoutContactSchema>
export type PixChargeInput = z.infer<typeof PixChargeSchema>
export type SubscriptionChargeInput = z.infer<typeof SubscriptionChargeSchema>
