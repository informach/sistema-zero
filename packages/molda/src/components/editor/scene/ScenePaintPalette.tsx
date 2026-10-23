import { hexToRgb, rgbToHex } from '../../../core/color'
import { COPY } from '../../../core/copy'
import type { MoldaPaletteFields } from '../../../core/model'
import { RESERVED_INDEX } from '../../../core/palette'
import { resolvePaletteColors } from '../../../core/sanitize'
import { SCENE_PAINT_COPY } from '../../../core/scenePaintCopy'
import { RequiresTool } from '../../toolAccess'
import { Button } from '../../ui/Button'
import { Grid3x3, Layers, Plus } from '../../ui/icons'
import { swatchClass } from '../../ui/interaction'
import { SceneColorPicker } from './SceneColorPicker'
import { ScenePaletteLibrary } from './ScenePaletteLibrary'
import type { useScenePaint } from './useScenePaint'

export function scenePaletteSwatches(palette: MoldaPaletteFields) {
  return resolvePaletteColors(palette).flatMap((hex, index) =>
    index === RESERVED_INDEX || !hex ? [] : [{ index, hex }],
  )
}
const NAMES: Readonly<Record<string, string>> = {
  '#ffffff': 'Branco',
  '#ff2121': 'Vermelho',
  '#ff93c4': 'Rosa',
  '#ff8135': 'Laranja',
  '#fff609': 'Amarelo',
  '#249ca3': 'Turquesa',
  '#78dc52': 'Verde',
  '#003fad': 'Azul',
  '#87f2ff': 'Azul claro',
  '#8e2ec4': 'Roxo',
  '#a4839f': 'Malva',
  '#5c406c': 'Roxo escuro',
  '#e5cdc4': 'Bege',
  '#91463d': 'Marrom',
  '#000000': 'Preto',
}

