import type { StudyGrantView } from '@sistemazero/member-shell/lib/study-access'
import { CalendarX, Clock, ShieldCheck } from 'lucide-react'
import { childAccessSummary, formatAccessEnd, GRANT_STATE_LABEL } from '@/lib/study-access-view'
import { StatusChip } from './_components/parent-ui'

/**
 * O estado dos aparelhos no cartão da criança, sem abrir a página dela: o responsável vê o
 * "Vence em breve" e o "Vencido" na própria área dos pais. Consulta que falhou não vira "sem
 * acesso": o cartão cala.
 */
export function ChildAccessStatus({ grants }: { grants: StudyGrantView[] | null | undefined }) {
  const summary = childAccessSummary(grants)
  if (summary.kind === 'unknown') return null
  const line = (text: string) => <p className="break-words text-muted-foreground text-xs">{text}</p>
  if (summary.kind === 'none')
    return (
      <div className="flex flex-col items-start gap-1.5">
        <StatusChip tone="attention" icon={Clock}>
          Ainda sem aparelho autorizado
        </StatusChip>
        {line('Sem um aparelho autorizado, a criança só entra com você por perto.')}
      </div>
    )
  if (summary.kind === 'expired')
    return (
      <div className="flex flex-col items-start gap-1.5">
        <StatusChip tone="neutral" icon={CalendarX}>
          {GRANT_STATE_LABEL.expired}
        </StatusChip>
        {line('Renove em Acesso nos aparelhos.')}
      </div>
    )
  if (summary.kind === 'expiring')
    return (
      <div className="flex flex-col items-start gap-1.5">
        <StatusChip tone="attention" icon={Clock}>
          {GRANT_STATE_LABEL.expiring}
        </StatusChip>
        {line(`${summary.label}: até ${formatAccessEnd(summary.expiresAt)}.`)}
      </div>
    )
  return (
    <div className="flex flex-col items-start gap-1.5">
      <StatusChip tone="ok" icon={ShieldCheck}>
        {GRANT_STATE_LABEL.active}
      </StatusChip>
      {line(summary.live === 1 ? 'Em 1 aparelho.' : `Em ${summary.live} aparelhos.`)}
    </div>
  )
}
