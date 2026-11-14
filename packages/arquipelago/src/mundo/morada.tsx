import { OrbitControls } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import {
  CapsuleCollider,
  CuboidCollider,
  Physics,
  type RapierRigidBody,
  RigidBody,
  TrimeshCollider,
  useBeforePhysicsStep,
  useRapier,
} from '@react-three/rapier'
import { avatarDoPack } from '@sistemazero/avatar-quarto/avatar/pack-catalog'
import { PackAvatarRig, PackRigBoundary } from '@sistemazero/avatar-quarto/avatar/pack-rig'
import {
  MORADA_CATALOG,
  type MoradaHouse,
  type MoradaInstance,
  type MoradaPiece,
} from '@sistemazero/avatar-quarto/morada/catalog'
import { MoradaHouseView } from '@sistemazero/avatar-quarto/morada/house'
import { MoradaPieceView } from '@sistemazero/avatar-quarto/morada/piece'
import { useReducedMotion } from '@sistemazero/avatar-quarto/use-reduced-motion'
import {
  type ComponentRef,
  type RefObject,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  type AnimationAction,
  type Group,
  Matrix4,
  type Object3D,
  Quaternion,
  Vector3,
} from 'three'
import { lojaDoConforto, useConforto } from '../estado/conforto'
import { Contexto, useEstado, useJogo } from '../estado/contexto'
import { casaMoradaStore, PAINEL_DA_MORADA } from '../estado/morada'
import { nomeNoJogo, useClipesDoJogo } from '../personagem/avatar-do-jogo'
import { MULTIPLICADOR_DA_RAPIDEZ } from '../sistemas/conforto'
import { estagio, geladeiraEm, progresso } from '../sistemas/horta'
import {
  CLIPES_DO_JOGO,
  criarLocomocao,
  criarPoseDosClipes,
  type EntradaDaLocomocao,
  passoDaLocomocao,
  poseDosClipes,
} from '../sistemas/locomocao'
import {
  isPlantingPiece,
  MORADA_NATIVE,
  moradaFunction,
  moradaTransform,
  plantingId,
} from '../sistemas/morada'
import { moradaRestPose } from '../sistemas/morada-descanso'
import { jogoPausadoNaMorada } from '../sistemas/pausa'
import { Ceu } from './ceu'
import { CameraDaFoto } from './foto'
import { criarRegistro, maisPerto } from './interativos'
import { CONTROLE_DA_CAMERA as CAMERA, LONGE_DA_CAMERA } from './medidas'
import { MoradaAppearance } from './morada-aparencia'
import { findMoradaSpawn, moradaCapsuleFree, MORADA_BODY as nativeBody } from './morada-chegada'
import {
  type AuthoredColliderShape,
  authoredColliderShapes,
  syncAuthoredCollider,
} from './morada-colisao'
import { MoradaGuests } from './morada-convidados'
import { MoradaFunctionDecor } from './morada-funcoes'
import { MoradaInterativos } from './morada-interativos'

const lot: MoradaInstance = {
  id: 'morada-lote',
  pieceId: 'construcao/lote_30x30',
  position: [0, -0.08, 0],
  rotation: 0,
}

