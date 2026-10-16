import { lazy } from 'react'

/**
 * Definição lazy compartilhada do Terminal — usada pelo
 * BottomPanel (layout wide) e pelo NarrowLayout (layout em abas). Centralizar
 * aqui garante o MESMO chunk nos dois caminhos (sem baixar duas vezes) e o
 * mesmo limite de Suspense.
 */
export const Terminal = lazy(() =>
  import('../terminal/Terminal').then((m) => ({ default: m.Terminal })),
)
