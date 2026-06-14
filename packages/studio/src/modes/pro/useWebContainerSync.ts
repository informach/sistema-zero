import type { WebContainer } from '@webcontainer/api'
import { type RefObject, useCallback, useEffect, useRef, useState } from 'react'
import {
  buildTerminalFileContents,
  buildTerminalFileTree,
  type TerminalProjectSnapshot,
} from '../../components/terminal/terminalProjectFiles'
import {
  claimFsOwnership,
  getWebContainer,
  registerProMountTrigger,
  releaseFsOwnership,
  resetWebContainerFs,
  setProFsMounted,
} from '../../components/terminal/webContainerClient'
import { computeFsDiff } from './fsDiff'

export type WcMountState = 'idle' | 'mounting' | 'mounted' | 'error' | 'busy'

export interface UseWebContainerSyncResult {
  state: WcMountState
  error: string | null
  /** Garante o mount inicial; idempotente por projectId. Resolve o container. */
  ensureMounted: () => Promise<WebContainer | null>
  webcontainerRef: RefObject<WebContainer | null>
}

const SYNC_DELAY_MS = 150

/**
 * FONTE ÚNICA de sincronização store→FS para o WebContainer singleton no modo
 * profissional. Terminal e ProPreview compartilham o MESMO container; se ambos
 * escrevessem, dois debounces concorrentes corromperiam o FS. Por isso só este
 * hook escreve — montado uma vez pelo `ProWebContainerProvider` em `CodeMode`.
 */
