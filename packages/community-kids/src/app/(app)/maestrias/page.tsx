import {
  isKidsStaffPreview,
  kidsJourneyAccess,
} from '@sistemazero/member-shell/lib/kids-journey-access'
import { KidsBackButton } from '@/components/kids/back-button'
import { KidsMasteryHub } from '@/components/kids/creator-journey/mastery'
import { StageMedal } from '@/components/kids/creator-journey/parts'
import { KidsBand } from '@/components/kids/kids-band'
import { KidsMascot } from '@/components/kids/mascot'
import { getGamificationReadonly } from '@/server/members'
import { shell } from '@/server/shell'

export const dynamic = 'force-dynamic'

/** As Maestrias no desenho da trilha Lenda: o medalhão dourado e um cartão por área. */
export default async function MasteriesPage() {
  const [result, gamification] = await Promise.all([
    shell.members.getCreatorMasteriesReadonly().catch(() => null),
    getGamificationReadonly().catch(() => null),
  ])
  const journey = kidsJourneyAccess(gamification?.status === 200 ? gamification.body : null)
  const view = journey && !isKidsStaffPreview(journey) ? journey.curriculum : undefined
  const legend = view?.level === 'god'
  return (
    <>
      <KidsBand tone="creme">
        <KidsBackButton href="/cursos" label="Voltar ao mapa" showLabel className="mb-6" />
        <div className="flex items-center gap-4">
          <StageMedal slug="god" ring="var(--level-god)" className="size-16 md:size-[4.5rem]" />
          <h1 className="sz-display text-[clamp(2rem,3.6vw,3rem)]">
            {legend ? 'Trilha Lenda' : 'Maestrias'}
          </h1>
        </div>
        <p className="mt-4 max-w-4xl font-medium text-[1.0625rem] text-muted-foreground">
          {legend
            ? 'Você chegou ao topo da jornada. Agora escolha no que quer ficar craque: cada Maestria tem 3 níveis, com projeto avaliado pela equipe.'
            : 'Escolha no que quer ficar craque. Cada Maestria tem 3 níveis, com projeto avaliado pela equipe. Você pode começar antes de ser Lenda: cada área abre depois dos cursos de uma trilha.'}
        </p>
      </KidsBand>
      <KidsBand tone="creme">
        {result?.status !== 200 ? (
          <Notice text="Não conseguimos consultar suas Maestrias agora. Suas conquistas estão guardadas. Tente novamente daqui a pouco." />
        ) : !result.body.configured ? (
          <Notice text="As Maestrias estão sendo preparadas. Seus cursos e conquistas continuam disponíveis na jornada." />
        ) : (
          <KidsMasteryHub areas={result.body.areas} view={view} />
        )}
      </KidsBand>
    </>
  )
}

function Notice({ text }: { text: string }) {
  return (
    <div className="kids-carta mx-auto flex w-full max-w-lg flex-col items-center gap-4 px-6 py-10 text-center">
      <KidsMascot expression="thinking" className="kid-float size-20" />
      <p role="status" className="font-bold text-[1.0625rem]">
        {text}
      </p>
    </div>
  )
}
