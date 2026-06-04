import { Badge } from '@/components/ui/badge'

const LABELS: Record<string, string> = {
  active: 'Ativo',
  draft: 'Rascunho',
  paused: 'Pausado',
  archived: 'Arquivado',
  inactive: 'Inativo',
  // Status de usuário (@sistemazero/auth).
  pending: 'Pendente',
  suspended: 'Suspenso',
  blocked: 'Bloqueado',
  // Status de matrícula (@sistemazero/members).
  revoked: 'Revogada',
  expired: 'Expirada',
  // Status de pagamento (@sistemazero/payments — UPPERCASE).
  PENDING: 'Pendente',
  AUTHORIZED: 'Autorizado',
  PAID: 'Pago',
  FAILED: 'Falhou',
  EXPIRED: 'Expirado',
  CANCELED: 'Cancelado',
  REFUNDED: 'Estornado',
  // Status de assinatura.
  ACTIVE: 'Ativa',
}

const VARIANT: Record<string, 'success' | 'muted' | 'destructive' | 'default' | 'outline'> = {
  active: 'success',
  draft: 'muted',
  paused: 'default',
  archived: 'destructive',
  inactive: 'muted',
  pending: 'outline',
  suspended: 'default',
  blocked: 'destructive',
  // Matrícula (@sistemazero/members).
  revoked: 'destructive',
  expired: 'muted',
  // Pagamentos / assinaturas.
  PENDING: 'outline',
  AUTHORIZED: 'default',
  PAID: 'success',
  FAILED: 'destructive',
  EXPIRED: 'muted',
  CANCELED: 'muted',
  REFUNDED: 'default',
  ACTIVE: 'success',
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge variant={VARIANT[status] ?? 'muted'}>{LABELS[status] ?? status}</Badge>
}