export function useWebContainerSync(snapshot: TerminalProjectSnapshot): UseWebContainerSyncResult {
  const projectId = snapshot.id
  const snapshotRef = useRef(snapshot)
  snapshotRef.current = snapshot

  // Identidade ESTÁVEL desta instância pro para o token de dono ÚNICO do FS
  // (compartilhado com o terminal clássico via webContainerClient).
  const fsOwnerRef = useRef<symbol>(Symbol('sz-pro-webcontainer'))
  const webcontainerRef = useRef<WebContainer | null>(null)
  const syncedFilesRef = useRef<Map<string, string>>(new Map())
  const mountSeqRef = useRef(0)
  const syncSeqRef = useRef(0)
  const syncChainRef = useRef<Promise<void>>(Promise.resolve())
  const mountedProjectRef = useRef<string | null>(null)
  const mountPromiseRef = useRef<Promise<WebContainer | null> | null>(null)
  const [state, setState] = useState<WcMountState>('idle')
  const [error, setError] = useState<string | null>(null)

  const ensureMounted = useCallback(async (): Promise<WebContainer | null> => {
    if (!projectId) return null
    if (mountedProjectRef.current === projectId && webcontainerRef.current) {
      return webcontainerRef.current
    }
    if (mountPromiseRef.current) return mountPromiseRef.current

    const mountId = ++mountSeqRef.current
    setState('mounting')
    setError(null)
    const promise = (async (): Promise<WebContainer | null> => {
      try {
        // Dono ÚNICO do FS singleton: outra instância (clássica ou pro) já montou
        // na raiz e tem um jsh/dev-server rodando sobre ela — resetar/remontar
        // aqui apagaria os arquivos dela. Recusa antes de tocar no FS.
        if (claimFsOwnership && !claimFsOwnership(fsOwnerRef.current)) {
          if (mountSeqRef.current !== mountId) return null
          setState('busy')
          return null
        }
        const wc = await getWebContainer()
        if (mountSeqRef.current !== mountId) return null
        // Troca de projeto: limpa o FS preservando node_modules (evita reinstalar).
        if (mountedProjectRef.current && mountedProjectRef.current !== projectId) {
          await resetWebContainerFs(wc)
        }
        await wc.mount(buildTerminalFileTree(snapshotRef.current))
        if (mountSeqRef.current !== mountId) return null
        webcontainerRef.current = wc
        mountedProjectRef.current = projectId
        syncedFilesRef.current = new Map(
          Object.entries(buildTerminalFileContents(snapshotRef.current)),
        )
        setState('mounted')
        // Publica o sinal para o Terminal pro (irmão fora do provider) abrir o
        // jsh sobre o FS já montado em vez de montar por conta própria.
        setProFsMounted?.(projectId)
        return wc
      } catch (err) {
        if (mountSeqRef.current !== mountId) return null
        setError(err instanceof Error ? err.message : String(err))
        setState('error')
        return null
      } finally {
        mountPromiseRef.current = null
      }
    })()
    mountPromiseRef.current = promise
    return promise
  }, [projectId])

  // Troca de projeto: invalida mount/sync em voo e volta para idle (o ProPreview
  // chama ensureMounted de novo, que fará o reset+remount). SÓ dispara numa
  // MUDANÇA real de projeto — no mount inicial NÃO pode bumpar mountSeqRef, ou
  // invalidaria o ensureMounted que o ProPreview (filho, efeito roda antes do
  // pai) já disparou, e o boot resolveria com mountId obsoleto → null.
  const lastProjectIdRef = useRef<string | null>(null)
  useEffect(() => {
    const prev = lastProjectIdRef.current
    lastProjectIdRef.current = projectId
    if (prev === null || prev === projectId) return
    mountSeqRef.current += 1
    syncSeqRef.current += 1
    syncChainRef.current = Promise.resolve()
    mountPromiseRef.current = null
    // O FS do projeto anterior será resetado no próximo ensureMounted; invalida o
    // sinal para o Terminal pro esperar pelo remount em vez de abrir sobre o FS
    // antigo. A POSSE permanece desta instância (ainda é o escritor pro).
    setProFsMounted?.(null)
    setState('idle')
  }, [projectId])

  // Registra o gatilho de mount (escritor único) para o Terminal pro poder pedir
  // o mount mesmo com o preview fechado. Reregistra se `ensureMounted` mudar
  // (troca de projeto) e desregistra ao desmontar.
  useEffect(() => {
    registerProMountTrigger?.(() => {
      void ensureMounted()
    })
    return () => registerProMountTrigger?.(null)
  }, [ensureMounted])

  // Desmontagem: libera a posse do FS para outra instância poder montar e
  // invalida o sinal de mount (o jsh/dev-server desta instância foi embora).
  useEffect(() => {
    const owner = fsOwnerRef.current
    return () => {
      releaseFsOwnership?.(owner)
      setProFsMounted?.(null)
    }
  }, [])

  // Sync debounced (único escritor). Só roda quando montado.
  useEffect(() => {
    if (state !== 'mounted') return
    const wc = webcontainerRef.current
    if (!wc) return
    const contents = buildTerminalFileContents(snapshot)
    const diff = computeFsDiff(Object.fromEntries(syncedFilesRef.current), contents)
    if (diff.writes.length === 0 && diff.removes.length === 0 && diff.rmdirs.length === 0) return

    const syncId = ++syncSeqRef.current
    let cancelled = false
    const timer = window.setTimeout(() => {
      const run = syncChainRef.current.then(async () => {
        if (cancelled || syncSeqRef.current !== syncId || webcontainerRef.current !== wc) return
        for (const dir of diff.mkdirs) {
          await wc.fs.mkdir(dir, { recursive: true }).catch(() => undefined)
        }
        await Promise.all(diff.writes.map((w) => wc.fs.writeFile(w.path, w.content)))
        await Promise.all(diff.removes.map((p) => wc.fs.rm(p, { force: true, recursive: true })))
        // Poda pastas que ficaram vazias após remover o último arquivo dentro
        // delas (da mais profunda para a mais rasa — ver computeFsDiff).
        await Promise.all(diff.rmdirs.map((d) => wc.fs.rm(d, { force: true, recursive: true })))
        if (!cancelled && syncSeqRef.current === syncId && webcontainerRef.current === wc) {
          syncedFilesRef.current = new Map(Object.entries(contents))
        }
      })
      syncChainRef.current = run.catch(() => undefined)
      run.catch((err) => {
        if (cancelled || syncSeqRef.current !== syncId) return
        setError(
          `Não foi possível sincronizar arquivos: ${err instanceof Error ? err.message : String(err)}`,
        )
      })
    }, SYNC_DELAY_MS)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [snapshot, state])

  return { state, error, ensureMounted, webcontainerRef }
}
