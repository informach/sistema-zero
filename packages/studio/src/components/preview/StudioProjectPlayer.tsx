import type { CSSProperties, JSX } from 'react'
import { useMemo } from 'react'
import type { Project } from '#core'
import { renderProjectToPreviewDoc } from '#preview'

export interface StudioProjectPlayerProps {
  /** Projeto auto-suficiente (assets embutidos) — o que será JOGADO. */
  project: Project
  /** Origem do host para o targetOrigin dos interceptors (defesa em profundidade). */
  parentOrigin?: string
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
 */
export function StudioProjectPlayer({
  project,
  parentOrigin,
  title,
  className,
  style,
}: StudioProjectPlayerProps): JSX.Element {
  const doc = useMemo(
    () =>
      renderProjectToPreviewDoc(project, {
        parentOrigin:
          parentOrigin ?? (typeof window !== 'undefined' ? window.location.origin : undefined),
      }),
    [project, parentOrigin],
  )

  return (
    <iframe
      title={title ?? project.name ?? 'Projeto'}
      srcDoc={doc}
      // Mesmo sandbox do preview vivo do editor. NUNCA `allow-same-origin`.
      sandbox="allow-scripts allow-modals"
      // Libera a Fullscreen API do jogo (blocos de "tela cheia") no player público.
      // Só `allow` (o `allowFullScreen` booleano é redundante e gera warning no console).
      allow="fullscreen"
      className={className}
      style={{ width: '100%', height: '100%', border: 0, background: '#fff', ...style }}
    />
  )
}
