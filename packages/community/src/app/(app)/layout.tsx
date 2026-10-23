import { ImpersonationBanner } from '@sistemazero/member-shell/components/impersonation-banner'
import { learnerIdentity } from '@sistemazero/member-shell/lib/learner-identity'
import { redirect } from 'next/navigation'
import { CommunityFrame } from '@/components/community/community-frame'
import { AdultGamificationProvider } from '@/components/community/gamification-provider'
import { actorLabel } from '@/lib/act'
import { getAvatarReadonly } from '@/server/members'
import { getSession } from '@/server/session'
import { shell } from '@/server/shell'

export const dynamic = 'force-dynamic'

/** Shell autenticado do aluno: sessão obrigatória (qualquer conta ativa). */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session || !learnerIdentity(session, 'adult')) redirect('/login')

  // A imagem da pessoa é a FOTO DO AVATAR 3D, como no Kids (direção de arte de 18/10/2026): a
  // foto enviada saiu. Best-effort e SOMENTE-LEITURA (layout é Server Component: refresh/escrita
  // de cookie aqui LANÇA). Sem avatar, gateway fora ou access expirado → as iniciais.
  const [avatar, gamification] = await Promise.all([
    getAvatarReadonly().catch(() => null),
    shell.members.getGamificationReadonly({ withRanking: true }).catch(() => null),
  ])
  const avatarUrl = avatar?.status === 200 ? (avatar.body?.photoUrl ?? null) : null
  const user = { ...session, avatarUrl }

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
