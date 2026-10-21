'use client'

import { UserAvatar } from '@sistemazero/member-shell/components/user-avatar'
import Link from 'next/link'
import { useState } from 'react'
import { cn } from '@/lib/cn'
import type { ProfileView } from '@/lib/types'
import { ChildProgress } from '../_components/child-progress'
import { ParentShell } from '../_components/parent-shell'
import { ParentPageTitle, PRIMARY_ACTION } from '../_components/parent-ui'
import { useChildrenStats } from '../_components/use-children-stats'
import { WeeklyReportToggle } from '../_components/weekly-report-toggle'
import { NEW_CHILD_HREF } from '../parent-routes'

/**
 * O Acompanhamento (era a página `/responsavel`): o que cada criança descobriu e criou, uma
 * criança por vez. Com uma criança só, a escolha nem aparece.
 */
export function ProgressClient({
  parentName,
  profiles,
  photoByProfile,
  initialChild,
}: {
  parentName?: string
  profiles: Pick<ProfileView, 'id' | 'name'>[]
  photoByProfile: Record<string, string | null>
  initialChild?: string
}) {
  const stats = useChildrenStats()
  const [selected, setSelected] = useState(
    profiles.find((profile) => profile.id === initialChild)?.id ?? profiles[0]?.id ?? null,
  )
  return (
    <ParentShell active="acompanhamento" parentName={parentName}>
      <ParentPageTitle
        title="Acompanhamento"
        text="O que cada criança descobriu e criou. Uma boa conversa começa pedindo que ela mostre como fez."
      />
      {/* Mesmos nomes nas áreas da família e de quem faz as aulas. */}
      <p className="-mt-6 text-muted-foreground text-sm">
        As duas áreas usam os mesmos nomes: curso, aula e parte. Nos Recados, quem responde é a
        equipe.
      </p>
      {profiles.length === 0 ? (
        <section className="kids-carta flex flex-col items-start gap-3 p-6">
          <h2 className="sz-display text-xl">Ainda não há crianças na família</h2>
          <p className="text-muted-foreground text-sm">
            Adicione o perfil da criança para acompanhar o que ela cria.
          </p>
          <Link href={NEW_CHILD_HREF} className={PRIMARY_ACTION}>
            Adicionar criança
          </Link>
        </section>
      ) : (
        <>
          {profiles.length > 1 ? (
            // Um seletor (a mesma página para cada criança), não abas: botões com `aria-pressed`.
            <div role="group" aria-label="Escolha a criança" className="flex flex-wrap gap-2">
              {profiles.map((profile) => (
                <button
                  key={profile.id}
                  type="button"
                  aria-pressed={profile.id === selected}
                  onClick={() => setSelected(profile.id)}
                  className={cn(
                    'inline-flex min-h-11 items-center gap-2 rounded-full py-1 pr-4 pl-1 font-bold text-sm',
                    profile.id === selected
                      ? 'kids-marca'
                      : 'bg-card text-muted-foreground hover:text-foreground',
                  )}
                >
                  <UserAvatar
                    avatarUrl={photoByProfile[profile.id] ?? null}
                    firstName={profile.name}
                    size="sm"
                  />
                  {profile.name}
                </button>
              ))}
            </div>
          ) : null}
          {selected ? (
            <ChildProgress profileId={selected} stats={stats} aside={<WeeklyReportToggle />} />
          ) : null}
        </>
      )}
    </ParentShell>
  )
}
