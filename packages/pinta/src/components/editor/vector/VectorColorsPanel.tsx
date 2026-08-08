/**
 * Painel de CORES do vetor — a mesma casca do PaletteBar do pixel: o título É o
 * seletor de paleta ("Arcade ∨"), a lixeira e o "+" ficam no cabeçalho e embaixo
 * vem UMA grade de 5 por linha com "sem cor" na frente.
 *
 * Sem chips de canal: quem diz se a cor cai no preenchimento ou no contorno são
 * os dois quadradinhos da caixa de ferramentas (o `activeChannel`). Repetir isso
 * aqui era uma linha inteira do painel dizendo o que já estava dito.
 *
 * A cor do vetor é LIVRE (hex nas formas, não índice): trocar de paleta só troca
 * as sugestões da grade — nada no desenho muda, e por isso a lixeira aqui não
 * pede confirmação (ela some com a sugestão, não com a tinta).
 *
 * Largura FIXA (w-68), como os painéis do pixel: sem ela a grade `1fr`
 * esticaria os vãos conforme o conteúdo.
 */
import { clsx } from 'clsx'
import type { JSX } from 'react'
import { useState } from 'react'
import { COPY } from '../../../core/copy'
import { getPalette } from '../../../core/palette'
import { ToolButton } from '../../ui/Button'
import { Dialog } from '../../ui/Dialog'
import { ChevronDown, Plus, Trash2 } from '../../ui/icons'
import { Panel } from '../../ui/Panel'
import { useToast } from '../../ui/Toast'
import { ColorPicker } from '../ColorPicker'
import { PaletteMenu, usePaletteMenu } from '../PaletteMenu'
import { useVectorEditor } from './VectorEditorScope'

export function VectorColorsPanel(): JSX.Element {
  const {
    style,
    swatches,
    customColors,
    forgetColor,
    paletteId,
    setPaletteId,
    activeChannel,
    applyChannelColor,
    rememberColor,
  } = useVectorEditor()
  const { showToast } = useToast()
  const menu = usePaletteMenu()
  const [pickerOpen, setPickerOpen] = useState(false)

  const paletteName = getPalette(paletteId).name
  const channelLabel = activeChannel === 'fill' ? COPY.vector.fill : COPY.vector.stroke
  // Cor "selecionada" do canal ativo (destaca o swatch correspondente).
  const activeHex =
    activeChannel === 'fill'
      ? typeof style.fill === 'string' && style.fill !== 'none'
        ? style.fill
        : null
      : (style.stroke?.color ?? null)
  const noneActive = activeChannel === 'fill' ? style.fill === 'none' : style.stroke === null
  /** A lixeira só alcança cor ADICIONADA pela criança (as da paleta são fixas). */
  const deletable = activeHex !== null && customColors.includes(activeHex)

  function handleTrash(): void {
    if (!activeHex) {
      showToast(COPY.palette.pickColorFirst)
      return
    }
    if (!deletable) {
      showToast(COPY.palette.baseColorLocked)
      return
    }
    forgetColor(activeHex)
  }

  return (
    <Panel
      title={paletteName}
      ariaLabel={COPY.palette.title}
      className="w-68 shrink-0"
      onTitleClick={menu.toggle}
      titleRef={menu.triggerRef}
      titleProps={{
        'aria-haspopup': 'menu',
        'aria-expanded': menu.open,
        'aria-label': `${COPY.palette.switchPalette}: ${paletteName}`,
      }}
      titleSuffix={
        <ChevronDown
          aria-hidden="true"
          className={`size-4 shrink-0 transition ${menu.open ? 'rotate-180' : ''}`}
        />
      }
      actions={
        <>
          <ToolButton
            icon={Trash2}
            label={COPY.palette.deleteColor}
            onClick={handleTrash}
            aria-disabled={!deletable}
            className={deletable ? undefined : 'opacity-40'}
          />
          <button
            type="button"
            aria-label={COPY.palette.addColor}
            title={COPY.palette.addColor}
            onClick={() => setPickerOpen(true)}
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-pin-accent text-pin-accent-fg transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pin-accent"
          >
            <Plus aria-hidden="true" className="size-5" />
          </button>
        </>
      }
    >
      <div className="grid max-h-48 grid-cols-5 justify-items-center gap-1 overflow-y-auto overscroll-contain p-0.5">
        <button
          type="button"
          aria-label={`${channelLabel}: ${COPY.vector.none}`}
          aria-pressed={noneActive}
          title={COPY.vector.none}
          onClick={() => applyChannelColor('none')}
          className={clsx(
            'pin-checkerboard size-11 shrink-0 rounded-md border-2',
            noneActive ? 'border-pin-accent ring-2 ring-pin-accent' : 'border-pin-border',
          )}
        />
        {swatches.map((hex) => (
          <button
            key={hex}
            type="button"
            aria-label={`${channelLabel}: ${COPY.colorNames[hex] ?? hex}`}
            aria-pressed={activeHex === hex}
            title={COPY.colorNames[hex] ?? hex}
            onClick={() => applyChannelColor(hex)}
            className={clsx(
              'size-11 shrink-0 rounded-md border-2',
              activeHex === hex ? 'border-pin-accent ring-2 ring-pin-accent' : 'border-pin-border',
            )}
            style={{ backgroundColor: hex }}
          />
        ))}
      </div>

      <PaletteMenu
        anchor={menu}
        activeId={paletteId}
        onChoose={(id) => {
          setPaletteId(id)
          menu.close()
        }}
      />

      {/* Seletor livre: aplica AO VIVO no canal ativo (mesmo contrato de antes,
          quando o "+" era a última célula da grade) e guarda nas recentes. */}
      <Dialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title={COPY.palette.addColorTitle}
      >
        <ColorPicker
          value={activeHex ?? '#000000'}
          recentColors={customColors}
          onChange={(hex) => {
            rememberColor(hex)
            applyChannelColor(hex)
          }}
        />
      </Dialog>
    </Panel>
  )
}
