'use client'

import { Card } from '@sistemazero/ui/card'
import { Input } from '@sistemazero/ui/input'
import { Pagination } from '@sistemazero/ui/pagination'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@sistemazero/ui/table'
import { Medal, Search } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import type { RankingListResponse, RankingListRow } from '@/app/api/admin/ranking/route'
import { AdminHeader } from '@/components/admin/admin-header'
import { TableSkeletonRows } from '@/components/admin/table-skeleton'
import { type ApiError, apiGet } from '@/lib/api'
import { relativeCivilDayLabel } from '@/lib/format'
import { createForegroundPriority, runLatestForeground } from '@/lib/latest-wins'
import type { Platform } from '@/lib/platform'
import { STUDENT_RANK_LABELS } from '@/lib/student-rank'

const LIMIT = 20

export function RankingContent({ platform }: { platform: Platform }) {
  const [items, setItems] = useState<RankingListRow[]>([])
  const [total, setTotal] = useState(0)
  const [participants, setParticipants] = useState(0)
  const [offset, setOffset] = useState(0)
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [truncated, setTruncated] = useState(false)
  const loadAuthority = useRef(createForegroundPriority()).current

  const load = useCallback(async () => {
    setLoading(true)
    await runLatestForeground(
      loadAuthority,
      () => {
        const params = new URLSearchParams({
          audience: platform,
          limit: String(LIMIT),
          offset: String(offset),
        })
        if (q.trim()) params.set('q', q.trim())
        return apiGet<RankingListResponse>(`/api/admin/ranking?${params}`)
      },
      {
        onSuccess: (page) => {
          setItems(page.items)
          setTotal(page.total)
          setParticipants(page.totalParticipants)
          setTruncated(page.searchTruncated)
        },
        onError: (error) => {
          toast.error((error as ApiError).message ?? 'Falha ao carregar o ranking.')
        },
        onSettled: () => setLoading(false),
      },
    )
  }, [loadAuthority, offset, platform, q])

  useEffect(() => {
    const timer = setTimeout(() => void load(), 250)
    return () => {
      clearTimeout(timer)
      loadAuthority.invalidate()
    }
  }, [load, loadAuthority])

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Ranking"
        description={`Classificação geral por XP acumulado na plataforma ${platform === 'kids' ? 'Kids' : 'Adultos'}.`}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder={
              platform === 'kids'
                ? 'Buscar criança ou responsável…'
                : 'Buscar aluno por nome ou e-mail…'
            }
            value={q}
            onChange={(event) => {
              setOffset(0)
              setQ(event.target.value)
            }}
            className="pl-8"
          />
        </div>
        <div className="text-muted-foreground text-sm">
          {participants} {participants === 1 ? 'participante' : 'participantes'} com XP
        </div>
      </div>

      {truncated ? (
        <p className="text-amber-700 text-sm dark:text-amber-300">
          A busca encontrou mais de 100 identidades. Refine o nome ou e-mail para ver todos os
          resultados.
        </p>
      ) : null}

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">Posição</TableHead>
              <TableHead>Aluno</TableHead>
              <TableHead>Nível</TableHead>
              <TableHead>XP acumulado</TableHead>
              <TableHead>Última atividade</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableSkeletonRows columns={5} />
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                  {q.trim()
                    ? 'Nenhum participante encontrado nesta busca.'
                    : 'Ainda não há participantes com XP nesta plataforma.'}
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <RankingRow key={item.learnerId} item={item} kids={platform === 'kids'} />
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Pagination total={total} limit={LIMIT} offset={offset} onChange={setOffset} />
    </div>
  )
}

function RankingRow({ item, kids }: { item: RankingListRow; kids: boolean }) {
  const lastActivity = relativeCivilDayLabel(item.lastActivityDate)
  return (
    <TableRow className="hover:bg-muted/50">
      <TableCell>
        <span className="inline-flex items-center gap-1.5 font-semibold tabular-nums">
          {item.position <= 3 ? <Medal className="size-4 text-amber-500" /> : null}
          {item.position}º
        </span>
      </TableCell>
      <TableCell>
        <Link href={item.href} className="flex items-center gap-3">
          <RankingAvatar name={item.name} photoUrl={item.photoUrl} />
          <span>
            <span className="block font-medium">{item.name ?? 'Identidade indisponível'}</span>
            <span className="block text-muted-foreground text-xs">
              {kids && item.accountName ? `${item.accountName} · ` : ''}
              {item.accountEmail ?? `ID ${item.learnerId.slice(0, 8)}`}
            </span>
          </span>
        </Link>
      </TableCell>
      <TableCell>{STUDENT_RANK_LABELS[item.levelSlug] ?? item.levelSlug}</TableCell>
      <TableCell className="font-medium tabular-nums">
        {item.xp.toLocaleString('pt-BR')} XP
      </TableCell>
      <TableCell className="text-muted-foreground">{lastActivity ?? 'Nunca'}</TableCell>
    </TableRow>
  )
}

function RankingAvatar({ name, photoUrl }: { name: string | null; photoUrl: string | null }) {
  if (photoUrl) {
    return (
      // biome-ignore lint/performance/noImgElement: foto do avatar 3D vem de URL dinâmica do R2
      <img
        src={photoUrl}
        alt=""
        className="size-9 rounded-full border border-border object-cover"
      />
    )
  }
  return (
    <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary text-xs">
      {name?.trim().charAt(0).toUpperCase() || '?'}
    </span>
  )
}
