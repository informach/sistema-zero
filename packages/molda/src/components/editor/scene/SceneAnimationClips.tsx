import { useSyncExternalStore } from 'react'
import { COPY } from '../../../core/copy'
import {
  createSceneAnimation,
  deleteSceneAnimation,
  duplicateSceneAnimation,
  renameSceneAnimation,
} from '../../../scene/animationCommands'
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
 * Os movimentos da criação, na BARRA DA ABA do Animar (a tela-modelo, 11/09/2026): o movimento
 * escolhido, o nome do novo e "Criar movimento", renomear, copiar e excluir só com o ícone, e o
 * "Experimentar um movimento pronto" em amarelo no fim da barra. Os nomes são os de sempre: os
 * rótulos vão em `aria-label` e no texto escondido.
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
    try {
      animation.setClip(id ? editor.getState().content : null, id)
    } catch (error) {
      animation.reportError(error)
    }
  }
  return (
    <section aria-label={copy.animationTitle} className="flex flex-wrap items-end gap-x-3 gap-y-2">
      {!!document.animations?.length && (
        <label className="w-44 min-w-0 space-y-1 text-sm">
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
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            const name = new FormData(event.currentTarget).get('animationName')
            const next = run((source) => createSceneAnimation(source, String(name ?? '')))
            if (next) choose(next.animations!.at(-1)!.id)
          }}
        >
          <label className="w-44 min-w-0 space-y-1 text-sm">
            <span className="mld-kicker block">{copy.animationName}</span>
            <input
              className={BAR_FIELD}
              name="animationName"
              maxLength={48}
              required
              defaultValue={copy.animationNewName}
            />
          </label>
          <button type="submit" className="sz-tool-pill sz-tool-pill--primary text-sm">
            <Plus aria-hidden="true" />
            {copy.animationCreate}
          </button>
        </form>
      )}
      {create && clip && (
        <div className="flex items-end gap-1.5">
          <details className="relative">
            <summary className="sz-tool-icon-btn list-none [&::-webkit-details-marker]:hidden">
              <Pencil aria-hidden="true" />
              <span className="sr-only">{copy.animationRename}</span>
            </summary>
            <form
              key={JSON.stringify([clip.id, clip.name])}
              className="mld-drop top-full left-0 mt-2 w-72 flex-row items-end gap-2"
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
            onClick={() => {
              const next = run((source) =>
                duplicateSceneAnimation(source, clip.id, copy.animationCopyName(clip.name)),
              )
              if (next) choose(next.animations!.at(-1)!.id)
            }}
          >
            <Copy aria-hidden="true" />
          </button>
          <button
            type="button"
            className="sz-tool-icon-btn hover:text-mld-danger"
            aria-label={copy.animationDelete}
            title={copy.animationDelete}
            onClick={() => {
              const next = run((source) => deleteSceneAnimation(source, clip.id))
              if (next) choose(next.animations?.[0]?.id ?? null)
            }}
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
    </section>
  )
}
