import { Card, CardContent, CardHeader, CardTitle } from '@sistemazero/ui/card'
import type { LucideIcon } from 'lucide-react'
import Link from 'next/link'

/**
 * O cartão de número. Com `href`, o cartão inteiro leva à lista que ele resume (a sala da
 * equipe: todo número leva a algum lugar).
 */
export function OverviewCard({
  title,
  value,
  description,
  icon: Icon,
  href,
}: {
  title: string
  value: string | number
  description?: string
  icon?: LucideIcon
  href?: string
}) {
  const card = (
    <Card className={href ? 'h-full transition-colors hover:border-primary' : 'h-full'}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {Icon ? <Icon className="size-4 text-muted-foreground" aria-hidden /> : null}
      </CardHeader>
      <CardContent>
        <div className="font-mono text-3xl font-bold tracking-tight">{value}</div>
        {description ? <p className="mt-1 text-xs text-muted-foreground">{description}</p> : null}
      </CardContent>
    </Card>
  )
  if (!href) return card
  return (
    <Link href={href} className="block rounded-[var(--radius)] focus-visible:outline-2">
      {card}
    </Link>
  )
}
