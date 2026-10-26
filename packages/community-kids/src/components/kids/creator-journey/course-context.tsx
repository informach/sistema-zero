import type { CreatorCoursePlacement, CreatorJourneyView } from '@sistemazero/core/journey'
import {
  CREATOR_POST_LABELS,
  creatorCourseAccessNote,
  creatorPostHref,
  curriculumRoleLabel,
} from '@sistemazero/member-shell/lib/creator-journey-presentation'
import { ArrowRight, Lightbulb, type LucideIcon, RefreshCw, Rocket, Target } from 'lucide-react'
import Link from 'next/link'
import { KidsTag } from './parts'

/**
 * Onde este curso mora na Jornada do Criador, na página do curso. A missão ganha o cartão
 * "Como funciona a missão" das telas aprovadas; os outros cursos, a linha curta com o papel e
 * o caminho de volta para a trilha.
 */
export function KidsCourseJourneyContext({
  placement,
  accessReason,
  view,
}: {
  placement?: CreatorCoursePlacement
  accessReason?: string
  view?: CreatorJourneyView | null
}) {
  const note = creatorCourseAccessNote(accessReason)
  if (!placement && !note) return null
  const stage = placement?.level
    ? view?.stages.find((item) => item.level === placement.level)
    : undefined
  const post = placement?.level ? (stage?.title ?? CREATOR_POST_LABELS[placement.level]) : null
  if (placement?.role === 'mission')
    return (
      <MissionHowItWorks
        post={post}
        base2d={stage?.base2d.title ?? null}
        base3d={stage?.base3d.title ?? null}
        note={note}
      />
    )
  const href = placement?.level
    ? creatorPostHref(placement.level, 'kids')
    : placement?.masteryId
      ? `/maestrias/${encodeURIComponent(placement.masteryId)}`
      : null
  return (
    <div className="kids-carta flex flex-col gap-3 p-4 md:flex-row md:items-center md:gap-4 md:px-5">
      <div className="min-w-0 flex-1">
        {placement ? (
          <span className="flex flex-wrap items-center gap-1.5">
            <KidsTag tone="amarelo">{curriculumRoleLabel(placement.role)}</KidsTag>
            {post ? (
              <span className="font-bold text-muted-foreground text-sm">Trilha {post}</span>
            ) : placement.masteryLevel ? (
              <span className="font-bold text-muted-foreground text-sm">
                Nível {placement.masteryLevel}
              </span>
            ) : null}
          </span>
        ) : null}
        {note ? (
          <p className="mt-1.5 font-medium text-[0.875rem] text-muted-foreground">{note}</p>
        ) : null}
      </div>
      {href ? (
        <Link
          href={href}
          prefetch={false}
          className="sz-btn-gradient sz-btn-suave shrink-0 gap-2 px-5"
        >
          {placement?.masteryId ? 'Ver a Maestria' : 'Ver a trilha'}
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      ) : null}
    </div>
  )
}

/**
 * Os quatro quadros da missão, ditos como a plataforma funciona hoje: objetivos com
 * "Verificar projeto", a dica que só aparece depois de verificar, tentativas livres e o
 * Mural opcional.
 */
function MissionHowItWorks({
  post,
  base2d,
  base3d,
  note,
}: {
  post: string | null
  base2d: string | null
  base3d: string | null
  note: string | null
}) {
  const tiles: { Icon: LucideIcon; title: string; text: string }[] = [
    {
      Icon: Target,
      title: 'Cada parte tem objetivos',
      text: 'Clique em Verificar projeto para ver o que já funciona e o que falta.',
    },
    {
      Icon: Lightbulb,
      title: 'Uma dica quando você travar',
      text: 'Se faltar alguma coisa depois de verificar, aparece uma dica para o objetivo que faltou.',
    },
    {
      Icon: RefreshCw,
      title: 'Tente quantas vezes quiser',
      text: 'Sem nota e sem tempo. Verificar de novo nunca tira nada.',
    },
    {
      Icon: Rocket,
      title: 'Mostrar no Mural é com você',
      text: 'Quando terminar, você pode publicar o jogo no Mural. A missão conta para o próximo nível mesmo sem publicar.',
    },
  ]
  return (
    <section className="kids-carta p-6 md:p-7">
      <div className="flex items-center gap-4">
        <span className="grid size-16 shrink-0 place-items-center rounded-[1.25rem] bg-(--sz-kids-amarelo)">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/zappy/thinking.webp" alt="" className="size-12 object-contain" />
        </span>
        <div>
          <p className="font-extrabold text-muted-foreground text-xs uppercase tracking-[0.12em]">
            {post ? `Missão da Trilha ${post}` : 'Missão da trilha'}
          </p>
          <h2 className="sz-display mt-1 text-xl md:text-[1.625rem]">Como funciona a missão</h2>
        </div>
      </div>
      <p className="mt-3 max-w-3xl font-medium text-[0.9375rem] text-muted-foreground">
        Aqui não tem passo a passo. Cada aula conta o que o jogo precisa ter e você monta do seu
        jeito, com tudo o que aprendeu
        {base2d && base3d ? ` em ${base2d} e em ${base3d}` : ' nos cursos da trilha'}: primeiro em
        2D, depois em 3D.
      </p>
      {note ? <p className="mt-2 font-bold text-[0.875rem]">{note}</p> : null}
      <ul className="mt-5 grid gap-3 md:grid-cols-2">
        {tiles.map(({ Icon, title, text }) => (
          <li key={title} className="flex items-start gap-3 rounded-2xl bg-background p-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-(--band-amarelo) text-(--sz-kids-tinta)">
              <Icon className="size-5" aria-hidden />
            </span>
            <span>
              <span className="block font-extrabold text-[0.9375rem]">{title}</span>
              <span className="mt-0.5 block font-medium text-muted-foreground text-sm">{text}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
