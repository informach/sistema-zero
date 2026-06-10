import type { JSX } from 'react'
import { useMemo } from 'react'
import type { ExtraFile } from '#core'
import { countAdvancedIR } from '#ir'
import { Badge } from '#ui'
import { useProjectStore } from '../../state/projectStore'

const EMPTY_EXTRAS: ExtraFile[] = []
const MAX_NAMES = 3

/**
 * Aviso fino mostrado no topo dos modos Blocos e Ponte quando o projeto tem
 * conteúdo que esses modos NÃO representam como blocos granulares:
 * - arquivos extras (além dos 3 canônicos), que só são editáveis no Código;
 * - trechos "Código avançado" na IR (sem bloco próprio ainda).
 *
 * Nada é bloqueado nem perdido — o aviso só deixa explícito o que ficou só no
 * Código (decisão de produto: degradar + avisar). Retorna `null` quando o
 * projeto é totalmente representável.
 */
export function ModeLimitationsNotice(): JSX.Element | null {
  const extraFiles = useProjectStore((s) => s.project?.extraFiles ?? EMPTY_EXTRAS)
  const ir = useProjectStore((s) => s.project?.ir ?? null)
  const advancedCount = useMemo(() => (ir ? countAdvancedIR(ir) : 0), [ir])

  const hasExtras = extraFiles.length > 0
  if (!hasExtras && advancedCount === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-sz-warn/30 bg-sz-warn/10 px-3 py-1.5 text-xs text-sz-fg-soft">
      <Badge tone="warn">Só no Código</Badge>
      {hasExtras && (
        <span>
          {extraFiles.length} arquivo(s) extra(s) ({formatNames(extraFiles)}) aparecem e são
          editáveis só no modo Código — foram preservados.
        </span>
      )}
      {advancedCount > 0 && (
        <span>
          {advancedCount} trecho(s) viraram blocos “Código avançado” (ainda sem bloco próprio).
        </span>
      )}
    </div>
  )
}

function formatNames(files: ExtraFile[]): string {
  const names = files.map((f) => f.name)
  if (names.length <= MAX_NAMES) return names.join(', ')
  return `${names.slice(0, MAX_NAMES).join(', ')} +${names.length - MAX_NAMES}`
}
