'use client'

import { OrbitControls } from '@react-three/drei'
import { Canvas, type ThreeEvent, useThree } from '@react-three/fiber'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { Color, Plane, Raycaster, Vector2, Vector3 } from 'three'
import { lightingPreset, ROOM_ITEM_INFO, resolveRoomAppearance } from '@/lib/room-catalog'
import type { RoomStateView } from '@/lib/types'
import { recoverWebGLContext } from '@/lib/webgl-recovery'
import {
  effectiveFootprint,
  FLOOR_HALF_X,
  FLOOR_HALF_Z,
  type Rot,
  rectsOverlap,
  WALL_H_CELLS,
  worldToCell,
  worldToWallCell,
} from './coords'
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
  /** Move a peça: chão → (x,y); parede → (x=horizontal, y=altura, wall). */
  onMove?: (index: number, x: number, y: number, wall?: 'left' | 'right') => void
  onPaintWall?: (wall: 'left' | 'right', color: string) => void
  paintColor?: string | null
  /** Cena estática (ex.: quarto de um colega no perfil público) → nunca roda loop contínuo. */
  staticView?: boolean
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

  // Células do CHÃO ocupadas por móveis (itens de parede NÃO contam) — o pet desvia delas.
  const occupied = useMemo(() => {
    const set = new Set<string>()
    for (const p of state.placedItems) {
      const info = ROOM_ITEM_INFO[p.itemId]
      if (!info || info.mount === 'wall') continue
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

  // ── Arraste: chão por raycast no plano y=0; parede por raycast nos planos das paredes ──
  const dragRef = useRef<number | null>(null)
  const plane = useMemo(() => new Plane(new Vector3(0, 1, 0), 0), [])
  const wallPlaneRight = useMemo(() => new Plane(new Vector3(0, 0, 1), FLOOR_HALF_Z), [])
  const wallPlaneLeft = useMemo(() => new Plane(new Vector3(1, 0, 0), FLOOR_HALF_X), [])
  const ray = useMemo(() => new Raycaster(), [])
  const ndc = useMemo(() => new Vector2(), [])
  const hit = useMemo(() => new Vector3(), [])
  const hitR = useMemo(() => new Vector3(), [])
  const hitL = useMemo(() => new Vector3(), [])

  // O footprint (x,y,w,h) está LIVRE (sem sobrepor outra peça)? Chão↔chão e parede↔mesma-parede.
  const isFree = useCallback(
    (
      idx: number,
      isWall: boolean,
      wall: 'left' | 'right' | undefined,
      x: number,
      y: number,
      w: number,
      h: number,
    ) => {
      for (let i = 0; i < state.placedItems.length; i++) {
        if (i === idx) continue
        const it = state.placedItems[i]
        const inf = it && ROOM_ITEM_INFO[it.itemId]
        if (!it || !inf) continue
        const otherWall = inf.mount === 'wall'
        if (isWall) {
          if (!otherWall || (it.wall ?? 'right') !== wall) continue
          if (rectsOverlap(x, y, w, h, it.x, it.y, inf.w, inf.h)) return false
        } else {
          if (otherWall) continue
          const ofp = effectiveFootprint(inf.w, inf.h, (it.rot ?? 0) as Rot)
          if (rectsOverlap(x, y, w, h, it.x, it.y, ofp.w, ofp.h)) return false
        }
      }
      return true
    },
    [state.placedItems],
  )

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

      if (info.mount === 'wall') {
        // Raycast nas DUAS paredes; escolhe a mais próxima dentro dos limites.
        let best: { wall: 'left' | 'right'; u: number; v: number; dist: number } | null = null
        if (
          ray.ray.intersectPlane(wallPlaneRight, hitR) &&
          Math.abs(hitR.x) <= FLOOR_HALF_X + 0.6 &&
          hitR.y >= -0.3 &&
          hitR.y <= WALL_H_CELLS + 0.6
        ) {
          const r = worldToWallCell('right', hitR.x, hitR.y, info.w, info.h)
          best = { wall: 'right', u: r.u, v: r.v, dist: ray.ray.origin.distanceToSquared(hitR) }
        }
        if (
          ray.ray.intersectPlane(wallPlaneLeft, hitL) &&
          Math.abs(hitL.z) <= FLOOR_HALF_Z + 0.6 &&
          hitL.y >= -0.3 &&
          hitL.y <= WALL_H_CELLS + 0.6
        ) {
          const d = ray.ray.origin.distanceToSquared(hitL)
          if (!best || d < best.dist) {
            const l = worldToWallCell('left', hitL.z, hitL.y, info.w, info.h)
            best = { wall: 'left', u: l.u, v: l.v, dist: d }
          }
        }
        if (!best) return
        if (!isFree(idx, true, best.wall, best.u, best.v, info.w, info.h)) return
        if (best.u !== item.x || best.v !== item.y || best.wall !== item.wall) {
          onMove?.(idx, best.u, best.v, best.wall)
        }
        return
      }

      if (!ray.ray.intersectPlane(plane, hit)) return
      const fp = effectiveFootprint(info.w, info.h, (item.rot ?? 0) as Rot)
      const cell = worldToCell(hit.x, hit.z, fp.w, fp.h)
      if (!isFree(idx, false, undefined, cell.x, cell.y, fp.w, fp.h)) return
      if (cell.x !== item.x || cell.y !== item.y) onMove?.(idx, cell.x, cell.y)
    },
    [
      state.placedItems,
      gl,
      camera,
      plane,
      wallPlaneRight,
      wallPlaneLeft,
      ray,
      ndc,
      hit,
      hitR,
      hitL,
      isFree,
      onMove,
    ],
  )

  // `moveTo` muda a cada movimento (depende de `placedItems`); guardá-lo num ref deixa o efeito
  // de listeners ESTÁVEL — sem ele, cada `onMove` re-assinava pointermove/up a cada frame do
  // arraste (thrash de add/removeEventListener no tablet + janela rara onde um `pointerup` cai
  // entre o cleanup e o re-add → órbita ficava travada).
  const moveToRef = useRef(moveTo)
  moveToRef.current = moveTo
  useEffect(() => {
    if (mode !== 'edit') return
    const el = gl.domElement
    const onPointerMove = (e: PointerEvent) => {
      if (dragRef.current !== null) {
        moveToRef.current(e.clientX, e.clientY)
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
  }, [mode, gl, invalidate, controls])

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
          wall={p.wall}
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
  // `staticView`: o quarto de OUTRA criança (perfil público) não precisa animar o pet/festa dela
  // no aparelho de quem visita — renderiza 1 quadro sob demanda.
  const animated =
    !props.staticView && !reducedMotion && (Boolean(props.state.pet) || Boolean(preset.party))
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
