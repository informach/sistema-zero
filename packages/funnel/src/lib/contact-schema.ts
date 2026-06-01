// Schema de contato (pré-checkout) — client-safe: importa APENAS `zod`, sem env
// nem server. Usado pela ilha `PreCheckoutModal` (validação no browser) E pelo
// handler `saveContact` (validação no servidor) — fonte única de verdade.

import { z } from 'zod'

/** Conta os dígitos do telefone (ignora máscara). BR: 10 (fixo) ou 11 (celular). */
function telefoneDigits(value: string): number {
  return value.replace(/\D/g, '').length
}

export const ContactSchema = z.object({
  nome: z.string().trim().min(2, 'Informe seu nome completo.').max(200, 'Nome muito longo.'),
  email: z
    .string()
    .trim()
    .min(1, 'Informe seu e-mail.')
    .max(320, 'E-mail muito longo.')
    .regex(/^[^@\s]+@[^@\s]+\.[^@\s]+$/, 'E-mail inválido.'),
  telefone: z
    .string()
    .trim()
    .min(1, 'Informe seu telefone.')
    .max(20, 'Telefone muito longo.')
    .refine((v) => {
      const n = telefoneDigits(v)
      return n === 10 || n === 11
    }, 'Telefone inválido. Use DDD + número.'),
})

export type ContactInput = z.infer<typeof ContactSchema>

/** Achata os erros do `safeParse` em um mapa campo → primeira mensagem (pt-BR). */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? '')
    if (key && !out[key]) out[key] = issue.message
  }
  return out
}
