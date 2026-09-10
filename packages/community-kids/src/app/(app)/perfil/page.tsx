import { drawersForBlocks } from '@sistemazero/member-shell/server/studio-unlocks'
import { Home, Smile, UserRound } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BadgeShowcase } from '@/components/kids/badge-showcase'
import { CareerTimeline } from '@/components/kids/career-timeline'
import { FocusRefresh } from '@/components/kids/focus-refresh'
import { KidsBand } from '@/components/kids/kids-band'
import { KidsFeatureCard } from '@/components/kids/kids-feature-card'
import { KidsPageHeader } from '@/components/kids/kids-page-header'
import { MyTools } from '@/components/kids/my-tools'
import { StreakProtection } from '@/components/kids/streak-protection'
import { nextLevelHintWithin } from '@/lib/career-horizon'
import { canOpenFreeStudio } from '@/lib/studio-cta'
import {
  checkStudioAccessReadonly,
  getAvatarReadonly,
  getGamificationReadonly,
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

  const [profilesRes, gam, avatarRes, showcaseRes, catalogRes, unlocksRes, studioRes] =
    await Promise.all([
      listReadonly(),
      getGamificationReadonly({ withRanking: true }),
      getAvatarReadonly(),
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
    <>
      {/* Re-sincroniza ranking/nível/foguinho ao voltar pra tela (sem deslogar). */}
      <FocusRefresh />
      <KidsBand tone="creme">
        <KidsPageHeader
          eyebrow="Meu espaço"
          eyebrowIcon={UserRound}
          title="Meu perfil"
          subtitle="Seu avatar, seu nome e seu telefone."
        />
        <div className="mt-6">
          <ProfileClient
            profile={profile}
            ranking={gamification?.ranking ?? null}
            level={gamification?.level ?? null}
            levelHint={levelHint}
            avatarPhotoUrl={avatarPhotoUrl}
          />
        </div>
      </KidsBand>

      {gamification || ownsStudio ? (
        <KidsBand tone="menta" innerClassName="flex flex-col gap-6 px-4 py-8 md:px-8 md:py-12">
          {gamification ? (
            <CareerTimeline
              gamification={gamification}
              courses={courses}
              showcaseStats={showcaseStats}
            />
          ) : null}
          {ownsStudio ? <MyTools drawers={drawers} studioOwned={studioFree} /> : null}
        </KidsBand>
      ) : null}

      <KidsBand tone="lilas" innerClassName="flex flex-col gap-6 px-4 py-8 md:px-8 md:py-12">
        <h2 className="sz-display text-[clamp(1.4rem,3vw,1.9rem)]">Meu cantinho</h2>
        <section className="grid gap-4 sm:grid-cols-2" aria-label="Meu espaço criativo">
          <Link href="/quarto" prefetch={false} className="kid-pop">
            <KidsFeatureCard
              icon={Home}
              title="Meu quarto"
              description="Decore seu cantinho com as conquistas da carreira."
              color="var(--porta-clube)"
              ink="var(--porta-clube-texto)"
              className="h-full"
            />
          </Link>
          <Link href="/meu-avatar" prefetch={false} className="kid-pop">
            <KidsFeatureCard
              icon={Smile}
              title="Meu avatar"
              description="Escolha como você aparece para a turma."
              color="var(--porta-ranking)"
              ink="var(--porta-ranking-texto)"
              className="h-full"
            />
          </Link>
        </section>
        {gamification ? (
          <StreakProtection
            freezesAvailable={gamification.streak.freezesAvailable ?? 0}
            onVacation={gamification.streak.onVacation ?? false}
            vacationUntil={gamification.streak.vacationUntil ?? null}
          />
        ) : null}
      </KidsBand>

      {gamification ? (
        <KidsBand tone="ceu">
          <BadgeShowcase gamification={gamification} />
        </KidsBand>
      ) : null}
    </>
  )
}
