import type { CSSProperties, JSX, Ref } from 'react'
import { forwardRef, useEffect, useState } from 'react'
import type { Project } from '#core'
import { renderProjectToPreviewDocAsync } from '#preview'
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
  /** Título acessível do iframe (default = `project.name`). */
  title?: string
  className?: string
  style?: CSSProperties
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
export const StudioProjectPlayer = forwardRef<HTMLIFrameElement, StudioProjectPlayerProps>(
  function StudioProjectPlayer(
    {
      project,
      parentOrigin,
      securityProfile = 'strict',
      originAdapter,
      title,
      className,
      style,
    }: StudioProjectPlayerProps,
    ref: Ref<HTMLIFrameElement>,
  ): JSX.Element {
    const [loadState, setLoadState] = useState<PlayerLoadState>({
      status: 'loading',
      doc: PLAYER_LOADING_DOC,
      generation: 0,
    })
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
    }, [project, parentOrigin, securityProfile, originAdapter])

    const statusMessage =
      loadState.status === 'loading'
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
          ref={ref}
          title={title ?? project.name ?? 'Projeto'}
          src={loadState.url}
          srcDoc={loadState.url ? undefined : loadState.doc}
          aria-busy={loadState.status === 'loading'}
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
