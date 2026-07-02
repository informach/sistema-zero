/**
 * Seção "As telas do jogo": cada screen do spec vira um card de WIREFRAME
 * (moldura de telinha ~4:3) com CARA DE JOGO — o título é o logo (fonte
 * display do host), botão vira botão "3D", placar vira chip de HUD e
 * herói/inimigo/itens viram SPRITES com legenda pequenina (a criança
 * reconhece a tela, não lê uma lista de palavras). Com a prop `palette`
 * (hex escolhidos no funil de identidade) tudo REPINTA na hora via style
 * inline (conteúdo dinâmico — exceção permitida aos tokens); sem paleta
 * usam os tokens pz por kind.
 */
import { clsx } from 'clsx'
import type { JSX } from 'react'
import {
  type PensaScreenElement,
  type PensaScreenElementKind,
  type PensaSpecScreen,
  SCREEN_ZONES,
} from '../../core/specContent'
import { ApprovalActions } from './ApprovalActions'
import { EnemySprite, HeroSprite, ItemSprite, StarIcon } from './WireframeSprites'

/**
 * Índice da cor da paleta por kind (cicla no tamanho da paleta escolhida).
 * A cor 0 é o FUNDO da paleta (contrato do agente de identidade) — nenhum
 * elemento visível pode usá-la, senão some sobre o preenchimento do fundo.
 */
const KIND_PALETTE_INDEX: Record<PensaScreenElementKind, number> = {
  title: 2,
  hero: 1,
  button: 2,
  score: 3,
  enemy: 1,
  item: 2,
  background: 0,
  text: 3,
}

/** Cor por kind quando NÃO há paleta (via currentColor; classes por extenso p/ o Tailwind do host). */
const KIND_TOKEN_TEXT_CLASS: Partial<Record<PensaScreenElementKind, string>> = {
  title: 'text-pz-accent',
  hero: 'text-pz-stage-z',
  enemy: 'text-pz-stage-o',
  item: 'text-pz-ok',
  score: 'text-pz-warn',
  text: 'text-pz-muted',
}

interface Rgb {
  r: number
  g: number
  b: number
}

/** #rgb/#rrggbb → componentes (hex inválido → null → cai nos tokens). */
function parseHex(hex: string): Rgb | null {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim())
  if (!match?.[1]) return null
  let digits = match[1]
  if (digits.length === 3) {
    digits = digits
      .split('')
      .map((char) => char + char)
      .join('')
  }
  return {
    r: Number.parseInt(digits.slice(0, 2), 16),
    g: Number.parseInt(digits.slice(2, 4), 16),
    b: Number.parseInt(digits.slice(4, 6), 16),
  }
}

function rgbString(rgb: Rgb): string {
  return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`
}

function rgbaString(rgb: Rgb, alpha: number): string {
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`
}

/** Cor da paleta do kind, já parseada (sem paleta/hex inválido → null). */
function paletteRgb(kind: PensaScreenElementKind, palette?: string[]): Rgb | null {
  if (!palette || palette.length === 0) return null
  const color = palette[KIND_PALETTE_INDEX[kind] % palette.length]
  return color ? parseHex(color) : null
}

/** Texto legível sobre a cor (YIQ): fundo claro → quase-preto, escuro → branco. */
function readableTextColor(rgb: Rgb): string {
  const yiq = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000
  return yiq >= 150 ? 'rgba(0,0,0,.8)' : '#fff'
}

/** Cena do fundo: preenche a TELINHA inteira (camada sob as zonas) + "chão" ondulado. */
function BackgroundLayer({
  element,
  palette,
}: {
  element: PensaScreenElement
  palette?: string[]
}): JSX.Element {
  const rgb = paletteRgb('background', palette)
  return (
    <span
      data-kind="background"
      className={clsx('pointer-events-none absolute inset-0', rgb ? undefined : 'bg-pz-stage-e/10')}
      style={rgb ? { backgroundColor: rgbaString(rgb, 0.16) } : undefined}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 100 20"
        preserveAspectRatio="none"
        className={clsx(
          'absolute inset-x-0 bottom-0 h-1/4 w-full',
          rgb ? undefined : 'text-pz-stage-e',
        )}
        style={rgb ? { color: rgbString(rgb) } : undefined}
      >
        <path d="M0 20 L0 14 Q25 8 50 13 T100 12 L100 20 Z" fill="currentColor" opacity=".25" />
      </svg>
      <span className="absolute bottom-0.5 left-1.5 text-[9px] font-semibold text-pz-muted">
        {element.label}
      </span>
    </span>
  )
}

