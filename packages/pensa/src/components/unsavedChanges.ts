/**
 * "Coisa sem guardar" (26/09/2026): o `useUnsavedChanges` vivia em DUAS cópias (PensaApp e
 * TaskPlan) e só avisava o navegador (`beforeunload`). O "Atualizar" da faixa "alguém da equipe
 * mexeu no plano" recarrega o plano inteiro e DESMONTA a etapa, então ele precisa saber se há
 * um editor sujo antes de jogar fora o que a criança escreve. O hook passou a registrar também
 * num contexto do `PensaApp` (`DirtyContext`): cada editor segura uma "posse" enquanto está
 * sujo e solta ao limpar/desmontar; quem vai recarregar pergunta `isDirty()`.
 *
 * Sem contexto (um editor renderizado fora do `PensaApp`, como num teste) o hook só faz o
 * `beforeunload` de sempre.
 */
import { createContext, useContext, useEffect } from 'react'

export interface DirtyRegistry {
  /** Segura uma posse de "sujo"; a função devolvida solta. */
  hold(): () => void
  /** Há algum editor sujo neste instante? */
  isDirty(): boolean
}

export const DirtyContext = createContext<DirtyRegistry | null>(null)

export function useUnsavedChanges(active: boolean): void {
  const registry = useContext(DirtyContext)
  useEffect(() => {
    if (!active) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    const release = registry?.hold()
    return () => {
      window.removeEventListener('beforeunload', warn)
      release?.()
    }
  }, [active, registry])
}
