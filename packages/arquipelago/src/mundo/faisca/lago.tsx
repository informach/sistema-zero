import { useFrame } from '@react-three/fiber'
import { RigidBody, TrimeshCollider } from '@react-three/rapier'
import { useEffect, useMemo } from 'react'
import {
  CircleGeometry,
  type Material,
  type Mesh,
  MeshStandardMaterial,
  type Texture,
  Vector3,
} from 'three'
import { LAGO_DA_FAISCA, materialSolidoDoLago } from '../../sistemas/lago-da-faisca'
import type { ArteDoPiloto } from './carregar-piloto'
import { QuedaDoLago } from './queda-do-lago'

/** L1 conserva a forma/nível anteriores e usa somente o material de água do catálogo. */
export function LagoComFormaAtual({ arte }: { arte: ArteDoPiloto }) {
  const { geo, material } = useMemo(() => {
    let origem: Material | null = null
    arte.modelos.get('agua_ilha_pacote')!.scene.traverse((o) => {
      const m = o as Mesh
      if (m.isMesh && !origem) origem = Array.isArray(m.material) ? m.material[0]! : m.material
    })
    if (!origem) throw Error('Material de água Adventure Land ausente')
    return { material: (origem as Material).clone(), geo: new CircleGeometry(1, 64) }
  }, [arte])
  useEffect(
    () => () => {
      geo.dispose()
      material.dispose()
    },
    [geo, material],
  )
  return (
    <mesh
      geometry={geo}
      material={material}
      position={[LAGO_DA_FAISCA.x, 3.65, LAGO_DA_FAISCA.z]}
      rotation={[-Math.PI / 2, 0, 0]}
      scale={[8, 4, 1]}
      dispose={null}
    />
  )
}

export function LagoDaFaisca({ arte, aventura }: { arte: ArteDoPiloto; aventura: boolean }) {
  const preparado = useMemo(() => {
    const raiz = arte.modelos.get('lago_nadavel')!.scene.clone(true)
    const materiais: Material[] = [],
      texturas: Texture[] = [],
      moveis: { tex: Texture; x: number; y: number }[] = [],
      ondas: Mesh[] = []
    const colisores: { id: string; vertices: Float32Array; indices: Uint32Array }[] = []
    let alternativa: Material | null = null
    if (aventura)
      arte.modelos.get('agua_ilha_pacote')!.scene.traverse((o) => {
        const m = o as Mesh
        if (m.isMesh && !alternativa)
          alternativa = Array.isArray(m.material) ? m.material[0]! : m.material
      })
    raiz.updateMatrixWorld(true)
    raiz.traverse((o) => {
      const m = o as Mesh
      if (!m.isMesh) return
      const original = Array.isArray(m.material) ? m.material[0]! : m.material,
        nome = original.name
      const material = (
        nome === 'agua' && alternativa ? alternativa : original
      ).clone() as Material & { map?: Texture; normalMap?: Texture; depthWrite: boolean }
      materiais.push(material)
      if (materialSolidoDoLago(nome) && material instanceof MeshStandardMaterial) {
        material.onBeforeCompile = (s) => {
          s.fragmentShader = s.fragmentShader.replace(
            '#include <map_fragment>',
            '#include <map_fragment>\nfloat margemVerde=smoothstep(0.015,0.09,diffuseColor.g-diffuseColor.r)*smoothstep(0.02,0.12,diffuseColor.g-diffuseColor.b);\nfloat margemValor=dot(diffuseColor.rgb,vec3(0.2126,0.7152,0.0722));\ndiffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.28,0.40,0.15)*(0.75+0.5*margemValor),margemVerde*0.8);',
          )
        }
        material.customProgramCacheKey = () => 'faisca-margens-integradas-1'
      }
      m.material = material
      m.receiveShadow = materialSolidoDoLago(nome)
      m.castShadow = false
      if (['agua', 'espuma', 'caustica', 'cor_2_brilho'].includes(nome)) material.depthWrite = false
      for (const [chave, x, y] of (nome === 'agua'
        ? [['normalMap', 0.01, 0.006]]
        : nome === 'espuma'
          ? [['map', 0.03, 0]]
          : nome === 'caustica'
            ? [['map', 0.02, 0.015]]
            : []) as ['map' | 'normalMap', number, number][]) {
        if (material[chave]) {
          const tex = material[chave]!.clone()
          material[chave] = tex
          texturas.push(tex)
          moveis.push({ tex, x, y })
        }
      }
      if (m.morphTargetInfluences) ondas.push(m)
      if (!materialSolidoDoLago(nome)) return
      const pos = m.geometry.getAttribute('position'),
        vertices = new Float32Array(pos.count * 3),
        v = new Vector3()
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld)
        vertices.set(v.toArray(), i * 3)
      }
      const indices = m.geometry.index
        ? new Uint32Array(m.geometry.index.array)
        : Uint32Array.from({ length: pos.count }, (_, i) => i)
      colisores.push({ id: m.uuid, vertices, indices })
    })
    return { raiz, materiais, texturas, moveis, ondas, colisores }
  }, [arte, aventura])
  useEffect(
    () => () => {
      for (const m of preparado.materiais) m.dispose()
      for (const t of preparado.texturas) t.dispose()
    },
    [preparado],
  )
  useFrame(({ clock }) => {
    for (const p of preparado.moveis)
      p.tex.offset.set(clock.elapsedTime * p.x, clock.elapsedTime * p.y)
    const peso = 0.5 - 0.5 * Math.cos((clock.elapsedTime * Math.PI * 2) / 3)
    for (const m of preparado.ondas) m.morphTargetInfluences![0] = peso
  })
  return (
    <>
      <RigidBody
        type="fixed"
        colliders={false}
        position={[LAGO_DA_FAISCA.x, LAGO_DA_FAISCA.origem, LAGO_DA_FAISCA.z]}
      >
        <primitive object={preparado.raiz} dispose={null} />
        {preparado.colisores.map((p) => (
          <TrimeshCollider key={p.id} args={[p.vertices, p.indices]} />
        ))}
      </RigidBody>
      <QuedaDoLago arte={arte} />
    </>
  )
}
