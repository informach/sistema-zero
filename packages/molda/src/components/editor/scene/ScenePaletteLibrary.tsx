import { useEffect, useState } from 'react'
import { MOLDA_LIMITS } from '../../../core/limits'
import type { MoldaCustomPalette, MoldaPaletteFields } from '../../../core/model'
import { PALETTE_SIZE, PALETTES } from '../../../core/palette'
import { sanitizeCustomPalette } from '../../../core/sanitize'
import type { ScenePaletteChoice } from '../../../scene/paletteCommands'
import { Button } from '../../ui/Button'
import { Dialog } from '../../ui/Dialog'
import { type SavedScenePalette, useAvailableScenePaletteLibrary } from './useScenePaletteLibrary'

export function ScenePaletteLibrary({
  palette,
  busy,
  apply,
}: {
  palette: MoldaPaletteFields
  busy: boolean
  apply: (next: ScenePaletteChoice) => void
}) {
  const library = useAvailableScenePaletteLibrary()
  const [expanded, setExpanded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [dialog, setDialog] = useState<'create' | 'manage' | null>(null)
  const [draft, setDraft] = useState<MoldaCustomPalette | null>(null)
  const [message, setMessage] = useState('')
  const activeSaved =
    palette.paletteId === 'custom'
      ? library.palettes.find(
          (entry) =>
            entry.name === palette.customPalette?.name &&
            entry.colors.every((color, index) => color === palette.customPalette?.colors[index]),
        )
      : null
  const currentValue =
    palette.paletteId === 'custom' ? (activeSaved?.id ?? 'current') : palette.paletteId
  const visibleColors =
    palette.paletteId === 'custom' && palette.customPalette
      ? palette.customPalette.colors
      : (PALETTES.find((entry) => entry.id === palette.paletteId)?.colors ?? PALETTES[0]!.colors)

  function openCreate() {
    const colors =
      palette.paletteId === 'custom' && palette.customPalette
        ? palette.customPalette.colors
        : PALETTES.find((entry) => entry.id === palette.paletteId)!.colors
    setDraft({
      name: '',
      colors: Array.from({ length: PALETTE_SIZE }, (_, index) =>
        index === 0 ? '' : (colors[index] ?? ''),
      ),
    })
    setMessage('')
    setDialog('create')
  }

  function choose(value: string) {
    if (value === currentValue || value === 'current') return
    const preset = PALETTES.find((entry) => entry.id === value)
    if (preset) apply({ paletteId: preset.id })
    else {
      const saved = library.palettes.find((entry) => entry.id === value)
      if (saved)
        apply({
          paletteId: 'custom',
          customPalette: { name: saved.name, colors: [...saved.colors] },
        })
    }
  }

  async function create() {
    if (!draft) return
    const clean = sanitizeCustomPalette({ ...draft, name: draft.name.trim() || 'Minha paleta' })
    if (!clean) {
      setMessage('Escolha pelo menos uma cor.')
      return
    }
    setSaving(true)
    let saved: SavedScenePalette | null = null
    try {
      saved = await library.create(clean)
    } catch {
      // O diálogo continua aberto para tentar novamente.
    } finally {
      setSaving(false)
    }
    if (!saved) {
      setMessage('Não foi possível guardar a paleta neste navegador.')
      return
    }
    apply({ paletteId: 'custom', customPalette: clean })
    setDialog(null)
  }

  return (
    <>
      <details
        className="mld-disclosure mld-palette-disclosure"
        onToggle={(event) => setExpanded(event.currentTarget.open)}
      >
        <summary className="text-sm font-bold">
          Paletas:{' '}
          {palette.paletteId === 'custom'
            ? palette.customPalette?.name
            : PALETTES.find((entry) => entry.id === palette.paletteId)?.name}
        </summary>
        {expanded && (
          <div className="space-y-2 pt-2">
            <label className="block text-sm font-bold" htmlFor="mlda-scene-palette">
              Escolher paleta
            </label>
            <select
              id="mlda-scene-palette"
              name="scenePalette"
              className="min-h-11 w-full rounded-xl border-2 border-mld-border bg-mld-surface px-3 text-sm"
              value={currentValue}
              disabled={busy || !library.loaded}
              onChange={(event) => choose(event.target.value)}
            >
              {PALETTES.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name}
                </option>
              ))}
              {currentValue === 'current' && (
                <option value="current">{palette.customPalette?.name ?? 'Minha paleta'}</option>
              )}
              {library.palettes.length > 0 && (
                <optgroup label="Minhas paletas">
                  {library.palettes.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            <p className="text-xs text-mld-muted">Trocar a paleta muda as cores da criação.</p>
            <div
              aria-hidden="true"
              className="flex h-3 overflow-hidden rounded-full border border-mld-border"
            >
              {visibleColors.slice(1).map((color, index) => (
                <span
                  key={String(index)}
                  className="flex-1"
                  style={{ backgroundColor: color || 'transparent' }}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="compact"
                variant="ghost"
                disabled={busy || !library.loaded || library.full}
                onClick={openCreate}
              >
                + Criar paleta
              </Button>
              {library.palettes.length > 0 && (
                <Button size="compact" variant="ghost" onClick={() => setDialog('manage')}>
                  Gerenciar
                </Button>
              )}
            </div>
            {library.full && <p className="text-xs text-mld-muted">Você já guardou 24 paletas.</p>}
            {!library.loaded && (
              <p role="status" className="text-xs text-mld-muted">
                Buscando suas paletas...
              </p>
            )}
            {library.error && (
              <p role="status" className="text-xs text-mld-muted">
                Não foi possível guardar a paleta neste navegador.
              </p>
            )}
          </div>
        )}
      </details>
      <Dialog open={dialog === 'create'} title="Criar paleta" onClose={() => setDialog(null)}>
        {draft && (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault()
              void create()
            }}
          >
            <label className="block space-y-1 text-sm font-bold">
              <span>Nome da paleta</span>
              <input
                name="paletteName"
                className="min-h-11 w-full rounded-xl border-2 border-mld-border bg-mld-surface px-3 text-base"
                value={draft.name}
                maxLength={MOLDA_LIMITS.maxNameChars}
                placeholder="Minha paleta"
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              />
            </label>
            <p className="text-sm text-mld-muted">Toque em uma cor para trocar.</p>
            <div className="grid grid-cols-5 gap-2">
              {draft.colors.slice(1).map((color, index) => (
                <label key={String(index)} className="flex flex-col items-center gap-1 text-xs">
                  <span className="sr-only">Cor {index + 1}</span>
                  <input
                    name={`paletteColor${index + 1}`}
                    type="color"
                    aria-label={`Cor ${index + 1}`}
                    value={color || '#ffffff'}
                    className="size-11 cursor-pointer rounded-lg border border-mld-border"
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        colors: draft.colors.map((old, at) =>
                          at === index + 1 ? event.target.value : old,
                        ),
                      })
                    }
                  />
                </label>
              ))}
            </div>
            {message && (
              <p role="alert" className="text-sm text-mld-danger">
                {message}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setDialog(null)}>
                Cancelar
              </Button>
              <Button variant="primary" type="submit" disabled={saving}>
                Criar paleta
              </Button>
            </div>
          </form>
        )}
      </Dialog>
      <Dialog open={dialog === 'manage'} title="Minhas paletas" onClose={() => setDialog(null)}>
        <div className="space-y-3">
          {library.palettes.map((entry) => (
            <PaletteRow
              key={entry.id}
              entry={entry}
              rename={library.rename}
              remove={library.remove}
            />
          ))}
          <p className="text-xs text-mld-muted">
            Apagar uma paleta guardada não muda as criações que já usam suas cores.
          </p>
          {library.error && (
            <p role="alert" className="text-sm text-mld-danger">
              Não foi possível guardar a mudança neste navegador.
            </p>
          )}
          <Button className="w-full" onClick={() => setDialog(null)}>
            Concluir
          </Button>
        </div>
      </Dialog>
    </>
  )
}

