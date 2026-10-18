import { studioProPublicationUrl } from '@sistemazero/core/studio/pro-publication'
import type { CSSProperties, JSX, Ref } from 'react'
import { forwardRef, useCallback, useEffect, useRef, useState } from 'react'
import type { Project } from '#core'
import { renderProjectToPreviewDocAsync } from '#preview'
import { useProGameStorage } from '../../modes/pro/useProGameStorage'
import type { PreviewSecurityProfile } from '../../preview/csp'
import { type StudioPlayerOriginAdapter, validateIsolatedPreviewUrl } from './playerOriginAdapter'

export type { StudioPlayerOriginAdapter, StudioPlayerOriginRequest } from './playerOriginAdapter'

type PlayerLoadStatus = 'loading' | 'ready' | 'error'

interface PlayerLoadState {
  status: PlayerLoadStatus
  doc: string
  url?: string
  /**
   * Muda a cada documento novo e vira `key` do `<iframe>`, forçando um elemento
   * NOVO em vez de reescrever o `srcDoc` do existente.
   *
   * Trocar `srcDoc` logo depois da montagem pode ser descartado pelo navegador
   * quando o primeiro load ainda não se firmou. Isso acontece especialmente
   * numa remontagem, quando o documento já está em cache e fica pronto quase
   * imediatamente.
   */
  generation: number
}

