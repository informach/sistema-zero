import { Skeleton } from '@sistemazero/ui/skeleton'
import { TableCell, TableRow } from '@sistemazero/ui/table'

const ROW_KEYS = ['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7', 'r8']

/**
 * Linhas-esqueleto para o `<TableBody>` enquanto uma lista carrega — no lugar do
 * spinner centralizado. `columns` células com `Skeleton` por linha; `rows` (≤8)
 * controla a altura. A região da tabela comunica o carregamento (os blocos são
 * `aria-hidden` via Skeleton). Reaproveitado por todas as tabelas do painel.
 */
export function TableSkeletonRows({ columns, rows = 8 }: { columns: number; rows?: number }) {
  const cols = Array.from({ length: columns }, (_, i) => `c${i}`)
  return (
    <>
      {ROW_KEYS.slice(0, rows).map((rk) => (
        <TableRow key={rk}>
          {cols.map((ck) => (
            <TableCell key={ck}>
              <Skeleton className="h-4 w-3/4" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
}
