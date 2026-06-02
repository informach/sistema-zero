// Schema do login de admin — client-safe (só `zod`). Usado pela ilha `AdminLogin`
// (validação no browser) e pelo handler `adminLogin` (validação no servidor). As
// credenciais são de um usuário REAL do auth (IdP): e-mail + senha.

import { z } from 'zod'

export const AdminLoginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, 'Informe o e-mail.')
    .max(320, 'E-mail muito longo.')
    .email('E-mail inválido.'),
  password: z.string().min(1, 'Informe a senha.').max(200, 'Senha muito longa.'),
})

export type AdminLoginInput = z.infer<typeof AdminLoginSchema>
