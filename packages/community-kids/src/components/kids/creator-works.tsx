import type { CreativeToolId } from '@sistemazero/core/career'
import type { CreationToolView } from '@sistemazero/member-shell/lib/types'
import { ArrowUpRight } from 'lucide-react'
import Link from 'next/link'
import type { CSSProperties, ReactNode } from 'react'
import { TOOL_SIGNATURE } from '@/lib/tool-signature'
import { shell } from '@/server/shell'

const workspaces: {
  id: CreativeToolId
  tool: CreationToolView
  title: string
  parameter: string
}[] = [
  { id: 'estudio-completo', tool: 'studio', title: 'Jogos do Estúdio', parameter: 'projeto' },
  { id: 'pinta', tool: 'pinta', title: 'Desenhos do Pinta', parameter: 'desenho' },
  { id: 'molda', tool: 'molda', title: 'Criações do Molda', parameter: 'criacao' },
]

/**
 * Uma galeria da criança, vestindo a COR da oficina — a mesma do card no Criar e
 * do ladrilho no menu. Era `FolderOpen` azul nas quatro, e as quatro ficavam
 * indistinguíveis num relance; agora a cor faz o trabalho que o título fazia.
 */
function GaleriaCard({
  id,
  title,
  linkLabel,
  children,
}: {
  id: CreativeToolId
  title: string
  linkLabel: string
  children: ReactNode
}) {
  const oficina = TOOL_SIGNATURE[id]
  const Icone = oficina.icone
  return (
    <div
      className="kids-carta flex flex-col p-5"
      style={{ '--card-tinta': oficina.tinta } as CSSProperties}
    >
      <h3 className="sz-display flex items-center gap-2 text-base">
        <span
          aria-hidden="true"
          className="grid size-8 shrink-0 place-items-center rounded-lg"
          style={{
            backgroundColor: `color-mix(in oklab, ${oficina.fundo} 16%, transparent)`,
            color: oficina.tinta,
          }}
        >
          <Icone className="size-5" />
        </span>
        {title}
      </h3>
      <div className="flex-1">{children}</div>
      <Link
        prefetch={false}
        href={oficina.href}
        className="inline-flex min-h-11 items-center font-bold text-(--card-tinta) text-sm"
      >
        {linkLabel}
      </Link>
    </div>
  )
}

export async function CreatorWorks({ available }: { available: CreativeToolId[] }) {
  const [groups, plans] = await Promise.all([
    Promise.all(
      workspaces
        .filter((space) => available.includes(space.id))
        .map(async (space) => {
          const response = await shell.members.listCreationsReadonly(space.tool).catch(() => null)
          return { ...space, response }
        }),
    ),
    available.includes('pensa')
      ? shell.members.pensaListProjectsReadonly().catch(() => null)
      : null,
  ])
  if (!available.length) return null
  return (
    <section aria-labelledby="creator-works-heading">
      <div className="mb-4">
        <h2 id="creator-works-heading" className="sz-display text-[clamp(1.4rem,3vw,1.9rem)]">
          Seus trabalhos
        </h2>
        <p className="mt-1 font-semibold text-muted-foreground text-sm">
          Criações guardadas na conta e seus planos. Trabalhos que ainda estão só neste aparelho
          ficam na galeria de cada ferramenta.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {groups.map((space) => {
          const items =
            space.response?.status === 200 && space.response.body
              ? space.response.body.items.filter((item) => 'name' in item && !item.deletedAt)
              : null
          return (
            <GaleriaCard key={space.id} id={space.id} title={space.title} linkLabel="Abrir galeria">
              {items === null ? (
                <p role="status" className="my-4 font-semibold text-muted-foreground text-sm">
                  Não conseguimos consultar os trabalhos agora. Abra a galeria para tentar
                  novamente.
                </p>
              ) : items.length ? (
                <ul className="my-3 divide-y divide-(--linha-carta)">
                  {items.slice(0, 4).map((item) =>
                    'name' in item ? (
                      <li key={item.itemId}>
                        <Link
                          prefetch={false}
                          href={`${TOOL_SIGNATURE[space.id].href}?${space.parameter}=${encodeURIComponent(item.itemId)}`}
                          className="flex min-h-14 items-center justify-between gap-3 py-3 font-semibold text-sm hover:text-(--card-tinta)"
                        >
                          <span className="break-words">{item.name}</span>
                          <ArrowUpRight className="size-4 shrink-0" aria-hidden />
                        </Link>
                      </li>
                    ) : null,
                  )}
                </ul>
              ) : (
                <p className="my-4 font-semibold text-muted-foreground text-sm">
                  {space.response?.body?.nextCursor
                    ? 'Abra a galeria para ver os demais trabalhos.'
                    : 'Ainda não há criações guardadas na conta nesta ferramenta.'}
                </p>
              )}
            </GaleriaCard>
          )
        })}
        {available.includes('pensa') ? (
          <GaleriaCard id="pensa" title="Planos do Pensa" linkLabel="Abrir meus planos">
            {plans?.status !== 200 || !plans.body ? (
              <p role="status" className="my-4 font-semibold text-muted-foreground text-sm">
                Não conseguimos consultar seus planos agora.
              </p>
            ) : plans.body?.projects.length ? (
              <ul className="my-3 divide-y divide-(--linha-carta)">
                {plans.body.projects.slice(0, 4).map((plan) => (
                  <li key={plan.id}>
                    <Link
                      href={`/pensa?plano=${encodeURIComponent(plan.id)}`}
                      prefetch={false}
                      className="flex min-h-14 items-center justify-between gap-3 py-3 font-semibold text-sm hover:text-(--card-tinta)"
                    >
                      <span className="break-words">
                        {plan.name}
                        <span className="block font-normal text-muted-foreground text-xs">
                          Versão {plan.cycleNumber}
                        </span>
                      </span>
                      <ArrowUpRight className="size-4 shrink-0" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="my-4 font-semibold text-muted-foreground text-sm">
                Sua próxima ideia pode começar com um plano.
              </p>
            )}
          </GaleriaCard>
        ) : null}
      </div>
    </section>
  )
}
