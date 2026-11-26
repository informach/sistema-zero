'use client'
import { Edges, Grid, OrbitControls } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import { MoradaHouseView } from '@sistemazero/avatar-quarto/morada/house'
import {
  applyMoradaPlacement,
  MORADA_CATALOG,
  type MoradaHouse,
  type MoradaInstance,
  type MoradaPlacement,
  type MoradaVector,
  moradaInsertKind,
  moradaInstanceCenter,
  moradaWalls,
} from '@sistemazero/core/morada'
import { Suspense, useEffect, useMemo, useRef } from 'react'
import { type OrthographicCamera, PCFShadowMap } from 'three'
import { lightingPreset } from '../../../lib/room-catalog'
import { recoverWebGLContext } from '../../../lib/webgl-recovery'
import { ROOM_ZOOM_MAX, ROOM_ZOOM_STEP, type RoomZoomRequest } from './room-zoom'
import { useReducedMotion } from './use-reduced-motion'

/**
 * A câmera ortográfica encaixa o quarto no espaço que ele tem (a mesma conta do
 * `useResponsiveZoom`) e guarda o zoom da criança POR CIMA do encaixe: redimensionar a janela
 * ou abrir o menu reencaixa sem perder o zoom. A rodinha e o gesto de pinça são do
 * OrbitControls (limitados entre o encaixe e `ROOM_ZOOM_MAX`); os botões chegam por `request`.
 */
function RoomCameraRig({
  size,
  request,
  onZoomChange,
}: {
  size: [number, number]
  request?: RoomZoomRequest | null
  onZoomChange?: (factor: number) => void
}) {
  const camera = useThree((s) => s.camera) as OrthographicCamera
  const width = useThree((s) => s.size.width)
  const height = useThree((s) => s.size.height)
  const controls = useThree((s) => s.controls) as unknown as {
    minZoom: number
    maxZoom: number
    update(): void
    reset(): void
    addEventListener(type: 'change', fn: () => void): void
    removeEventListener(type: 'change', fn: () => void): void
  } | null
  const invalidate = useThree((s) => s.invalidate)
  const fit = useRef(1)
  const factor = useRef(1)
  const notify = useRef(onZoomChange)
  notify.current = onZoomChange
  const worldW = (size[0] + size[1]) * 0.9
  const worldH = (size[0] + size[1]) * 0.7
  useEffect(() => {
    fit.current = Math.max(8, Math.min(width / worldW, height / worldH) * 0.94)
    camera.zoom = fit.current * factor.current
    camera.updateProjectionMatrix()
    if (controls) {
      controls.minZoom = fit.current
      controls.maxZoom = fit.current * ROOM_ZOOM_MAX
    }
    invalidate()
  }, [camera, controls, width, height, worldW, worldH, invalidate])
  useEffect(() => {
    if (!controls) return
    const changed = () => {
      const next = camera.zoom / fit.current
      if (Math.abs(next - factor.current) < 0.005) return
      factor.current = next
      notify.current?.(next)
    }
    controls.addEventListener('change', changed)
    return () => controls.removeEventListener('change', changed)
  }, [camera, controls])
  const lastRequest = useRef(request?.id)
  useEffect(() => {
    if (!request || request.id === lastRequest.current) return
    lastRequest.current = request.id
    if (request.kind === 'reset') {
      // Volta o ângulo e o centro do começo (o zoom para o cursor também anda com a câmera).
      controls?.reset()
      factor.current = 1
    } else {
      const step = request.kind === 'in' ? ROOM_ZOOM_STEP : 1 / ROOM_ZOOM_STEP
      factor.current = Math.min(ROOM_ZOOM_MAX, Math.max(1, factor.current * step))
    }
    camera.zoom = fit.current * factor.current
    camera.updateProjectionMatrix()
    controls?.update()
    notify.current?.(factor.current)
    invalidate()
  }, [request, camera, controls, invalidate])
  return null
}

/** As paredes no modo construção, como no The Sims: levantadas, cortadas na frente ou baixas. */
export type RoomWallsMode = 'up' | 'cut' | 'down'

/** A peça "fantasma" que segue o ponteiro (verde onde cabe, vermelha onde não cabe). */
function PlacementGhost({ placement }: { placement: MoradaPlacement }) {
  const piece = MORADA_CATALOG.pieces[placement.instance.pieceId]
  if (!piece) return null
  const { instance } = placement
  const color = placement.valid ? '#22c55e' : '#ef4444'
  return (
    <group position={instance.position} rotation={[0, instance.rotation, 0]}>
      <mesh
        position={[
          (piece.min[0] + piece.max[0]) / 2,
          (piece.min[1] + piece.max[1]) / 2,
          (piece.min[2] + piece.max[2]) / 2,
        ]}
        renderOrder={10}
      >
        <boxGeometry args={[piece.size[0] + 0.04, piece.size[1] + 0.04, piece.size[2] + 0.04]} />
        <meshBasicMaterial color={color} opacity={0.22} transparent depthWrite={false} />
        <Edges color={color} lineWidth={2} />
      </mesh>
    </group>
  )
}

