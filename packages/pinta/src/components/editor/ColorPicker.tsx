/**
 * Seletor de cor livre kid-friendly (a "roda de cores" própria do Pinta, no
 * lugar do `<input type=color>` do sistema — que em tablet abre um picker
 * inconsistente e pequeno). Três controles:
 *  - quadrado SATURAÇÃO × BRILHO (um dedo escolhe cor e brilho de uma vez);
 *  - faixa de MATIZ (o arco-íris);
 *  - campo do CÓDIGO (#rrggbb) para quem sabe o hex, e cores recentes.
 *
 * Trabalha em HSV interno (`core/color.ts`) e é CONTROLADO por `value` (hex).
 * Guardamos o HSV local para não perder a matiz quando o brilho/saturação
 * zeram (preto/cinza não têm matiz definida no hex) — só re-sincroniza quando
 * `value` muda POR FORA.
 *
 * happy-dom não faz layout: `getBoundingClientRect` devolve zeros e os gestos
 * viram no-op — o componente ainda monta e o campo de código continua usável.
 */
import { clsx } from 'clsx'
import type { JSX, PointerEvent as ReactPointerEvent } from 'react'
import { useEffect, useState } from 'react'
import { type Hsv, hexToHsv, hsvToHex, normalizeHex } from '../../core/color'
import { COPY } from '../../core/copy'
import { safeSetPointerCapture } from '../../core/pointer'
import { Dialog } from '../ui/Dialog'

function clamp01(value: number): number {
  return Math.min(Math.max(value, 0), 1)
}

function localFraction(
  event: ReactPointerEvent<HTMLElement>,
  element: HTMLElement,
): { x: number; y: number } {
  const rect = element.getBoundingClientRect()
  const x = rect.width > 0 ? (event.clientX - rect.left) / rect.width : 0
  const y = rect.height > 0 ? (event.clientY - rect.top) / rect.height : 0
  return { x: clamp01(x), y: clamp01(y) }
}

const HUE_GRADIENT =
  'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)'

