// biome-ignore-all lint/a11y/noStaticElementInteractions: Picking de Three.js, também disponível pela árvore acessível do editor.
import type { ThreeEvent } from '@react-three/fiber'
import { CuboidCollider, CylinderCollider, RigidBody, TrimeshCollider } from '@react-three/rapier'
import type { InstanciaDeCenario, ModeloDeCatalogo } from '@sistemazero/molda-cenarios-core'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { type InstancedMesh, type Mesh, Vector3 } from 'three'
import { preencherInstancias } from '../mundo/faisca/instancias'
import { matrizDaInstancia } from './apoio'
import type { ArteDeCenario } from './arte'

function Lote({
  mesh,
  objetos,
  escolher,
}: {
  mesh: Mesh
  objetos: InstanciaDeCenario[]
  escolher: (id: string, multipla: boolean) => void
}) {
  const ref = useRef<InstancedMesh>(null)
  useLayoutEffect(() => {
    const m = ref.current!
    preencherInstancias(
      m,
      mesh,
      objetos.map((p) => matrizDaInstancia(p).multiply(mesh.matrixWorld)),
    )
    return () => m.dispose()
  }, [mesh, objetos])
  return (
    <instancedMesh
      ref={ref}
      args={[mesh.geometry, mesh.material, objetos.length]}
      dispose={null}
      castShadow
      receiveShadow
      onClick={(e: ThreeEvent<MouseEvent>) => {
        if (e.instanceId === undefined) return
        e.stopPropagation()
        escolher(objetos[e.instanceId]!.id, e.shiftKey)
      }}
    />
  )
}
function Colisor({
  p,
  meta,
  arte,
}: {
  p: InstanciaDeCenario
  meta: ModeloDeCatalogo
  arte: ArteDeCenario
}) {
  const malhas = useMemo(() => {
    if (!['ponte', 'escada', 'malha', 'solo'].includes(p.fisica)) return []
    const lista: { id: string; vertices: Float32Array; indices: Uint32Array }[] = [],
      g = arte.modelos.get(p.modelo)!
    g.scene.updateMatrixWorld(true)
    g.scene.traverse((o) => {
      const m = o as Mesh
      if (!m.isMesh) return
      const a = m.geometry.getAttribute('position'),
        v = new Vector3(),
        vertices = new Float32Array(a.count * 3)
      for (let i = 0; i < a.count; i++) {
        v.fromBufferAttribute(a, i)
          .applyMatrix4(m.matrixWorld)
          .multiplyScalar(p.transformacao.escala)
        vertices.set(v.toArray(), i * 3)
      }
      lista.push({
        id: m.uuid,
        vertices,
        indices: m.geometry.index
          ? new Uint32Array(m.geometry.index.array)
          : Uint32Array.from({ length: a.count }, (_, i) => i),
      })
    })
    return lista
  }, [arte, p.modelo, p.fisica, p.transformacao.escala])
  const t = p.transformacao,
    s = t.escala
  if (p.fisica === 'nenhuma') return null
  return (
    <RigidBody
      type="fixed"
      colliders={false}
      position={[t.posicao.x, t.posicao.y, t.posicao.z]}
      rotation={[t.rotacao.x, t.rotacao.y, t.rotacao.z]}
    >
      {malhas.map((m) => (
        <TrimeshCollider key={m.id} args={[m.vertices, m.indices]} />
      ))}
      {p.fisica === 'tronco' ? (
        <CylinderCollider
          args={[((meta.max[1] - meta.min[1]) * s) / 2, (p.raioDoTronco ?? 0.22) * s]}
          position={[0, ((meta.max[1] + meta.min[1]) * s) / 2, 0]}
        />
      ) : (
        p.fisica === 'caixa' &&
        (meta.colisao ?? [{ min: meta.min, max: meta.max }]).map((b) => (
          <CuboidCollider
            key={`${b.min.join(',')}:${b.max.join(',')}`}
            args={[
              ((b.max[0] - b.min[0]) * s) / 2,
              ((b.max[1] - b.min[1]) * s) / 2,
              ((b.max[2] - b.min[2]) * s) / 2,
            ]}
            position={[
              ((b.max[0] + b.min[0]) * s) / 2,
              ((b.max[1] + b.min[1]) * s) / 2,
              ((b.max[2] + b.min[2]) * s) / 2,
            ]}
          />
        ))
      )}
    </RigidBody>
  )
}
export function ObjetosDoCenario({
  objetos,
  catalogo,
  arte,
  escolher,
}: {
  objetos: InstanciaDeCenario[]
  catalogo: ReadonlyMap<string, ModeloDeCatalogo>
  arte: ArteDeCenario
  escolher: (id: string, multipla: boolean) => void
}) {
  const partes = useMemo(() => {
    const lista: { id: string; mesh: Mesh; objetos: InstanciaDeCenario[] }[] = []
    for (const [id, g] of arte.modelos) {
      const copias = objetos.filter((p) => p.modelo === id)
      if (!copias.length) continue
      g.scene.updateMatrixWorld(true)
      g.scene.traverse((o) => {
        const mesh = o as Mesh
        if (mesh.isMesh) lista.push({ id: mesh.uuid, mesh, objetos: copias })
      })
    }
    return lista
  }, [arte, objetos])
  return (
    <>
      {partes.map((p) => (
        <Lote key={p.id} {...p} escolher={escolher} />
      ))}
      {objetos.map((p) => (
        <Colisor key={p.id} p={p} meta={catalogo.get(p.modelo)!} arte={arte} />
      ))}
    </>
  )
}

export function FundacoesDoCenario({
  objetos,
  catalogo,
  altura,
}: {
  objetos: InstanciaDeCenario[]
  catalogo: ReadonlyMap<string, ModeloDeCatalogo>
  altura: (x: number, z: number) => number
}) {
  return objetos
    .filter((p) => p.fundacao)
    .map((p) => {
      const f = p.fundacao!,
        t = p.transformacao,
        s = t.escala,
        c = Math.cos(t.rotacao.y),
        sn = Math.sin(t.rotacao.y),
        m = catalogo.get(p.modelo)!
      const minX = f.min.x * s,
        maxX = f.max.x * s,
        minZ = f.min.z * s,
        maxZ = f.max.z * s
      const baixo =
          Math.min(
            ...[minX, maxX].flatMap((x) =>
              [minZ, maxZ].map((z) =>
                altura(t.posicao.x + c * x + sn * z, t.posicao.z - sn * x + c * z),
              ),
            ),
          ) - 0.12,
        topo = t.posicao.y + m.min[1] * s,
        h = topo - baixo
      if (h <= 0.015) return null
      const pos: [number, number, number] = [
          (minX + maxX) / 2,
          (baixo + topo) / 2,
          (minZ + maxZ) / 2,
        ],
        args: [number, number, number] = [(maxX - minX) / 2, h / 2, (maxZ - minZ) / 2]
      return (
        <RigidBody
          key={p.id}
          type="fixed"
          colliders={false}
          position={[t.posicao.x, 0, t.posicao.z]}
          rotation={[0, t.rotacao.y, 0]}
        >
          <mesh position={pos} receiveShadow>
            <boxGeometry args={[args[0] * 2, args[1] * 2, args[2] * 2]} />
            <meshStandardMaterial color="#8c8e7c" roughness={1} />
          </mesh>
          <CuboidCollider position={pos} args={args} />
        </RigidBody>
      )
    })
}
