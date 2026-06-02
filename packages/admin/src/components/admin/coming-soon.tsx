import { Construction } from 'lucide-react'
import { AdminHeader } from './admin-header'

export function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-8">
      <AdminHeader title={title} description={description} />
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card/50 py-20 text-center">
        <Construction className="size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Esta área será habilitada em breve, na próxima fase do painel.
        </p>
      </div>
    </div>
  )
}
