/**
 * O CARTÃO DA PEÇA no painel direito da aba Pintar: onde estou pintando e com quê. O estado
 * (peça escolhida, textura ativa), a ajuda, as texturas da peça, a preparação das faces tortas,
 * a paleta do modelo (recolhida: muda as cores do modelo inteiro) e as opções da peça. As cores
 * do pincel moram na barra do pé do palco (`ScenePaintColorBar`); o jeito de cada ferramenta,
 * na coluna da esquerda (`ScenePaintToolbox`).
 */
import { COPY } from '../../../core/copy'
import type { MoldaPaletteFields } from '../../../core/model'
import { SCENE_PAINT_COPY } from '../../../core/scenePaintCopy'
import { RequiresTool } from '../../toolAccess'
import { Button } from '../../ui/Button'
import { Layers } from '../../ui/icons'
import { SceneHelpButton } from './SceneHelpButton'
import { ScenePaletteLibrary } from './ScenePaletteLibrary'
import { sceneCommand } from './sceneCommandRegistry'
import type { useScenePaint } from './useScenePaint'

export function ScenePaintPalette({
  paint,
  pieceName,
  palette,
  applyPalette,
  preparation,
  interior,
  prepared,
  plane,
  openSheet,
  textures,
}: {
  paint: ReturnType<typeof useScenePaint>
  pieceName?: string
  palette: MoldaPaletteFields
  applyPalette: React.ComponentProps<typeof ScenePaletteLibrary>['apply']
  preparation?: { faces: readonly string[]; apply(): void } | null
  interior?: { apply(): void; disabled: boolean } | null
  prepared?: boolean
  plane?: boolean
  openSheet?(): void
  /** Criar textura, usar imagem e vestir: só existem com uma peça escolhida. */
  textures?: React.ReactNode
}) {
  const busy = paint.drawing || paint.busy
  const copy = SCENE_PAINT_COPY
  const rotateCommand = sceneCommand('paint.rotate')
  const RotateIcon = rotateCommand.icon
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
            : paint.shape === 'gradient'
              ? COPY.scene.paintGradientHint
              : paint.shape === 'stamp'
                ? COPY.scene.paintStampHint
                : paint.shape
                  ? COPY.scene.paintShapeHint
                  : copy.instructions.pencil
  return (
    <RequiresTool family="paint.brush">
      <section aria-label={copy.pieceCard} className="mld-paint-palette shrink-0 space-y-3 py-2">
        <div className="flex items-start gap-2 px-1">
          <p className="min-w-0 flex-1 text-sm font-bold">
            {paint.data
              ? `Pintando no modelo: ${paint.data.image.name}`
              : pieceName
                ? `Peça escolhida: ${pieceName}`
                : copy.choosePieceAll}
          </p>
          <SceneHelpButton title="Como pintar no modelo">
            <p>{instruction}</p>
            <p>
              Escolha uma peça, uma cor e desenhe diretamente nela. O Molda prepara a textura quando
              você faz o primeiro traço.
            </p>
            <p>
              Abra a Folha de pintura para desenhar detalhes na mesma textura. A pintura aparece no
              modelo e na folha.
            </p>
            <p>{COPY.scene.paintHint}</p>
            <p>{COPY.scene.paintShapeHint}</p>
            <p>{COPY.scene.paintGradientNeedsRgba}</p>
            <p>{copy.simpleUvHint}</p>
          </SceneHelpButton>
        </div>
        {prepared && pieceName && (
          <div className="space-y-2 rounded-xl border border-mld-accent bg-mld-accent/5 p-3">
            <p className="text-sm font-bold">
              {plane ? 'Plano pronto para pintar' : 'Peça pronta para pintar'}
            </p>
            <p className="text-xs text-mld-muted">
              Arraste o pincel {plane ? 'sobre o plano' : 'sobre a peça'}. A textura é criada no
              primeiro traço.
            </p>
            {openSheet && (
              <Button className="w-full text-sm" onClick={openSheet}>
                Abrir folha para pintar
              </Button>
            )}
          </div>
        )}
        {textures}
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
        {/* A troca de paleta muda as cores do modelo inteiro: já nasce recolhida. */}
        <ScenePaletteLibrary palette={palette} busy={busy} apply={applyPalette} />
        {(interior || paint.data) && (
          <details className="mld-disclosure">
            <summary>Mais opções da peça</summary>
            <div className="space-y-2 pb-2">
              {interior && (
                <div className="space-y-2">
                  <SceneHelpButton title="Pintar o lado interno">
                    <p>
                      Cria faces internas para usar outra cor no verso. A pintura de fora permanece.
                    </p>
                  </SceneHelpButton>
                  <Button
                    className="w-full text-sm"
                    disabled={busy || interior.disabled}
                    onClick={interior.apply}
                  >
                    <Layers aria-hidden="true" className="size-4" /> Criar lado interno pintável
                  </Button>
                </div>
              )}
              {paint.data && (
                <Button
                  variant="ghost"
                  className="w-full justify-start text-sm"
                  data-paint-tool="paint.rotate"
                  aria-pressed={paint.rotate}
                  aria-keyshortcuts={rotateCommand.shortcut?.display}
                  title={`${rotateCommand.label}${rotateCommand.shortcut ? ` (${rotateCommand.shortcut.display})` : ''}`}
                  disabled={busy}
                  onClick={paint.setRotate}
                >
                  <RotateIcon aria-hidden="true" className="size-4" />
                  {copy.rotate}
                </Button>
              )}
            </div>
          </details>
        )}
      </section>
    </RequiresTool>
  )
}
