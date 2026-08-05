/**
 * Painel de CORES do vetor (espelho compacto do PaletteBar do pixel): chips de
 * canal (Preenchimento | Contorno) e UMA grade de swatches, 5 por linha, com
 * "sem cor" e o "+" do seletor livre. Clicar numa cor aplica no CANAL ativo —
 * o mesmo que os slots da caixa de ferramentas apontam.
 *
 * Largura FIXA (w-68), como os painéis do pixel: sem ela a grade `1fr`
 * esticaria os vãos conforme o conteúdo.
 */
import { clsx } from 'clsx'
import type { JSX } from 'react'
import { COPY } from '../../../core/copy'
import { ColorButton } from '../ColorPicker'
import { useVectorEditor, type VectorColorChannel } from './VectorEditorScope'

export function VectorColorsPanel(): JSX.Element {
  const {
    style,
    swatches,
    customColors,
    activeChannel,
    setActiveChannel,
    applyChannelColor,
    rememberColor,
  } = useVectorEditor()

  const channelLabel = activeChannel === 'fill' ? COPY.vector.fill : COPY.vector.stroke
  // Cor "selecionada" do canal ativo (destaca o swatch correspondente).
  const activeHex =
    activeChannel === 'fill'
      ? typeof style.fill === 'string' && style.fill !== 'none'
        ? style.fill
        : null
      : (style.stroke?.color ?? null)
  const noneActive = activeChannel === 'fill' ? style.fill === 'none' : style.stroke === null

  const chip = (channel: VectorColorChannel, label: string): JSX.Element => (
    <button
      type="button"
      aria-pressed={activeChannel === channel}
      onClick={() => setActiveChannel(channel)}
      className={clsx(
        'min-h-11 min-w-0 flex-1 truncate rounded-xl border-2 px-2 text-sm font-bold transition',
        activeChannel === channel
          ? 'border-pin-accent bg-pin-accent/10 text-pin-text'
          : 'border-pin-border text-pin-muted hover:bg-pin-border/40',
      )}
    >
      {label}
    </button>
  )

  return (
    <section
      aria-label={COPY.palette.title}
      className="pin-panel flex w-68 shrink-0 flex-col gap-2 p-3"
    >
      <span className="min-w-0 truncate px-1 font-bold text-pin-text">{COPY.palette.title}</span>
      {/* Chips do canal: onde a próxima cor vai cair. */}
      <div className="flex gap-1">
        {chip('fill', COPY.vector.fill)}
        {chip('stroke', COPY.vector.stroke)}
      </div>
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
        <ColorButton
          label={`${channelLabel}: ${COPY.vector.customColor}`}
          value={activeHex ?? '#000000'}
          recentColors={customColors}
          onChange={(hex) => {
            rememberColor(hex)
            applyChannelColor(hex)
          }}
        />
      </div>
    </section>
  )
}
