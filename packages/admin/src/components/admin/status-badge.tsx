import { Badge } from '@/components/ui/badge'

const LABELS: Record<string, string> = {
  active: 'Ativo',
  draft: 'Rascunho',
  paused: 'Pausado',
  archived: 'Arquivado',
  inactive: 'Inativo',
}

const VARIANT: Record<string, 'success' | 'muted' | 'destructive' | 'default'> = {
  active: 'success',
  draft: 'muted',
  paused: 'default',
  archived: 'destructive',
  inactive: 'muted',
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge variant={VARIANT[status] ?? 'muted'}>{LABELS[status] ?? status}</Badge>
}
