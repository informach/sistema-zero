'use client'

import { OrbitControls } from '@react-three/drei'
import { Canvas, type ThreeEvent, useThree } from '@react-three/fiber'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { Color, Plane, Raycaster, Vector2, Vector3 } from 'three'
import { lightingPreset, ROOM_ITEM_INFO, resolveRoomAppearance } from '@/lib/room-catalog'
import type { RoomStateView } from '@/lib/types'
import { recoverWebGLContext } from '@/lib/webgl-recovery'
import { effectiveFootprint, type Rot, worldToCell } from './coords'
import { Floor } from './floor'
import { FurniturePiece } from './furniture-piece'
import { Pet3D } from './pet-3d'
import { RoomLights } from './room-lights'
import { useReducedMotion } from './use-reduced-motion'
import { useResponsiveZoom } from './use-responsive-zoom'
import { Walls } from './walls'

// Footprint isométrico aproximado da cena (unidades) p/ enquadrar no container — tunado no QA.
const WORLD_W = 18
const WORLD_H = 14
// Centro de órbita/olhar (um pouco acima do chão, no meio do quarto).
const TARGET: [number, number, number] = [0, 1.2, 0]
const AZIMUTH = Math.PI / 4 // ângulo isométrico padrão (45°) — a órbita gira ±31° em torno dele.

export interface Room3DProps {
  state: RoomStateView
  mode: 'edit' | 'view'
  selectedIndex?: number | null
  onSelect?: (index: number | null) => void
  onMove?: (index: number, x: number, y: number) => void
  onPaintWall?: (wall: 'left' | 'right', color: string) => void
  paintColor?: string | null
  className?: string
}

