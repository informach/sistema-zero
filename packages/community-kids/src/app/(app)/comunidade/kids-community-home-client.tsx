'use client'

import { ChevronRight, MessagesSquare } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { apiGet } from '@/lib/api'
import type { HubSpaceView } from '@/lib/types'

export function KidsCommunityHomeClient() {
  const [spaces, setSpaces] = useState<HubSpaceView[] | null>(null)

  useEffect(() => {
    apiGet<{ items: HubSpaceView[] }>('/api/hub/spaces')
      .then((r) => setSpaces(r.items))
      .catch(() => setSpaces([]))
  }, [])

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6">
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 [font-family:var(--font-display)] font-bold text-3xl">
          <MessagesSquare className="size-7 text-primary" /> Turma
        </h1>
        <p className="text-muted-foreground">
          Converse com os colegas e mostre o que você criou! 🎉
        </p>
      </header>

      {spaces === null ? (
        <p className="text-muted-foreground">Carregando…</p>
      ) : spaces.length === 0 ? (
        <div className="rounded-2xl border-2 border-border border-dashed p-8 text-center text-muted-foreground">
          Ainda não tem nenhuma turma pra você. 🙂
        </div>
      ) : (
        <div className="grid gap-3">
          {spaces.map((s) => (
            <Link
              key={s.id}
              href={`/comunidade/${s.slug}`}
              className="flex items-center gap-3 rounded-2xl border-2 border-border bg-card p-4 transition-colors hover:border-primary hover:bg-(--kids-cyan-tint)"
            >
              <div className="min-w-0 flex-1">
                <p className="[font-family:var(--font-display)] font-bold text-lg">{s.name}</p>
                {s.description ? (
                  <p className="truncate text-muted-foreground text-sm">{s.description}</p>
                ) : null}
              </div>
              <ChevronRight className="size-6 shrink-0 text-primary" />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
