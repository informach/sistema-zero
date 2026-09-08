import type { CreativeToolId } from '@sistemazero/core/career'
import type { CreationToolView } from '@sistemazero/member-shell/lib/types'
import { ArrowUpRight, FolderOpen } from 'lucide-react'
import Link from 'next/link'
import { shell } from '@/server/shell'

const workspaces: {
  id: CreativeToolId
  tool: CreationToolView
  title: string
  href: string
  parameter: string
}[] = [
  {
    id: 'estudio-completo',
    tool: 'studio',
    title: 'Jogos do Estúdio',
    href: '/estudio',
    parameter: 'projeto',
  },
  { id: 'pinta', tool: 'pinta', title: 'Desenhos do Pinta', href: '/pinta', parameter: 'desenho' },
  { id: 'molda', tool: 'molda', title: 'Criações do Molda', href: '/molda', parameter: 'criacao' },
]

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
        <h2 id="creator-works-heading" className="sz-display text-xl">
          Seus trabalhos
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
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
            <div key={space.id} className="rounded-2xl border border-border bg-card p-5">
              <h3 className="flex items-center gap-2 font-bold">
                <FolderOpen className="size-5 text-primary" aria-hidden />
                {space.title}
              </h3>
              {items === null ? (
                <p role="status" className="my-4 text-sm text-muted-foreground">
                  Não conseguimos consultar os trabalhos agora. Abra a galeria para tentar
                  novamente.
                </p>
              ) : items.length ? (
                <ul className="my-3 divide-y divide-border">
                  {items.slice(0, 4).map((item) =>
                    'name' in item ? (
                      <li key={item.itemId}>
                        <Link
                          prefetch={false}
                          href={`${space.href}?${space.parameter}=${encodeURIComponent(item.itemId)}`}
                          className="flex min-h-14 items-center justify-between gap-3 py-3 text-sm font-semibold hover:text-primary"
                        >
                          <span className="break-words">{item.name}</span>
                          <ArrowUpRight className="size-4 shrink-0" aria-hidden />
                        </Link>
                      </li>
                    ) : null,
                  )}
                </ul>
              ) : (
                <p className="my-4 text-sm text-muted-foreground">
                  {space.response?.body?.nextCursor
                    ? 'Abra a galeria para ver os demais trabalhos.'
                    : 'Ainda não há criações guardadas na conta nesta ferramenta.'}
                </p>
              )}
              <Link
                prefetch={false}
                href={space.href}
                className="inline-flex min-h-11 items-center text-sm font-bold text-primary"
              >
                Abrir galeria
              </Link>
            </div>
          )
        })}
        {available.includes('pensa') ? (
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="font-bold">Planos do Pensa</h3>
            {plans?.status !== 200 || !plans.body ? (
              <p role="status" className="my-4 text-sm text-muted-foreground">
                Não conseguimos consultar seus planos agora.
              </p>
            ) : plans.body?.projects.length ? (
              <ul className="my-3 divide-y divide-border">
                {plans.body.projects.slice(0, 4).map((plan) => (
                  <li key={plan.id}>
                    <Link
                      href={`/pensa?plano=${encodeURIComponent(plan.id)}`}
                      prefetch={false}
                      className="flex min-h-14 items-center justify-between gap-3 py-3 text-sm font-semibold hover:text-primary"
                    >
                      <span className="break-words">
                        {plan.name}
                        <span className="block text-xs font-normal text-muted-foreground">
                          Versão {plan.cycleNumber}
                        </span>
                      </span>
                      <ArrowUpRight className="size-4 shrink-0" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="my-4 text-sm text-muted-foreground">
                Sua próxima ideia pode começar com um plano.
              </p>
            )}
            <Link
              href="/pensa"
              prefetch={false}
              className="inline-flex min-h-11 items-center text-sm font-bold text-primary"
            >
              Abrir meus planos
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  )
}
