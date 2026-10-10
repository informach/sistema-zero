import type { StudyGrantView } from '@sistemazero/member-shell/lib/study-access'
import { GrantStateChip } from '@/components/kids/study-device-manager'
import { childAccessSummary, formatAccessEnd } from '@/lib/study-access-view'

/**
 * O estado dos aparelhos no cartão da criança, sem abrir o painel: o responsável vê o
 * "Vence em breve" e o "Vencido" na própria área dos pais, não só a criança na grade dela.
 * Consulta que falhou não vira "sem acesso": o cartão cala.
 */
export function ChildAccessStatus({ grants }: { grants: StudyGrantView[] | null | undefined }) {
  const summary = childAccessSummary(grants)
  if (summary.kind === 'unknown') return null
  if (summary.kind === 'none')
    return <p className="text-sm text-muted-foreground">Ainda sem aparelho autorizado.</p>
  if (summary.kind === 'expired')
    return (
      <div className="flex flex-col items-center gap-1 text-sm">
        <GrantStateChip state="expired" />
        <p className="text-muted-foreground">Renove em Acesso nos aparelhos.</p>
      </div>
    )
  if (summary.kind === 'expiring')
    return (
      <div className="flex flex-col items-center gap-1 text-sm">
        <GrantStateChip state="expiring" />
        <p className="break-words text-muted-foreground">
          {summary.label}: até {formatAccessEnd(summary.expiresAt)}.
        </p>
      </div>
    )
  return (
    <div className="flex flex-col items-center gap-1 text-sm">
      <GrantStateChip state="active" />
      <p className="text-muted-foreground">
        {summary.live === 1 ? 'Em 1 aparelho.' : `Em ${summary.live} aparelhos.`}
      </p>
    </div>
  )
}
