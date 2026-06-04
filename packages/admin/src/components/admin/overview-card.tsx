import { Card, CardContent, CardHeader, CardTitle } from '@sistemazero/ui/card'
import type { LucideIcon } from 'lucide-react'

export function OverviewCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string
  value: string | number
  description?: string
  icon?: LucideIcon
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {Icon ? <Icon className="size-4 text-muted-foreground" /> : null}
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold tracking-tight">{value}</div>
        {description ? <p className="mt-1 text-xs text-muted-foreground">{description}</p> : null}
      </CardContent>
    </Card>
  )
}