export function ColorPicker({
  value,
  onChange,
  recentColors,
  className,
}: {
  value: string
  onChange: (hex: string) => void
  recentColors?: readonly string[]
  className?: string
}): JSX.Element {
  const [hsv, setHsv] = useState<Hsv>(() => hexToHsv(value))
  const [hexText, setHexText] = useState(() => normalizeHex(value) ?? value)

  // Re-sincroniza SÓ quando `value` muda por fora (trocar de shape selecionado):
  // se a mudança veio deste picker, `value` já bate com `hsvToHex(hsv)`.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `hsv` é comparação, não gatilho
  useEffect(() => {
    const norm = normalizeHex(value)
    if (norm && norm !== hsvToHex(hsv)) {
      setHsv(hexToHsv(norm))
    }
    setHexText(norm ?? value)
  }, [value])

  function commit(next: Hsv): void {
    setHsv(next)
    const hex = hsvToHex(next)
    setHexText(hex)
    onChange(hex)
  }

  function pickFromSquare(event: ReactPointerEvent<HTMLDivElement>): void {
    const { x, y } = localFraction(event, event.currentTarget)
    commit({ h: hsv.h, s: x, v: 1 - y })
  }

  function pickFromHue(event: ReactPointerEvent<HTMLDivElement>): void {
    const { x } = localFraction(event, event.currentTarget)
    commit({ h: x * 360, s: hsv.s, v: hsv.v })
  }

  const current = hsvToHex(hsv)
  const pureHue = hsvToHex({ h: hsv.h, s: 1, v: 1 })

  return (
    <div className={className}>
      {/* Quadrado saturação × brilho. Controle visual só de ponteiro; o campo
          de código (#rrggbb) abaixo é o caminho acessível por teclado. */}
      <div
        onPointerDown={(event) => {
          safeSetPointerCapture(event.currentTarget, event.pointerId)
          pickFromSquare(event)
        }}
        onPointerMove={(event) => {
          if (event.buttons !== 0) pickFromSquare(event)
        }}
        className="relative h-40 w-full cursor-crosshair touch-none rounded-xl border-2 border-pin-border"
        style={{
          backgroundColor: pureHue,
          backgroundImage:
            'linear-gradient(to top, #000, rgba(0,0,0,0)), linear-gradient(to right, #fff, rgba(255,255,255,0))',
        }}
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1.5px_rgba(0,0,0,0.6)]"
          style={{
            left: `${hsv.s * 100}%`,
            top: `${(1 - hsv.v) * 100}%`,
            backgroundColor: current,
          }}
        />
      </div>

      {/* Faixa de matiz (arco-íris). Também só de ponteiro. */}
      <div
        onPointerDown={(event) => {
          safeSetPointerCapture(event.currentTarget, event.pointerId)
          pickFromHue(event)
        }}
        onPointerMove={(event) => {
          if (event.buttons !== 0) pickFromHue(event)
        }}
        className="relative mt-3 h-5 w-full cursor-pointer touch-none rounded-full border-2 border-pin-border"
        style={{ backgroundImage: HUE_GRADIENT }}
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1.5px_rgba(0,0,0,0.6)]"
          style={{ left: `${(hsv.h / 360) * 100}%`, backgroundColor: pureHue }}
        />
      </div>

      {/* Código da cor + amostra */}
      <div className="mt-3 flex items-center gap-2">
        <span
          aria-hidden="true"
          className="size-9 shrink-0 rounded-lg border-2 border-pin-border"
          style={{ backgroundColor: current }}
        />
        <label className="sr-only" htmlFor="pin-color-hex">
          {COPY.colorPicker.hex}
        </label>
        <input
          id="pin-color-hex"
          name="pinta-color-hex"
          type="text"
          inputMode="text"
          autoComplete="off"
          spellCheck={false}
          aria-label={COPY.colorPicker.hex}
          value={hexText}
          onChange={(event) => {
            const raw = event.target.value
            setHexText(raw)
            const norm = normalizeHex(raw)
            if (norm) {
              setHsv(hexToHsv(norm))
              onChange(norm)
            }
          }}
          className="min-w-0 flex-1 rounded-lg border-2 border-pin-border bg-pin-bg px-3 py-2 font-mono text-base text-pin-text focus-visible:border-pin-accent focus-visible:outline-none"
        />
      </div>

      {/* Cores recentes (se houver) */}
      {recentColors && recentColors.length > 0 ? (
        <div className="mt-3">
          <span className="mb-1 block text-xs font-bold text-pin-muted">
            {COPY.colorPicker.recent}
          </span>
          <div className="flex flex-wrap gap-1">
            {recentColors.map((hex) => (
              <button
                key={hex}
                type="button"
                aria-label={hex}
                title={hex}
                onClick={() => {
                  setHsv(hexToHsv(hex))
                  setHexText(hex)
                  onChange(hex)
                }}
                className={`size-11 rounded-lg border-2 transition ${current === hex ? 'border-pin-accent ring-1 ring-pin-accent' : 'border-pin-border'}`}
                style={{ backgroundColor: hex }}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

/**
 * Amostra clicável que abre o `ColorPicker` num Dialog — o substituto do
 * `<input type=color>` no editor vetorial. Aplica a cor AO VIVO (mesmo contrato
 * do input nativo antigo: cada mudança já vale); fechar o modal é só "pronto".
 */
export function ColorButton({
  value,
  onChange,
  label,
  recentColors,
  className,
}: {
  value: string
  onChange: (hex: string) => void
  label: string
  recentColors?: readonly string[]
  className?: string
}): JSX.Element {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        aria-label={label}
        title={label}
        onClick={() => setOpen(true)}
        className={clsx(
          'size-11 rounded-lg border-2 border-pin-border transition hover:border-pin-accent',
          className,
        )}
        style={{ backgroundColor: value }}
      />
      <Dialog open={open} onClose={() => setOpen(false)} title={label}>
        <ColorPicker value={value} onChange={onChange} recentColors={recentColors} />
      </Dialog>
    </>
  )
}
