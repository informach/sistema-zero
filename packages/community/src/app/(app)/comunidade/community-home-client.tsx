'use client'

import { Card } from '@sistemazero/ui/card'
import { ChevronRight, MessagesSquare } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { apiGet } from '@/lib/api'
import type { HubSpaceView } from '@/lib/types'

export function CommunityHomeClient() {
  const [spaces, setSpaces] = useState<HubSpaceView[] | null>(null)

  useEffect(() => {
    apiGet<{ items: HubSpaceView[] }>('/api/hub/spaces')
      .then((r) => setSpaces(r.items))
      .catch(() => setSpaces([]))
  }, [])

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8">
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <MessagesSquare className="size-6" /> Comunidade
        </h1>
        <p className="text-sm text-muted-foreground">
          Tire dúvidas, compartilhe projetos e troque ideias com a turma.
        </p>
      </header>

      {spaces === null ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : spaces.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          Nenhuma comunidade disponível para você ainda.
        </Card>
      ) : (
        <div className="grid gap-3">
          {spaces.map((s) => (
            <Link key={s.id} href={`/comunidade/${s.slug}`}>
              <Card className="flex items-center gap-3 p-4 transition-colors hover:bg-muted/50">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{s.name}</p>
                  {s.description ? (
                    <p className="truncate text-sm text-muted-foreground">{s.description}</p>
                  ) : null}
                </div>
                <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
