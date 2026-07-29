import Link from 'next/link'
import type { ReactNode } from 'react'
import { AvatarWithAura } from '@/components/kids/avatar-with-aura'
import type { HubReaction } from '@/lib/types'

export interface AuthorItem {
  isShowcase?: boolean
  authorDisplayName?: string | null
  authorId: string | null
  authorProfileId?: string | null
  authorAvatarUrl?: string | null
  authorLevel?: string | null
}

export function displayAuthor(item: AuthorItem, viewerId: string): ReactNode {
  if (item.authorId === viewerId) return 'Você'
  const name = item.authorDisplayName?.trim()
  const text = name ? (item.isShowcase ? `por ${name}` : name) : 'Colega'
  if (!item.authorProfileId || !name) return text
  return (
    <Link
      href={`/crianca/${encodeURIComponent(item.authorProfileId)}`}
      className="font-semibold text-primary transition-colors hover:text-foreground hover:underline"
    >
      {text}
    </Link>
  )
}

export function authorText(item: AuthorItem, viewerId: string): string {
  return item.authorId === viewerId ? 'Você' : item.authorDisplayName?.trim() || 'Colega'
}

export function AuthorBadge({
  item,
  viewerId,
  nameNode,
}: {
  item: AuthorItem
  viewerId: string
  nameNode: ReactNode
}) {
  const label = authorText(item, viewerId)
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <AvatarWithAura
        photoUrl={item.authorAvatarUrl}
        levelSlug={item.authorLevel ?? undefined}
        size="sm"
        label={`Avatar de ${label}`}
      />
      <span className="truncate">{nameNode}</span>
    </span>
  )
}

export function toggleReaction(
  reactions: HubReaction[],
  emoji: string,
  mine: boolean,
): HubReaction[] {
  const index = reactions.findIndex((reaction) => reaction.emoji === emoji)
  const current = index < 0 ? undefined : reactions[index]
  if (mine) {
    if (!current) return reactions
    const count = current.count - 1
    if (count <= 0) return reactions.filter((_, reactionIndex) => reactionIndex !== index)
    return reactions.map((reaction, reactionIndex) =>
      reactionIndex === index ? { ...reaction, count, reactedByMe: false } : reaction,
    )
  }
  if (!current) return [...reactions, { emoji, count: 1, reactedByMe: true }]
  return reactions.map((reaction, reactionIndex) =>
    reactionIndex === index
      ? { ...reaction, count: reaction.count + 1, reactedByMe: true }
      : reaction,
  )
}
