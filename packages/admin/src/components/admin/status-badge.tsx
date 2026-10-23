import { Badge } from '@sistemazero/ui/badge'

/**
 * As situações escritas para gente, numa tabela só (a sala da equipe, 23/10/2026): os filtros,
 * os formulários e os selos usam os mesmos nomes, em vez de `draft/active/PENDING` crus.
 *
 * `kind` separa o que o mesmo valor quer dizer em cada lugar: `active` é "Publicado" num
 * produto, oferta ou curso, e "Ativa" numa conta.
 */
export type StatusKind = 'catalog' | 'account' | 'generic'

const CATALOG: Record<string, string> = {
  draft: 'Rascunho',
  active: 'Publicado',
  published: 'Publicado',
  paused: 'Pausado',
  archived: 'Arquivado',
  inactive: 'Desligado',
}

const ACCOUNT: Record<string, string> = {
  active: 'Ativa',
  pending: 'Convite sem resposta',
  suspended: 'Suspensa',
  blocked: 'Bloqueada',
  inactive: 'Inativa',
}

const GENERIC: Record<string, string> = {
  active: 'Ativo',
  draft: 'Rascunho',
  paused: 'Pausado',
  archived: 'Arquivado',
  inactive: 'Inativo',
  pending: 'Aguardando',
  suspended: 'Suspenso',
  blocked: 'Bloqueado',
  // Acesso a curso (@sistemazero/members).
  revoked: 'Acesso tirado',
  expired: 'Acesso encerrado',
  // Derivado, NÃO é status do banco: `active` com a validade já passada. Ver
  // `lib/entitlement-status.ts` (a coluna diz 'active' para sempre nesse caso).
  lapsed: 'Venceu',
  // Pagamento (@sistemazero/payments, em maiúsculas).
  PENDING: 'Aguardando',
  AUTHORIZED: 'Autorizado',
  PAID: 'Pago',
  FAILED: 'Não deu certo',
  EXPIRED: 'Expirado',
  CANCELED: 'Cancelado',
  REFUNDED: 'Estornado',
  // Assinatura.
  ACTIVE: 'Em dia',
}

export function statusLabel(status: string, kind: StatusKind = 'generic'): string {
  const table = kind === 'catalog' ? CATALOG : kind === 'account' ? ACCOUNT : {}
  return table[status] ?? GENERIC[status] ?? status
}

const VARIANT: Record<
  string,
  'success' | 'muted' | 'destructive' | 'default' | 'outline' | 'warning'
> = {
  active: 'success',
  published: 'success',
  draft: 'muted',
  paused: 'warning',
  archived: 'muted',
  inactive: 'muted',
  pending: 'warning',
  suspended: 'warning',
  blocked: 'destructive',
  // Acesso a curso (@sistemazero/members).
  revoked: 'destructive',
  expired: 'muted',
  // Vencida NÃO é neutra: é acesso cortado que o operador precisa notar.
  lapsed: 'destructive',
  // Pagamentos / assinaturas.
  PENDING: 'warning',
  AUTHORIZED: 'default',
  PAID: 'success',
  FAILED: 'destructive',
  EXPIRED: 'muted',
  CANCELED: 'muted',
  REFUNDED: 'default',
  ACTIVE: 'success',
}

export function StatusBadge({ status, kind }: { status: string; kind?: StatusKind }) {
  return <Badge variant={VARIANT[status] ?? 'muted'}>{statusLabel(status, kind)}</Badge>
}
