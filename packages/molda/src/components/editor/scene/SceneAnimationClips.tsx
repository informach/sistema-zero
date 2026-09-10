import { useSyncExternalStore } from 'react'
import { COPY } from '../../../core/copy'
import {
  createSceneAnimation,
  deleteSceneAnimation,
  duplicateSceneAnimation,
  renameSceneAnimation,
} from '../../../scene/animationCommands'
import { Button } from '../../ui/Button'
import { SceneAnimationPresets } from './SceneAnimationPresets'
import { SCENE_APPEARANCE_FIELD as field } from './sceneAppearanceForm'
import type { useSceneWorkshop } from './useSceneWorkshop'

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
  function choose(id: string | null) {
    try {
      animation.setClip(id ? editor.getState().asset : null, id)
    } catch (error) {
      animation.reportError(error)
    }
  }
  return (
    <section
      aria-label={copy.animationTitle}
      className="flex flex-wrap items-end gap-2 border-b border-mld-border p-3"
    >
      {!!document.animations?.length && (
        <label className="min-w-40 flex-1 space-y-1 text-sm">
          <span>{copy.animationChoose}</span>
          <select
            name="animationClip"
            className={field}
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
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          const name = new FormData(event.currentTarget).get('animationName')
          const next = run((source) => createSceneAnimation(source, String(name ?? '')))
          if (next) choose(next.animations!.at(-1)!.id)
        }}
      >
        <label className="space-y-1 text-sm">
          <span>{copy.animationName}</span>
          <input
            className={field}
            name="animationName"
            maxLength={48}
            required
            defaultValue={copy.animationNewName}
          />
        </label>
        <Button type="submit" variant="primary" className="text-sm">
          {copy.animationCreate}
        </Button>
      </form>
      {clip && (
        <>
          <Button
            className="text-sm"
            onClick={() => {
              const next = run((source) =>
                duplicateSceneAnimation(source, clip.id, copy.animationCopyName(clip.name)),
              )
              if (next) choose(next.animations!.at(-1)!.id)
            }}
          >
            {copy.animationDuplicate}
          </Button>
          <Button
            className="text-sm"
            onClick={() => {
              const next = run((source) => deleteSceneAnimation(source, clip.id))
              if (next) choose(next.animations?.[0]?.id ?? null)
            }}
          >
            {copy.animationDelete}
          </Button>
          <details className="w-full">
            <summary className="flex min-h-11 cursor-pointer items-center text-sm font-bold">
              {copy.animationRename}
            </summary>
            <form
              key={JSON.stringify([clip.id, clip.name])}
              className="flex gap-2"
              onSubmit={(event) => {
                event.preventDefault()
                const name = new FormData(event.currentTarget).get('name')
                run((source) => renameSceneAnimation(source, clip.id, String(name ?? '')))
              }}
            >
              <label className="flex-1">
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
        </>
      )}
      <SceneAnimationPresets workshop={workshop} />
    </section>
  )
}
