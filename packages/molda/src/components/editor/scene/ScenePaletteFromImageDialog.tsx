import { useEffect, useRef, useState } from 'react'
import { MOLDA_LIMITS } from '../../../core/limits'
import { MAX_CUSTOM_PALETTE_SIZE } from '../../../core/palette'
import { decodeLocalRaster } from '../../../import/decodeLocalRaster'
import { paletteFromRgba } from '../../../import/paletteFromImage'
import { Button } from '../../ui/Button'
import { Dialog } from '../../ui/Dialog'
import { SceneRasterFileInput } from './SceneRasterFileInput'

export function ScenePaletteFromImageDialog({
  onClose,
  onCreate,
}: {
  onClose(): void
  onCreate(name: string, colors: string[]): Promise<boolean>
}) {
  const pending = useRef<AbortController | null>(null)
  const [colors, setColors] = useState<string[] | null>(null)
  const [name, setName] = useState('')
  const [reading, setReading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => () => pending.current?.abort(), [])

  async function choose(file: File) {
    pending.current?.abort()
    const controller = new AbortController()
    pending.current = controller
    setReading(true)
    setColors(null)
    setMessage('')
    try {
      const decoded = await decodeLocalRaster(file, controller.signal)
      try {
        const canvas = document.createElement('canvas')
        canvas.width = decoded.width
        canvas.height = decoded.height
        const context = canvas.getContext('2d', { willReadFrequently: true })
        if (!context) throw new Error('canvas')
        context.drawImage(decoded.image, 0, 0)
        const extracted = paletteFromRgba(
          context.getImageData(0, 0, canvas.width, canvas.height).data,
        )
        if (!extracted.some(Boolean)) {
          setMessage('Não encontrei cores nessa imagem. Tente outra.')
          return
        }
        setColors(extracted)
      } finally {
        decoded.dispose()
      }
    } catch {
      if (!controller.signal.aborted)
        setMessage('Não foi possível ler essa imagem. Escolha um PNG ou JPEG menor.')
    } finally {
      if (pending.current === controller) {
        pending.current = null
        setReading(false)
      }
    }
  }

  async function create() {
    if (!colors) return
    setSaving(true)
    const success = await onCreate(name.trim() || 'Minha paleta', colors)
    setSaving(false)
    if (success) onClose()
    else setMessage('Não foi possível guardar a paleta neste navegador.')
  }

  return (
    <Dialog open title="Cores de uma imagem" onClose={onClose}>
      <div className="space-y-3">
        <p className="text-sm text-mld-muted">
          Escolha uma imagem. O Molda encontra até 32 cores para sua paleta.
        </p>
        <SceneRasterFileInput name="paletteImage" disabled={reading || saving} onChoose={choose} />
        {colors && (
          <>
            <p className="text-sm font-bold">
              Cores encontradas: {colors.filter(Boolean).length}/{MAX_CUSTOM_PALETTE_SIZE - 1}
            </p>
            <div className="grid max-h-52 grid-cols-8 gap-1 overflow-y-auto">
              {colors
                .slice(1)
                .filter(Boolean)
                .map((color) => (
                  <span
                    key={color}
                    title={color}
                    className="size-8 rounded-md border border-mld-border"
                    style={{ backgroundColor: color }}
                  />
                ))}
            </div>
            <label className="block space-y-1 text-sm font-bold">
              <span>Nome da paleta</span>
              <input
                name="imagePaletteName"
                value={name}
                maxLength={MOLDA_LIMITS.maxNameChars}
                placeholder="Minha paleta"
                onChange={(event) => setName(event.target.value)}
                className="min-h-11 w-full rounded-xl border-2 border-mld-border bg-mld-surface px-3 text-base"
              />
            </label>
          </>
        )}
        {message && (
          <p role="alert" className="text-sm text-mld-danger">
            {message}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            disabled={!colors || reading || saving}
            onClick={() => void create()}
          >
            Criar e usar
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