/** Física independente: o avatar e as portas têm a mesma medida do Meu Quarto. */
export function CenaMorada({
  house,
  editing,
  onSelect,
  onPlace,
}: {
  house: MoradaHouse
  editing: boolean
  onSelect(instance: MoradaInstance): void
  onPlace(x: number, z: number): void
}) {
  const jogo = useJogo()
  const { loja } = jogo
  const nativeContext = useMemo(() => ({ ...jogo, interativos: criarRegistro() }), [jogo])
  const deviceReducedMotion = useReducedMotion()
  const reducedMotion = useConforto(lojaDoConforto(loja), (state) => state.conforto.menosMovimento)
  const blocked = useEstado(jogoPausadoNaMorada)
  const [loaded, setLoaded] = useState<Map<string, Object3D>>(new Map())
  const actions = useRef(new Map<string, () => void>())
  const onLoad = useCallback((instance: MoradaInstance, root: Object3D, activate: () => void) => {
    root.userData.moradaPieceId = instance.pieceId
    actions.current.set(instance.id, activate)
    setLoaded((before) => {
      if (before.get(instance.id) === root) return before
      return new Map(before).set(instance.id, root)
    })
  }, [])
  return (
    <Contexto.Provider value={nativeContext}>
      <Canvas
        shadows
        camera={{ position: [12, 15, 18], near: 0.1, far: LONGE_DA_CAMERA, fov: 50 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true }}
      >
        <Ceu shadowArea={18} />
        <CameraDaFoto />
        <Suspense fallback={null}>
          <Physics paused={blocked} gravity={[0, -MORADA_NATIVE.gravity, 0]} timeStep={1 / 60}>
            <MoradaPieceView instance={lot} />
            <RigidBody type="fixed" colliders={false}>
              <CuboidCollider
                args={[house.lot.size[0] / 2, 0.2, house.lot.size[1] / 2]}
                position={[0, -0.245, 0]}
              />
            </RigidBody>
            <MoradaHouseView
              house={house}
              paused={blocked}
              petReducedMotion={deviceReducedMotion || reducedMotion}
              interactive={!editing}
              onSelect={onSelect}
              onPieceLoad={onLoad}
            />
            <FunctionalAppearances house={house} roots={loaded} />
            <GardenVisuals house={house} />
            <MoradaGuests house={house} editing={editing} paused={blocked} />
            <Collision house={house} loaded={loaded} />
            {!editing && !blocked ? (
              <MoradaInterativos
                house={house}
                roots={loaded}
                actions={actions.current}
                onSelect={onSelect}
              />
            ) : null}
            {editing ? (
              <EditorCamera />
            ) : (
              <NativeActor
                house={house}
                blocked={blocked}
                ready={house.instances.every(
                  (i) => loaded.get(i.id)?.userData.moradaPieceId === i.pieceId,
                )}
              />
            )}
            {editing ? (
              // biome-ignore lint/a11y/noStaticElementInteractions: alvo 3D; o editor oferece colocação e coordenadas por botões e campos DOM.
              <mesh
                rotation-x={-Math.PI / 2}
                position={[0, 0.05, 0]}
                onClick={(e) => {
                  e.stopPropagation()
                  onPlace(e.point.x, e.point.z)
                }}
              >
                <planeGeometry args={house.lot.size} />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} />
              </mesh>
            ) : null}
          </Physics>
        </Suspense>
      </Canvas>
    </Contexto.Provider>
  )
}

function GardenVisuals({ house }: { house: MoradaHouse }) {
  const save = useEstado((s) => s.salvamento)
  const visit = useEstado((s) => s.visita)
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 2000)
    return () => clearInterval(timer)
  }, [])
  const plots = visit?.horta ?? save.horta
  return (
    <>
      {house.instances
        .filter(
          (i) =>
            MORADA_CATALOG.pieces[i.pieceId] && isPlantingPiece(MORADA_CATALOG.pieces[i.pieceId]!),
        )
        .map((instance) => {
          const plot = plots.find((p) => p.id === plantingId(instance.id))
          if (!plot?.semente) return null
          const phase = estagio(plot, now, geladeiraEm(save))
          if (phase === 'vazio' || phase === 'semente') return null
          const t = moradaTransform(house, instance)
          const growth = Math.max(0.25, Math.min(1, progresso(plot, now, geladeiraEm(save))))
          const pieceId =
            plot.semente === 'milho'
              ? 'cidade/fazenda/milho_pe_solto'
              : plot.semente === 'tomate'
                ? 'cidade/fazenda/canteiro_tomate_estaqueado'
                : 'cidade/fazenda/repolho_solto'
          return (
            <group key={instance.id} position={t.position} rotation-y={t.rotation}>
              <group
                scale={[
                  plot.semente === 'tomate' ? 0.85 : 1,
                  growth,
                  plot.semente === 'tomate' ? 0.85 : 1,
                ]}
              >
                <MoradaPieceView
                  instance={{
                    id: `crop-${instance.id}`,
                    pieceId,
                    position: [0, plot.semente === 'tomate' ? 0.08 : 0.25, 0],
                    rotation: 0,
                  }}
                />
              </group>
            </group>
          )
        })}
    </>
  )
}

function FunctionalAppearances({
  house,
  roots,
}: {
  house: MoradaHouse
  roots: ReadonlyMap<string, Object3D>
}) {
  const projects = useEstado((s) => s.salvamento.projetos)
  const visiting = useEstado((s) => s.visita !== null)
  if (visiting) return null
  return (
    <>
      {house.instances.map((instance) => {
        const object = moradaFunction(instance)
        const root = roots.get(instance.id)
        return object && root ? (
          <group key={instance.id}>
            <MoradaAppearance
              object={object}
              appearance={projects[object]?.aparencia ?? null}
              model={root}
            />
            <MoradaFunctionDecor object={object} model={root} />
          </group>
        ) : null
      })}
    </>
  )
}

