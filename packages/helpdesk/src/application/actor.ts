/**
 * Ator confiável da requisição, montado dos headers `X-Auth-User-*` que o
 * gateway injeta após verificar o JWT (o `x-internal-token` prova a origem).
 */
export interface Actor {
  userId: string
  /** Nome de exibição (1º nome) — snapshot em autoria/atribuição/notas. */
  displayName: string
  role: string | undefined
  status: string | undefined
}
