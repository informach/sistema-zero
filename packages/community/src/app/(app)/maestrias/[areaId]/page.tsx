import { CreatorMasteryArea } from '@sistemazero/member-shell/components/creator-journey'
import { MasterySubmission } from '@sistemazero/member-shell/components/mastery-submission'
import { notFound } from 'next/navigation'
import { PageBand, PageBody } from '@/components/community/page'
import { shell } from '@/server/shell'

export const dynamic = 'force-dynamic'
export default async function MasteryPage({ params }: { params: Promise<{ areaId: string }> }) {
  const { areaId } = await params
  const [result, catalog, evidence] = await Promise.all([
    shell.members.getCreatorMasteriesReadonly().catch(() => null),
    shell.members.listCatalog().catch(() => null),
    shell.members.getCreatorMasteryEvidenceReadonly().catch(() => null),
  ])
  if (result?.status !== 200)
    return (
      <>
        <PageBand title="Sua maestria" back={{ href: '/maestrias', label: 'Voltar às áreas' }} />
        <PageBody>
          <p role="status">
            Não foi possível consultar esta área agora. Tente novamente em alguns instantes.
          </p>
        </PageBody>
      </>
    )
  const area = result.body.areas.find((item) => item.id === areaId)
  if (!area) notFound()
  return (
    <>
      <PageBand
        kicker="Maestria · três níveis de criação"
        title={area.title}
        lead="Aprenda um conceito, aplique em um jogo e apresente suas escolhas. Seu projeto recebe o retorno da equipe."
        back={{ href: '/maestrias', label: 'Todas as áreas' }}
      />
      <PageBody>
        <CreatorMasteryArea
          area={area}
          catalog={catalog?.status === 200 ? catalog.body.courses : []}
          skin="adult"
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