function EditorCamera() {
  return (
    <OrbitControls
      makeDefault
      minDistance={4}
      maxDistance={55}
      maxPolarAngle={Math.PI / 2.1}
      target={[0, 0, 0]}
    />
  )
}

/** Origem mundial dos nós reais: filhos acompanham o slot e a parte animada do pai. */
function Collision({
  house,
  loaded,
}: {
  house: MoradaHouse
  loaded: ReadonlyMap<string, Object3D>
}) {
  return (
    <>
      {house.instances.map((instance) => {
        const piece = MORADA_CATALOG.pieces[instance.pieceId]
        if (!piece) return null
        return (
          <PieceCollision
            key={instance.id}
            instance={instance}
            house={house}
            piece={piece}
            root={loaded.get(instance.id)}
          />
        )
      })}
    </>
  )
}

function PieceCollision({
  instance,
  house,
  piece,
  root,
}: {
  instance: MoradaInstance
  house: MoradaHouse
  piece: MoradaPiece
  root?: Object3D
}) {
  const transform = moradaTransform(house, instance)
  return (
    <>
      {piece.colliders.map((box) => (
        <MovingBox
          key={`${box.part ?? ''}:${box.center.join(',')}:${box.size.join(',')}`}
          root={root}
          part={box.part}
          center={box.center}
          size={box.size}
          fallbackPosition={transform.position}
          fallbackRotation={transform.rotation}
        />
      ))}
      {root && piece.collisionMeshes.length ? (
        <AuthoredMeshes root={root} names={piece.collisionMeshes} />
      ) : null}
    </>
  )
}

function MovingBox({
  root,
  part,
  center,
  size,
  fallbackPosition,
  fallbackRotation,
}: {
  root?: Object3D
  part?: string
  center: [number, number, number]
  size: [number, number, number]
  fallbackPosition: [number, number, number]
  fallbackRotation: number
}) {
  const body = useRef<RapierRigidBody>(null)
  const point = useMemo(() => new Vector3(), [])
  const rotation = useMemo(() => new Quaternion(), [])
  const restInverse = useMemo(() => {
    const node = part && root?.getObjectByName(part)
    if (!node || !root) return null
    root.updateWorldMatrix(true, true)
    return new Matrix4().copy(node.matrixWorld).invert().multiply(root.matrixWorld)
  }, [root, part])
  useBeforePhysicsStep(() => {
    if (!body.current || !root) return
    root.updateWorldMatrix(true, true)
    const node = part ? (root.getObjectByName(part) ?? root) : root
    point.fromArray(center)
    if (restInverse) point.applyMatrix4(restInverse)
    node.localToWorld(point)
    node.getWorldQuaternion(rotation)
    body.current.setNextKinematicTranslation(point)
    body.current.setNextKinematicRotation(rotation)
  })
  const offset = useMemo(
    () =>
      new Vector3(...center)
        .applyAxisAngle(new Vector3(0, 1, 0), fallbackRotation)
        .add(new Vector3(...fallbackPosition))
        .toArray(),
    [center, fallbackPosition, fallbackRotation],
  )
  return (
    <RigidBody
      ref={body}
      type="kinematicPosition"
      colliders={false}
      position={offset}
      rotation={[0, fallbackRotation, 0]}
    >
      <CuboidCollider args={[size[0] / 2, size[1] / 2, size[2] / 2]} />
    </RigidBody>
  )
}

function AuthoredMeshes({ root, names }: { root: Object3D; names: string[] }) {
  const meshes = useMemo(() => authoredColliderShapes(root, names), [root, names])
  return (
    <>
      {meshes.map((mesh) => (
        <AuthoredMeshCollider key={mesh.name} shape={mesh} />
      ))}
    </>
  )
}

function AuthoredMeshCollider({ shape }: { shape: AuthoredColliderShape }) {
  const body = useRef<RapierRigidBody>(null)
  const position = useMemo(() => new Vector3(), [])
  const rotation = useMemo(() => new Quaternion(), [])
  const initial = useMemo(() => {
    shape.node.updateWorldMatrix(true, false)
    return {
      position: shape.node.getWorldPosition(new Vector3()).toArray(),
      quaternion: shape.node.getWorldQuaternion(new Quaternion()).toArray(),
    }
  }, [shape.node])
  useBeforePhysicsStep(() => {
    if (body.current) syncAuthoredCollider(shape.node, body.current, position, rotation)
  })
  return (
    <RigidBody
      ref={body}
      type="kinematicPosition"
      colliders={false}
      position={initial.position}
      quaternion={initial.quaternion}
    >
      <TrimeshCollider args={[shape.vertices, shape.indices]} />
    </RigidBody>
  )
}

