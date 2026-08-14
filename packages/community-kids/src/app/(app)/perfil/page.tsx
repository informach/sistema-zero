import { drawersForBlocks } from '@sistemazero/member-shell/server/studio-unlocks'
import { redirect } from 'next/navigation'
import { BadgeShowcase } from '@/components/kids/badge-showcase'
import { CareerTimeline } from '@/components/kids/career-timeline'
import { FocusRefresh } from '@/components/kids/focus-refresh'
import { LeagueBoard } from '@/components/kids/league-board'
import { MyTools } from '@/components/kids/my-tools'
import { StreakProtection } from '@/components/kids/streak-protection'
import { nextLevelHintWithin } from '@/lib/career-horizon'
import { canOpenFreeStudio } from '@/lib/studio-cta'
import {
  checkStudioAccessReadonly,
  getAvatarReadonly,
  getGamificationReadonly,
  getLeagueReadonly,
  getStudioUnlocksReadonly,
  listCatalog,
} from '@/server/members'
import { listReadonly } from '@/server/profiles'
import { getSession } from '@/server/session'
import { shell } from '@/server/shell'
import { ProfileClient } from './profile-client'

export const dynamic = 'force-dynamic'

/**
 * "Meu perfil" do kids: a CRIANÇA edita o PRÓPRIO perfil (nome/telefone; a imagem
 * vem só do avatar 3D — clicar no rosto abre o configurador) —
 * nunca a conta do responsável (isso é da Área dos pais, em `/perfis`). A página é
 * sempre uma sessão de perfil (o proxy manda a sessão da CONTA para `/perfis`); o
 * perfil ativo é aquele cujo `id` == `sub` da sessão. Gamificação (ranking/badges)
 * é best-effort: 401/erro → some.
 */
export default async function ProfilePage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const [profilesRes, gam, avatarRes, leagueRes, showcaseRes, catalogRes, unlocksRes, studioRes] =
    await Promise.all([
      listReadonly(),
      getGamificationReadonly({ withRanking: true }),
      getAvatarReadonly(),
      getLeagueReadonly(),
      // Jogos publicados + jogadas (linha da carreira) — best-effort, some no erro.
      shell.hub.myShowcaseStatsReadonly().catch(() => null),
      // Catálogo: define até onde a escada da carreira é desenhada e limita o contador
      // ao que EXISTE (horizonte). Best-effort — sem ele a escada cai no comportamento
      // antigo (os 8 postos), que é o estado final de qualquer forma.
      listCatalog().catch(() => null),
      // Ferramentas conquistadas nos cursos (currículo) + posse do Estúdio p/ o atalho.
      getStudioUnlocksReadonly().catch(() => null),
      checkStudioAccessReadonly().catch(() => null),
    ])
  const profiles = profilesRes.status === 200 ? (profilesRes.body?.profiles ?? []) : []
  const profile = profiles.find((p) => p.id === session.id) ?? null
  // Sessão da conta (sem perfil) ou perfil sumido → volta à grade de seleção.
  if (!profile) redirect('/perfis')
  const gamification = gam.status === 200 ? (gam.body ?? null) : null
  const league = leagueRes.status === 200 ? (leagueRes.body ?? null) : null
  const avatarPhotoUrl =
    avatarRes.status === 200 && avatarRes.body ? (avatarRes.body.photoUrl ?? null) : null
  const showcaseStats = showcaseRes?.status === 200 ? (showcaseRes.body ?? null) : null
  // `null` = catálogo DESCONHECIDO (≠ vazio): a escada não encolhe por soluço de rede.
  const courses = catalogRes?.status === 200 ? (catalogRes.body?.courses ?? []) : null
  const levelHint = nextLevelHintWithin(gamification?.level, courses)
  // Gavetas conquistadas: a cara visível do currículo (cada curso concluído + publicado
  // entrega os blocos que ensinou). Sem nenhuma, a seção some.
  const drawers = drawersForBlocks(
    unlocksRes?.status === 200 ? (unlocksRes.body?.blocks ?? []) : [],
  )
  // ⚠️ Duas coisas diferentes: TER o produto decide se a seção existe (produtos vendidos
  // à parte — não se mostra superfície de produto a quem não o comprou) e `freeStudio`
  // decide se o ATALHO aparece (Faísca com o produto ainda não abre o Estúdio livre).
  const ownsStudio =
    studioRes?.status === 200 && studioRes.body?.access?.['estudio-completo'] === true
  const studioFree = canOpenFreeStudio(ownsStudio, gamification?.level?.slug, session.role)

  return (
    <div className="flex w-full flex-col gap-6">
      {/* Re-sincroniza ranking/nível/foguinho ao voltar pra tela (sem deslogar). */}
      <FocusRefresh />
      <div>
        <h1 className="sz-display text-2xl">Meu perfil</h1>
        <p className="mt-1 text-sm text-muted-foreground">Seu avatar, seu nome e seu telefone.</p>
      </div>
      <ProfileClient
        profile={profile}
        ranking={gamification?.ranking ?? null}
        level={gamification?.level ?? null}
        levelHint={levelHint}
        avatarPhotoUrl={avatarPhotoUrl}
      />
      {gamification ? (
        <CareerTimeline
          gamification={gamification}
          courses={courses}
          showcaseStats={showcaseStats}
        />
      ) : null}
      {ownsStudio ? <MyTools drawers={drawers} studioOwned={studioFree} /> : null}
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
