/**
 * "Vestir a peça com uma textura": escolhe uma textura da galeria e o modo
 * (repetir ou esticar) e veste TODAS as faces da peça selecionada. É um bake
 * (copia os pixels para as peles; apagar a textura depois não afeta o modelo),
 * num commit só.
 */
import { clsx } from 'clsx'
import type { JSX } from 'react'
import { useState } from 'react'
import { COPY } from '../../../core/copy'
import type { MoldaTextureAsset } from '../../../core/model'
import type { ApplyMode } from '../../../texture/ops'
import { useGallery } from '../../appContext'
import { TextureThumb } from '../../gallery/thumbs'
import { Button } from '../../ui/Button'
import { Dialog } from '../../ui/Dialog'

export function ApplyTextureDialog({
  open,
  onClose,
  onApply,
}: {
  open: boolean
  onClose: () => void
  onApply: (texture: MoldaTextureAsset, mode: ApplyMode) => void
}): JSX.Element | null {
  const assets = useGallery((state) => state.assets)
  const textures = assets.filter((asset): asset is MoldaTextureAsset => asset.kind === 'texture')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [mode, setMode] = useState<ApplyMode>('tile')
  const copy = COPY.editor.model.paint.apply
  const selected = textures.find((texture) => texture.id === selectedId) ?? null

  return (
    <Dialog open={open} onClose={onClose} title={copy.title} wide>
      {textures.length === 0 ? (
        <p className="text-base text-mld-text-soft">{copy.empty}</p>
      ) : (
        <>
          <ul
            aria-label={copy.pick}
            className="grid grid-cols-[repeat(auto-fill,minmax(6rem,1fr))] gap-2"
          >
            {textures.map((texture) => {
              const active = texture.id === selectedId
              return (
                <li key={texture.id}>
                  <button
                    type="button"
                    aria-pressed={active}
                    aria-label={texture.name}
                    onClick={() => setSelectedId(texture.id)}
                    className={clsx(
                      'flex w-full flex-col items-center gap-1 rounded-xl border-2 p-2 text-xs font-bold transition',
                      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mld-accent',
                      active
                        ? 'border-mld-accent bg-mld-accent/10'
                        : 'border-mld-border hover:border-mld-accent',
                    )}
                  >
                    <span className="mld-checkerboard size-16 overflow-hidden rounded-lg">
                      <TextureThumb asset={texture} />
                    </span>
                    <span className="w-full truncate text-mld-text">{texture.name}</span>
                  </button>
                </li>
              )
            })}
          </ul>
          <fieldset className="mt-4 flex items-center gap-2">
            <legend className="text-sm font-bold text-mld-text">{copy.modeLabel}</legend>
            {(['tile', 'stretch'] as ApplyMode[]).map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={mode === item}
                onClick={() => setMode(item)}
                className={clsx(
                  'min-h-11 rounded-full border-2 px-4 text-sm font-bold transition',
                  mode === item
                    ? 'border-mld-accent bg-mld-accent text-mld-accent-fg'
                    : 'border-mld-border bg-mld-surface text-mld-text hover:border-mld-accent',
                )}
              >
                {item === 'tile' ? copy.modeTile : copy.modeStretch}
              </button>
            ))}
          </fieldset>
        </>
      )}
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          {COPY.gallery.cancel}
        </Button>
        <Button
          variant="primary"
          disabled={!selected}
          onClick={() => {
            if (selected) onApply(selected, mode)
          }}
        >
          {copy.apply}
        </Button>
      </div>
    </Dialog>
  )
}
