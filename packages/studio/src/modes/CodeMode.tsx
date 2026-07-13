import type { JSX } from 'react'
import { useProjectStore } from '../state/projectStore'
import { ProCodeMode } from './pro/ProCodeMode'

/**
 * Modo Código. Desde o D2 (`modesForKind` em core/modes.ts) SÓ projetos
 * profissionais entram em `mode: 'code'`: o clássico expõe Blocos+Ponte e o
 * legado `'code'` é migrado para `'bridge'` por `normalizeClassicMode`, com o
 * `setMode` do store coagindo o resto. O corpo clássico que vivia aqui
 * (FileExplorer + 3 canônicos + abas de extras) ficou inalcançável e foi
 * removido — este componente é só o gate de projeto + o editor profissional.
 */
export function CodeMode(): JSX.Element {
  const hasProject = useProjectStore((s) => Boolean(s.project))
  if (!hasProject) return <div />
  return <ProCodeMode />
}
