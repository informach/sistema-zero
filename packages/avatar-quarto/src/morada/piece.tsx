'use client'

import { useGLTF } from '@react-three/drei'
import { createPortal, type ThreeEvent, useFrame, useLoader, useThree } from '@react-three/fiber'
import {
  MORADA_CATALOG,
  type MoradaCatalog,
  type MoradaInstance,
  type MoradaVector,
  moradaFileUrl,
} from '@sistemazero/core/morada'
import { Component, type ReactNode, Suspense, useEffect, useMemo, useRef } from 'react'
import {
  AnimationMixer,
  LoopOnce,
  LoopRepeat,
  type Object3D,
  Plane,
  RepeatWrapping,
  SRGBColorSpace,
  type Texture,
  TextureLoader,
  Vector3,
} from 'three'
import { moradaMovingParts, prepareMoradaScene, stepMoradaAnimation } from './instance'

export interface MoradaPieceViewProps {
  instance: MoradaInstance
  catalog?: MoradaCatalog
  paused?: boolean
  interactive?: boolean
  animation?: string
  onSelect?: (instance: MoradaInstance) => void
  onMove?: (instance: MoradaInstance, position: MoradaVector) => void
  onLoad?: (root: Object3D, activate: () => void) => void
  onError?: (error: Error, instance: MoradaInstance) => void
  children?: ReactNode
  attachments?: { slotId: string; children: ReactNode }[]
}

/** Um recurso com erro é omitido e relatado. Nunca substitui a arte por primitivas antigas. */
class PieceBoundary extends Component<
  { children: ReactNode; instance: MoradaInstance; onError?: MoradaPieceViewProps['onError'] },
  { failed: boolean }
> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: Error) {
    this.props.onError?.(error, this.props.instance)
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

export function MoradaPieceView(props: MoradaPieceViewProps) {
  const catalog = props.catalog ?? MORADA_CATALOG
  if (!catalog.pieces[props.instance.pieceId]) return null
  return (
    <group position={props.instance.position} rotation={[0, props.instance.rotation, 0]}>
      <PieceBoundary key={props.instance.pieceId} instance={props.instance} onError={props.onError}>
        <Suspense fallback={null}>
          <LoadedPiece {...props} catalog={catalog} />
        </Suspense>
      </PieceBoundary>
    </group>
  )
}

function LoadedPiece({
  instance,
  catalog,
  paused = false,
  interactive = false,
  animation,
  onLoad,
  onSelect,
  onMove,
  children,
  attachments,
}: MoradaPieceViewProps & { catalog: MoradaCatalog }) {
  const piece = catalog.pieces[instance.pieceId]
  if (!piece) throw new Error(`Peça desconhecida: ${instance.pieceId}`)
  const gltf = useGLTF(moradaFileUrl(piece.file), false, false)
  const controls = useThree((state) => state.controls)
  const drag = useRef<{
    pointer: number
    plane: Plane
    start: Vector3
    origin: Vector3
    parent: Object3D
    orbitWasEnabled: unknown
  } | null>(null)
  const files = useMemo(
    () => [
      ...new Set(
        [
          ...piece.materials.flatMap((m) => [m.map, m.emissiveMap]),
          ...Object.values(instance.materials ?? {}).map((m) =>
            m.texture ? catalog.textures[m.texture]?.file : undefined,
          ),
        ].filter((file): file is string => Boolean(file)),
      ),
    ],
    [piece, instance.materials, catalog],
  )
  const loaded = useLoader(TextureLoader, files.map(moradaFileUrl))
  const textures = useMemo(
    () =>
      new Map(
        files.map((file, index) => {
          const texture = loaded[index]
          if (texture) {
            texture.flipY = false
            texture.colorSpace = SRGBColorSpace
            texture.wrapS = texture.wrapT = RepeatWrapping
          }
          return [file, texture] as [string, Texture]
        }),
      ),
    [files, loaded],
  )
  const { colors, materials } = instance
  const prepared = useMemo(
    () => prepareMoradaScene(gltf.scene, piece, { colors, materials }, catalog, textures),
    [gltf.scene, piece, colors, materials, catalog, textures],
  )
  const parts = useMemo(() => moradaMovingParts(prepared.scene, piece), [prepared.scene, piece])
  const mixer = useMemo(() => new AnimationMixer(prepared.scene), [prepared.scene])
  useEffect(() => {
    onLoad?.(prepared.scene, () => {
      const part = parts[0]
      if (part) part.target = part.target ? 0 : 1
    })
  }, [prepared.scene, onLoad, parts])
  useEffect(() => {
    return () => {
      mixer.stopAllAction()
      mixer.uncacheRoot(prepared.scene)
      prepared.dispose()
    }
  }, [prepared, mixer])
  useEffect(() => {
    if (!animation) return
    const clip = gltf.animations.find((c) => c.name === animation)
    if (!clip) return
    const action = mixer.clipAction(clip)
    const meta = piece.animations.find((a) => a.id === animation)
    action.setLoop(meta?.loop === false ? LoopOnce : LoopRepeat, Infinity)
    action.clampWhenFinished = true
    action.reset().fadeIn(0.15).play()
    return () => {
      action.fadeOut(0.15)
    }
  }, [animation, gltf.animations, mixer, piece.animations])
  useFrame((_, dt) => {
    stepMoradaAnimation(mixer, parts, dt, paused)
  })
  const select = (event: ThreeEvent<MouseEvent>) => {
    if (!interactive && !onSelect) return
    event.stopPropagation()
    onSelect?.(instance)
    if (interactive) {
      let node: Object3D | null = event.object
      while (node) {
        const part = parts.find((p) => p.object === node)
        if (part) {
          part.target = part.target ? 0 : 1
          break
        }
        node = node.parent
      }
    }
  }
  const startDrag = (event: ThreeEvent<PointerEvent>) => {
    if (!onMove || instance.parentId || event.button !== 0) return
    const container = event.eventObject.parent
    const parent = container?.parent
    if (!container || !parent) return
    const origin = container.getWorldPosition(new Vector3())
    const normal =
      piece.mount === 'wall'
        ? new Vector3(0, 0, 1).transformDirection(container.matrixWorld)
        : new Vector3(0, 1, 0)
    const plane = new Plane().setFromNormalAndCoplanarPoint(normal, origin)
    const start = event.ray.intersectPlane(plane, new Vector3())
    if (!start) return
    event.stopPropagation()
    onSelect?.(instance)
    const orbitWasEnabled = controls && 'enabled' in controls ? controls.enabled : undefined
    if (controls && 'enabled' in controls) controls.enabled = false
    drag.current = { pointer: event.pointerId, plane, start, origin, parent, orbitWasEnabled }
    if (
      event.target &&
      'setPointerCapture' in event.target &&
      typeof event.target.setPointerCapture === 'function'
    )
      event.target.setPointerCapture(event.pointerId)
  }
  const moveDrag = (event: ThreeEvent<PointerEvent>) => {
    const active = drag.current
    if (!active || active.pointer !== event.pointerId || !onMove) return
    const hit = event.ray.intersectPlane(active.plane, new Vector3())
    if (!hit) return
    event.stopPropagation()
    const position = active.parent.worldToLocal(hit.sub(active.start).add(active.origin))
    const snap = (value: number) => Math.round(value * 2) / 2
    onMove(instance, [
      snap(position.x),
      piece.mount === 'wall' ? snap(position.y) : instance.position[1],
      snap(position.z),
    ])
  }
  const endDrag = (event: ThreeEvent<PointerEvent>) => {
    if (!drag.current || drag.current.pointer !== event.pointerId) return
    event.stopPropagation()
    if (
      event.target &&
      'releasePointerCapture' in event.target &&
      typeof event.target.releasePointerCapture === 'function'
    )
      event.target.releasePointerCapture(event.pointerId)
    if (controls && 'enabled' in controls) controls.enabled = drag.current.orbitWasEnabled
    drag.current = null
  }
  useEffect(
    () => () => {
      if (drag.current && controls && 'enabled' in controls)
        controls.enabled = drag.current.orbitWasEnabled
    },
    [controls],
  )
  return (
    <group
      dispose={null}
      onClick={select}
      onPointerDown={startDrag}
      onPointerMove={moveDrag}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <primitive object={prepared.scene} />
      {children}
      {attachments?.map((attachment) => {
        const slot = piece.slots.find((s) => s.id === attachment.slotId)
        if (!slot) return null
        const target = prepared.scene.getObjectByName(slot.id)
        if (target)
          return (
            <group key={slot.id}>
              {createPortal(
                <group position={[0, -slot.size[1] / 2, 0]}>{attachment.children}</group>,
                target,
              )}
            </group>
          )
        const parent = slot.part ? prepared.scene.getObjectByName(slot.part) : prepared.scene
        if (!parent) return null
        return (
          <group key={slot.id}>
            {createPortal(
              <group position={[slot.center[0], slot.center[1] - slot.size[1] / 2, slot.center[2]]}>
                {attachment.children}
              </group>,
              parent,
            )}
          </group>
        )
      })}
    </group>
  )
}
