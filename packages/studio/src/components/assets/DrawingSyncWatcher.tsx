import { useEffect } from 'react'
import { getPersonalAssetsNamespace } from '../../asset-library/personal'
import { syncDrawingsIntoProjects } from '../../asset-library/personalSync'
import { useProjectStoreApi } from '../../state/projectStore'

/**
 * Reconcilia os desenhos do Pinta quando a janela do Estúdio volta ao foco — é
 * assim que "editei o desenho na outra aba" chega ao jogo sem nenhum clique.
 *
 * Não renderiza nada. Fica no Shell (ao lado dos outros observadores sempre
 * ligados) porque o painel de Imagens pode estar fechado justamente quando ela
 * volta para cá — e o que ela quer ver atualizado é o JOGO rodando.
 *
 * O custo real é o portão do `syncDrawingsIntoProjects`: sem desenho novo desde
 * a última passada, a chamada sai sem tocar no IndexedDB. Por isso não há
 * throttle aqui — o trabalho pesado já é condicional.
 */
export function DrawingSyncWatcher(): null {
  const storeApi = useProjectStoreApi()

  useEffect(() => {
    // Só o Estúdio Completo tem biblioteca pessoal (namespace por PERFIL). Na
    // aula e no adulto o namespace é vazio e não há o que sincronizar.
    if (!getPersonalAssetsNamespace()) return

    let disposed = false
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
        void syncDrawingsIntoProjects(storeApi)
      })
    }

    const onVisible = () => {
      if (!document.hidden) run()
    }
    // A primeira passada cobre "desenhei ontem, abro o Estúdio hoje".
    run()
    window.addEventListener('focus', run)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      disposed = true
      window.removeEventListener('focus', run)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [storeApi])

  return null
}
