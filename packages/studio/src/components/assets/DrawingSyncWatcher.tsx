import { useCallback, useEffect } from 'react'
import {
  getPersonalAssetsNamespace,
  subscribePersonalAssetsChanged,
} from '../../asset-library/personal'
import { syncDrawingsIntoProjects } from '../../asset-library/personalSync'
import { captureProjectStorageScope } from '../../state/projectStorageRuntime'
import { useProjectStoreApi } from '../../state/projectStore'
import { useStudioPintaLibrary } from '../../studio/pinta-library'
import { useStudioRuntimeEnvironment } from '../../studio/runtime-environment'

/**
 * Reconcilia no foco e quando a ponte do Pinta termina em outra aba. O commit
 * pode chegar depois do foco: o jogo não deve esperar uma segunda volta à janela.
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
  const environment = useStudioRuntimeEnvironment()
  const runtimeCatalog = useCallback(() => environment?.catalog ?? null, [environment])

  useEffect(() => {
    // Só o Estúdio Completo tem biblioteca pessoal (namespace por PERFIL). Na
    // aula e no adulto o namespace é vazio e não há o que sincronizar.
    const namespace = getPersonalAssetsNamespace()
    if (!namespace) return

    let disposed = false
    let running = false
    let pending = false
    let scheduled = false
    const controller = new AbortController()
    const ownerScope = captureProjectStorageScope()
    const isActive = () =>
      !disposed &&
      !ownerScope.signal?.aborted &&
      getPersonalAssetsNamespace() === namespace &&
      captureProjectStorageScope().identity === ownerScope.identity
    const flush = async () => {
      scheduled = false
      if (!isActive()) return
      running = true
      try {
        do {
          pending = false
          await syncDrawingsIntoProjects(storeApi, {
            pintaLibrary,
            signal: controller.signal,
            runtimeCatalog,
          })
        } while (pending && isActive())
      } finally {
        running = false
        if (pending && isActive()) run()
      }
    }
    const run = () => {
      if (!isActive()) return
      pending = true
      if (running || scheduled) return
      scheduled = true
      // A varredura dos projetos FECHADOS é I/O de fundo: espera a aba ficar
      // ociosa para não competir com o editor/preview no instante do foco.
      const idle = (cb: () => void) =>
        typeof requestIdleCallback === 'function'
          ? requestIdleCallback(() => cb(), { timeout: 2000 })
          : setTimeout(cb, 200)
      idle(() => {
        void flush().catch((error: unknown) => {
          console.warn('Não consegui atualizar os desenhos do Pinta.', error)
        })
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
    const unsubscribeChanges = subscribePersonalAssetsChanged(run, namespace)
    return () => {
      disposed = true
      controller.abort()
      unsubscribe()
      unsubscribeChanges()
      window.removeEventListener('focus', run)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [storeApi, pintaLibrary, runtimeCatalog])

  return null
}
