import { useEffect } from 'react'
import { isPythonProject } from '../../core/editableProject'
import { useProjectStore, useProjectStoreApi } from '../../state/projectStore'
import { useStudioConfig } from '../../studio/config'
import { useStudioRuntimeEnvironment } from '../../studio/runtime-environment'
import { PYTHON_EXTENSIONS } from './catalog'
import { changePythonExtension } from './operations'
import { hasPythonStartingExtension, takePythonStartingExtension } from './startingExtension'

/** Instala a extensão do ponto de partida no projeto Python recém-criado (ver o módulo). */
export function usePythonStartingExtension(): void {
  const store = useProjectStoreApi()
  const projectId = useProjectStore((state) => state.project?.id)
  const author = useProjectStore((state) => state.editingAccess === 'author')
  const environment = useStudioRuntimeEnvironment()
  const allowedIds = useStudioConfig().learning.allowExtensions
  useEffect(() => {
    if (!projectId || !author || !environment || !hasPythonStartingExtension(projectId)) return
    const project = store.getState().project
    if (!project || project.id !== projectId || !isPythonProject(project)) return
    const id = takePythonStartingExtension(projectId)
    const extension = PYTHON_EXTENSIONS.find((item) => item.id === id)
    if (!extension || project.installedExtensions.some((item) => item.id === extension.id)) return
    void changePythonExtension({
      store,
      expected: project,
      extension: { id: extension.id, version: extension.version },
      action: 'install',
      policy: () => ({ environment, allowedIds }),
    }).catch(() => {
      // Sem permissão ou sem ambiente: o projeto segue em branco e a criança instala por
      // "Mais blocos".
    })
  }, [projectId, author, environment, allowedIds, store])
}