function NativeActor({
  house,
  blocked,
  ready,
}: {
  house: MoradaHouse
  blocked: boolean
  ready: boolean
}) {
  const { controle, loja, plataforma, interativos } = useJogo()
  const casa = casaMoradaStore(loja, plataforma)
  const conforto = lojaDoConforto(loja)
  const canvas = useThree((state) => state.gl.domElement)
  useEffect(() => {
    canvas.tabIndex = 0
    canvas.setAttribute('aria-label', 'Área 3D da casa')
    const focus = () => canvas.focus({ preventScroll: true })
    focus()
    canvas.addEventListener('pointerdown', focus)
    return () => canvas.removeEventListener('pointerdown', focus)
  }, [canvas])
  const { world, rapier } = useRapier()
  const body = useRef<RapierRigidBody>(null)
  const visual = useRef<Group>(null)
  const rig = useRef<Group>(null)
  const camera = useRef<ComponentRef<typeof OrbitControls>>(null)
  const spawn = useMemo<[number, number, number]>(() => [0, nativeBody.centerToFoot + 0.06, 0], [])
  const arrival = useRef(0)
  const usages = useRef(controle.usar)
  const recenter = useRef(controle.recentrar)
  const resting = useRef<string | null>(null)
  const velocity = useRef(0)
  const pulos = useRef(controle.pulos)
  const moving = useRef<EntradaDaLocomocao>({
    velocidade: 0,
    noChao: true,
    velY: 0,
    nadando: false,
    especial: null,
  })
  const horizontal = useRef({ x: 0, z: 0 })
  const kcc = useMemo(() => {
    const c = world.createCharacterController(0.02)
    c.enableAutostep(MORADA_NATIVE.step, 0.1, true)
    c.enableSnapToGround(0.25)
    c.setMaxSlopeClimbAngle(Math.PI / 6)
    c.setMinSlopeSlideAngle(Math.PI / 3)
    return c
  }, [world])
  useEffect(() => () => world.removeCharacterController(kcc), [world, kcc])
  useEffect(() => () => loja.getState().definirAlvo(null), [loja])
  useBeforePhysicsStep(() => {
    const b = body.current
    if (!b || blocked || jogoPausadoNaMorada(loja.getState()) || !ready) {
      if (b) b.setNextKinematicTranslation(b.translation())
      usages.current = controle.usar
      pulos.current = controle.pulos
      return
    }
    // Aguarda o primeiro passo atualizar as estruturas de consulta do Rapier.
    if (arrival.current === 0) {
      arrival.current = 1
      return
    }
    if (arrival.current === 1) {
      const point = findMoradaSpawn(house, (p) => moradaCapsuleFree(world, rapier, p, b.handle))
      if (!point) {
        casa.setState({ error: 'Deixe uma chegada livre no lote antes de entrar em Viver.' })
        arrival.current = 3
        return
      }
      b.setTranslation({ x: point[0], y: point[1], z: point[2] }, true)
      b.setNextKinematicTranslation({ x: point[0], y: point[1], z: point[2] })
      arrival.current = 2
      if (visual.current) visual.current.visible = true
    }
    if (arrival.current !== 2) return
    const current = b.translation()
    const target = maisPerto(interativos, current.x, current.z, false, false, current.y)
    loja.getState().definirAlvo(target)
    const used = controle.usar !== usages.current
    usages.current = controle.usar
    if (loja.getState().descanso) {
      const rest = casa.getState().resting
      const instance = house.instances.find((i) => i.id === rest?.instanceId)
      const pose = rest && instance && moradaRestPose(house, instance, rest.mode)
      if (!pose || controle.eixoX || controle.eixoZ || used || controle.pulos !== pulos.current) {
        casa.getState().stopRest()
      } else {
        if (resting.current !== rest.instanceId) {
          const candidates = [...pose.candidates].sort(
            (a, c) =>
              (a[0] - current.x) ** 2 +
              (a[2] - current.z) ** 2 -
              ((c[0] - current.x) ** 2 + (c[2] - current.z) ** 2),
          )
          const point = candidates.find(
            (p) =>
              Math.abs(p[0]) < house.lot.size[0] / 2 - nativeBody.radius &&
              Math.abs(p[2]) < house.lot.size[1] / 2 - nativeBody.radius &&
              moradaCapsuleFree(world, rapier, p, b.handle),
          )
          if (!point) {
            casa.getState().stopRest()
            return
          }
          b.setTranslation({ x: point[0], y: point[1], z: point[2] }, true)
          b.setNextKinematicTranslation({ x: point[0], y: point[1], z: point[2] })
          resting.current = rest.instanceId
        }
        const p = b.translation()
        visual.current?.position.set(
          pose.visual[0] - p.x,
          pose.visual[1] - p.y,
          pose.visual[2] - p.z,
        )
        if (visual.current) visual.current.rotation.y = pose.rotation
        horizontal.current = { x: 0, z: 0 }
        velocity.current = 0
        moving.current = { ...moving.current, velocidade: 0, velY: 0, especial: rest.mode }
        return
      }
    }
    resting.current = null
    if (casa.getState().resting) casa.getState().stopRest()
    visual.current?.position.set(0, -nativeBody.centerToFoot - 0.02, 0)
    if (used && target) {
      interativos.get(target.id)?.agir()
      if (loja.getState().painelAberto !== PAINEL_DA_MORADA) return
    }
    const dt = 1 / 60
    const position = b.translation()
    const x = controle.eixoX
    const z = -controle.eixoZ
    const magnitude = Math.max(1, Math.hypot(x, z))
    const speed = controle.correr ? MORADA_NATIVE.run : MORADA_NATIVE.walk
    const angle = camera.current?.getAzimuthalAngle() ?? 0
    const targetX = ((x * Math.cos(angle) + z * Math.sin(angle)) * speed) / magnitude
    const targetZ = ((-x * Math.sin(angle) + z * Math.cos(angle)) * speed) / magnitude
    const easing = 1 - Math.exp(-(x || z ? 3.5 : 5) * dt)
    horizontal.current.x += (targetX - horizontal.current.x) * easing
    horizontal.current.z += (targetZ - horizontal.current.z) * easing
    const { x: dx, z: dz } = horizontal.current
    if (controle.pulos !== pulos.current && kcc.computedGrounded())
      velocity.current = MORADA_NATIVE.jump
    pulos.current = controle.pulos
    velocity.current -= MORADA_NATIVE.gravity * dt
    const collider = b.collider(0)
    if (!collider) return
    kcc.computeColliderMovement(
      collider,
      { x: dx * dt, y: velocity.current * dt, z: dz * dt },
      rapier.QueryFilterFlags.EXCLUDE_SENSORS,
      undefined,
      (other) => other.parent()?.handle !== b.handle,
    )
    const movement = kcc.computedMovement()
    if (kcc.computedGrounded() && velocity.current < 0) velocity.current = 0
    const nextPosition = {
      x: Math.max(
        -house.lot.size[0] / 2 + 0.3,
        Math.min(house.lot.size[0] / 2 - 0.3, position.x + movement.x),
      ),
      y: position.y + movement.y,
      z: Math.max(
        -house.lot.size[1] / 2 + 0.3,
        Math.min(house.lot.size[1] / 2 - 0.3, position.z + movement.z),
      ),
    }
    b.setNextKinematicTranslation(nextPosition)
    const actualX = nextPosition.x - position.x
    const actualZ = nextPosition.z - position.z
    moving.current = {
      velocidade: Math.hypot(actualX, actualZ) / dt,
      noChao: kcc.computedGrounded(),
      velY: velocity.current,
      nadando: false,
      especial: null,
    }
    if (visual.current && moving.current.velocidade > 0.05) {
      const target = Math.atan2(actualX, actualZ)
      const turn = Math.atan2(
        Math.sin(target - visual.current.rotation.y),
        Math.cos(target - visual.current.rotation.y),
      )
      visual.current.rotation.y += turn * (1 - Math.exp(-9 * dt))
    }
  })
  useFrame((_, delta) => {
    const p = body.current?.translation()
    const controls = camera.current
    if (!p || !controls) return
    const target = new Vector3(p.x, p.y + 0.3, p.z)
    const offset = target.clone().sub(controls.target)
    controls.object.position.add(offset)
    controls.target.copy(target)
    if (!blocked || loja.getState().painelAberto === 'foto') {
      const prefs = conforto.getState().conforto
      const k = MULTIPLICADOR_DA_RAPIDEZ[prefs.rapidez]
      const dt = Math.min(delta, 0.1)
      const commanded =
        controle.cameraX !== 0 || controle.cameraY !== 0 || recenter.current !== controle.recentrar
      const damping = controls.enableDamping
      // Os setters já aplicam um ângulo absoluto. O amortecimento do arraste
      // reduziria novamente cada passo do analógico e atrasaria o recentralizar.
      if (commanded) controls.enableDamping = false
      if (controle.cameraX)
        controls.setAzimuthalAngle(
          controls.getAzimuthalAngle() - controle.cameraX * CAMERA.giroDoAnalogico * k * dt,
        )
      if (controle.cameraY)
        controls.setPolarAngle(
          Math.max(
            0.1,
            Math.min(
              Math.PI / 2,
              controls.getPolarAngle() +
                controle.cameraY *
                  CAMERA.inclinacaoDoAnalogico *
                  k *
                  (prefs.inverterVertical ? -1 : 1) *
                  dt,
            ),
          ),
        )
      if (recenter.current !== controle.recentrar) {
        recenter.current = controle.recentrar
        controls.setAzimuthalAngle((visual.current?.rotation.y ?? 0) + Math.PI)
      }
      if (commanded) {
        controls.update()
        controls.enableDamping = damping
      }
    }
    controls.update()
  })
  return (
    <>
      <RigidBody
        ref={body}
        type="kinematicPosition"
        colliders={false}
        position={spawn}
        enabledRotations={[false, false, false]}
      >
        <CapsuleCollider args={[nativeBody.halfHeight, nativeBody.radius]} />
        <group ref={visual} visible={false} position={[0, -nativeBody.centerToFoot - 0.02, 0]}>
          <PackRigBoundary>
            <Suspense fallback={null}>
              <NativeRig rig={rig} moving={moving} blocked={blocked} />
            </Suspense>
          </PackRigBoundary>
        </group>
      </RigidBody>
      <OrbitControls
        ref={camera}
        makeDefault
        minDistance={2}
        maxDistance={12}
        maxPolarAngle={Math.PI / 2}
      />
    </>
  )
}

