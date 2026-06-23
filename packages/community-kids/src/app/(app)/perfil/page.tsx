import { redirect } from 'next/navigation'
import { BadgeShowcase } from '@/components/kids/badge-showcase'
import { LeagueBoard } from '@/components/kids/league-board'
import { StreakProtection } from '@/components/kids/streak-protection'
import { getAvatarReadonly, getGamificationReadonly, getLeagueReadonly } from '@/server/members'
import { listReadonly } from '@/server/profiles'
import { getSession } from '@/server/session'
import { ProfileClient } from './profile-client'

export const dynamic = 'force-dynamic'

/**
 * "Meu perfil" do kids: a CRIANÇA edita o PRÓPRIO perfil (nome/foto/telefone) —
 * nunca a conta do responsável (isso é da Área dos pais, em `/perfis`). A página é
 * sempre uma sessão de perfil (o proxy manda a sessão da CONTA para `/perfis`); o
 * perfil ativo é aquele cujo `id` == `sub` da sessão. Gamificação (ranking/badges)
 * é best-effort: 401/erro → some.
 */
export default async function ProfilePage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const [profilesRes, gam, avatarRes, leagueRes] = await Promise.all([
    listReadonly(),
    getGamificationReadonly({ withRanking: true }),
    getAvatarReadonly(),
    getLeagueReadonly(),
  ])
  const profiles = profilesRes.status === 200 ? (profilesRes.body?.profiles ?? []) : []
  const profile = profiles.find((p) => p.id === session.id) ?? null
  // Sessão da conta (sem perfil) ou perfil sumido → volta à grade de seleção.
  if (!profile) redirect('/perfis')
  const gamification = gam.status === 200 ? (gam.body ?? null) : null
  const league = leagueRes.status === 200 ? (leagueRes.body ?? null) : null
  const avatarPhotoUrl =
    avatarRes.status === 200 && avatarRes.body ? (avatarRes.body.photoUrl ?? null) : null

  return (
    <div className="flex w-full flex-col gap-6">
      <div>
        <h1 className="sz-display text-2xl">Meu perfil</h1>
        <p className="mt-1 text-sm text-muted-foreground">Seu avatar, seu nome e seu telefone.</p>
      </div>
      <ProfileClient
        profile={profile}
        ranking={gamification?.ranking ?? null}
        avatarPhotoUrl={avatarPhotoUrl}
      />
      {league ? <LeagueBoard league={league} /> : null}
      {gamification ? (
        <StreakProtection
          freezesAvailable={gamification.streak.freezesAvailable ?? 0}
          onVacation={gamification.streak.onVacation ?? false}
          vacationUntil={gamification.streak.vacationUntil ?? null}
        />
      ) : null}
      {gamification ? <BadgeShowcase gamification={gamification} /> : null}
    </div>
  )
}
