/**
 * O contrato do palco 3D, separado da implementação (three.js) para os
 * testes de componente rodarem com um palco FALSO (happy-dom não tem WebGL).
 */
import type { MoldaModelAsset, ShapeId, Vec3 } from '../core/model'
import type { PaintSettings } from '../paint/stroke'
import type { EditorMode, TransformTool } from '../state/sessionStore'

export type ViewName = 'front' | 'back' | 'left' | 'right' | 'top' | 'frame'

/** O que uma alça arrastada muda numa peça (sempre a peça FONTE). */
export interface DragPatch {
  id: string
  from?: Vec3
  to?: Vec3
  rotation?: Vec3
}

export interface AtlasInfo {
  size: number
  /** As peles não couberam no maior atlas: as faces novas saem sem pintura. */
  full: boolean
}

export interface ViewportCallbacks {
  /** Toque numa peça (gêmeo já resolvido para a fonte) ou no vazio. */
  onSelect(partId: string | null): void
  /** Confirma a forma pendente na superfície tocada. */
  onPlace(shape: ShapeId, point: Vec3, normal: Vec3, nearId: string | null): void
  onDragStart(partId: string): void
  /** Durante o arrasto (mover/girar): sem histórico. */
  onDragMove(patch: DragPatch): void
  /** Fim do arrasto; o patch só vem no TAMANHO (que não é aplicado ao vivo). */
  onDragEnd(patch: DragPatch | null): void
  /** Um gesto de pintura começou (o editor guarda o "antes"). */
  onPaintStart(): void
  /** O gesto terminou: o modelo com as peles novas (UM commit). */
  onPaintEnd(model: MoldaModelAsset): void
  /** Conta-gotas: índice de cor. */
  onPickColor(index: number): void
  onAtlas(info: AtlasInfo): void
}

export interface ViewportOptions {
  /** Sem amortecimento da órbita nem animações. */
  reducedMotion?: boolean
  /** Cor de fundo da miniatura (hex). */
  thumbBackground?: string
}

export interface MoldaViewportLike {
  setModel(model: MoldaModelAsset): void
  setSelected(partId: string | null): void
  setMode(mode: EditorMode): void
  setTool(tool: TransformTool): void
  setPlacementShape(shape: ShapeId | null): void
  setPaint(settings: PaintSettings): void
  setSnap(snap: number): void
  setGridVisible(visible: boolean): void
  setView(view: ViewName): void
  /** Foto do modelo (data URL JPEG dentro do teto) ou `null` sem GL/modelo vazio. */
  renderThumb(): string | null
  dispose(): void
}

export type ViewportFactory = (
  canvas: HTMLCanvasElement,
  callbacks: ViewportCallbacks,
  options: ViewportOptions,
) => MoldaViewportLike