const SPRITE_BY_KIND = {
  hero: HeroSprite,
  enemy: EnemySprite,
  item: ItemSprite,
} as const

function ElementBlock({
  element,
  palette,
}: {
  element: PensaScreenElement
  palette?: string[]
}): JSX.Element {
  const kind = element.kind
  const rgb = paletteRgb(kind, palette)

  // Logo do jogo: texto grande na fonte display do host (Baloo no kids; sem a
  // var cai na herdada). Plano B se o contraste reprovar no QA: plate
  // `bg-pz-surface/70 rounded-lg px-2` atrás do texto.
  if (kind === 'title') {
    return (
      <span
        data-kind="title"
        className={clsx(
          'relative max-w-full text-center text-base leading-tight font-extrabold tracking-tight break-words [font-family:var(--font-display)] drop-shadow-[0_1px_0_rgba(0,0,0,0.25)]',
          rgb ? undefined : KIND_TOKEN_TEXT_CLASS.title,
        )}
        style={rgb ? { color: rgbString(rgb) } : undefined}
      >
        {element.label}
      </span>
    )
  }

  // Botão "3D" de jogo (sombra dura, label DENTRO) — ilustração, não focável.
  if (kind === 'button') {
    return (
      <span
        data-kind="button"
        className={clsx(
          'relative rounded-xl px-3 py-1 text-[11px] font-extrabold',
          rgb ? undefined : 'bg-pz-accent text-pz-accent-fg shadow-[0_3px_0_rgba(0,0,0,0.25)]',
        )}
        style={
          rgb
            ? {
                backgroundColor: rgbString(rgb),
                color: readableTextColor(rgb),
                boxShadow: `0 3px 0 ${rgbaString(rgb, 0.45)}`,
              }
            : undefined
        }
      >
        {element.label}
      </span>
    )
  }

  // Chip de HUD: ★ + número fake (decorativos); o label é a legenda visível.
  if (kind === 'score') {
    return (
      <span data-kind="score" className="relative ml-auto flex flex-col items-end gap-0.5">
        <span
          aria-hidden="true"
          className="inline-flex items-center gap-1 rounded-full bg-pz-text/80 px-1.5 py-0.5 text-[9px] font-bold text-pz-surface"
        >
          <span
            className={rgb ? undefined : KIND_TOKEN_TEXT_CLASS.score}
            style={rgb ? { color: rgbString(rgb) } : undefined}
          >
            <StarIcon />
          </span>
          123
        </span>
        <span className="text-[8px] font-semibold text-pz-muted">{element.label}</span>
      </span>
    )
  }

  // Sprites com legenda: a cor da paleta entra por currentColor no wrapper.
  if (kind === 'hero' || kind === 'enemy' || kind === 'item') {
    const Sprite = SPRITE_BY_KIND[kind]
    return (
      <span
        data-kind={kind}
        className={clsx(
          'relative flex min-w-0 flex-col items-center gap-0.5',
          rgb ? undefined : KIND_TOKEN_TEXT_CLASS[kind],
        )}
        style={rgb ? { color: rgbString(rgb) } : undefined}
      >
        <Sprite />
        <span className="max-w-16 truncate text-[9px] font-semibold text-pz-text">
          {element.label}
        </span>
      </span>
    )
  }

  // kind === 'text': linha discreta.
  return (
    <span
      data-kind="text"
      className={clsx(
        'relative max-w-full truncate text-center text-[9px] font-medium',
        rgb ? undefined : KIND_TOKEN_TEXT_CLASS.text,
      )}
      style={rgb ? { color: rgbString(rgb) } : undefined}
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
  // O fundo é a CENA da telinha: camada absoluta sob as zonas (não uma faixa).
  const backgrounds = screen.elements.filter((element) => element.kind === 'background')
  const visibles = screen.elements.filter((element) => element.kind !== 'background')
  return (
    <li data-screen={screen.name} className="flex flex-col gap-1.5">
      <div className="relative flex aspect-[4/3] flex-col gap-1 overflow-hidden rounded-2xl border-2 border-pz-border bg-pz-surface p-2">
        {backgrounds.map((element, index) => (
          <BackgroundLayer
            // biome-ignore lint/suspicious/noArrayIndexKey: elementos podem repetir kind+label; a posição é a identidade.
            key={`background-${element.label}-${index}`}
            element={element}
            palette={palette}
          />
        ))}
        {SCREEN_ZONES.map((zone) => {
          const inZone = visibles.filter((element) => element.zone === zone)
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
