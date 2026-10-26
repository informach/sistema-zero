import { CreatorMasteryArea } from '@sistemazero/member-shell/components/creator-journey'
import { MasterySubmission } from '@sistemazero/member-shell/components/mastery-submission'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { KidsBand } from '@/components/kids/kids-band'
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
      <KidsBand tone="creme">
        <Link
          href="/maestrias"
          className="inline-flex min-h-11 items-center font-bold text-primary"
        >
          ← Voltar às áreas
        </Link>
        <p role="status">
          Não foi possível consultar esta área agora. Tente novamente daqui a pouco.
        </p>
      </KidsBand>
    )
  const area = result.body.areas.find((item) => item.id === areaId)
  if (!area) notFound()
  return (
    <>
      <KidsBand tone="creme">
        <Link
          href="/maestrias"
          className="inline-flex min-h-11 items-center font-bold text-primary"
        >
          ← Todas as áreas
        </Link>
        <p className="mt-5 font-bold text-primary">Maestria · três níveis de criação</p>
        <h1 className="sz-display mt-2 text-3xl md:text-4xl">{area.title}</h1>
        <p className="mt-3 text-muted-foreground">
          Crie, teste e mostre as suas escolhas. A equipe acompanha o seu projeto.
        </p>
      </KidsBand>
      <KidsBand tone="lilas">
        <CreatorMasteryArea
          area={area}
          catalog={catalog?.status === 200 ? catalog.body.courses : []}
          skin="kids"
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
