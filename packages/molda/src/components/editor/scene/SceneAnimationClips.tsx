import { useState, useSyncExternalStore } from 'react'
import { COPY } from '../../../core/copy'
import {
  createSceneAnimation,
  deleteSceneAnimation,
  duplicateSceneAnimation,
  renameSceneAnimation,
} from '../../../scene/animationCommands'
import { useMoldaToolAccess } from '../../toolAccess'
import { Clapperboard, Copy, MoreHorizontal, Play, Plus, Repeat, Trash2 } from '../../ui/icons'
import { SceneAnimationPresets } from './SceneAnimationPresets'
import type { useSceneWorkshop } from './useSceneWorkshop'

/** Creating an empty movement never changes the scene's hierarchy or selection. */
export function SceneAnimationClips({
  workshop,
}: {
  workshop: ReturnType<typeof useSceneWorkshop>
}) {
  const { animation, document, editor, run } = workshop
  const source = useSyncExternalStore(
    animation.subscribe,
    () => animation.getSnapshot().source,
    () => null,
  )
  const [renaming, setRenaming] = useState<string | null>(null)
  const create = useMoldaToolAccess().can('animate.create'),
    copy = COPY.scene
  function choose(id: string | null) {
    workshop.requestTransition(() => {
      try {
        animation.setClip(id ? editor.getState().content : null, id)
      } catch (error) {
        animation.reportError(error)
      }
    })
  }
  return (
    <section aria-label={copy.animationTitle} className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="mld-kicker">Movimentos</h3>
        {create && (
          <button
            type="button"
            className="sz-tool-pill sz-tool-pill--quiet px-2 text-xs"
            aria-label={copy.animationCreate}
            onClick={() =>
              workshop.requestTransition(() => {
                const current = editor.getState().content
                let number = 1
                while (current.animations?.some((clip) => clip.name === `Movimento ${number}`))
                  number++
                const next = run((document) =>
                  createSceneAnimation(document, `Movimento ${number}`),
                )
                if (next) choose(next.animations!.at(-1)!.id)
              })
            }
          >
            <Plus aria-hidden="true" className="size-4" />
            Novo
          </button>
        )}
      </div>
      <section className="space-y-1" aria-label={copy.animationChoose}>
        {document.animations?.map((clip) => (
          <div key={clip.id} className="mld-movement-row" data-active={source?.clip.id === clip.id}>
            {renaming === clip.id ? (
              <form
                className="min-w-0 flex-1"
                onSubmit={(event) => {
                  event.preventDefault()
                  const name = String(new FormData(event.currentTarget).get('name') ?? '')
                  const next = run((source) => renameSceneAnimation(source, clip.id, name))
                  if (next) setRenaming(null)
                }}
              >
                <input
                  name="name"
                  aria-label={copy.animationRename}
                  defaultValue={clip.name}
                  required
                  maxLength={48}
                  className="w-full rounded border border-mld-border bg-mld-surface px-2 py-2 text-sm"
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') {
                      event.stopPropagation()
                      setRenaming(null)
                    }
                  }}
                />
                <button type="submit" className="text-xs font-bold">
                  Salvar nome
                </button>
              </form>
            ) : (
              <button
                type="button"
                className="mld-movement-choice"
                aria-label={`Escolher movimento ${clip.name}`}
                aria-pressed={source?.clip.id === clip.id}
                title={`${clip.tracks.reduce((sum, track) => sum + track.keys.length, 0)} poses${clip.loop ? ' · repetir' : ''}`}
                onClick={() => choose(clip.id)}
                onDoubleClick={() => {
                  if (create) workshop.requestTransition(() => setRenaming(clip.id))
                }}
              >
                {source?.clip.id === clip.id ? (
                  <Play aria-hidden="true" className="size-4 shrink-0" />
                ) : (
                  <Clapperboard aria-hidden="true" className="size-4 shrink-0" />
                )}
                <span className="min-w-0 truncate text-sm font-bold">{clip.name}</span>
                {clip.loop && (
                  <Repeat aria-label="Repetir" className="size-3 shrink-0 text-mld-muted" />
                )}
                <span className="ml-auto shrink-0 text-xs text-mld-muted">
                  {clip.duration.toLocaleString('pt-BR')} s
                </span>
              </button>
            )}
            {create && (
              <details className="relative shrink-0">
                <summary
                  className="mld-movement-options list-none [&::-webkit-details-marker]:hidden"
                  aria-label={`Opções de ${clip.name}`}
                >
                  <MoreHorizontal aria-hidden="true" />
                </summary>
                <div className="mld-movement-menu">
                  <button
                    type="button"
                    onClick={() => workshop.requestTransition(() => setRenaming(clip.id))}
                  >
                    Renomear
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      workshop.requestTransition(() => {
                        const next = run((source) =>
                          duplicateSceneAnimation(
                            source,
                            clip.id,
                            copy.animationCopyName(clip.name),
                          ),
                        )
                        if (next) choose(next.animations!.at(-1)!.id)
                      })
                    }
                  >
                    <Copy aria-hidden="true" />
                    {copy.animationDuplicate}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      workshop.requestTransition(() => {
                        const next = run((source) => deleteSceneAnimation(source, clip.id))
                        if (next && source?.clip.id === clip.id)
                          choose(next.animations?.[0]?.id ?? null)
                      })
                    }
                  >
                    <Trash2 aria-hidden="true" />
                    {copy.animationDelete}
                  </button>
                </div>
              </details>
            )}
          </div>
        ))}
        {!document.animations?.length && (
          <p className="text-sm text-mld-muted">Crie um movimento e marque a primeira pose.</p>
        )}
      </section>
      {create && <SceneAnimationPresets workshop={workshop} />}
    </section>
  )
}