export function ScenePaintPalette({
  paint,
  palette,
  applyPalette,
  preparation,
  mapping,
  interior,
}: {
  paint: ReturnType<typeof useScenePaint>
  palette: MoldaPaletteFields
  applyPalette: React.ComponentProps<typeof ScenePaletteLibrary>['apply']
  preparation?: { faces: readonly string[]; apply(): void } | null
  mapping?: { apply(): void; disabled: boolean } | null
  interior?: { apply(): void; disabled: boolean } | null
}) {
  const busy = paint.drawing || paint.busy
  const hex = rgbToHex(paint.ink[0], paint.ink[1], paint.ink[2])
  const base = scenePaletteSwatches(palette)
  const colors = [
    ...base,
    ...paint.favorites.map((entry, index) => ({
      index: base.length + index + 1,
      hex: rgbToHex(entry[0], entry[1], entry[2]),
    })),
  ].filter((entry, index, all) => all.findIndex((other) => other.hex === entry.hex) === index)
  const favorite = colors.some((entry) => entry.hex === hex)
  const copy = SCENE_PAINT_COPY
  const instruction = paint.eraser
    ? paint.eraseMode === 'cutout' && (paint.data?.imageKind ?? 'color') === 'color'
      ? copy.instructions.cutout
      : copy.instructions.eraser
    : paint.fill
      ? paint.fillScope === 'base'
        ? copy.instructions.base
        : copy.instructions.fill
      : paint.picker
        ? copy.instructions.picker
        : paint.rotate
          ? copy.instructions.rotate
          : paint.closeupTool
            ? copy.instructions.closeup
            : copy.instructions.pencil
  return (
    <RequiresTool family="paint.brush">
      <section
        aria-label={SCENE_PAINT_COPY.colors}
        className="mld-paint-palette shrink-0 space-y-3 py-2"
      >
        {interior && (
          <div className="space-y-2 rounded-xl border border-mld-border bg-mld-surface p-3">
            <p className="text-sm font-bold">Pintar o lado interno separadamente</p>
            <p className="text-xs text-mld-muted">
              Crie faces internas para usar outra cor no verso. Isso também mostra o interior
              transparente. A pintura de fora fica como está.
            </p>
            <Button
              className="w-full text-sm"
              disabled={busy || interior.disabled}
              onClick={interior.apply}
            >
              <Layers aria-hidden="true" className="size-4" /> Criar lado interno pintável
            </Button>
          </div>
        )}
        <div className="space-y-3 rounded-xl border border-mld-border bg-mld-surface p-3">
          <ScenePaletteLibrary palette={palette} busy={busy} apply={applyPalette} />
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="size-10 shrink-0 rounded-lg border border-mld-border shadow-sm"
              style={{ background: hex }}
            />
            <div className="min-w-0 flex-1">
              <h3 className="mld-display text-base leading-tight">{copy.chooseColor}</h3>
              <p className="truncate text-xs text-mld-muted">
                {copy.currentColor}: {NAMES[hex] ?? 'Personalizada'}
              </p>
            </div>
          </div>
          <div className="mld-paint-swatches">
            {colors.map(({ index, hex: value }) => (
              <button
                key={value}
                type="button"
                aria-label={COPY.a11y.colorSwatch(index, value)}
                aria-pressed={hex === value}
                title={NAMES[value] ?? 'Cor personalizada'}
                disabled={busy}
                onClick={() => paint.setColor([...hexToRgb(value), 255])}
                className={`${swatchClass(hex === value, 'compact')} mld-paint-swatch`}
                style={{ backgroundColor: value }}
              />
            ))}
          </div>
          {paint.recentColors.length > 0 && (
            <div className="border-t border-mld-border pt-2">
              <p className="mld-kicker mb-2">{copy.recentColors}</p>
              <div className="flex flex-wrap gap-2">
                {paint.recentColors.map((entry) => {
                  const value = rgbToHex(entry[0], entry[1], entry[2])
                  return (
                    <button
                      key={value}
                      type="button"
                      aria-label={`Usadas agora: ${value}`}
                      className={`${swatchClass(hex === value)} rounded-full!`}
                      style={{ background: value }}
                      disabled={busy}
                      onClick={() => paint.setColor(entry)}
                    />
                  )
                })}
              </div>
            </div>
          )}
          <details className="mld-disclosure">
            <summary>{copy.customColor}</summary>
            <div className="space-y-3 pb-2">
              <SceneColorPicker ink={paint.ink} disabled={busy} change={paint.newColorStep} />
              <Button
                variant="ghost"
                className="w-full text-sm"
                aria-label={copy.saveColor}
                disabled={busy || favorite || paint.favoritesFull}
                onClick={paint.toggleFavorite}
              >
                <Plus aria-hidden="true" className="size-4" /> {copy.saveColor}
              </Button>
            </div>
          </details>
          {paint.favoritesUnavailable && (
            <p role="status" className="text-xs text-mld-muted">
              As cores continuam disponíveis nesta sessão. Não foi possível guardar a paleta neste
              navegador.
            </p>
          )}
          {paint.favoritesFull && (
            <p className="text-xs text-mld-muted">Sua paleta chegou a 256 cores guardadas.</p>
          )}
        </div>
        <div className="space-y-2 rounded-xl border border-mld-border p-3">
          <p className="mld-kicker">Ferramenta atual</p>
          <p className="text-sm text-mld-muted" aria-live="polite">
            {instruction}
          </p>
          {paint.fill && (
            <fieldset className="space-y-1">
              <legend className="text-sm font-bold">O que pintar?</legend>
              <label className="flex min-h-11 items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="fill-scope"
                  checked={paint.fillScope === 'area'}
                  onChange={() => paint.setFillScope('area')}
                />
                Área desta face
              </label>
              {(paint.data?.imageKind ?? 'color') === 'color' && (
                <RequiresTool family="model.finish">
                  <label className="flex min-h-11 items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="fill-scope"
                      checked={paint.fillScope === 'base'}
                      onChange={() => paint.setFillScope('base')}
                    />
                    Cor de fundo da peça
                  </label>
                </RequiresTool>
              )}
            </fieldset>
          )}
          {paint.eraser && (paint.data?.imageKind ?? 'color') === 'color' && (
            <fieldset className="space-y-1">
              <legend className="text-xs font-bold">Como apagar?</legend>
              <div className="flex gap-1">
                {(
                  [
                    ['paint', 'Apagar tinta'],
                    ['cutout', 'Deixar vazado'],
                  ] as const
                ).map(([mode, label]) => (
                  <Button
                    key={mode}
                    size="compact"
                    variant="outline"
                    aria-pressed={paint.eraseMode === mode}
                    onClick={() => paint.setEraseMode(mode)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </fieldset>
          )}
          {paint.eraser && paint.eraseMode !== 'cutout' && (
            <p className="text-xs text-mld-muted">
              Apaga só o desenho
              {paint.data && paint.data.image.layers.length > 1
                ? ` da camada “${paint.data.layer.name}”`
                : ''}
              . A cor de baixo aparece.
            </p>
          )}
        </div>
        {preparation && !(paint.fill && paint.fillScope === 'base') && (
          <div className="space-y-2 rounded-xl border border-mld-border bg-mld-surface p-3">
            <p role="status" className="text-sm text-mld-muted">
              {copy.crooked(preparation.faces.length)}
            </p>
            <Button className="w-full text-sm" onClick={preparation.apply} disabled={busy}>
              {copy.split}
            </Button>
          </div>
        )}
        {mapping && (
          <div className="space-y-1 rounded-xl border border-mld-border p-3">
            <Button
              className="w-full text-sm"
              disabled={busy || mapping.disabled}
              onClick={mapping.apply}
            >
              <Grid3x3 aria-hidden="true" className="size-4" /> {copy.simpleUv}
            </Button>
            <p className="text-xs text-mld-muted">{copy.simpleUvHint}</p>
          </div>
        )}
      </section>
    </RequiresTool>
  )
}
