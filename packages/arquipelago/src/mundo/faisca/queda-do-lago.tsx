import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import {
  BufferGeometry,
  DoubleSide,
  Float32BufferAttribute,
  type Material,
  type Mesh,
  MeshStandardMaterial,
  Raycaster,
  RingGeometry,
  type Texture,
  Vector3,
} from 'three'
import { assentamentoDaPeca, pisoDaFaisca } from '../../sistemas/assentamento-da-faisca'
import { COMPOSICAO_DA_FAISCA } from '../../sistemas/composicao-faisca'
import { LAGO_DA_FAISCA, pontoNoContorno } from '../../sistemas/lago-da-faisca'
import type { ArteDoPiloto } from './carregar-piloto'

/** Ligação visual da nascente à bacia, com materiais do próprio lago e apoio nas rochas reais. */
export function QuedaDoLago({ arte }: { arte: ArteDoPiloto }) {
  const p = useMemo(() => {
    const rochas = COMPOSICAO_DA_FAISCA.filter((p) => p.id.startsWith('margem-rocha-')).map((p) => {
      const glb = arte.modelos.get(p.peca)
      if (!glb) throw Error(`Rocha da nascente não carregada: ${p.peca}`)
      const obj = glb.scene.clone(true)
      obj.position.set(p.x, assentamentoDaPeca(p).y, p.z)
      obj.rotation.y = p.giro
      obj.scale.setScalar(p.escala)
      obj.updateMatrixWorld(true)
      return obj
    })
    const ray = new Raycaster(),
      nivel = LAGO_DA_FAISCA.agua.y,
      pontos: Vector3[] = []
    for (let i = 0; i <= 40; i++) {
      const t = i / 40,
        x = 35.1 + 2.2 * t,
        z = 121.1 + 4 * t
      ray.set(new Vector3(x, 16, z), new Vector3(0, -1, 0))
      const hit = ray.intersectObjects(rochas, true)[0],
        solo = pontoNoContorno(LAGO_DA_FAISCA.furo, x, z) ? nivel : pisoDaFaisca(x, z)
      pontos.push(
        new Vector3(
          x,
          Math.max(nivel + 0.025, solo + 0.02, hit ? hit.point.y + 0.025 : -Infinity),
          z,
        ),
      )
    }
    const pos: number[] = [],
      uv: number[] = [],
      idx: number[] = []
    let distancia = 0
    for (let i = 0; i < pontos.length; i++) {
      const a = pontos[i]!,
        t = i / (pontos.length - 1),
        largura = 0.36 + 0.1 * Math.sin(t * Math.PI)
      if (i) distancia += a.distanceTo(pontos[i - 1]!)
      for (const lado of [-1, 1]) {
        pos.push(a.x + lado * largura, a.y, a.z - lado * largura * 0.55)
        uv.push(lado === -1 ? 0 : 1, distancia)
      }
      if (i) {
        const k = 2 * i
        idx.push(k - 2, k - 1, k, k - 1, k + 1, k)
      }
    }
    const geo = new BufferGeometry()
      .setAttribute('position', new Float32BufferAttribute(pos, 3))
      .setAttribute('uv', new Float32BufferAttribute(uv, 2))
      .setIndex(idx)
    geo.computeVertexNormals()
    geo.computeBoundingSphere()
    let agua: MeshStandardMaterial | null = null,
      espuma: Material | null = null
    arte.modelos.get('lago_nadavel')!.scene.traverse((o) => {
      const m = o as Mesh
      if (!m.isMesh) return
      for (const mat of Array.isArray(m.material) ? m.material : [m.material]) {
        if (mat.name === 'agua' && mat instanceof MeshStandardMaterial) agua = mat
        if (mat.name === 'espuma') espuma = mat
      }
    })
    if (!agua || !espuma) throw Error('Materiais da nascente ausentes no lago')
    const material = (agua as MeshStandardMaterial).clone(),
      foam = (espuma as Material).clone()
    material.side = DoubleSide
    material.depthWrite = false
    material.transparent = true
    material.opacity = 0.82
    const texturas: Texture[] = []
    for (const chave of ['map', 'normalMap'] as const)
      if (material[chave]) {
        const tex = material[chave]!.clone()
        material[chave] = tex
        texturas.push(tex)
      }
    foam.depthWrite = false
    foam.transparent = true
    foam.opacity = 0.7
    const anel = new RingGeometry(0.15, 0.7, 32)
    return { geo, material, foam, anel, texturas, final: pontos.at(-1)! }
  }, [arte])
  useEffect(
    () => () => {
      p.geo.dispose()
      p.material.dispose()
      p.foam.dispose()
      p.anel.dispose()
      for (const t of p.texturas) t.dispose()
    },
    [p],
  )
  useFrame(({ clock }) => {
    for (const t of p.texturas) t.offset.y = -clock.elapsedTime * 0.16
  })
  return (
    <>
      <mesh geometry={p.geo} material={p.material} dispose={null} />
      <mesh
        geometry={p.anel}
        material={p.foam}
        position={[p.final.x, LAGO_DA_FAISCA.agua.y + 0.018, p.final.z]}
        rotation={[-Math.PI / 2, 0, 0]}
        dispose={null}
      />
    </>
  )
}
