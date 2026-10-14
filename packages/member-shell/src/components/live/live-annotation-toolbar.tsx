'use client'

import { Button } from '@sistemazero/ui'
import {
  ArrowUpRight,
  Circle,
  Eraser,
  Highlighter,
  type LucideIcon,
  MonitorUp,
  Pen,
  Presentation,
  Sparkles,
  Square,
  Trash2,
  Type,
  Undo2,
} from 'lucide-react'
import { useSyncExternalStore } from 'react'
import {
  ANNOTATION_COLORS,
  ANNOTATION_WIDTHS,
  type AnnotationBoardTheme,
  type AnnotationSurface,
  type AnnotationTool,
  type AnnotationWidth,
  SURFACE_SHORTCUT,
  TOOL_SHORTCUTS,
} from '../../lib/live/annotation'
import type { ScreenAnnotation, ScreenAnnotationState } from '../../lib/live/screen-annotation'

/** O retrato do compositor que a tela desenha (muda quando muda o desenho ou a superfície). */
export function useAnnotationState(annotation: ScreenAnnotation): ScreenAnnotationState {
  return useSyncExternalStore(annotation.subscribe, annotation.getState, annotation.getState)
}

export const ANNOTATION_TOOLS: { tool: AnnotationTool; label: string; icon: LucideIcon }[] = [
  { tool: 'pen', label: 'Caneta', icon: Pen },
  { tool: 'highlighter', label: 'Marca-texto', icon: Highlighter },
  { tool: 'arrow', label: 'Seta', icon: ArrowUpRight },
  { tool: 'rect', label: 'Retângulo', icon: Square },
  { tool: 'ellipse', label: 'Círculo', icon: Circle },
  { tool: 'text', label: 'Texto', icon: Type },
  { tool: 'eraser', label: 'Borracha', icon: Eraser },
  { tool: 'laser', label: 'Luz mágica', icon: Sparkles },
]

const WIDTH_DOT: Record<AnnotationWidth, number> = { thin: 6, medium: 11, thick: 18 }
const BOARD_THEMES: { theme: AnnotationBoardTheme; label: string; swatch: string }[] = [
  { theme: 'light', label: 'Fundo branco', swatch: '#ffffff' },
  { theme: 'dark', label: 'Fundo escuro', swatch: '#1e293b' },
]

const TARGET = 'min-h-11 min-w-11'

/**
 * O que a turma vê: a tela (a aba de demonstração) ou o quadro branco. Trocar não para a
 * transmissão. Sem tela ainda (começou pelo quadro), "Tela" pede para escolher a aba.
 */
export function LiveAnnotationSurfaceSwitch({
  state,
  disabled = false,
  onSurface,
  onBoardTheme,
}: {
  state: ScreenAnnotationState
  disabled?: boolean
  onSurface(surface: AnnotationSurface): void
  onBoardTheme(theme: AnnotationBoardTheme): void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <fieldset className="flex gap-1 rounded-xl border bg-background p-1">
        <legend className="sr-only">O que a turma vê</legend>
        <Button
          className={`${TARGET} gap-2 px-3`}
          variant={state.surface === 'screen' ? 'default' : 'ghost'}
          aria-pressed={state.surface === 'screen'}
          aria-keyshortcuts={SURFACE_SHORTCUT}
          title={`Mostrar a tela (${SURFACE_SHORTCUT})`}
          disabled={disabled}
          onClick={() => onSurface('screen')}
        >
          <MonitorUp className="size-5" />
          {state.hasScreen ? 'Tela' : 'Escolher a tela'}
        </Button>
        <Button
          className={`${TARGET} gap-2 px-3`}
          variant={state.surface === 'board' ? 'default' : 'ghost'}
          aria-pressed={state.surface === 'board'}
          aria-keyshortcuts={SURFACE_SHORTCUT}
          title={`Mostrar o quadro branco (${SURFACE_SHORTCUT})`}
          disabled={disabled}
          onClick={() => onSurface('board')}
        >
          <Presentation className="size-5" />
          Quadro branco
        </Button>
      </fieldset>
      {state.surface === 'board' ? (
        <fieldset className="flex gap-1 rounded-xl border bg-background p-1">
          <legend className="sr-only">Fundo do quadro</legend>
          {BOARD_THEMES.map(({ theme, label, swatch }) => (
            <Button
              key={theme}
              className={TARGET}
              size="icon"
              variant={state.boardTheme === theme ? 'secondary' : 'ghost'}
              aria-pressed={state.boardTheme === theme}
              aria-label={label}
              title={label}
              disabled={disabled}
              onClick={() => onBoardTheme(theme)}
            >
              <span
                aria-hidden
                className="size-6 rounded-md border-2 border-foreground/40"
                style={{ background: swatch }}
              />
            </Button>
          ))}
        </fieldset>
      ) : null}
    </div>
  )
}

/**
 * No painel da professora, enquanto a demonstração está no ar: abrir o modo desenho e trocar entre
 * a tela e o quadro sem abrir o modo desenho.
 */
