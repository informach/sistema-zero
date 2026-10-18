import { ImpersonationBanner } from '@sistemazero/member-shell/components/impersonation-banner'
import { learnerIdentity } from '@sistemazero/member-shell/lib/learner-identity'
import { redirect } from 'next/navigation'
import { CommunityFrame } from '@/components/community/community-frame'
import { AdultGamificationProvider } from '@/components/community/gamification-provider'
import { actorLabel } from '@/lib/act'
import { getMeReadonly } from '@/server/auth'
import { getSession } from '@/server/session'
import { shell } from '@/server/shell'

export const dynamic = 'force-dynamic'

/** Shell autenticado do aluno: sessão obrigatória (qualquer conta ativa). */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session || !learnerIdentity(session, 'adult')) redirect('/login')

  // Avatar não vive nas claims do JWT → hidrata fresco do auth, best-effort e
  // SOMENTE-LEITURA (layout é Server Component: refresh/escrita de cookie aqui
  // LANÇA — "Cookies can only be modified in a Server Action or Route Handler").
  // Access expirado/gateway fora → 401 → header cai no fallback de iniciais.
  const me = await getMeReadonly()
  const avatarUrl = me.status === 200 ? (me.body?.user?.avatarUrl ?? null) : null
  const user = { ...session, avatarUrl }
  const gamification = await shell.members
    .getGamificationReadonly({ withRanking: true })
    .catch(() => null)

  return (
    // `sz-app`: gancho do fundo da página (a aula troca para o fundo alternativo pelo CSS).
    <AdultGamificationProvider
      key={session.id}
      initial={gamification?.status === 200 ? (gamification.body ?? null) : null}
    >
      <CommunityFrame
        user={user}
        banner={
          session.act ? (
            <ImpersonationBanner
              studentName={`${session.firstName} ${session.lastName}`.trim() || session.email}
              actorName={actorLabel(session.act)}
              mode={session.act.mode}
            />
          ) : null
        }
      >
        {children}
      </CommunityFrame>
    </AdultGamificationProvider>
  )
}
