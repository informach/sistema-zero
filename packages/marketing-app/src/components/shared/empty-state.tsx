import { Construction, type LucideIcon } from 'lucide-react'

/** Bloco vazio padrão: ícone + mensagem (stubs "em construção", listas vazias). */
export function EmptyState({
  title,
  description,
  icon: Icon = Construction,
}: {
  title: string
  description?: string
  icon?: LucideIcon
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card/50 py-20 text-center">
      <Icon className="size-8 text-muted-foreground" />
      <div className="space-y-1 px-6">
        <p className="text-sm font-medium">{title}</p>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
    </div>
  )
}
