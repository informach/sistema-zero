'use client'
import { Grid, OrbitControls } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import { MoradaHouseView } from '@sistemazero/avatar-quarto/morada/house'
import {
  MORADA_CATALOG,
  type MoradaHouse,
  type MoradaInstance,
  type MoradaVector,
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
}) {
  const reducedMotion = useReducedMotion()
  const room = house.rooms.find((r) => r.id === house.roomId)
  const origin = room?.origin ?? [0, 0, 0]
  const selected = house.instances.find((i) => i.id === selectedId)
  const piece = selected ? MORADA_CATALOG.pieces[selected.pieceId] : undefined
  const extent = Math.max(...(room?.size ?? [8, 6]))
  const lighting = lightingPreset(room?.lighting ?? 'dia')
  // Recorte só da prévia: paredes e porta continuam no documento usado pelo jogo.
  const preview = useMemo(
    () => ({
      ...house,
      instances: house.instances.filter((instance) => {
        if (!cutaway || !room || instance.roomId !== room.id || instance.parentId) return true
        const model = MORADA_CATALOG.pieces[instance.pieceId]
        if (
          model?.kind !== 'construction' ||
          model.size[1] < 1.5 ||
          Math.min(model.size[0], model.size[2]) > 0.5
        )
          return true
        const x = (model.min[0] + model.max[0]) / 2,
          z = (model.min[2] + model.max[2]) / 2
        const centerX =
          instance.position[0] + x * Math.cos(instance.rotation) + z * Math.sin(instance.rotation)
        const centerZ =
          instance.position[2] - x * Math.sin(instance.rotation) + z * Math.cos(instance.rotation)
        return centerX < room.size[0] / 2 - 0.3 && centerZ < room.size[1] / 2 - 0.3
      }),
    }),
    [house, room, cutaway],
  )
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
          interactive={!staticView}
          onSelect={onSelect}
          onMove={onMove}
        />
      </Suspense>
      {!staticView ? (
        <Grid
          args={room?.size ?? [8, 6]}
          position={[origin[0], origin[1] - 0.015, origin[2]]}
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
        enablePan={false}
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