function Scene({
  state,
  mode,
  selectedIndex = null,
  onSelect,
  onMove,
  onPaintWall,
  paintColor = null,
  reducedMotion,
}: Room3DProps & { reducedMotion: boolean }) {
  const appearance = resolveRoomAppearance(state)
  const preset = lightingPreset(appearance.lightingId)
  useResponsiveZoom(WORLD_W, WORLD_H)

  const gl = useThree((s) => s.gl)
  const camera = useThree((s) => s.camera)
  const scene = useThree((s) => s.scene)
  const invalidate = useThree((s) => s.invalidate)
  // Câmera de órbita (drei `makeDefault` injeta em `state.controls`) — desligada no arraste.
  const controls = useThree((s) => s.controls) as unknown as { enabled: boolean } | null

  // Células OCUPADAS por móveis (com a rotação) — o pet desvia delas (colisão).
  const occupied = useMemo(() => {
    const set = new Set<string>()
    for (const p of state.placedItems) {
      const info = ROOM_ITEM_INFO[p.itemId]
      if (!info) continue
      const fp = effectiveFootprint(info.w, info.h, (p.rot ?? 0) as Rot)
      for (let dx = 0; dx < fp.w; dx++) {
        for (let dz = 0; dz < fp.h; dz++) set.add(`${p.x + dx},${p.y + dz}`)
      }
    }
    return set
  }, [state.placedItems])

  // Fundo/atmosfera por preset (restaura no unmount).
  useEffect(() => {
    const prev = scene.background
    scene.background = new Color(preset.background)
    invalidate()
    return () => {
      scene.background = prev
    }
  }, [scene, preset.background, invalidate])

  // ── Arraste no chão por raycast contra o plano y=0 (robusto a oclusão de móveis) ──
  const dragRef = useRef<number | null>(null)
  const plane = useMemo(() => new Plane(new Vector3(0, 1, 0), 0), [])
  const ray = useMemo(() => new Raycaster(), [])
  const ndc = useMemo(() => new Vector2(), [])
  const hit = useMemo(() => new Vector3(), [])

  const moveTo = useCallback(
    (clientX: number, clientY: number) => {
      const idx = dragRef.current
      if (idx === null) return
      const item = state.placedItems[idx]
      const info = item && ROOM_ITEM_INFO[item.itemId]
      if (!item || !info) return
      const rect = gl.domElement.getBoundingClientRect()
      ndc.set(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1,
      )
      ray.setFromCamera(ndc, camera)
      if (!ray.ray.intersectPlane(plane, hit)) return
      const fp = effectiveFootprint(info.w, info.h, (item.rot ?? 0) as Rot)
      const cell = worldToCell(hit.x, hit.z, fp.w, fp.h)
      if (cell.x !== item.x || cell.y !== item.y) onMove?.(idx, cell.x, cell.y)
    },
    [state.placedItems, gl, camera, plane, ray, ndc, hit, onMove],
  )

  useEffect(() => {
    if (mode !== 'edit') return
    const el = gl.domElement
    const onPointerMove = (e: PointerEvent) => {
      if (dragRef.current !== null) {
        moveTo(e.clientX, e.clientY)
        invalidate()
      }
    }
    const onUp = (e: PointerEvent) => {
      if (dragRef.current !== null) {
        try {
          el.releasePointerCapture(e.pointerId)
        } catch {}
        dragRef.current = null
        if (controls) controls.enabled = true // reativa a órbita ao soltar a peça
      }
    }
    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onUp)
    return () => {
      el.removeEventListener('pointermove', onPointerMove)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onUp)
    }
  }, [mode, gl, moveTo, invalidate, controls])

  const startDrag = useCallback(
    (index: number, e: ThreeEvent<PointerEvent>) => {
      if (paintColor) return // em modo pincel a peça não arrasta
      onSelect?.(index)
      dragRef.current = index
      if (controls) controls.enabled = false // não orbitar enquanto arrasta a peça
      try {
        gl.domElement.setPointerCapture(e.pointerId)
      } catch {}
    },
    [gl, onSelect, paintColor, controls],
  )

  const editable = mode === 'edit'
  return (
    <>
      {/* Órbita REDUZIDA: gira um pouco p/ ver ângulos, sem sair do recorte isométrico. */}
      <OrbitControls
        makeDefault
        target={TARGET}
        enablePan={false}
        enableZoom={false}
        enableDamping={false}
        rotateSpeed={0.5}
        minPolarAngle={0.85}
        maxPolarAngle={1.18}
        minAzimuthAngle={AZIMUTH - 0.55}
        maxAzimuthAngle={AZIMUTH + 0.55}
        onChange={() => invalidate()}
      />
      <RoomLights preset={preset} reducedMotion={reducedMotion} />
      <Walls
        left={appearance.left}
        right={appearance.right}
        dark={Boolean(preset.dark)}
        paintColor={editable ? paintColor : null}
        onPaint={(side) => {
          if (paintColor) onPaintWall?.(side, paintColor)
        }}
      />
      <Floor
        floorId={appearance.floorId}
        editable={editable}
        painting={Boolean(paintColor)}
        onDeselect={() => onSelect?.(null)}
      />
      {state.placedItems.map((p, i) => (
        <FurniturePiece
          // biome-ignore lint/suspicious/noArrayIndexKey: a ordem dos itens É a identidade aqui.
          key={i}
          index={i}
          itemId={p.itemId}
          x={p.x}
          y={p.y}
          rot={(p.rot ?? 0) as Rot}
          selected={editable && selectedIndex === i}
          editable={editable}
          onStart={startDrag}
        />
      ))}
      <Pet3D petId={state.pet} occupied={occupied} reducedMotion={reducedMotion} />
    </>
  )
}

/**
 * Quarto 3D isométrico (react-three-fiber). Câmera ORTOGRÁFICA com órbita REDUZIDA (drei
 * OrbitControls travado num cone estreito — sem pan/zoom, sem dar a volta nas paredes).
 * `frameloop` sob demanda — vira "always" só quando há animação idle (pet/festa) e o
 * movimento é permitido. Client-only (importado via dynamic ssr:false pelo `RoomCanvas`).
 */
export function RoomCanvas3D(props: Room3DProps) {
  const reducedMotion = useReducedMotion()
  const preset = lightingPreset(resolveRoomAppearance(props.state).lightingId)
  const animated = !reducedMotion && (Boolean(props.state.pet) || Boolean(preset.party))
  return (
    <Canvas
      orthographic
      dpr={[1, 1.5]}
      frameloop={animated ? 'always' : 'demand'}
      gl={{ antialias: true, powerPreference: 'low-power' }}
      camera={{ position: [13, 11, 13], zoom: 40, near: 0.1, far: 120 }}
      onCreated={(state) => {
        state.camera.lookAt(...TARGET)
        recoverWebGLContext(state)
      }}
      className={props.className}
    >
      <Scene {...props} reducedMotion={reducedMotion} />
    </Canvas>
  )
}
