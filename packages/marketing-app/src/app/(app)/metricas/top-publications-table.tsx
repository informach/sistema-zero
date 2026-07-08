'use client'

import { InfoTooltip } from '@sistemazero/ui/info-tooltip'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@sistemazero/ui/table'
import Link from 'next/link'
import { NetworkChip } from '@/components/shared/network-chip'
import { formatShortSp } from '@/lib/dates'
import type { MetricsSummaryView } from '@/lib/types'

const NUMBER_FMT = new Intl.NumberFormat('pt-BR')

/** Top publicações (90d, multi-rede) por views — último snapshot de cada uma. */
export function TopPublicationsTable({
  publications,
}: {
  publications: MetricsSummaryView['topPublications']
}) {
  if (publications.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/50 px-6 py-10 text-center">
        <p className="text-sm text-muted-foreground">
          Nenhuma publicação com métricas ainda. Os números aparecem depois da primeira coleta
          pós-publicação.
        </p>
      </div>
    )
  }
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <h2 className="text-sm font-medium">Top publicações</h2>
        <InfoTooltip text="Publicações dos últimos 90 dias ordenadas por views, com o último snapshot coletado de cada uma. No Facebook a API só expõe reações e comentários." />
      </div>
      <div className="rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Publicação</TableHead>
              <TableHead>Formato</TableHead>
              <TableHead>Publicado em</TableHead>
              <TableHead className="text-right">Views</TableHead>
              <TableHead className="text-right">Likes</TableHead>
              <TableHead className="text-right">Comentários</TableHead>
              <TableHead>Coletado em</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {publications.map((pub) => (
              <TableRow key={pub.publicationId}>
                <TableCell>
                  <Link
                    href={`/conteudos/${pub.contentId}/publicacoes/${pub.publicationId}`}
                    className="font-medium hover:underline"
                  >
                    {pub.contentTitle}
                  </Link>
                </TableCell>
                <TableCell>
                  <NetworkChip format={pub.format} />
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {pub.publishedAt ? formatShortSp(pub.publishedAt) : '—'}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {NUMBER_FMT.format(pub.views)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {NUMBER_FMT.format(pub.likes)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {NUMBER_FMT.format(pub.comments)}
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {formatShortSp(pub.capturedAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
