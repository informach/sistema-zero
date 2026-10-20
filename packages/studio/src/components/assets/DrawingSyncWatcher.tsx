import { useEffect } from 'react'
import { getPersonalAssetsNamespace } from '../../asset-library/personal'
import { syncDrawingsIntoProjects } from '../../asset-library/personalSync'
import { useProjectStoreApi } from '../../state/projectStore'
import { useStudioPintaLibrary } from '../../studio/pinta-library'

/**
 * Reconcilia os desenhos do Pinta quando a janela do Estúdio volta ao foco — é
 * assim que "editei o desenho na outra aba" chega ao jogo sem nenhum clique.
 *
 * Não renderiza nada. Fica no Shell (ao lado dos outros observadores sempre
 * ligados) porque a janela dos materiais pode estar fechada justamente quando ela
 * volta para cá — e o que ela quer ver atualizado é o JOGO rodando.
 *
 * O portão do `syncDrawingsIntoProjects` evita releitura das cópias canônicas sem mudança.
 * Receitas Python conferem a proveniência nativa, mas rasterizam apenas quando ela muda.
 */
export function DrawingSyncWatcher(): null {
  const storeApi = useProjectStoreApi()
  const pintaLibrary = useStudioPintaLibrary()

  useEffect(() => {
    // Só o Estúdio Completo tem biblioteca pessoal (namespace por PERFIL). Na
    // aula e no adulto o namespace é vazio e não há o que sincronizar.
    if (!getPersonalAssetsNamespace()) return

    let disposed = false
    const controller = new AbortController()
    const run = () => {
      if (disposed) return
      // A varredura dos projetos FECHADOS é I/O de fundo: espera a aba ficar
      // ociosa para não competir com o editor/preview no instante do foco.
      const idle = (cb: () => void) =>
        typeof requestIdleCallback === 'function'
          ? requestIdleCallback(() => cb(), { timeout: 2000 })
          : setTimeout(cb, 200)
      idle(() => {
        if (disposed) return
        void syncDrawingsIntoProjects(storeApi, { pintaLibrary, signal: controller.signal })
      })
    }

    const onVisible = () => {
      if (!document.hidden) run()
    }
    // A primeira passada cobre "desenhei ontem, abro o Estúdio hoje".
    run()
    const unsubscribe = storeApi.subscribe((state, previous) => {
      if (
        state.project?.id !== previous.project?.id ||
        state.editingAccess !== previous.editingAccess ||
        (state.project?.programmingLanguage ?? 'javascript') !==
          (previous.project?.programmingLanguage ?? 'javascript')
      )
        run()
    })
    window.addEventListener('focus', run)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      disposed = true
      controller.abort()
      unsubscribe()
      window.removeEventListener('focus', run)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [storeApi, pintaLibrary])

  return null
}
