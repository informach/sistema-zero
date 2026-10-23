import type {
  HelpCollectionIcon,
  HelpCollectionTone,
  HelpCollectionView,
  HelpTutorialEntry,
} from '@sistemazero/core/help'
import {
  Blocks,
  BookOpen,
  Box,
  ChevronRight,
  Compass,
  Gamepad2,
  Lightbulb,
  type LucideIcon,
  Palette,
  Sparkles,
  UserRound,
  Users,
} from 'lucide-react'
import Link from 'next/link'

/**
 * A APRESENTAÇÃO das coleções do "Como fazer" no adulto. A coleção mora no banco com um `icon` e
 * um `tone` das allowlists do core; aqui cada nome vira um ícone do lucide e um par fundo/tinta.
 * ⚠️ `Record`s completos de propósito: ícone ou tom novo no core sem entrada aqui é erro de tipo.
 */
const HELP_ICON: Record<HelpCollectionIcon, LucideIcon> = {
  compass: Compass,
  palette: Palette,
  blocks: Blocks,
  lightbulb: Lightbulb,
  box: Box,
  gamepad: Gamepad2,
  sparkles: Sparkles,
  book: BookOpen,
  users: Users,
  user: UserRound,
}

/** `marca` segue a cor escolhida no perfil; as demais são as cores de identidade das oficinas. */
function tone(color: string) {
  return { background: `color-mix(in oklab, ${color} 12%, white)`, color }
}
const HELP_TONE: Record<HelpCollectionTone, { background: string; color: string }> = {
  marca: { background: 'var(--acao-tint)', color: 'var(--acao-texto)' },
  estudio: tone('var(--sz-community-blue)'),
  pinta: tone('var(--sz-community-pink)'),
  pensa: tone('var(--sz-community-purple)'),
  molda: tone('var(--sz-community-orange)'),
}

function helpCollectionIcon(collection: HelpCollectionView | undefined): LucideIcon {
  return collection ? HELP_ICON[collection.icon] : BookOpen
}

/** O ladrilho do ícone da coleção, na cor do tom. */
function HelpCollectionTile({ collection }: { collection: HelpCollectionView | undefined }) {
  const Icon = helpCollectionIcon(collection)
  const style = collection ? HELP_TONE[collection.tone] : HELP_TONE.marca
  return (
    <span
      aria-hidden
      style={style}
      className="inline-flex size-[2.6rem] flex-none items-center justify-center rounded-[0.7rem]"
    >
      <Icon className="size-[1.3rem]" />
    </span>
  )
}

function tutorialCount(n: number) {
  return `${n} ${n === 1 ? 'tutorial' : 'tutoriais'}`
}

/** As coleções publicadas em cartões: ícone, nome e quantos tutoriais elas têm. */
export function HelpCollectionGrid({ collections }: { collections: HelpCollectionView[] }) {
  const visible = collections.filter((item) => item.publishedCount > 0)
  if (!visible.length) return null
  return (
    <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:gap-4 lg:grid-cols-4">
      {visible.map((collection) => (
        <li key={collection.id} className="flex">
          <Link
            href={`/como-fazer/colecao/${encodeURIComponent(collection.slug)}`}
            prefetch={false}
            className="sz-card-sm flex w-full min-w-0 flex-col gap-2.5 p-4 text-foreground sm:p-5 no-underline transition-colors hover:bg-background"
          >
            <HelpCollectionTile collection={collection} />
            <strong className="sz-h4">{collection.title}</strong>
            <span className="text-[0.85rem] text-muted-foreground">
              {tutorialCount(collection.publishedCount)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

/** Tutoriais em linhas: o ícone da coleção (discreto), o título, o resumo e a seta. */
export function HelpTutorialRows({
  tutorials,
  collections,
  showCollection = false,
}: {
  tutorials: HelpTutorialEntry[]
  collections: HelpCollectionView[]
  showCollection?: boolean
}) {
  if (!tutorials.length) return null
  const byId = new Map(collections.map((item) => [item.id, item]))
  return (
    <ul className="sz-card m-0 flex list-none flex-col overflow-hidden p-0">
      {tutorials.map((tutorial, index) => {
        const collection = byId.get(tutorial.collectionId)
        const Icon = helpCollectionIcon(collection)
        return (
          <li key={tutorial.id} className={index > 0 ? 'border-border border-t' : undefined}>
            <Link
              href={`/como-fazer/${encodeURIComponent(tutorial.slug)}`}
              prefetch={false}
              className="flex min-h-[3.6rem] items-center gap-4 px-5 py-3 text-foreground no-underline transition-colors hover:bg-background md:px-6"
            >
              <Icon className="size-6 flex-none text-muted-foreground" aria-hidden />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                {showCollection && collection ? (
                  <span className="text-[0.85rem] text-muted-foreground">{collection.title}</span>
                ) : null}
                <strong>{tutorial.title}</strong>
                {tutorial.summary ? (
                  <span className="text-[0.85rem] text-muted-foreground">{tutorial.summary}</span>
                ) : null}
              </span>
              <ChevronRight className="size-5 flex-none text-muted-foreground" aria-hidden />
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
