import { BadgeShowcase } from '@/components/kids/badge-showcase'
import { getMeReadonly } from '@/server/auth'
import { getGamificationReadonly } from '@/server/members'
import { getSession } from '@/server/session'
import { ProfileClient } from './profile-client'

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  // Dados frescos do banco (trazem `phone`); fallback nas claims da sessão.
  // SOMENTE-LEITURA: página é Server Component (refresh/escrita de cookie aqui
  // lança) — o proxy já renovou o access antes do render; 401 residual degrada.
  // Gamificação é best-effort (401 → vitrine/ranking somem). `withRanking`
  // pede a colocação no ranking de XP da vitrine kids (só esta página usa).
  const session = await getSession()
  const [{ status, body }, gam] = await Promise.all([
    getMeReadonly(),
    getGamificationReadonly({ withRanking: true }),
  ])
  const user =
    status === 200 && body?.user ? body.user : session ? { ...session, phone: undefined } : null
  const gamification = gam.status === 200 ? (gam.body ?? null) : null

  if (!user) return null

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <h1 className="sz-display text-2xl">Meu perfil</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Seus dados de acesso e informações pessoais.
        </p>
      </div>
      <ProfileClient user={user} ranking={gamification?.ranking ?? null} />
      {gamification ? <BadgeShowcase gamification={gamification} /> : null}
    </div>
  )
}
