import { ImpersonationBanner } from '@sistemazero/member-shell/components/impersonation-banner'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { AppSidebar } from '@/components/kids/app-sidebar'
import { MobileTabbar, MobileTopbar } from '@/components/kids/mobile-nav'
import { actorLabel } from '@/lib/act'
import type { AvatarConfig } from '@/lib/avatar-catalog'
import { getMeReadonly } from '@/server/auth'
import { getAvatarReadonly, getGamificationReadonly } from '@/server/members'
import { getSession } from '@/server/session'

export const dynamic = 'force-dynamic'

type Session = NonNullable<Awaited<ReturnType<typeof getSession>>>

/**
 * Carrega avatar (fora das claims) + gamificação — best-effort e SOMENTE-LEITURA
 * (Server Component: refresh/escrita de cookie aqui LANÇA; 401 → cai no fallback).
 * Ambas são deduplicadas por request (React cache no member-shell), então chamar
 * daqui na sidebar E na topbar custa UMA ida ao gateway cada. `withRanking` traz a
 * colocação p/ o menu/rodapé do avatar (substitui o e-mail do responsável). Em
 * sessão de PERFIL a CRIANÇA se vê em toda a navegação (nome/foto do perfil).
 */
async function loadChrome(session: Session) {
  const profileName = session.activeProfile?.name
  const isProfile = Boolean(profileName)
  // O avatar montado por camadas só vale em sessão de PERFIL (a criança); na sessão
  // da CONTA (pais) cai na foto/iniciais. Best-effort (401/erro → null → fallback).
  const [me, gam, avatar] = await Promise.all([
    getMeReadonly(),
    getGamificationReadonly({ withRanking: true }),
    isProfile ? getAvatarReadonly() : Promise.resolve(null),
  ])
  const avatarUrl = me.status === 200 ? (me.body?.user?.avatarUrl ?? null) : null
  const gamification = gam.status === 200 ? (gam.body ?? null) : null
  const avatarConfig: AvatarConfig | null =
    avatar && avatar.status === 200 && avatar.body
      ? { style: avatar.body.style, parts: avatar.body.equipped }
      : null
  const user = {
    ...session,
    firstName: profileName ?? session.firstName,
    lastName: profileName ? '' : session.lastName,
    avatarUrl: profileName ? null : avatarUrl,
  }
  return { user, gamification, avatarConfig }
}

async function SidebarChrome({ session }: { session: Session }) {
  const { user, gamification, avatarConfig } = await loadChrome(session)
  return <AppSidebar user={user} gamification={gamification} avatarConfig={avatarConfig} />
}

async function TopbarChrome({ session }: { session: Session }) {
  const { user, gamification, avatarConfig } = await loadChrome(session)
  return <MobileTopbar user={user} gamification={gamification} avatarConfig={avatarConfig} />
}

/**
 * Shell autenticado do aluno: sessão obrigatória (qualquer conta ativa).
 * Navegação estilo Duolingo — sidebar fixa no desktop, top bar + tab bar
 * inferior no mobile (o pb-24 do main respira acima da tab bar).
 *
 * A sidebar/topbar dependem de avatar+gamificação (rede) e ficam atrás de
 * `<Suspense>`: o layout retorna o frame na hora (só com a sessão, que é local), o
 * `loading.tsx` da página transmite SEM esperar essas chamadas, e a chrome
 * preenche quando resolver. O esqueleto reserva o espaço (sem layout shift).
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login')

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Sessão de impersonação (suporte): faixa persistente acima de tudo. */}
      {session.act ? (
        <ImpersonationBanner
          studentName={`${session.firstName} ${session.lastName}`.trim() || session.email}
          actorName={actorLabel(session.act)}
        />
      ) : null}
      <div className="flex flex-1">
        <Suspense
          fallback={
            <aside className="sticky top-0 hidden h-screen w-60 shrink-0 border-border border-r bg-card md:block" />
          }
        >
          <SidebarChrome session={session} />
        </Suspense>
        <div className="flex min-w-0 flex-1 flex-col">
          <Suspense
            fallback={
              <div className="sticky top-0 z-40 h-14 border-border border-b bg-background/80 backdrop-blur md:hidden" />
            }
          >
            <TopbarChrome session={session} />
          </Suspense>
          <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 pb-24 md:px-8 md:py-8 md:pb-8">
            {children}
          </main>
          <MobileTabbar />
        </div>
      </div>
    </div>
  )
}
