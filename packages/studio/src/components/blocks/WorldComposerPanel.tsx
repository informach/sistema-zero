import * as Blockly from 'blockly/core'
import type { JSX, PointerEvent as ReactPointerEvent } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import {
  appendWorldComposerBlock,
  collectWorldComposerItems,
  moveWorldComposerItem,
  type WorldComposerItem,
} from './worldComposerModel'

export interface WorldComposerPanelProps {
  workspace: Blockly.WorkspaceSvg | null
}

interface DragState {
  id: string
  pointerId: number
}

function itemScale(item: WorldComposerItem): THREE.Vector3 {
  if (item.type === 'sz_w3d_city') return new THREE.Vector3(18, 5, 18)
  if (item.type === 'sz_w3d_district') return new THREE.Vector3(13, 4, 13)
  if (item.type === 'sz_w3d_road_grid') return new THREE.Vector3(18, 0.25, 18)
  if (item.type === 'sz_w3d_house_row') return new THREE.Vector3(18, 3, 2.5)
  if (item.type === 'sz_w3d_zone') return new THREE.Vector3(6, 0.25, 6)
  if (item.type === 'sz_w3d_lighthouse' || item.type === 'sz_w3d_rocket') {
    return new THREE.Vector3(2.2, 7, 2.2)
  }
  return new THREE.Vector3(3, 3, 3)
}

function disposeObject(object: THREE.Object3D): void {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh) && !(child instanceof THREE.LineSegments)) return
    child.geometry.dispose()
    if (Array.isArray(child.material)) {
      for (const material of child.material) material.dispose()
    } else {
      child.material.dispose()
    }
  })
}