export function LiveAnnotationControls({
  annotation,
  busy = false,
  className = '',
  onDraw,
  onShareScreen,
}: {
  annotation: ScreenAnnotation
  busy?: boolean
  className?: string
  onDraw(): void
  onShareScreen(): void
}) {
  const state = useAnnotationState(annotation)
  return (
    <fieldset className={`space-y-2 rounded-xl border bg-background/60 p-3 ${className}`}>
      <legend className="sr-only">Desenho e quadro branco</legend>
      <div className="flex flex-wrap items-center gap-2">
        <Button className={`${TARGET} gap-2`} onClick={onDraw}>
          <Pen className="size-4" />
          Desenhar na tela
        </Button>
        <LiveAnnotationSurfaceSwitch
          state={state}
          disabled={busy}
          onSurface={(surface) => {
            if (surface === 'screen' && !state.hasScreen) onShareScreen()
            else annotation.setSurface(surface)
          }}
          onBoardTheme={(theme) => annotation.setBoardTheme(theme)}
        />
      </div>
      <p className="text-sm text-muted-foreground">
        O desenho entra na imagem que a turma vê e fica na gravação.
        {state.shapeCount ? ' Há desenho na transmissão agora.' : ''}
      </p>
    </fieldset>
  )
}

/** A barra de ferramentas do desenho, no alto do modo desenho. Alvos de 44px, atalhos no título. */
export function LiveAnnotationToolbar({
  state,
  tool,
  color,
  width,
  busy = false,
  onTool,
  onColor,
  onWidth,
  onUndo,
  onClear,
  onSurface,
  onBoardTheme,
}: {
  state: ScreenAnnotationState
  tool: AnnotationTool
  color: string
  width: AnnotationWidth
  busy?: boolean
  onTool(tool: AnnotationTool): void
  onColor(color: string): void
  onWidth(width: AnnotationWidth): void
  onUndo(): void
  onClear(): void
  onSurface(surface: AnnotationSurface): void
  onBoardTheme(theme: AnnotationBoardTheme): void
}) {
  return (
    <div
      role="toolbar"
      aria-label="Ferramentas de desenho"
      className="flex flex-wrap items-center gap-1.5 rounded-2xl bg-card p-2 text-card-foreground shadow-lg"
    >
      <fieldset className="flex flex-wrap gap-0.5">
        <legend className="sr-only">Ferramenta</legend>
        {ANNOTATION_TOOLS.map(({ tool: item, label, icon: Icon }) => (
          <Button
            key={item}
            className={TARGET}
            size="icon"
            variant={tool === item ? 'default' : 'ghost'}
            aria-pressed={tool === item}
            aria-label={label}
            aria-keyshortcuts={TOOL_SHORTCUTS[item]}
            title={`${label} (${TOOL_SHORTCUTS[item]})`}
            onClick={() => onTool(item)}
          >
            <Icon className="size-5" />
          </Button>
        ))}
      </fieldset>
      <span aria-hidden className="hidden h-8 w-px bg-border sm:block" />
      <fieldset className="flex flex-wrap gap-0.5">
        <legend className="sr-only">Cor</legend>
        {ANNOTATION_COLORS.map(({ value, label }) => (
          <Button
            key={value}
            className={TARGET}
            size="icon"
            variant={color === value ? 'secondary' : 'ghost'}
            aria-pressed={color === value}
            aria-label={label}
            title={label}
            onClick={() => onColor(value)}
          >
            <span
              aria-hidden
              className={`size-7 rounded-full border-2 ${color === value ? 'border-foreground' : 'border-foreground/30'}`}
              style={{ background: value }}
            />
          </Button>
        ))}
      </fieldset>
      <span aria-hidden className="hidden h-8 w-px bg-border sm:block" />
      <fieldset className="flex gap-0.5">
        <legend className="sr-only">Espessura</legend>
        {(Object.keys(ANNOTATION_WIDTHS) as AnnotationWidth[]).map((item) => (
          <Button
            key={item}
            className={TARGET}
            size="icon"
            variant={width === item ? 'secondary' : 'ghost'}
            aria-pressed={width === item}
            aria-label={`Espessura ${ANNOTATION_WIDTHS[item].label.toLowerCase()}`}
            title={`Espessura ${ANNOTATION_WIDTHS[item].label.toLowerCase()}`}
            onClick={() => onWidth(item)}
          >
            <span
              aria-hidden
              className="rounded-full bg-foreground"
              style={{ width: WIDTH_DOT[item], height: WIDTH_DOT[item] }}
            />
          </Button>
        ))}
      </fieldset>
      <span aria-hidden className="hidden h-8 w-px bg-border sm:block" />
      <Button
        className={TARGET}
        size="icon"
        variant="ghost"
        aria-label="Desfazer"
        aria-keyshortcuts="Control+Z"
        title="Desfazer (Ctrl+Z)"
        disabled={!state.canUndo}
        onClick={onUndo}
      >
        <Undo2 className="size-5" />
      </Button>
      <Button
        className={TARGET}
        size="icon"
        variant="ghost"
        aria-label="Limpar tudo"
        title="Limpar tudo (dá para desfazer)"
        disabled={!state.shapeCount}
        onClick={onClear}
      >
        <Trash2 className="size-5" />
      </Button>
      <span aria-hidden className="hidden h-8 w-px bg-border sm:block" />
      <LiveAnnotationSurfaceSwitch
        state={state}
        disabled={busy}
        onSurface={onSurface}
        onBoardTheme={onBoardTheme}
      />
    </div>
  )
}
