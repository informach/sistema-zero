import { MasterySubmission } from '@sistemazero/member-shell/components/mastery-submission'
import { creatorMasteryProgress } from '@sistemazero/member-shell/lib/creator-journey-presentation'
import { notFound } from 'next/navigation'
import {
  AdultMasteryArea,
  AdultMasteryHowItWorks,
  MasteryTile,
} from '@/components/community/journey/creator'
import { PageBand, PageBody } from '@/components/community/page'
import { shell } from '@/server/shell'

export const dynamic = 'force-dynamic'

/**
 * Uma área de Maestria: no palco, o ícone, o nome e o nível de agora; na bancada, como se
 * conquista cada nível e os três níveis em cartões (o atual já aberto), com a entrega do projeto.
 */
export default async function MasteryPage({ params }: { params: Promise<{ areaId: string }> }) {
  const { areaId } = await params
  const [result, catalog, mine, evidence, gamification] = await Promise.all([
    shell.members.getCreatorMasteriesReadonly().catch(() => null),
    shell.members.listCatalog().catch(() => null),
    shell.members.listMyCourses().catch(() => null),
    shell.members.getCreatorMasteryEvidenceReadonly().catch(() => null),
    shell.members.getGamificationReadonly({ withRanking: true }).catch(() => null),
  ])
  if (result?.status !== 200)
    return (
      <>
        <PageBand title="Sua maestria" back={{ href: '/maestrias', label: 'Voltar às áreas' }} />
        <PageBody>
          <p role="status" className="sz-card m-0 p-6">
            Não foi possível consultar esta área agora. Tente novamente em alguns instantes.
          </p>
        </PageBody>
      </>
    )
  const area = result.body.areas.find((item) => item.id === areaId)
  if (!area) notFound()
  const view =
    gamification?.status === 200 ? (gamification.body?.journey?.curriculum ?? undefined) : undefined
  const progress = creatorMasteryProgress(area)
  return (
    <>
      <PageBand
        kicker={`Maestria · ${progress.earned} de ${area.levels.length} níveis conquistados`}
        title={
          <span className="flex items-center gap-4">
            <MasteryTile id={area.id} big />
            <span className="min-w-0 break-words">{area.title}</span>
          </span>
        }
        lead="Aprenda um conceito, aplique em um jogo e apresente suas escolhas. Seu projeto recebe o retorno da equipe."
        back={{ href: '/maestrias', label: 'Todas as áreas' }}
      />
      <PageBody className="gap-10">
        <AdultMasteryHowItWorks area={area} />
        <AdultMasteryArea
          area={area}
          catalog={catalog?.status === 200 ? catalog.body.courses : []}
          mine={mine?.status === 200 ? mine.body.courses : []}
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
              skin="adult"
            />
          )}
        />
      </PageBody>
    </>
  )
}
