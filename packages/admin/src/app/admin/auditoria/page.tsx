import { ShieldAlert } from 'lucide-react'
import { getSession } from '@/server/session'
import { AuditoriaClient } from './auditoria-client'

export const dynamic = 'force-dynamic'

const AUDIT_ROLES = new Set(['superadmin', 'admin'])

export default async function AuditoriaPage() {
  const user = await getSession()
  if (!user || !AUDIT_ROLES.has(user.role)) {
    return (
      <div className="flex min-h-[45vh] flex-col items-center justify-center gap-3 text-center">
        <ShieldAlert className="size-10 text-destructive" />
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Acesso negado</h1>
          <p className="text-muted-foreground text-sm">Auditoria é restrita a administradores.</p>
        </div>
      </div>
    )
  }

  return <AuditoriaClient />
}
