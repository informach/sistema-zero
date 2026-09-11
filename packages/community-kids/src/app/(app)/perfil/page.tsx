import { drawersForBlocks } from '@sistemazero/member-shell/server/studio-unlocks'
import { ChevronRight, type LucideIcon, Smile, Sofa, UserRound } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BadgeShowcase } from '@/components/kids/badge-showcase'
import { CareerTimeline } from '@/components/kids/career-timeline'
import { FocusRefresh } from '@/components/kids/focus-refresh'
import { KidsBand } from '@/components/kids/kids-band'
import { KidsPageHeader } from '@/components/kids/kids-page-header'
import { KidsSectionHeader } from '@/components/kids/kids-section-header'
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

  // "Minhas ferramentas" some sem gaveta nenhuma (ver `MyTools`), então a faixa menta só
  // existe quando há carreira OU ferramenta de verdade para mostrar.
  const showTools = ownsStudio && drawers.length > 0

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
        <div className="mt-7">
          <ProfileClient
            profile={profile}
            ranking={gamification?.ranking ?? null}
            level={gamification?.level ?? null}
            levelHint={levelHint}
            avatarPhotoUrl={avatarPhotoUrl}
          />
        </div>
      </KidsBand>

      {/* A ordem das telas-modelo (11/09/2026): carreira no menta, o cantinho no azul-claro
          e as conquistas fechando no lilás. */}
      {gamification || showTools ? (
        <KidsBand tone="menta">
          {gamification ? (
            <CareerTimeline
              gamification={gamification}
              courses={courses}
              showcaseStats={showcaseStats}
            />
          ) : null}
          {showTools ? (
            <MyTools
              drawers={drawers}
              studioOwned={studioFree}
              className={gamification ? 'mt-8' : undefined}
            />
          ) : null}
        </KidsBand>
      ) : null}

      {/* Sem gamificação a vitrine de conquistas some, e o cantinho passa a ser a última
          faixa da página: a última é sempre a lilás. */}
      <KidsBand tone={gamification ? 'ceu' : 'lilas'}>
        <section aria-labelledby="meu-cantinho">
          <KidsSectionHeader
            id="meu-cantinho"
            title="Meu cantinho"
            // A sequência só é citada quando ela está na tela: sem gamificação o cartão de
            // proteger a sequência não aparece, e a frase prometia o que não tem.
            subtitle={
              gamification
                ? 'Deixe o seu espaço com a sua cara e cuide da sua sequência de dias.'
                : 'Deixe o seu espaço com a sua cara.'
            }
          />
          <ul className="grid gap-4 md:grid-cols-2 md:gap-6">
            <li>
              <CantinhoLink
                href="/quarto"
                icon={Sofa}
                tone={{ fundo: 'var(--tool-molda)', tinta: 'var(--tool-molda-fg)' }}
                title="Meu quarto"
                description="Decore seu cantinho com as conquistas da carreira."
                action="Arrumar o quarto"
              />
            </li>
            <li>
              <CantinhoLink
                href="/meu-avatar"
                icon={Smile}
                tone={{ fundo: 'var(--tool-pensa)', tinta: 'var(--tool-pensa-fg)' }}
                title="Meu avatar"
                description="Escolha como você aparece para a turma."
                action="Trocar avatar"
              />
            </li>
          </ul>
          {gamification ? (
            <StreakProtection
              className="mt-4 md:mt-6"
              freezesAvailable={gamification.streak.freezesAvailable ?? 0}
              onVacation={gamification.streak.onVacation ?? false}
              vacationUntil={gamification.streak.vacationUntil ?? null}
            />
          ) : null}
        </section>
      </KidsBand>

      {gamification ? (
        <KidsBand tone="lilas">
          <BadgeShowcase gamification={gamification} />
        </KidsBand>
      ) : null}
    </>
  )
}

/**
 * Cartão-linha do "Meu cantinho" (telas-modelo de 11/09/2026): ladrilho colorido, título e
 * frase, e a pílula creme com a ação à direita. O cartão INTEIRO é o link (alvo grande
 * para mão pequena); a pílula é só o desenho do convite.
 *
 * A pílula só vai para a direita quando o PRÓPRIO cartão tem largura para isso (consulta
 * de contêiner, `@md` = 28rem): a largura dele depende da grade de duas colunas, e não da
 * janela. Numa régua de janela, o texto espremia até uma palavra por linha no celular.
 */
function CantinhoLink({
  href,
  icon: Icon,
  tone,
  title,
  description,
  action,
}: {
  href: string
  icon: LucideIcon
  tone: { fundo: string; tinta: string }
  title: string
  description: string
  action: string
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      className="kid-pop kids-carta @container block h-full p-5 md:p-7"
    >
      <span className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-3 @md:grid-cols-[auto_minmax(0,1fr)_auto]">
        <span
          aria-hidden="true"
          className="grid size-14 shrink-0 place-items-center rounded-2xl"
          style={{ backgroundColor: tone.fundo, color: tone.tinta }}
        >
          <Icon className="size-7" />
        </span>
        <span className="min-w-0">
          <span className="sz-display block text-xl md:text-[1.375rem]">{title}</span>
          <span className="mt-1.5 block font-medium text-[0.8125rem] text-muted-foreground leading-relaxed">
            {description}
          </span>
        </span>
        <span className="sz-btn-gradient sz-btn-suave col-start-2 h-10 w-fit gap-1 px-4 text-[0.8125rem] @md:col-start-auto">
          {action}
          <ChevronRight className="size-4" aria-hidden />
        </span>
      </span>
    </Link>
  )
}