export function MoradaRoomScene({
  house,
  selectedId,
  onSelect,
  onMove,
  staticView = false,
  cutaway = true,
  zoomable = false,
  zoom,
  onZoomChange,
  className,
  wallsMode,
  showGrid = true,
  placement,
  onFloorHover,
  onFloorClick,
}: {
  house: MoradaHouse
  selectedId?: string | null
  onSelect?: (instance: MoradaInstance) => void
  onMove?: (instance: MoradaInstance, position: MoradaVector) => void
  staticView?: boolean
  cutaway?: boolean
  /** Rodinha, pinça e os botões de zoom (o quarto Kids, 26/11/2026). Desligado = como antes. */
  zoomable?: boolean
  /** Os botões de zoom da tela (aproximar, afastar, ver o quarto todo). */
  zoom?: RoomZoomRequest | null
  onZoomChange?: (factor: number) => void
  className?: string
  /** O modo construção (26/11/2026): paredes levantadas/cortadas/baixas; manda no `cutaway`. */
  wallsMode?: RoomWallsMode
  showGrid?: boolean
  /** A peça que está sendo posta ou movida (fantasma); com ela, o chão recebe o ponteiro. */
  placement?: MoradaPlacement | null
  onFloorHover?: (point: [number, number]) => void
  onFloorClick?: (point: [number, number]) => void
}) {
  const reducedMotion = useReducedMotion()
  const room = house.rooms.find((r) => r.id === house.roomId)
  const origin = room?.origin ?? [0, 0, 0]
  const selected = house.instances.find((i) => i.id === selectedId)
  const piece = selected ? MORADA_CATALOG.pieces[selected.pieceId] : undefined
  const extent = Math.max(...(room?.size ?? [8, 6]))
  const lighting = lightingPreset(room?.lighting ?? 'dia')
  const mode: RoomWallsMode = wallsMode ?? (cutaway ? 'cut' : 'up')
  // Recorte só da prévia: paredes e porta continuam no documento usado pelo jogo. Com a peça em
  // andamento, a prévia já mostra a parede trocada (a janela no vão novo).
  const shown = useMemo(
    () =>
      placement
        ? applyMoradaPlacement(
            house,
            placement.valid ? placement : { ...placement, replace: undefined },
          )
        : house,
    [house, placement],
  )
  const walls = useMemo(() => moradaWalls(shown), [shown])
  const preview = useMemo(() => {
    const keep = (instance: MoradaInstance) => {
      if (mode === 'up' || !room || instance.roomId !== room.id || instance.parentId) return true
      const model = MORADA_CATALOG.pieces[instance.pieceId]
      if (
        model?.kind !== 'construction' ||
        model.size[1] < 1.5 ||
        Math.min(model.size[0], model.size[2]) > 0.5
      )
        return true
      if (mode === 'down') return false
      const x = (model.min[0] + model.max[0]) / 2,
        z = (model.min[2] + model.max[2]) / 2
      const centerX =
        instance.position[0] + x * Math.cos(instance.rotation) + z * Math.sin(instance.rotation)
      const centerZ =
        instance.position[2] - x * Math.sin(instance.rotation) + z * Math.cos(instance.rotation)
      return centerX < room.size[0] / 2 - 0.3 && centerZ < room.size[1] / 2 - 0.3
    }
    const hiddenWalls = new Set(walls.filter((w) => !keep(w.instance)).map((w) => w.instance.id))
    return {
      ...shown,
      instances: shown.instances.filter((instance) => {
        if (placement && instance.id === placement.instance.id) return true
        const model = MORADA_CATALOG.pieces[instance.pieceId]
        // Janela e porta acompanham a parede delas: parede cortada ou baixa leva junto.
        if (
          model &&
          moradaInsertKind(model) &&
          room &&
          instance.roomId === room.id &&
          mode !== 'up'
        ) {
          const [x, z] = moradaInstanceCenter(instance, model)
          const wall = walls.find((w) => {
            const along = (x - w.start[0]) * w.dir[0] + (z - w.start[1]) * w.dir[1]
            const off = Math.abs((x - w.start[0]) * w.dir[1] - (z - w.start[1]) * w.dir[0])
            return off < 0.2 && along > -0.05 && along < w.length + 0.05
          })
          if (wall && hiddenWalls.has(wall.instance.id)) return false
        }
        return keep(instance)
      }),
    }
  }, [shown, walls, room, mode, placement])
  /** Com as paredes baixas, fica o rodapé de cada trecho (como no The Sims). */
  const stubs = mode === 'down' && room ? walls.filter((w) => w.instance.roomId === room.id) : []
  const press = useRef<[number, number] | null>(null)
  return (
    <Canvas
      orthographic
      dpr={[1, 1.5]}
      shadows={{ type: PCFShadowMap }}
      camera={{
        position: [origin[0] + extent, origin[1] + extent, origin[2] + extent],
        zoom: 40,
        near: 0.1,
        far: 100,
      }}
      frameloop={staticView ? 'demand' : 'always'}
      gl={{ antialias: true, powerPreference: 'low-power' }}
      onCreated={(state) => {
        state.camera.lookAt(origin[0], origin[1] + 1.2, origin[2])
        recoverWebGLContext(state)
      }}
      className={className}
    >
      <RoomCameraRig
        size={room?.size ?? [8, 6]}
        request={zoomable ? zoom : null}
        onZoomChange={onZoomChange}
      />
      <color attach="background" args={[lighting.background]} />
      <ambientLight intensity={lighting.ambient.intensity} color={lighting.ambient.color} />
      <directionalLight
        position={lighting.sun.position}
        intensity={lighting.sun.intensity}
        color={lighting.sun.color}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-normalBias={0.03}
      />
      {lighting.neon || lighting.party ? (
        <pointLight
          position={[0, 3, 0]}
          color={lighting.neon ?? '#b060ff'}
          intensity={4}
          distance={15}
        />
      ) : null}
      <Suspense fallback={null}>
        <MoradaHouseView
          house={preview}
          roomId={house.roomId}
          paused={staticView || reducedMotion}
          interactive={!staticView && !placement}
          onSelect={onSelect}
          onMove={onMove}
        />
      </Suspense>
      {stubs.map((wall) => (
        <mesh
          key={wall.instance.id}
          position={[
            origin[0] + wall.start[0] + (wall.dir[0] * wall.length) / 2,
            origin[1] + 0.09,
            origin[2] + wall.start[1] + (wall.dir[1] * wall.length) / 2,
          ]}
          rotation={[0, wall.instance.rotation, 0]}
        >
          <boxGeometry args={[wall.length, 0.18, wall.thickness]} />
          <meshStandardMaterial color="#e9d6c4" />
        </mesh>
      ))}
      {placement ? (
        <group position={origin}>
          <PlacementGhost placement={placement} />
        </group>
      ) : null}
      {onFloorHover || onFloorClick ? (
        <mesh
          position={[origin[0], origin[1] + 0.001, origin[2]]}
          rotation={[-Math.PI / 2, 0, 0]}
          onPointerMove={(event) => {
            event.stopPropagation()
            onFloorHover?.([event.point.x - origin[0], event.point.z - origin[2]])
          }}
          // O clique é o apertar e soltar sem arrastar (arrastar gira a vista).
          onPointerDown={(event) => {
            if (event.button === 0) press.current = [event.clientX, event.clientY]
          }}
          onPointerUp={(event) => {
            const start = press.current
            press.current = null
            if (!start || Math.hypot(event.clientX - start[0], event.clientY - start[1]) > 6) return
            event.stopPropagation()
            onFloorClick?.([event.point.x - origin[0], event.point.z - origin[2]])
          }}
        >
          <planeGeometry args={[40, 40]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      ) : null}
      {!staticView && showGrid ? (
        <Grid
          args={room?.size ?? [8, 6]}
          // No modo construção a grade fica por cima do piso (antes ela sumia embaixo dele).
          position={[origin[0], origin[1] + (zoomable ? 0.012 : -0.015), origin[2]]}
          cellSize={0.5}
          cellThickness={0.5}
          sectionSize={2}
          fadeDistance={25}
          infiniteGrid={false}
        />
      ) : null}
      {selected && piece && !selected.parentId ? (
        <group
          position={[
            origin[0] + selected.position[0],
            origin[1] + selected.position[1],
            origin[2] + selected.position[2],
          ]}
          rotation={[0, selected.rotation, 0]}
        >
          <mesh
            position={[(piece.min[0] + piece.max[0]) / 2, 0.02, (piece.min[2] + piece.max[2]) / 2]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <planeGeometry args={[piece.size[0], piece.size[2]]} />
            <meshBasicMaterial color="#287a78" opacity={0.35} transparent depthWrite={false} />
          </mesh>
        </group>
      ) : null}
      <OrbitControls
        makeDefault
        target={[origin[0], origin[1] + 1.2, origin[2]]}
        // O modo construção arrasta a vista com o botão direito (ou dois dedos).
        enablePan={zoomable && !staticView}
        // Rodinha e pinça aproximam (para onde o cursor aponta); o OrbitControls cancela a
        // rolagem da página sobre o quarto. Na vista parada (perfil) nada se mexe.
        enableZoom={zoomable && !staticView}
        zoomToCursor
        zoomSpeed={0.8}
        enableDamping={false}
        rotateSpeed={0.5}
        minPolarAngle={0.85}
        maxPolarAngle={1.18}
        minAzimuthAngle={Math.PI / 4 - 0.55}
        maxAzimuthAngle={Math.PI / 4 + 0.55}
      />
    </Canvas>
  )
}
