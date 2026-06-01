// Schema do login de admin — client-safe (só `zod`). Usado pela ilha `AdminLogin`
// (validação no browser) e pelo handler `adminLogin` (validação no servidor).

import { z } from 'zod'

export const AdminLoginSchema = z.object({
  usuario: z.string().trim().min(1, 'Informe o usuário.').max(200, 'Usuário muito longo.'),
  senha: z.string().min(1, 'Informe a senha.').max(200, 'Senha muito longa.'),
})

export type AdminLoginInput = z.infer<typeof AdminLoginSchema>
