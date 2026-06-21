import { Card } from '@sistemazero/ui/card'
import { Skeleton } from '@sistemazero/ui/skeleton'
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@sistemazero/ui/table'
import { TableSkeletonRows } from '@/components/admin/table-skeleton'

const HEAD_KEYS = ['h1', 'h2', 'h3', 'h4', 'h5']

/**
 * Esqueleto genérico das páginas do painel (fallback de Suspense do Next) — título
 * + barra de filtros + tabela, no lugar de "Carregando…". Cobre a navegação de
 * TODAS as rotas `/admin/*` (a maioria é lista/tabela). `aria-busy` + sr-only.
 */
export default function AdminLoading() {
  return (
    <div aria-busy="true" className="flex flex-col gap-6">
      <span className="sr-only">Carregando…</span>
      <Skeleton className="h-7 w-48" />
      <div className="flex flex-wrap gap-3">
        <Skeleton className="h-9 w-64 max-w-full" />
        <Skeleton className="h-9 w-32" />
      </div>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              {HEAD_KEYS.map((k) => (
                <TableHead key={k}>
                  <Skeleton className="h-4 w-20" />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableSkeletonRows columns={5} />
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
