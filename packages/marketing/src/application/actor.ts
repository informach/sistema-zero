/**
 * Ator confiável da requisição, montado dos headers `X-Auth-User-*` que o
 * gateway injeta após verificar o JWT (o `x-internal-token` prova a origem).
 */
export interface Actor {
  desktopDeviceId?: string
  userId: string
  /** Nome de exibição (1º nome) — snapshot em autoria/checklist/atividade. */
  displayName: string
  role: string | undefined
  status: string | undefined
}
