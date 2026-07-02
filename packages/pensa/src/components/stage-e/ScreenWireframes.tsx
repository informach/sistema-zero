/**
 * Seção "As telas do jogo": cada screen do spec vira um card de WIREFRAME
 * (moldura de telinha ~4:3) com os elementos agrupados por zona
 * (top/middle/bottom) como blocos arredondados coloridos por kind. Com a prop
 * `palette` (hex escolhidos no funil de identidade) os blocos REPINTAM na hora
 * via style inline (conteúdo dinâmico — exceção permitida aos tokens); sem
 * paleta usam os tokens pz por kind.
 */
import { clsx } from 'clsx'
import type { CSSProperties, JSX } from 'react'
import {
  type PensaScreenElement,
  type PensaScreenElementKind,
  type PensaSpecScreen,
  SCREEN_ZONES,
} from '../../core/specContent'
import { ApprovalActions } from './ApprovalActions'

/** Tons por kind quando NÃO há paleta (classes por extenso p/ o Tailwind do host). */
const KIND_TOKEN_CLASS: Record<PensaScreenElementKind, string> = {
  title: 'bg-pz-accent/20',
  button: 'bg-pz-stage-r/30',
  score: 'bg-pz-warn/25',
  hero: 'bg-pz-stage-z/25',
  enemy: 'bg-pz-stage-o/30',
  item: 'bg-pz-ok/25',
  background: 'bg-pz-stage-e/10',
  text: 'bg-pz-border/60',
}

/** Forma por kind: title=faixa larga, button=pílula, score=chip no canto... */
const KIND_SHAPE_CLASS: Record<PensaScreenElementKind, string> = {
  title: 'w-4/5 rounded-lg px-2 py-1 text-center text-xs font-extrabold',
  button: 'rounded-full px-3 py-1 text-[11px] font-bold',
  score: 'ml-auto rounded-lg px-2 py-0.5 text-[10px] font-bold',
  hero: 'rounded-xl px-3 py-2 text-xs font-extrabold',
  enemy: 'rounded-lg px-2 py-1 text-[10px] font-semibold',
  item: 'rounded-lg px-2 py-1 text-[10px] font-semibold',
  background: '',
  text: 'w-3/5 rounded-md px-2 py-0.5 text-center text-[10px] font-medium',
}

/** Índice da cor da paleta por kind (cicla no tamanho da paleta escolhida). */
const KIND_PALETTE_INDEX: Record<PensaScreenElementKind, number> = {
  title: 0,
  hero: 1,
  button: 2,
  score: 3,
  enemy: 1,
  item: 2,
  background: 0,
  text: 3,
}

/** Converte #rgb/#rrggbb em rgba() com alpha (hex inválido → null → cai nos tokens). */
function hexAlpha(hex: string, alpha: number): string | null {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim())
  if (!match?.[1]) return null
  let digits = match[1]
  if (digits.length === 3) {
    digits = digits
      .split('')
      .map((char) => char + char)
      .join('')
  }
  const r = Number.parseInt(digits.slice(0, 2), 16)
  const g = Number.parseInt(digits.slice(2, 4), 16)
  const b = Number.parseInt(digits.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function elementStyle(kind: PensaScreenElementKind, palette?: string[]): CSSProperties | undefined {
  if (!palette || palette.length === 0) return undefined
  const color = palette[KIND_PALETTE_INDEX[kind] % palette.length]
  if (!color) return undefined
  const backgroundColor = hexAlpha(color, kind === 'background' ? 0.16 : 0.4)
  return backgroundColor ? { backgroundColor } : undefined
}

function ElementBlock({
  element,
  palette,
}: {
  element: PensaScreenElement
  palette?: string[]
}): JSX.Element {
  const style = elementStyle(element.kind, palette)
  if (element.kind === 'background') {
    // Preenchimento suave da zona inteira, com o label discreto no canto.
    return (
      <span
        data-kind="background"
        className={clsx(
          'pointer-events-none absolute inset-0 rounded-lg',
          style ? undefined : KIND_TOKEN_CLASS.background,
        )}
        style={style}
      >
        <span className="absolute bottom-0.5 left-1.5 text-[9px] font-semibold text-pz-muted">
          {element.label}
        </span>
      </span>
    )
  }
  return (
    <span
      data-kind={element.kind}
      className={clsx(
        // `relative` garante que o bloco pinta ACIMA do background absoluto.
        'relative text-pz-text',
        KIND_SHAPE_CLASS[element.kind],
        style ? undefined : KIND_TOKEN_CLASS[element.kind],
      )}
      style={style}
    >
      {element.label}
    </span>
  )
}

function ScreenCard({
  screen,
  palette,
}: {
  screen: PensaSpecScreen
  palette?: string[]
}): JSX.Element {
  return (
    <li data-screen={screen.name} className="flex flex-col gap-1.5">
      <div className="flex aspect-[4/3] flex-col gap-1 overflow-hidden rounded-2xl border-2 border-pz-border bg-pz-surface p-2">
        {SCREEN_ZONES.map((zone) => {
          const inZone = screen.elements.filter((element) => element.zone === zone)
          return (
            <div
              key={zone}
              data-zone={zone}
              className="relative flex min-h-0 flex-1 flex-wrap content-center items-center justify-center gap-1"
            >
              {inZone.map((element, index) => (
                <ElementBlock
                  // biome-ignore lint/suspicious/noArrayIndexKey: elementos podem repetir kind+label; a posição é a identidade.
                  key={`${element.kind}-${element.label}-${index}`}
                  element={element}
                  palette={palette}
                />
              ))}
            </div>
          )
        })}
      </div>
      <p className="text-center text-sm font-bold text-pz-text">{screen.name}</p>
    </li>
  )
}

export function ScreenWireframes({
  screens,
  palette,
  approved,
  busy,
  onApprove,
  onChange,
}: {
  screens: PensaSpecScreen[]
  /** Hex da paleta escolhida no funil (repinta os wireframes na hora). */
  palette?: string[]
  approved: boolean
  busy?: boolean
  onApprove: () => void
  onChange: () => void
}): JSX.Element {
  return (
    <div className="flex flex-col gap-4">
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {screens.map((screen) => (
          <ScreenCard key={screen.name} screen={screen} palette={palette} />
        ))}
      </ul>
      <ApprovalActions approved={approved} busy={busy} onApprove={onApprove} onChange={onChange} />
    </div>
  )
}