const PLAYER_LOADING_DOC = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>html,body{height:100%;margin:0}body{display:grid;place-items:center;background:#fff;color:#334155;font:600 16px system-ui,sans-serif}p{margin:0;padding:24px;text-align:center}</style></head><body><p role="status" aria-live="polite">Carregando o jogo…</p></body></html>`
const PLAYER_ERROR_DOC = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>html,body{height:100%;margin:0}body{display:grid;place-items:center;background:#fff;color:#b91c1c;font:600 16px system-ui,sans-serif}p{margin:0;padding:24px;text-align:center}</style></head><body><p role="alert">Não foi possível carregar o motor deste jogo.</p></body></html>`
const PLAYER_STATUS_STYLE: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
}

export interface StudioProjectPlayerProps {
  /** Projeto auto-suficiente (assets embutidos) — o que será JOGADO. */
  project: Project
  /** Origem do host para o targetOrigin dos interceptors (defesa em profundidade). */
  parentOrigin?: string
  /** `strict` por padrão; `creative` reabre imagens/fontes/mídia https. */
  securityProfile?: PreviewSecurityProfile
  /** Publica o documento numa origem isolada e faz o iframe navegar por `src`. */
  originAdapter?: StudioPlayerOriginAdapter
  /** Authoritative permanent revision resolved by the host after checking visibility. */
  published?: { playId: string; revision: string; url: string }
  /** Título acessível do iframe (default = `project.name`). */
  title?: string
  className?: string
  tabIndex?: number
  style?: CSSProperties
  onError?: () => void
  /** Carregamento do documento jogável, sem contar o placeholder. */
  onReady?: () => void
}

/**
 * Player AUTÔNOMO do jogo de um projeto, para a página PÚBLICA de jogar (sem
 * login), renderizada pelo community-kids FORA do editor. Roda SÓ o jogo num
 * iframe sandbox — mesmos atributos/segurança do preview vivo do editor —
 * preenchendo o contêiner. Autostart: o `srcdoc` já contém todo o código
 * (auto-suficiente), então o jogo começa no `load`. NÃO depende do CSS do Studio.
 *
 * Renderizar SOMENTE no client (`next/dynamic(..., { ssr:false })`): o doc é
 * montado a partir de `window.location.origin` quando `parentOrigin` é omitido.
 *
 * O `ref` encaminhado aponta para o elemento `<iframe>` — útil para o gamepad
 * virtual (postMessage de teclas) e para `requestFullscreen()`.
 */
export const JavaScriptProjectPlayer = forwardRef<HTMLIFrameElement, StudioProjectPlayerProps>(
  function JavaScriptProjectPlayer(
    {
      project,
      parentOrigin,
      securityProfile = 'strict',
      originAdapter,
      published,
      title,
      className,
      tabIndex,
      style,
      onError,
      onReady,
    }: StudioProjectPlayerProps,
    ref: Ref<HTMLIFrameElement>,
  ): JSX.Element {
    const [loadState, setLoadState] = useState<PlayerLoadState>({
      status: 'loading',
      doc: PLAYER_LOADING_DOC,
      generation: 0,
    })
    const [confirmedProGeneration, setConfirmedProGeneration] = useState<number | null>(null)
    const onErrorRef = useRef(onError)
    const onReadyRef = useRef(onReady)
    onReadyRef.current = onReady
    const iframeRef = useRef<HTMLIFrameElement | null>(null)
    const assignFrame = useCallback(
      (node: HTMLIFrameElement | null) => {
        iframeRef.current = node
        if (typeof ref === 'function') return ref(node)
        if (ref) ref.current = node
      },
      [ref],
    )
    const storageName = useProGameStorage({
      frame: iframeRef,
      projectId: project.kind === 'pro' && published ? `published-${published.playId}` : null,
      revision: loadState.generation,
      identity: `${loadState.url ?? ''}:${loadState.generation}`,
      origin: project.kind === 'pro' && loadState.url ? 'null' : null,
    })
    onErrorRef.current = onError
    useEffect(() => {
      if (project.kind !== 'pro' || !loadState.url || loadState.status !== 'ready') return
      let confirmed = false
      const ask = () =>
        iframeRef.current?.contentWindow?.postMessage({ type: 'sz:pro-document?' }, '*')
      const receive = (event: MessageEvent) => {
        if (
          event.source !== iframeRef.current?.contentWindow ||
          event.origin !== 'null' ||
          event.data?.type !== 'sz:pro-document-ready' ||
          event.data.version !== 1 ||
          confirmed
        )
          return
        confirmed = true
        setConfirmedProGeneration(loadState.generation)
        clearInterval(interval)
        clearTimeout(timeout)
        onReadyRef.current?.()
      }
      const interval = setInterval(ask, 250)
      const timeout = setTimeout(() => {
        if (confirmed) return
        clearInterval(interval)
        setLoadState((current) => ({
          status: 'error',
          doc: PLAYER_ERROR_DOC,
          generation: current.generation + 1,
        }))
        onErrorRef.current?.()
      }, 10000)
      window.addEventListener('message', receive)
      ask()
      return () => {
        clearInterval(interval)
        clearTimeout(timeout)
        window.removeEventListener('message', receive)
      }
    }, [project.kind, loadState.url, loadState.status, loadState.generation])
    useEffect(() => {
      let ignore = false
      let activeUrl: string | null = null
      const abortController = new AbortController()
      const actualHostOrigin = typeof window !== 'undefined' ? window.location.origin : ''
      const resolvedParentOrigin = parentOrigin ?? actualHostOrigin
      const isolationHostOrigin =
        actualHostOrigin && actualHostOrigin !== 'null' ? actualHostOrigin : resolvedParentOrigin
      const release = (url: string) => {
        try {
          void Promise.resolve(originAdapter?.releasePreviewUrl?.(url)).catch(() => {})
        } catch {
          // Limpeza best-effort: falha do host não deve derrubar a árvore React.
        }
      }
      setLoadState((current) =>
        current.status === 'ready'
          ? current
          : { status: 'loading', doc: PLAYER_LOADING_DOC, generation: current.generation },
      )
      void (async () => {
        if (project.kind === 'pro') {
          if (!published) throw new Error('Este projeto Pro ainda não tem uma revisão publicada.')
          const url = validateIsolatedPreviewUrl(published.url, isolationHostOrigin)
          if (
            studioProPublicationUrl(new URL(url).origin, published.playId, published.revision) !==
            url
          )
            throw new Error('Revisão publicada inválida.')
          if (!ignore)
            setLoadState((current) => ({
              status: 'ready',
              doc: '',
              url,
              generation: current.generation + 1,
            }))
          return
        }
        const nextDoc = await renderProjectToPreviewDocAsync(project, {
          parentOrigin: resolvedParentOrigin || undefined,
          securityProfile,
        })
        let nextUrl: string | undefined
        if (originAdapter) {
          const candidate = await originAdapter.createPreviewUrl({
            project,
            document: nextDoc,
            signal: abortController.signal,
          })
          try {
            nextUrl = validateIsolatedPreviewUrl(candidate, isolationHostOrigin)
          } catch (error) {
            release(candidate)
            throw error
          }
          if (ignore) {
            release(nextUrl)
            return
          }
          activeUrl = nextUrl
        }
        if (ignore) return
        setLoadState((current) => ({
          status: 'ready',
          doc: nextDoc,
          url: nextUrl,
          generation: current.generation + 1,
        }))
      })().catch(() => {
        if (ignore) return
        onErrorRef.current?.()
        setLoadState((current) => ({
          status: 'error',
          doc: PLAYER_ERROR_DOC,
          generation: current.generation + 1,
        }))
      })
      return () => {
        ignore = true
        abortController.abort()
        if (activeUrl) release(activeUrl)
      }
    }, [project, parentOrigin, securityProfile, originAdapter, published])

    const loading =
      loadState.status === 'loading' ||
      (project.kind === 'pro' &&
        loadState.status === 'ready' &&
        confirmedProGeneration !== loadState.generation)
    const statusMessage = loading
      ? 'Carregando o motor do jogo…'
      : loadState.status === 'ready'
        ? 'Jogo pronto.'
        : 'Não foi possível carregar o motor deste jogo.'

    return (
      <>
        <iframe
          // Cada documento nasce em um elemento novo; não reescreva o srcDoc de
          // um iframe que ainda pode estar concluindo a navegação anterior.
          key={loadState.generation}
          ref={assignFrame}
          name={project.kind === 'pro' ? storageName : undefined}
          referrerPolicy="no-referrer"
          tabIndex={tabIndex}
          title={title ?? project.name ?? 'Projeto'}
          src={loadState.url}
          srcDoc={loadState.url ? undefined : loadState.doc}
          aria-busy={loading}
          onLoad={() => {
            if (loadState.status === 'ready' && project.kind !== 'pro') onReady?.()
          }}
          // Mesmo sandbox do preview vivo do editor. Pointer Lock habilita a câmera FPS;
          // NUNCA adicionar `allow-same-origin`.
          sandbox="allow-scripts allow-modals allow-pointer-lock"
          // Libera a Fullscreen API do jogo (blocos de "tela cheia") no player público.
          // Só `allow` (o `allowFullScreen` booleano é redundante e gera warning no console).
          allow="fullscreen"
          className={className}
          style={{ width: '100%', height: '100%', border: 0, background: '#fff', ...style }}
        />
        <span role="status" aria-live="polite" aria-atomic="true" style={PLAYER_STATUS_STYLE}>
          {statusMessage}
        </span>
      </>
    )
  },
)
