import { UserAvatar } from '@sistemazero/member-shell/components/user-avatar'
import type { StudyGrantView } from '@sistemazero/member-shell/lib/study-access'
import { AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { childAccessSummary, formatAccessEnd } from '@/lib/study-access-view'
import type { ProfileView } from '@/lib/types'
import { childHref } from '../parent-routes'
import { PRIMARY_ACTION, SECONDARY_ACTION } from './parent-ui'

export interface AttentionItem {
  profile: ProfileView
  kind: 'none' | 'expiring' | 'expired'
  title: string
  text: string
  action: string
}

/**
 * O que precisa do responsável AGORA, tirado do estado real dos acessos: a criança que ainda
 * não entra sozinha, o acesso que vence em menos de uma semana e o que já terminou. Antes isso
 * aparecia pequeno, dentro do cartão de cada criança.
 */
export function attentionItems(
  profiles: readonly ProfileView[],
  access: Readonly<Record<string, StudyGrantView[] | null | undefined>>,
  now = Date.now(),
): AttentionItem[] {
  const items: AttentionItem[] = []
  for (const profile of profiles) {
    const summary = childAccessSummary(access[profile.id], now)
    if (summary.kind === 'none')
      items.push({
        profile,
        kind: 'none',
        title: `${profile.name} ainda não tem aparelho autorizado.`,
        text: 'Autorize um aparelho para a criança entrar sem a sua senha.',
        action: 'Preparar acesso',
      })
    else if (summary.kind === 'expiring')
      items.push({
        profile,
        kind: 'expiring',
        title: `O acesso de ${profile.name} no aparelho ${summary.label} termina em ${formatAccessEnd(summary.expiresAt)}.`,
        text: 'Renove para não interromper.',
        action: 'Renovar prazo',
      })
    else if (summary.kind === 'expired')
      items.push({
        profile,
        kind: 'expired',
        title: `O acesso de ${profile.name} terminou.`,
        text: 'Renove ou autorize outro aparelho para a criança voltar a entrar.',
        action: 'Renovar acesso',
      })
  }
  return items
}

export function AttentionList({
  items,
  photoByProfile,
  studentDestination,
}: {
  items: AttentionItem[]
  photoByProfile: Record<string, string | null>
  studentDestination?: string
}) {
  if (!items.length) return null
  return (
    <section
      aria-labelledby="parents-attention"
      className="kids-carta flex flex-col gap-1 border-2 border-(--kids-ouro) p-2"
    >
      <h2
        id="parents-attention"
        className="flex items-center gap-2 px-3 pt-2 font-extrabold text-sm uppercase tracking-[0.1em]"
      >
        <AlertTriangle className="size-4 text-(--kids-ouro-texto)" aria-hidden="true" />
        Precisa da sua atenção
      </h2>
      <ul className="flex flex-col">
        {items.map((item, index) => (
          <li
            key={`${item.profile.id}:${item.kind}`}
            className="flex flex-wrap items-center gap-3 rounded-2xl px-3 py-3"
          >
            <UserAvatar
              avatarUrl={photoByProfile[item.profile.id] ?? null}
              firstName={item.profile.name}
              size="lg"
            />
            <p className="min-w-48 flex-1 text-sm">
              <strong>{item.title}</strong> {item.text}
            </p>
            <Link
              href={childHref(item.profile.id, undefined, studentDestination)}
              className={index === 0 ? PRIMARY_ACTION : SECONDARY_ACTION}
            >
              {item.action}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
