import { MasterySubmission } from '@sistemazero/member-shell/components/mastery-submission'
import {
  creatorMasteryEntryNote,
  creatorPostHref,
} from '@sistemazero/member-shell/lib/creator-journey-presentation'
import {
  isKidsStaffPreview,
  kidsJourneyAccess,
} from '@sistemazero/member-shell/lib/kids-journey-access'
import { Lock } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { KidsBackButton } from '@/components/kids/back-button'
import {
  KidsMasteryArea,
  MasteryHowItWorks,
  MasteryIcon,
} from '@/components/kids/creator-journey/mastery'
import { KidsBand } from '@/components/kids/kids-band'
import { getGamificationReadonly, listMyCourses } from '@/server/members'
import { shell } from '@/server/shell'

export const dynamic = 'force-dynamic'
export default async function MasteryPage({ params }: { params: Promise<{ areaId: string }> }) {
  const { areaId } = await params
  const [result, catalog, evidence, mineRes, gamification] = await Promise.all([
    shell.members.getCreatorMasteriesReadonly().catch(() => null),
    shell.members.listCatalog().catch(() => null),
    shell.members.getCreatorMasteryEvidenceReadonly().catch(() => null),
    // As aulas feitas de cada curso vêm de "Meus cursos"; sem elas o cartão só perde a barra.
    listMyCourses().catch(() => null),
    getGamificationReadonly().catch(() => null),
  ])
  if (result?.status !== 200)
    return (
      <KidsBand tone="creme">
        <KidsBackButton href="/maestrias" label="Voltar às Maestrias" showLabel className="mb-6" />
        <p role="status" className="kids-carta p-6 font-bold">
          Não foi possível consultar esta área agora. Tente novamente daqui a pouco.
        </p>
      </KidsBand>
    )
  const area = result.body.areas.find((item) => item.id === areaId)
  if (!area) notFound()
  const journey = kidsJourneyAccess(gamification?.status === 200 ? gamification.body : null)
  // A prévia da equipe não tem posto: sem ela, a área diz a trilha pelo nome padrão.
  const view = journey && !isKidsStaffPreview(journey) ? journey.curriculum : undefined
  return (
    <>
      <KidsBand tone="creme">
        <KidsBackButton href="/maestrias" label="Voltar às Maestrias" showLabel className="mb-6" />
        <div className="flex items-center gap-4">
          <MasteryIcon id={area.id} size="lg" />
          <div className="min-w-0">
            <p className="font-extrabold text-muted-foreground text-xs uppercase tracking-[0.12em]">
              Maestria · três níveis
            </p>
            <h1 className="sz-display mt-1 text-[clamp(2rem,3.6vw,3rem)]">{area.title}</h1>
          </div>
        </div>
        {!area.available ? (
          <div className="kids-carta mt-6 flex flex-col gap-3 p-5 md:flex-row md:items-center md:gap-5">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
              <Lock className="size-5" aria-hidden />
            </span>
            <p className="min-w-0 flex-1 font-extrabold text-[0.9375rem]">
              {creatorMasteryEntryNote(area, view)}. Você já pode espiar o que vem por aqui.
            </p>
            <Link
              href={creatorPostHref(area.opensAfterPair, 'kids')}
              prefetch={false}
              className="sz-btn-gradient sz-btn-suave shrink-0 px-5"
            >
              Ver essa trilha
            </Link>
          </div>
        ) : null}
        <div className="mt-6">
          <MasteryHowItWorks area={area} />
        </div>
      </KidsBand>
      <KidsBand tone="lilas">
        <KidsMasteryArea
          area={area}
          catalog={catalog?.status === 200 ? catalog.body.courses : []}
          mine={mineRes?.status === 200 ? (mineRes.body?.courses ?? []) : []}
          view={view}
          submission={(level) => (
            <MasterySubmission
              areaId={area.id}
              level={level.level}
              evidence={evidence?.status === 200 ? evidence.body.evidence : []}
              evidenceUnavailable={evidence?.status !== 200}
              current={area.levels.find((item) => item.level === level.level)?.submission ?? null}
              hasAccess={result.body.hasAccess}
              available={level.available}
              skin="kids"
            />
          )}
        />
      </KidsBand>
    </>
  )
}
