/**
 * O contrato do palco 3D, separado da implementação (three.js) para os
 * testes de componente rodarem com um palco FALSO (happy-dom não tem WebGL).
 */
import type { MoldaModelAsset, ShapeId, Vec3 } from '../core/model'
import type { MeshPick } from '../model/meshSelection'
import type { SnapAnchor } from '../model/snap'
import type { FacePaintTarget } from '../paint/facePaint'
import type { PaintSettings } from '../paint/stroke'
import type { EditorMode, MeshSelectMode, TransformTool } from '../state/sessionStore'

export type { MeshPick }

export type ViewportSnapState =
  | { phase: 'inactive' }
  | { phase: 'source'; primaryId: string; movingIds: readonly string[] }
  | {
      phase: 'target'
      primaryId: string
      movingIds: readonly string[]
      source: SnapAnchor
    }

/** "Editar malha" no palco: a peça aberta, o que um toque escolhe e os vértices escolhidos. */
export interface MeshEditState {
  partId: string
  mode: MeshSelectMode
  vertices: readonly string[]
}

export type ViewName = 'front' | 'back' | 'left' | 'right' | 'top' | 'frame'

/** O que uma alça arrastada muda numa peça (sempre a peça FONTE). */
export interface DragPatch {
  id: string
  from?: Vec3
  to?: Vec3
  rotation?: Vec3
  /** Arrasto do GRUPO (seleção múltipla): a caixa de destino de cada peça, absoluta. */
  parts?: Array<{ id: string; from: Vec3; to: Vec3 }>
}

export interface AtlasInfo {
  size: number
  /** As peles não couberam no maior atlas: as faces novas saem sem pintura. */
  full: boolean
}

export interface ViewportCallbacks {
  /** Toque numa peça (gêmeo já resolvido para a fonte) ou no vazio. */
  onSelect(partId: string | null, additive: boolean): void
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
  /** Abre a face tocada no editor ampliado; o gêmeo já virou fonte + orientação. */
  onOpenFace(target: FacePaintTarget): void
  onAtlas(info: AtlasInfo): void
  /** Toque na malha em edição (`null` = no vazio); `additive` = Shift/"Somar à seleção". */
  onMeshPick(pick: MeshPick | null, additive: boolean): void
  onMeshDragStart(): void
  /** Delta acumulado desde o início, em coordenadas da CAIXA da peça (sem histórico). */
  onMeshDragMove(delta: Vec3): void
  onMeshDragEnd(): void
  /** Primeiro e segundo toque da ferramenta “Grudar”. */
  onSnapSource(anchor: SnapAnchor): void
  onSnapTarget(anchor: SnapAnchor): void
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
  /** As peças SOMADAS à seleção (contorno em todas; alça no centro do grupo). */
  setExtraSelected(ids: readonly string[]): void
  setMode(mode: EditorMode): void
  setTool(tool: TransformTool): void
  setPlacementShape(shape: ShapeId | null): void
  setPaint(settings: PaintSettings): void
  setSnap(snap: number): void
  setGridVisible(visible: boolean): void
  /** "Ver arestas": contorno de todas as peças. */
  setEdgesVisible(visible: boolean): void
  setView(view: ViewName): void
  /** Liga/desliga o sub-modo "Editar malha" (overlay de pontos e arestas + alça no centro da seleção). */
  setMeshEdit(state: MeshEditState | null): void
  /** Estado transitório da ferramenta “Grudar”; não entra no asset nem no histórico. */
  setSnapState(state: ViewportSnapState): void
  /** Foto do modelo (data URL JPEG dentro do teto) ou `null` sem GL/modelo vazio. */
  renderThumb(): string | null
  dispose(): void
}

export type ViewportFactory = (
  canvas: HTMLCanvasElement,
  callbacks: ViewportCallbacks,
  options: ViewportOptions,
) => MoldaViewportLike
