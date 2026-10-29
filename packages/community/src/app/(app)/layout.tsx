import { ImpersonationBanner } from '@sistemazero/member-shell/components/impersonation-banner'
import { AcessoSchema } from '@sistemazero/member-shell/lib/arquipelago-contracts'
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
  const [avatar, gamification, acessoJogo] = await Promise.all([
    getAvatarReadonly().catch(() => null),
    shell.members.getGamificationReadonly({ withRanking: true }).catch(() => null),
    shell.gateway
      .gatewayFetchReadonly<unknown>('/arquipelago/acesso', { signal: AbortSignal.timeout(1500) })
      .catch(() => null),
  ])
  const acesso = AcessoSchema.safeParse(acessoJogo?.status === 200 ? acessoJogo.body : null)
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
        // Restrição temporária só do menu durante a validação do jogo.
        arquipelagoLiberado={
          (session.role === 'admin' || session.role === 'superadmin') &&
          acesso.success &&
          acesso.data.liberado
        }
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
