/**
 * "Gerenciar paletas": renomear e excluir da BIBLIOTECA. Excluir nunca toca um
 * desenho (a paleta usada fica EMBUTIDA no asset; e no vetor a escolha é
 * snapshot de sessão) — por isso a exclusão é leve: 1º toque ARMA no próprio
 * botão, 2º confirma (padrão da compra em 2 toques do kids), sem Dialog de
 * confirmação em cima de Dialog.
 */
import type { JSX } from 'react'
import { useState } from 'react'
import { useStore } from 'zustand'
import { COPY } from '../../core/copy'
import { TRANSPARENT_INDEX } from '../../core/palette'
import { usePintaApp } from '../appContext'
import { Button, ToolButton } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { Pencil, Trash2 } from '../ui/icons'

export function ManagePalettesDialog({
  open,
  onClose,
}: {
  open: boolean
  onClose(): void
}): JSX.Element | null {
  const { paletteLibrary } = usePintaApp()
  const palettes = useStore(paletteLibrary, (state) => state.palettes)
  const [renameId, setRenameId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [armedDeleteId, setArmedDeleteId] = useState<string | null>(null)
  if (!open) return null

  const renameTarget = palettes.find((p) => p.id === renameId) ?? null

  return (
    <>
      <Dialog open={open} onClose={onClose} title={COPY.palette.managePalettes}>
        {palettes.length === 0 ? (
          <p className="text-pin-muted text-sm">{COPY.palette.manageEmpty}</p>
        ) : (
          <>
            <p className="mb-3 text-pin-muted text-sm">{COPY.palette.manageDeleteNote}</p>
            <ul className="flex max-h-72 flex-col gap-1 overflow-y-auto">
              {palettes.map((palette) => {
                const armed = armedDeleteId === palette.id
                return (
                  <li key={palette.id} className="flex min-h-11 items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="flex h-2.5 min-w-0 flex-1 overflow-hidden rounded-full"
                    >
                      {palette.colors.map((hex, i) =>
                        i === TRANSPARENT_INDEX || !hex ? null : (
                          <span
                            key={hex + String(i)}
                            className="h-full flex-1"
                            style={{ background: hex }}
                          />
                        ),
                      )}
                    </span>
                    <span className="min-w-0 shrink-0 truncate font-bold text-pin-text text-sm">
                      {palette.name}
                    </span>
                    <ToolButton
                      icon={Pencil}
                      label={COPY.palette.manageRename(palette.name)}
                      onClick={() => {
                        setRenameId(palette.id)
                        setRenameValue(palette.name)
                        setArmedDeleteId(null)
                      }}
                    />
                    <ToolButton
                      icon={Trash2}
                      label={
                        armed
                          ? COPY.palette.manageDeleteArm(palette.name)
                          : COPY.palette.manageDelete(palette.name)
                      }
                      className={armed ? 'text-pin-danger ring-2 ring-pin-danger' : ''}
                      onClick={() => {
                        if (!armed) {
                          setArmedDeleteId(palette.id)
                          return
                        }
                        setArmedDeleteId(null)
                        void paletteLibrary.getState().removePalette(palette.id)
                      }}
                    />
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </Dialog>
      <Dialog
        open={renameTarget !== null}
        onClose={() => setRenameId(null)}
        title={COPY.gallery.rename}
      >
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            if (renameId && renameValue.trim()) {
              void paletteLibrary.getState().renamePalette(renameId, renameValue)
            }
            setRenameId(null)
          }}
        >
          <input
            name="pinta-palette-rename"
            autoComplete="off"
            value={renameValue}
            onChange={(event) => setRenameValue(event.target.value)}
            aria-label={COPY.palette.paletteNameLabel}
            className="min-h-11 rounded-xl border-2 border-pin-border bg-pin-bg px-4 text-base outline-none focus:border-pin-accent"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setRenameId(null)}>
              {COPY.gallery.cancel}
            </Button>
            <Button type="submit" variant="primary">
              {COPY.gallery.rename}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  )
}