function PaletteRow({
  entry,
  rename,
  remove,
}: {
  entry: SavedScenePalette
  rename: (id: string, name: string) => boolean | Promise<boolean>
  remove: (id: string) => boolean | Promise<boolean>
}) {
  const [name, setName] = useState(entry.name)
  const [confirm, setConfirm] = useState(false)
  useEffect(() => {
    setName(entry.name)
  }, [entry.name])
  return (
    <div className="space-y-2 rounded-xl border border-mld-border p-2">
      <div aria-hidden="true" className="flex h-3 overflow-hidden rounded-full">
        {entry.colors.slice(1).map((color, index) => (
          <span
            key={String(index)}
            className="flex-1"
            style={{ backgroundColor: color || 'transparent' }}
          />
        ))}
      </div>
      <label className="block text-xs font-bold">
        Nome
        <input
          name={`savedPaletteName-${entry.id}`}
          aria-label={`Nome da paleta ${entry.name}`}
          className="mt-1 min-h-11 w-full rounded-xl border border-mld-border px-2 text-base"
          value={name}
          maxLength={MOLDA_LIMITS.maxNameChars}
          onChange={(event) => setName(event.target.value)}
        />
      </label>
      <div className="flex justify-end gap-2">
        <Button
          size="compact"
          variant="ghost"
          aria-label={`Salvar nome da paleta ${entry.name}`}
          disabled={!name.trim() || name.trim() === entry.name}
          onClick={() => void rename(entry.id, name)}
        >
          Salvar nome
        </Button>
        {confirm ? (
          <>
            <Button size="compact" variant="ghost" onClick={() => setConfirm(false)}>
              Cancelar
            </Button>
            <Button
              size="compact"
              variant="danger"
              aria-label={`Confirmar exclusão da paleta ${entry.name}`}
              onClick={() => void remove(entry.id)}
            >
              Confirmar exclusão
            </Button>
          </>
        ) : (
          <Button
            size="compact"
            variant="ghost"
            aria-label={`Apagar paleta ${entry.name}`}
            onClick={() => setConfirm(true)}
          >
            Apagar
          </Button>
        )}
      </div>
    </div>
  )
}