const nativeLocomotion = { escala: 1, andar: MORADA_NATIVE.walk, correr: MORADA_NATIVE.run }

function NativeRig({
  rig,
  moving,
  blocked,
}: {
  rig: RefObject<Group | null>
  moving: RefObject<EntradaDaLocomocao>
  blocked: boolean
}) {
  const { loja } = useJogo()
  const slots = useEstado((s) => s.avatar.slots)
  const avatar = useMemo(() => avatarDoPack(slots), [slots])
  const actions = useRef<Record<string, AnimationAction | null>>({})
  const clips = useClipesDoJogo()
  const locomotion = useRef(criarLocomocao())
  const pose = useRef(criarPoseDosClipes())
  const onAnimations = useCallback((all: Record<string, AnimationAction | null>) => {
    actions.current = all
    for (const [id, action] of Object.entries(all)) {
      if (!action) continue
      action.setEffectiveWeight(id === nomeNoJogo('parado_relaxado') ? 1 : 0)
      action.play()
      action.setEffectiveTimeScale(0)
    }
  }, [])
  useFrame((_, delta) => {
    if (blocked || jogoPausadoNaMorada(loja.getState())) return
    const state = passoDaLocomocao(
      locomotion.current,
      moving.current,
      Math.min(delta, 0.1),
      nativeLocomotion,
    )
    const current = poseDosClipes(state, pose.current)
    for (const id of CLIPES_DO_JOGO) {
      const action = actions.current[nomeNoJogo(id)]
      if (!action) continue
      action.setEffectiveWeight(current[id].peso)
      action.time = Math.min(current[id].tempo, action.getClip().duration)
    }
  })
  const onStood = () => {
    const group = rig.current
    if (!group?.parent) return
    const world = new Vector3(-group.position.x, -group.position.y, -group.position.z)
    group.parent.updateWorldMatrix(true, false)
    const local = group.parent.worldToLocal(world)
    group.position.set(-local.x, -local.y, -local.z)
  }
  return (
    <PackAvatarRig
      slots={avatar}
      charRef={rig}
      extraClips={clips}
      onAnimations={onAnimations}
      onStood={onStood}
    />
  )
}
