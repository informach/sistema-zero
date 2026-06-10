import { lazy } from 'react'
import type { IDEMode } from '#core'

// Fábricas de import() definidas UMA vez e reusadas tanto pelo `lazy()` quanto
// pelo `prefetchMode()`. Compartilhar a mesma referência garante que qualquer
// prefetch explícito e o mount via Suspense usem o MESMO chunk.
const importBlocksMode = () => import('./BlocksMode')
const importBridgeMode = () => import('./BridgeMode')
const importCodeMode = () => import('./CodeMode')

export const BlocksMode = lazy(() => importBlocksMode().then((m) => ({ default: m.BlocksMode })))
export const BridgeMode = lazy(() => importBridgeMode().then((m) => ({ default: m.BridgeMode })))
export const CodeMode = lazy(() => importCodeMode().then((m) => ({ default: m.CodeMode })))

/**
 * Inicia o download/avaliação do chunk do modo informado sem renderizá-lo.
 * Idempotente (o import() é cacheado). Use só em momentos explicitamente fora
 * de interações críticas: importar Código/Ponte ainda pode avaliar Monaco ou
 * Blockly no thread principal.
 */
export function prefetchMode(mode: IDEMode | undefined): void {
  switch (mode) {
    case 'code':
      void importCodeMode()
      break
    case 'bridge':
      void importBridgeMode()
      break
    default:
      void importBlocksMode()
      break
  }
}
