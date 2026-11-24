import { useEffect, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { isPythonProject } from '../../../core/editableProject'
import type { ProjectTree } from '../../../core/proProject'
import { useProjectStore } from '../../../state/projectStore'
import {
  PRO_ENGINE_COPY_PATHS,
  type ProEngineInventory,
  proEngineUpdatePlan,
} from '../proEngineCopies'

/**
 * O projeto Pro aberto tem um motor 2D antigo e intacto que pode receber o motor de agora? Devolve
 * o id do projeto quando sim. Lê só os arquivos do motor (`public/sz-ext/*.js`): digitar no código
 * da criança não refaz a conferência. Quem só observa o projeto não recebe a oferta.
 */
export function useProEngineUpdateOffer(known?: ProEngineInventory): string | null {
  const projectId = useProjectStore((state) => {
    const project = state.project
    return project?.kind === 'pro' && !isPythonProject(project) && state.editingAccess === 'author'
      ? project.id
      : null
  })
  const copies = useProjectStore(
    useShallow((state) => {
      const project = state.project
      const selected: ProjectTree = {}
      if (project?.kind !== 'pro' || isPythonProject(project)) return selected
      for (const path of PRO_ENGINE_COPY_PATHS) {
        const node = project.tree?.[path]
        if (node) selected[path] = node
      }
      return selected
    }),
  )
  const [offer, setOffer] = useState<{ copies: ProjectTree; projectId: string } | null>(null)
  useEffect(() => {
    if (!projectId || !Object.keys(copies).length) {
      setOffer(null)
      return
    }
    let active = true
    void proEngineUpdatePlan(copies, known).then(
      (plan) => {
        if (active) setOffer(plan ? { copies, projectId } : null)
      },
      () => {
        // Sem conferir, nada é oferecido: o projeto continua com o motor que tem.
        if (active) setOffer(null)
      },
    )
    return () => {
      active = false
    }
  }, [projectId, copies, known])
  return offer?.copies === copies && offer.projectId === projectId ? projectId : null
}