export function WorldComposerPanel({ workspace }: WorldComposerPanelProps): JSX.Element {
  const viewportRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const objectsGroupRef = useRef<THREE.Group | null>(null)
  const objectByIdRef = useRef(new Map<string, THREE.Mesh>())
  const dragRef = useRef<DragState | null>(null)
  const [items, setItems] = useState<WorldComposerItem[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [addNotice, setAddNotice] = useState<string | null>(null)
  const [webglUnavailable, setWebglUnavailable] = useState(false)
  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId],
  )

  const refreshFromWorkspace = useCallback(() => {
    if (!workspace) {
      setItems([])
      setSelectedId(null)
      return
    }
    setItems(collectWorldComposerItems(workspace))
    const selected = Blockly.common.getSelected()
    if (selected?.workspace === workspace) setSelectedId(selected.id)
  }, [workspace])

  useEffect(() => {
    refreshFromWorkspace()
    if (!workspace) return
    const listener = () => refreshFromWorkspace()
    workspace.addChangeListener(listener)
    return () => workspace.removeChangeListener(listener)
  }, [workspace, refreshFromWorkspace])

  const renderScene = useCallback(() => {
    const renderer = rendererRef.current
    const scene = sceneRef.current
    const camera = cameraRef.current
    if (renderer && scene && camera) renderer.render(scene, camera)
  }, [])

  useEffect(() => {
    const container = viewportRef.current
    if (!container) return
    const probe = document.createElement('canvas')
    if (!probe.getContext('webgl2') && !probe.getContext('webgl')) {
      setWebglUnavailable(true)
      return
    }

    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#0b1220')
    scene.fog = new THREE.Fog('#0b1220', 100, 260)
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 500)
    camera.position.set(70, 65, 70)
    camera.lookAt(0, 0, 0)
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.shadowMap.enabled = false
    container.appendChild(renderer.domElement)

    const ambient = new THREE.HemisphereLight('#dbeafe', '#1f2937', 2.2)
    scene.add(ambient)
    const sun = new THREE.DirectionalLight('#ffffff', 2.4)
    sun.position.set(30, 50, 20)
    scene.add(sun)
    const grid = new THREE.GridHelper(200, 40, '#475569', '#1e293b')
    scene.add(grid)
    const group = new THREE.Group()
    scene.add(group)

    rendererRef.current = renderer
    sceneRef.current = scene
    cameraRef.current = camera
    objectsGroupRef.current = group

    const resize = () => {
      const width = Math.max(1, container.clientWidth)
      const height = Math.max(1, container.clientHeight)
      renderer.setSize(width, height, false)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.render(scene, camera)
    }
    const observer = new ResizeObserver(resize)
    observer.observe(container)
    resize()

    return () => {
      observer.disconnect()
      for (const child of [...group.children]) disposeObject(child)
      grid.geometry.dispose()
      grid.material.dispose()
      renderer.dispose()
      renderer.domElement.remove()
      rendererRef.current = null
      sceneRef.current = null
      cameraRef.current = null
      objectsGroupRef.current = null
      objectByIdRef.current.clear()
    }
  }, [])

  useEffect(() => {
    const group = objectsGroupRef.current
    if (!group) return
    for (const child of [...group.children]) {
      group.remove(child)
      disposeObject(child)
    }
    objectByIdRef.current.clear()
    for (const item of items) {
      const scale = itemScale(item)
      const geometry =
        item.type === 'sz_w3d_zone'
          ? new THREE.CylinderGeometry(0.5, 0.5, 1, 32)
          : new THREE.BoxGeometry(1, 1, 1)
      const material = new THREE.MeshStandardMaterial({
        color: item.color,
        roughness: 0.72,
        metalness: 0.04,
        transparent: !item.movable,
        opacity: item.movable ? 1 : 0.45,
      })
      const mesh = new THREE.Mesh(geometry, material)
      mesh.name = item.id
      mesh.position.set(item.x, scale.y * 0.5, item.z)
      mesh.scale.copy(scale)
      group.add(mesh)
      objectByIdRef.current.set(item.id, mesh)
    }
    renderScene()
  }, [items, renderScene])

  useEffect(() => {
    const group = objectsGroupRef.current
    if (!group) return
    const previous = group.getObjectByName('__selection')
    if (previous) {
      group.remove(previous)
      disposeObject(previous)
    }
    const mesh = selectedItem ? objectByIdRef.current.get(selectedItem.id) : null
    if (mesh) {
      const helper = new THREE.BoxHelper(mesh, '#fbbf24')
      helper.name = '__selection'
      group.add(helper)
    }
    renderScene()
  }, [selectedItem, renderScene])

  const selectItem = useCallback(
    (id: string) => {
      setSelectedId(id)
      const block = workspace?.getBlockById(id)
      if (block) block.select()
    },
    [workspace],
  )

  const pointOnGround = useCallback((clientX: number, clientY: number): THREE.Vector3 | null => {
    const renderer = rendererRef.current
    const camera = cameraRef.current
    if (!renderer || !camera) return null
    const rect = renderer.domElement.getBoundingClientRect()
    const pointer = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    )
    const ray = new THREE.Raycaster()
    ray.setFromCamera(pointer, camera)
    const result = new THREE.Vector3()
    return ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), result)
      ? result
      : null
  }, [])

  const onViewportPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    const renderer = rendererRef.current
    const camera = cameraRef.current
    if (!renderer || !camera) return
    const rect = renderer.domElement.getBoundingClientRect()
    const pointer = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    )
    const ray = new THREE.Raycaster()
    ray.setFromCamera(pointer, camera)
    const hits = ray.intersectObjects([...objectByIdRef.current.values()], false)
    const hit = hits[0]?.object
    if (!hit || !objectByIdRef.current.has(hit.name)) return
    selectItem(hit.name)
    const item = items.find((candidate) => candidate.id === hit.name)
    if (!item?.movable) return
    dragRef.current = { id: hit.name, pointerId: event.pointerId }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onViewportPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const point = pointOnGround(event.clientX, event.clientY)
    const object = objectByIdRef.current.get(drag.id)
    if (!point || !object) return
    object.position.x = Math.round(point.x * 10) / 10
    object.position.z = Math.round(point.z * 10) / 10
    renderScene()
  }

  const finishDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    dragRef.current = null
    const object = objectByIdRef.current.get(drag.id)
    if (workspace && object)
      moveWorldComposerItem(workspace, drag.id, object.position.x, object.position.z)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const moveSelected = (axis: 'x' | 'z', value: number) => {
    if (!workspace || !selectedItem?.movable) return
    const x = axis === 'x' ? value : selectedItem.x
    const z = axis === 'z' ? value : selectedItem.z
    moveWorldComposerItem(workspace, selectedItem.id, x, z)
  }

  const addBlock = (type: 'sz_w3d_district' | 'sz_w3d_road_grid' | 'sz_w3d_house_row') => {
    if (!workspace) return
    const id = appendWorldComposerBlock(workspace, type)
    if (id) {
      setSelectedId(id)
      setAddNotice(null)
    } else {
      setAddNotice('Crie a área “⚙️ Ao iniciar” em Áreas do projeto para adicionar ao mundo.')
    }
  }

  const setCameraPreset = (preset: 'perspectiva' | 'topo') => {
    const camera = cameraRef.current
    if (!camera) return
    if (preset === 'topo') camera.position.set(0, 120, 0.01)
    else camera.position.set(70, 65, 70)
    camera.lookAt(0, 0, 0)
    renderScene()
  }

  return (
    <div className="grid h-full min-h-0 grid-cols-[minmax(12rem,16rem)_1fr_minmax(13rem,17rem)] bg-sz-bg">
      <aside className="flex min-h-0 flex-col border-r border-sz-border bg-sz-panel">
        <div className="border-b border-sz-border p-3">
          <p className="m-0 font-semibold text-sm text-sz-fg">Adicionar ao mundo</p>
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            <button
              type="button"
              className="rounded-lg bg-sz-accent px-2 py-2 font-medium text-xs text-white"
              onClick={() => addBlock('sz_w3d_district')}
            >
              Distrito
            </button>
            <button
              type="button"
              className="rounded-lg border border-sz-border px-2 py-2 text-xs text-sz-fg"
              onClick={() => addBlock('sz_w3d_road_grid')}
            >
              Ruas
            </button>
            <button
              type="button"
              className="rounded-lg border border-sz-border px-2 py-2 text-xs text-sz-fg"
              onClick={() => addBlock('sz_w3d_house_row')}
            >
              Casas
            </button>
          </div>
          {addNotice && (
            <p
              role="status"
              className="mt-2 rounded-lg bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-300"
            >
              {addNotice}
            </p>
          )}
        </div>
        <nav className="min-h-0 flex-1 overflow-auto p-2" aria-label="Objetos do mundo">
          {items.length === 0 ? (
            <p className="px-2 text-xs leading-5 text-sz-fg-soft">
              Adicione blocos com posição para vê-los e movê-los aqui.
            </p>
          ) : (
            items.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={selectedId === item.id}
                onClick={() => selectItem(item.id)}
                className={`mb-1 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm ${selectedId === item.id ? 'bg-sz-accent/15 text-sz-fg' : 'text-sz-fg-soft hover:bg-sz-bg'}`}
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-sm"
                  style={{ background: item.color }}
                />
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {!item.movable && <span title="Posição calculada por expressão">ƒ</span>}
              </button>
            ))
          )}
        </nav>
      </aside>

      <main className="relative min-h-0 min-w-0">
        <div
          ref={viewportRef}
          className="h-full w-full touch-none overflow-hidden"
          onPointerDown={onViewportPointerDown}
          onPointerMove={onViewportPointerMove}
          onPointerUp={finishDrag}
          onPointerCancel={finishDrag}
          aria-hidden="true"
        />
        {webglUnavailable && (
          <div className="absolute inset-0 flex items-center justify-center p-8 text-center text-sm text-sz-fg-soft">
            O viewport 3D precisa de WebGL. Os blocos continuam editáveis normalmente.
          </div>
        )}
        <div className="absolute left-3 top-3 flex gap-1 rounded-xl border border-white/10 bg-slate-950/75 p-1 shadow-lg backdrop-blur">
          <button
            type="button"
            className="rounded-lg px-2.5 py-1.5 text-xs text-white hover:bg-white/10"
            onClick={() => setCameraPreset('perspectiva')}
          >
            Perspectiva
          </button>
          <button
            type="button"
            className="rounded-lg px-2.5 py-1.5 text-xs text-white hover:bg-white/10"
            onClick={() => setCameraPreset('topo')}
          >
            Topo
          </button>
        </div>
      </main>

      <aside className="min-h-0 overflow-auto border-l border-sz-border bg-sz-panel p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="m-0 font-semibold text-sm text-sz-fg">Inspector</h2>
          <div className="flex gap-1">
            <button
              type="button"
              className="rounded border border-sz-border px-2 py-1 text-xs text-sz-fg"
              onClick={() => workspace?.undo(false)}
              aria-label="Desfazer"
            >
              ↶
            </button>
            <button
              type="button"
              className="rounded border border-sz-border px-2 py-1 text-xs text-sz-fg"
              onClick={() => workspace?.undo(true)}
              aria-label="Refazer"
            >
              ↷
            </button>
          </div>
        </div>
        {selectedItem ? (
          <div className="mt-4 space-y-4">
            <div>
              <p className="m-0 font-medium text-sz-fg">{selectedItem.label}</p>
              <p className="mt-1 text-xs text-sz-fg-soft">
                Arraste no chão ou informe coordenadas.
              </p>
            </div>
            <label className="block text-xs font-medium text-sz-fg-soft">
              Posição X
              <input
                type="number"
                step="0.5"
                value={selectedItem.x}
                disabled={!selectedItem.movable}
                onChange={(event) => moveSelected('x', Number(event.target.value))}
                className="mt-1 w-full rounded-lg border border-sz-border bg-sz-bg px-3 py-2 text-sm text-sz-fg disabled:opacity-50"
              />
            </label>
            <label className="block text-xs font-medium text-sz-fg-soft">
              Posição Z
              <input
                type="number"
                step="0.5"
                value={selectedItem.z}
                disabled={!selectedItem.movable}
                onChange={(event) => moveSelected('z', Number(event.target.value))}
                className="mt-1 w-full rounded-lg border border-sz-border bg-sz-bg px-3 py-2 text-sm text-sz-fg disabled:opacity-50"
              />
            </label>
            {!selectedItem.movable && (
              <p className="rounded-lg bg-amber-500/10 p-3 text-xs leading-5 text-amber-700 dark:text-amber-300">
                A posição usa uma expressão. Troque-a por um bloco de número para mover visualmente.
              </p>
            )}
          </div>
        ) : (
          <p className="mt-4 text-xs leading-5 text-sz-fg-soft">
            Selecione um objeto na lista ou no viewport.
          </p>
        )}
      </aside>
    </div>
  )
}
