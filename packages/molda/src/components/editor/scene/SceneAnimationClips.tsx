import { useSyncExternalStore } from 'react'
import { COPY } from '../../../core/copy'
import {
  createSceneAnimation,
  deleteSceneAnimation,
  duplicateSceneAnimation,
  renameSceneAnimation,
} from '../../../scene/animationCommands'
import { prepareSceneAnimationTarget } from '../../../scene/animationTarget'
import { keepSceneThumb } from '../../../scene/documentContent'
import { useMoldaToolAccess } from '../../toolAccess'
import { Button } from '../../ui/Button'
import { Copy, Pencil, Plus, Trash2 } from '../../ui/icons'
import { SceneAnimationPresets } from './SceneAnimationPresets'
import { SCENE_APPEARANCE_FIELD as field } from './sceneAppearanceForm'
import type { useSceneWorkshop } from './useSceneWorkshop'

/** O campo da barra da aba: pílula clara com a altura dos botões da barra. */
const BAR_FIELD =
  'min-h-11 w-full rounded-full border border-mld-border bg-mld-surface px-3 text-sm text-mld-text focus-visible:outline-2 focus-visible:outline-mld-accent'

/**
 * Movimentos no painel direito: alvo explícito, criação direta e opções de gerenciamento.
 */
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
  const clip = document.animations?.find((clip) => clip.id === source?.clip.id)
  const copy = COPY.scene
  // Escolher e reproduzir um movimento é leitura, sempre livre; criar, copiar, apagar, renomear
  // e os movimentos prontos são `animate.create`.
  const create = useMoldaToolAccess().can('animate.create')
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
    <section
      aria-label={copy.animationTitle}
      className="flex flex-wrap items-end gap-2 border-b border-mld-border pb-3"
    >
      {!!document.animations?.length && (
        <label className="w-full min-w-0 space-y-1 text-sm">
          <span className="mld-kicker block">{copy.animationChoose}</span>
          <select
            name="animationClip"
            className={BAR_FIELD}
            value={clip?.id ?? ''}
            onChange={(event) => choose(event.target.value || null)}
          >
            <option value="">{copy.animationChoose}</option>
            {document.animations.map((clip) => (
              <option key={clip.id} value={clip.id}>
                {clip.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {create && (
        <details className="mld-disclosure w-full" open={!clip}>
          <summary>Criar ou gerenciar movimentos</summary>
          <div className="space-y-3">
            <fieldset className="w-full space-y-1">
              <legend className="text-sm font-bold">O que vai se mexer?</legend>
              <div className="grid grid-cols-2 gap-1">
                <Button
                  className="px-2 text-sm"
                  aria-pressed={workshop.animationTarget === 'piece'}
                  onClick={() => workshop.setAnimationTarget('piece')}
                >
                  Esta peça
                </Button>
                <Button
                  className="px-2 text-sm"
                  aria-pressed={workshop.animationTarget === 'model'}
                  onClick={() => workshop.setAnimationTarget('model')}
                >
                  Modelo inteiro
                </Button>
              </div>
              <p className="text-xs text-mld-muted">
                {workshop.animationTarget === 'piece'
                  ? (workshop.primary?.name ?? 'Escolha uma peça ou conjunto.')
                  : 'As peças vão se mover juntas.'}
              </p>
            </fieldset>
            <Button
              variant="primary"
              className="w-full text-sm"
              disabled={workshop.animationTarget === 'piece' && workshop.selected.length !== 1}
              onClick={() =>
                workshop.requestTransition(() => {
                  try {
                    const current = editor.getState().content
                    const target = prepareSceneAnimationTarget(
                      current,
                      workshop.selected,
                      workshop.animationTarget,
                    )
                    let number = 1
                    while (current.animations?.some((clip) => clip.name === `Movimento ${number}`))
                      number++
                    const next = run((source) =>
                      keepSceneThumb(
                        createSceneAnimation(target.document, `Movimento ${number}`),
                        source,
                      ),
                    )
                    if (next) {
                      choose(next.animations!.at(-1)!.id)
                      workshop.selectMany(target.ids, false)
                      workshop.setTool('move')
                    }
                  } catch (error) {
                    workshop.setMessage(error instanceof Error ? error.message : copy.commandFailed)
                  }
                })
              }
            >
              <Plus aria-hidden="true" className="size-4" />
              {copy.animationCreate}
            </Button>
            {create && clip && (
              <div className="flex items-end gap-1.5">
                <details className="relative">
                  <summary className="sz-tool-icon-btn list-none [&::-webkit-details-marker]:hidden">
                    <Pencil aria-hidden="true" />
                    <span className="sr-only">{copy.animationRename}</span>
                  </summary>
                  <form
                    key={JSON.stringify([clip.id, clip.name])}
                    className="mt-2 flex w-full flex-wrap items-end gap-2 rounded-lg border border-mld-border p-2"
                    onSubmit={(event) => {
                      event.preventDefault()
                      const name = new FormData(event.currentTarget).get('name')
                      run((source) => renameSceneAnimation(source, clip.id, String(name ?? '')))
                    }}
                  >
                    <label className="min-w-0 flex-1">
                      <span className="sr-only">{copy.animationRename}</span>
                      <input
                        name="name"
                        defaultValue={clip.name}
                        required
                        maxLength={48}
                        className={field}
                      />
                    </label>
                    <Button type="submit" className="text-sm">
                      {copy.animationRename}
                    </Button>
                  </form>
                </details>
                <button
                  type="button"
                  className="sz-tool-icon-btn"
                  aria-label={copy.animationDuplicate}
                  title={copy.animationDuplicate}
                  onClick={() =>
                    workshop.requestTransition(() => {
                      const next = run((source) =>
                        duplicateSceneAnimation(source, clip.id, copy.animationCopyName(clip.name)),
                      )
                      if (next) choose(next.animations!.at(-1)!.id)
                    })
                  }
                >
                  <Copy aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="sz-tool-icon-btn hover:text-mld-danger"
                  aria-label={copy.animationDelete}
                  title={copy.animationDelete}
                  onClick={() =>
                    workshop.requestTransition(() => {
                      const next = run((source) => deleteSceneAnimation(source, clip.id))
                      if (next) choose(next.animations?.[0]?.id ?? null)
                    })
                  }
                >
                  <Trash2 aria-hidden="true" />
                </button>
              </div>
            )}
            {create && (
              <div className="sm:ml-auto">
                <SceneAnimationPresets workshop={workshop} />
              </div>
            )}
          </div>
        </details>
      )}
    </section>
  )
}
