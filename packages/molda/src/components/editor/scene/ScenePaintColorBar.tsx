/**
 * A BARRA DE CORES da aba Pintar: a faixa no pé da área central, debaixo do 3D e da Folha de
 * pintura (as duas pintam com a mesma cor). Antes as cores moravam no fim do painel direito e
 * a criança atravessava a tela a cada troca, a ação mais frequente do Pintar.
 *
 * Da esquerda para a direita: o POTINHO (a cor atual com o nome), a fila das cores da paleta,
 * as favoritas depois de um fio, e o "+" com "Criar outra cor" e "Usadas agora". A fila rola de
 * lado quando não cabe; o potinho e o "+" ficam fora dela (o popover do "+" não pode ser
 * recortado pela rolagem). A troca de PALETA não mora aqui: ela muda as cores do modelo
 * inteiro e fica no painel direito.
 *
 * Os nomes acessíveis são os de sempre (`COPY.a11y.colorSwatch`, "Usadas agora: #…").
 */
import { useEffect, useRef } from 'react'
import { hexToRgb, rgbToHex } from '../../../core/color'
import { COPY } from '../../../core/copy'
import type { MoldaPaletteFields } from '../../../core/model'
import { scenePaletteSwatches } from '../../../core/sanitize'
import { SCENE_PAINT_COPY } from '../../../core/scenePaintCopy'
import type { ScenePaintRgba } from '../../../scene/imagePaint'
import { RequiresTool } from '../../toolAccess'
import { Button } from '../../ui/Button'
import { Plus } from '../../ui/icons'
import { SceneColorPicker } from './SceneColorPicker'
import type { useScenePaint } from './useScenePaint'

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

/** Cores que somem no fundo claro ganham a borda interna fina (`data-light`). */
function isLight(hex: string) {
  const [r, g, b] = hexToRgb(hex)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 200
}

export function scenePaintColorName(hex: string) {
  return NAMES[hex] ?? SCENE_PAINT_COPY.customColorName
}

export function ScenePaintColorBar({
  paint,
  palette,
}: {
  paint: ReturnType<typeof useScenePaint>
  palette: MoldaPaletteFields
}) {
  const copy = SCENE_PAINT_COPY
  const busy = paint.drawing || paint.busy
  const hex = rgbToHex(paint.ink[0], paint.ink[1], paint.ink[2])
  const base = scenePaletteSwatches(palette)
  // Uma cor aparece UMA vez, entre a paleta e as favoritas (a paleta pode repetir um hex: a
  // personalizada, a tirada de uma imagem). Repetida, a chave colidia e as duas ficavam marcadas.
  const colors = [
    ...base.map((entry) => ({ ...entry, favorite: false })),
    ...paint.favorites.map((entry, index) => ({
      index: base.length + index + 1,
      hex: rgbToHex(entry[0], entry[1], entry[2]),
      favorite: true,
    })),
  ].filter((entry, index, all) => all.findIndex((other) => other.hex === entry.hex) === index)
  const palettePart = colors.filter((entry) => !entry.favorite)
  const favorites = colors.filter((entry) => entry.favorite)
  const favorite = colors.some((entry) => entry.hex === hex)
  const more = useRef<HTMLDetailsElement>(null)
  // O popover fecha com um toque fora dele: aberto, ele cobria o palco enquanto a criança pintava.
  useEffect(() => {
    const close = (event: PointerEvent) => {
      const details = more.current
      if (details?.open && !details.contains(event.target as Node)) details.open = false
    }
    document.addEventListener('pointerdown', close, true)
    return () => document.removeEventListener('pointerdown', close, true)
  }, [])
  const swatch = (value: string, label: string, color: ScenePaintRgba) => (
    <button
      key={value}
      type="button"
      aria-label={label}
      aria-pressed={hex === value}
      title={scenePaintColorName(value)}
      data-light={isLight(value) ? '' : undefined}
      disabled={busy}
      onClick={() => paint.setColor(color)}
      className="mld-color-swatch"
      style={{ backgroundColor: value }}
    />
  )
  const paletteSwatch = ({ index, hex: value }: { index: number; hex: string }) =>
    swatch(value, COPY.a11y.colorSwatch(index, value), [...hexToRgb(value), 255])
  const unsaved =
    'As cores continuam disponíveis nesta sessão. Não foi possível guardar a paleta neste navegador.'
  return (
    <RequiresTool family="paint.brush">
      <section aria-label={copy.colors} className="mld-color-bar">
        <div className="mld-color-pot" title={copy.currentColor}>
          {/* A chave é a cor: cada cor nova monta o pingo de novo e o CSS anima o salto. */}
          <span
            key={hex}
            aria-hidden="true"
            className="mld-color-pot-ink"
            data-light={isLight(hex) ? '' : undefined}
            style={{ background: hex }}
          />
          <span className="mld-color-pot-name">
            <span className="sr-only">{copy.currentColor}: </span>
            {scenePaintColorName(hex)}
          </span>
        </div>
        <div className="mld-color-row">
          {palettePart.map(paletteSwatch)}
          {favorites.length > 0 && <span aria-hidden="true" className="mld-color-rule" />}
          {favorites.map(paletteSwatch)}
        </div>
        <details
          ref={more}
          className="mld-color-more"
          onKeyDown={(event) => {
            if (event.key !== 'Escape' || !more.current?.open) return
            event.preventDefault()
            event.stopPropagation()
            more.current.open = false
            more.current.querySelector('summary')?.focus()
          }}
        >
          <summary title={copy.customColor}>
            <Plus aria-hidden="true" className="size-5" />
            <span className="sr-only">{copy.customColor}</span>
          </summary>
          <div className="mld-color-more-panel">
            <p className="mld-kicker">{copy.customColor}</p>
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
            {paint.favoritesUnavailable && (
              <p aria-hidden="true" className="text-xs text-mld-muted">
                {unsaved}
              </p>
            )}
            {paint.favoritesFull && (
              <p className="text-xs text-mld-muted">Sua paleta chegou a 256 cores guardadas.</p>
            )}
            {paint.recentColors.length > 0 && (
              <div className="border-t border-mld-border pt-2">
                <p className="mld-kicker mb-2">{copy.recentColors}</p>
                <div className="flex flex-wrap gap-2">
                  {paint.recentColors.map((entry) => {
                    const value = rgbToHex(entry[0], entry[1], entry[2])
                    return swatch(value, `${copy.recentColors}: ${value}`, entry)
                  })}
                </div>
              </div>
            )}
          </div>
        </details>
        {/* O aviso de não guardar vive FORA do popover recolhido: a região viva anuncia mesmo
            fechado, e o texto visível aparece junto do "Guardar cor favorita". */}
        {paint.favoritesUnavailable && (
          <p role="status" className="sr-only">
            {unsaved}
          </p>
        )}
      </section>
    </RequiresTool>
  )
}
