/**
 * "Cores de uma imagem": um print de paleta vira uma paleta PERSONALIZADA
 * (não anexa mais nada a `extraColors` — esse era o comportamento antigo do
 * "Trazer uma foto", que segue intocado para importar DESENHOS).
 *
 * Carregado LAZY pelo consumidor (padrão LazyImportImageDialog): o decoder e o
 * quantizador só entram quando a criança abre este diálogo.
 */
import type { JSX } from 'react'
import { useRef, useState } from 'react'
import { COPY } from '../../core/copy'
import { TRANSPARENT_INDEX } from '../../core/palette'
import { PINTA_LIMITS } from '../../core/project'
import { decodeImageFile, IMPORT_ACCEPT, MAX_IMAGE_FILE_BYTES } from '../../import/decodeImage'
import { paletteColorsFromImage } from '../../import/paletteFromImage'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { Image as ImageIcon } from '../ui/icons'
import { useToast } from '../ui/Toast'

export function PaletteFromImageDialog({
  open,
  onClose,
  onCreate,
}: {
  open: boolean
  onClose(): void
  onCreate(name: string, colors: string[]): void
}): JSX.Element | null {
  const { showToast } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState('')
  const [colors, setColors] = useState<string[] | null>(null)
  const [reading, setReading] = useState(false)
  if (!open) return null

  async function handleFile(file: File): Promise<void> {
    if (file.size > MAX_IMAGE_FILE_BYTES) {
      showToast(COPY.gallery.importTooLarge)
      return
    }
    setReading(true)
    try {
      const decoded = await decodeImageFile(file)
      if (!decoded) {
        showToast(COPY.gallery.importDecodeError)
        return
      }
      const extracted = paletteColorsFromImage(decoded)
      if (extracted.every((c) => c === '')) {
        showToast(COPY.palette.fromImageEmpty)
        return
      }
      setColors(extracted)
    } finally {
      setReading(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={COPY.palette.paletteFromImage}>
      <div className="flex flex-col gap-3">
        <p className="text-pin-muted text-sm">{COPY.palette.fromImageHint}</p>
        <input
          ref={fileRef}
          type="file"
          accept={IMPORT_ACCEPT}
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void handleFile(file)
            event.target.value = ''
          }}
        />
        <Button
          variant="ghost"
          disabled={reading}
          aria-busy={reading}
          onClick={() => fileRef.current?.click()}
        >
          <ImageIcon aria-hidden="true" className="size-4" />
          {COPY.palette.fromImagePick}
        </Button>
        {colors ? (
          <>
            <p className="font-bold text-pin-text text-sm">{COPY.palette.fromImagePreview}</p>
            <div className="grid grid-cols-5 justify-items-center gap-1 p-0.5">
              {colors.map((hex, index) =>
                index === TRANSPARENT_INDEX || !hex ? null : (
                  <span
                    key={hex + String(index)}
                    aria-hidden="true"
                    title={hex}
                    className="size-11 shrink-0 rounded-md border-2 border-pin-border"
                    style={{ backgroundColor: hex }}
                  />
                ),
              )}
            </div>
            <label className="flex flex-col gap-1">
              <span className="font-bold text-pin-text text-sm">
                {COPY.palette.paletteNameLabel}
              </span>
              <input
                name="pinta-palette-from-image-name"
                autoComplete="off"
                value={name}
                maxLength={PINTA_LIMITS.maxNameChars}
                onChange={(event) => setName(event.target.value)}
                placeholder={COPY.palette.paletteNamePlaceholder}
                className="min-h-11 rounded-xl border-2 border-pin-border bg-pin-bg px-4 text-base outline-none focus:border-pin-accent"
              />
            </label>
          </>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            {COPY.gallery.cancel}
          </Button>
          <Button
            variant="primary"
            disabled={!colors}
            onClick={() => {
              if (!colors) return
              onCreate(name.trim() || COPY.a11y.customPaletteName, colors)
            }}
          >
            {COPY.palette.createConfirm}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
