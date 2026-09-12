import type { CreativeToolId } from '@sistemazero/core/career'
import type { CreationToolView } from '@sistemazero/member-shell/lib/types'
import { ArrowUpRight, ChevronRight, Gamepad2, type LucideIcon } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { KidsSectionHeader } from '@/components/kids/kids-section-header'
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
 * O ícone do cartão é o da oficina (`TOOL_SIGNATURE`), salvo onde a tela-modelo mostra
 * o que ESTÁ dentro dela: os jogos do Estúdio levam o controle, e não o ladrilho da
 * oficina, que continua no cartão "Prontas para criar".
 */
const ICONE_DOS_TRABALHOS: Partial<Record<CreativeToolId, LucideIcon>> = {
  'estudio-completo': Gamepad2,
}

/**
 * Uma galeria da criança, vestindo a COR da oficina — a mesma do card no Criar. No
 * desenho das telas-modelo (11/09/2026) a cor é um ladrilho SÓLIDO ao lado do título
 * (ícone na tinta da oficina, escura no âmbar do Pensa), os trabalhos são pílulas
 * cinza-claras com a seta, e o link do rodapé é o azul dos links.
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
  const Icone = ICONE_DOS_TRABALHOS[id] ?? oficina.icone
  return (
    <div className="kids-carta flex flex-col p-6">
      <h3 className="sz-display flex items-center gap-3 text-[1.375rem]">
        <span
          aria-hidden="true"
          className="grid size-10 shrink-0 place-items-center rounded-[0.625rem]"
          style={{ backgroundColor: oficina.fundo, color: oficina.fg }}
        >
          <Icone className="size-5" />
        </span>
        {title}
      </h3>
      <div className="flex-1">{children}</div>
      {/* 32px com mouse e 44px no toque: no modelo o link encosta nas pílulas (17px de
          tinta a tinta), e a altura de toque cheia só faz sentido para o dedo. */}
      <Link
        prefetch={false}
        href={oficina.href}
        className="inline-flex min-h-8 w-fit items-center gap-1 font-extrabold text-[0.9375rem] text-primary hover:underline any-pointer-coarse:min-h-11"
      >
        {linkLabel}
        <ChevronRight className="size-4" aria-hidden />
      </Link>
    </div>
  )
}

/** A pílula de um trabalho: cinza-clara, o nome à esquerda e a seta à direita. */
const PILULA =
  'flex min-h-11 items-center justify-between gap-3 rounded-[0.625rem] bg-background px-4 py-2 font-semibold text-[0.9375rem] transition-colors hover:bg-muted'

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
      <KidsSectionHeader
        id="creator-works-heading"
        title="Meus trabalhos"
        subtitle="Criações guardadas na conta e seus planos. Trabalhos que ainda estão só neste aparelho ficam na galeria de cada ferramenta."
      />
      <div className="grid gap-6 md:grid-cols-2">
        {groups.map((space) => {
          const items =
            space.response?.status === 200 && space.response.body
              ? space.response.body.items.filter((item) => 'name' in item && !item.deletedAt)
              : null
          return (
            <GaleriaCard key={space.id} id={space.id} title={space.title} linkLabel="Abrir galeria">
              {items === null ? (
                <p
                  role="status"
                  className="mt-5 mb-1.5 font-semibold text-muted-foreground text-sm"
                >
                  Não conseguimos consultar os trabalhos agora. Abra a galeria para tentar
                  novamente.
                </p>
              ) : items.length ? (
                <ul className="mt-5 mb-1.5 space-y-1">
                  {items.slice(0, 4).map((item) =>
                    'name' in item ? (
                      <li key={item.itemId}>
                        <Link
                          prefetch={false}
                          href={`${TOOL_SIGNATURE[space.id].href}?${space.parameter}=${encodeURIComponent(item.itemId)}`}
                          className={PILULA}
                        >
                          <span className="break-words">{item.name}</span>
                          <ArrowUpRight className="size-4 shrink-0" aria-hidden />
                        </Link>
                      </li>
                    ) : null,
                  )}
                </ul>
              ) : (
                <p className="mt-5 mb-1.5 font-semibold text-muted-foreground text-sm">
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
              <p role="status" className="mt-5 mb-1.5 font-semibold text-muted-foreground text-sm">
                Não conseguimos consultar seus planos agora.
              </p>
            ) : plans.body?.projects.length ? (
              <ul className="mt-5 mb-1.5 space-y-1">
                {plans.body.projects.slice(0, 4).map((plan) => (
                  <li key={plan.id}>
                    <Link
                      href={`/pensa?plano=${encodeURIComponent(plan.id)}`}
                      prefetch={false}
                      className={PILULA}
                    >
                      <span className="break-words">
                        {plan.name} · Versão {plan.cycleNumber}
                      </span>
                      <ArrowUpRight className="size-4 shrink-0" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-5 mb-1.5 font-semibold text-muted-foreground text-sm">
                Sua próxima ideia pode começar com um plano.
              </p>
            )}
          </GaleriaCard>
        ) : null}
      </div>
    </section>
  )
}
