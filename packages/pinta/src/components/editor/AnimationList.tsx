/**
 * Lista de animações do sprite (coluna direita): selecionar, criar, renomear,
 * duplicar e apagar. Toda mutação passa pelos helpers puros de
 * `animation/frames.ts` e vira commit (undoable) no editorStore.
 */
import type { JSX } from 'react'
import { useState } from 'react'
import {
  addAnimation,
  duplicateAnimation,
  removeAnimation,
  renameAnimation,
} from '../../animation/frames'
import { activeAnimationOf } from '../../core/assetEdit'
import { COPY } from '../../core/copy'
import { type AnimatedSpriteAsset, isAnimatedSpriteKind } from '../../core/project'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { useToast } from '../ui/Toast'
import { useEditor, useEditorStores, useSession } from './editorContext'

export function AnimationList(): JSX.Element | null {
  const { editor, session } = useEditorStores()
  const { showToast } = useToast()
  const asset = useEditor((state) => state.asset)
  const animationId = useSession((state) => state.animationId)
  const frameIndex = useSession((state) => state.frameIndex)
  const [renaming, setRenaming] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  if (!isAnimatedSpriteKind(asset)) return null
  const active = activeAnimationOf(asset, { animationId, frameIndex })

  function withSprite(action: (sprite: AnimatedSpriteAsset) => void): void {
    const current = editor.getState().asset
    if (isAnimatedSpriteKind(current)) action(current)
  }

  return (
    <section
      aria-label={COPY.animation.animations}
      className="flex min-h-0 flex-col gap-2 rounded-3xl border-2 border-pin-border bg-pin-surface p-3"
    >
      <span className="text-sm font-bold text-pin-muted">{COPY.animation.animations}</span>
      <div className="flex min-h-0 flex-col gap-1 overflow-y-auto">
        {asset.animations.map((animation) => {
          const selected = animation.id === active?.id
          return (
            <div key={animation.id} className="flex items-center gap-1">
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => session.getState().selectAnimation(animation.id)}
                className={`min-h-11 flex-1 truncate rounded-2xl border-2 px-3 text-left text-sm font-bold transition ${
                  selected
                    ? 'border-pin-accent bg-pin-accent/10'
                    : 'border-pin-border hover:border-pin-accent'
                }`}
                title={animation.name}
              >
                {animation.name}
                <span className="ml-1 font-normal text-pin-muted">({animation.frames.length})</span>
              </button>
              {selected ? (
                <>
                  <button
                    type="button"
                    aria-label={`${COPY.animation.renameAnimation}: ${animation.name}`}
                    title={COPY.animation.renameAnimation}
                    onClick={() => {
                      setRenaming(animation.id)
                      setRenameValue(animation.name)
                    }}
                    className="flex min-h-11 min-w-11 items-center justify-center rounded-2xl transition hover:bg-pin-border/40"
                  >
                    <span aria-hidden="true">✏️</span>
                  </button>
                  <button
                    type="button"
                    aria-label={`${COPY.animation.duplicateAnimation}: ${animation.name}`}
                    title={COPY.animation.duplicateAnimation}
                    onClick={() =>
                      withSprite((sprite) => {
                        const result = duplicateAnimation(sprite, animation.id)
                        if (!result.animationId) {
                          showToast(COPY.animation.animationLimit)
                          return
                        }
                        editor.getState().commit(result.asset)
                        session.getState().selectAnimation(result.animationId)
                      })
                    }
                    className="flex min-h-11 min-w-11 items-center justify-center rounded-2xl transition hover:bg-pin-border/40"
                  >
                    <span aria-hidden="true">🧬</span>
                  </button>
                  {asset.animations.length > 1 ? (
                    <button
                      type="button"
                      aria-label={`${COPY.animation.removeAnimation}: ${animation.name}`}
                      title={COPY.animation.removeAnimation}
                      onClick={() =>
                        withSprite((sprite) => {
                          const next = removeAnimation(sprite, animation.id)
                          if (next === sprite) return
                          editor.getState().commit(next)
                          const first = next.animations[0]
                          if (first) session.getState().selectAnimation(first.id)
                        })
                      }
                      className="flex min-h-11 min-w-11 items-center justify-center rounded-2xl transition hover:bg-pin-danger/20"
                    >
                      <span aria-hidden="true">🗑️</span>
                    </button>
                  ) : null}
                </>
              ) : null}
            </div>
          )
        })}
      </div>
      <Button
        onClick={() =>
          withSprite((sprite) => {
            const result = addAnimation(sprite)
            if (!result.animationId) {
              showToast(COPY.animation.animationLimit)
              return
            }
            editor.getState().commit(result.asset)
            session.getState().selectAnimation(result.animationId)
          })
        }
      >
        ＋ {COPY.animation.addAnimation}
      </Button>

      <Dialog
        open={renaming !== null}
        onClose={() => setRenaming(null)}
        title={COPY.animation.renameAnimation}
      >
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            if (!renaming) return
            withSprite((sprite) => {
              const next = renameAnimation(sprite, renaming, renameValue)
              if (next !== sprite) editor.getState().commit(next)
            })
            setRenaming(null)
          }}
        >
          <input
            value={renameValue}
            onChange={(event) => setRenameValue(event.target.value)}
            aria-label={COPY.animation.renameAnimation}
            className="min-h-11 rounded-2xl border-2 border-pin-border bg-pin-bg px-4 text-base outline-none focus:border-pin-accent"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setRenaming(null)}>
              {COPY.gallery.cancel}
            </Button>
            <Button type="submit" variant="primary">
              {COPY.gallery.rename}
            </Button>
          </div>
        </form>
      </Dialog>
    </section>
  )
}
