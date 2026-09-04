/**
 * Palco FALSO para os testes de componente (happy-dom não tem WebGL): grava
 * as chamadas e devolve os callbacks para o teste simular toques, arrastos e
 * gestos de pintura.
 */
import type { MoldaModelAsset, ShapeId } from '../core/model'
import type { PaintSettings } from '../paint/stroke'
import type { EditorMode, TransformTool } from '../state/sessionStore'
import { setMoldaViewportFactory } from '../viewport/factory'
import type { MoldaViewportLike, ViewName, ViewportCallbacks } from '../viewport/types'

export interface FakeViewport extends MoldaViewportLike {
  callbacks: ViewportCallbacks
  models: MoldaModelAsset[]
  selected: string | null
  mode: EditorMode
  tool: TransformTool
  placementShape: ShapeId | null
  paint: PaintSettings | null
  snap: number
  gridVisible: boolean
  views: ViewName[]
  thumbs: number
  disposed: boolean
}

export function installFakeViewport(options: { thumb?: string | null } = {}): {
  instances: FakeViewport[]
  uninstall(): void
} {
  const instances: FakeViewport[] = []
  setMoldaViewportFactory((_canvas, callbacks) => {
    const fake: FakeViewport = {
      callbacks,
      models: [],
      selected: null,
      mode: 'build',
      tool: 'move',
      placementShape: null,
      paint: null,
      snap: 1,
      gridVisible: true,
      views: [],
      thumbs: 0,
      disposed: false,
      setModel(model) {
        fake.models.push(model)
      },
      setSelected(id) {
        fake.selected = id
      },
      setMode(mode) {
        fake.mode = mode
      },
      setTool(tool) {
        fake.tool = tool
      },
      setPlacementShape(shape) {
        fake.placementShape = shape
      },
      setPaint(settings) {
        fake.paint = settings
      },
      setSnap(snap) {
        fake.snap = snap
      },
      setGridVisible(visible) {
        fake.gridVisible = visible
      },
      setView(view) {
        fake.views.push(view)
      },
      renderThumb() {
        fake.thumbs += 1
        return options.thumb === undefined ? 'data:image/jpeg;base64,AAAA' : options.thumb
      },
      dispose() {
        fake.disposed = true
      },
    }
    instances.push(fake)
    return fake
  })
  return {
    instances,
    uninstall: () => setMoldaViewportFactory(null),
  }
}

export function installFailingViewport(): () => void {
  setMoldaViewportFactory(() => {
    throw new Error('sem WebGL')
  })
  return () => setMoldaViewportFactory(null)
}
