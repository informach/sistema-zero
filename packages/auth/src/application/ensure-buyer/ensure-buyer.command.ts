/**
 * Comando de "garantir comprador" (create-or-get por e-mail). Usado S2S pelo funil
 * pós-pagamento: precisa SEMPRE de um `userId` (novo ou existente) para conceder o
 * acesso na área de membros — inclusive ao comprador RECORRENTE (e-mail já existe).
 * `password` só é usado quando o usuário é criado (senha "dummy"; a real vem depois
 * pelo magic-link de 1º acesso). `phone`/`source` são opcionais.
 */
export interface EnsureBuyerCommand {
  email: string
  password: string
  firstName: string
  lastName: string
  phone?: string
  source?: string
}
