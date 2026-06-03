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
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge variant={VARIANT[status] ?? 'muted'}>{LABELS[status] ?? status}</Badge>
}
