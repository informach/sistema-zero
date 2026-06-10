import { useMemo } from 'react'
import { findIdAtLine, reverseSourceMap, type SourceMappedFile } from '#generators'
import { useSourcemapStore } from '../state/sourcemapStore'

/**
 * Hook utilitário que expõe duas funções:
 * - `lookupBlock(blockId)` → onde no arquivo o trecho gerado está.
 * - `lookupLine(file, line)` → qual bloco produziu este trecho.
 *
 * Os componentes (BlocklyPanel, MonacoTabs) chamam estas funções nos
 * callbacks de seleção/cursor para fazer scroll cruzado.
 */
export function useCrossHighlight() {
  const map = useSourcemapStore((s) => s.map)
  const reverse = useMemo(() => reverseSourceMap(map), [map])

  return useMemo(
    () => ({
      lookupBlock(blockId: string): {
        file: SourceMappedFile
        startLine: number
        endLine: number
        startColumn?: number
        endColumn?: number
      } | null {
        const entry = map[blockId]
        return entry ?? null
      },
      lookupLine(file: SourceMappedFile, line: number, column?: number): string | null {
        return findIdAtLine(reverse, file, line, column)
      },
    }),
    [map, reverse],
  )
}
