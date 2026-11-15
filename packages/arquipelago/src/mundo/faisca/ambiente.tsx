import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { BoxGeometry, type InstancedMesh, MeshStandardMaterial, Object3D } from 'three'
import {
  assentamentoDaPeca,
  baseDoVolume,
  pisoDaFaisca,
} from '../../sistemas/assentamento-da-faisca'
import { COMPOSICAO_DA_FAISCA } from '../../sistemas/composicao-faisca'
import { VOLUMES_DA_VILA } from '../../sistemas/implantacao-da-faisca'
import { ARTE_DA_FAISCA } from './arte.generated'

interface Bloco {
  p: [number, number, number]
  s: [number, number, number]
  cor: string
  giro?: number
}
function partesDaVila() {
  const partes: Bloco[] = []
  for (const v of VOLUMES_DA_VILA) {
    if (v.id === 'correio' || v.id === 'bancada') continue
    const y = baseDoVolume(v).alto
    const por = (
      x: number,
      h: number,
      z: number,
      w: number,
      a: number,
      d: number,
      cor = '#855935',
      giro = 0,
    ) => partes.push({ p: [v.x + x, y + h, v.z + z], s: [w, a, d], cor, giro })
    if (v.id === 'quadro') {
      for (const x of [-0.75, 0.75]) {
        const base = pisoDaFaisca(v.x + x, v.z),
          altura = y + 1.6 - base
        por(x, base - y + altura / 2, 0, 0.12, altura, 0.12)
      }
      por(0, 1.1, 0, 1.8, 1.1, 0.14)
      por(0, 1.12, 0.09, 1.6, 0.91, 0.04, '#e7d6ad')
      for (let i = 0; i < 6; i++)
        por(
          ((i % 3) - 1) * 0.46,
          1.33 - Math.floor(i / 3) * 0.42,
          0.13,
          0.32,
          0.28,
          0.03,
          '#cc9d42',
        )
    } else if (v.id === 'lacre') {
      for (const x of [-2.7, 2.7]) por(x, 0.8, 0, 0.22, 1.6, 0.25)
      for (const giro of [-0.19, 0.19]) por(0, 0.8, 0, 5.6, 0.22, 0.2, '#9a6c45', giro)
      por(0, 0.83, 0.15, 0.65, 0.7, 0.08, '#8e3a34')
      por(0, 0.84, 0.21, 0.4, 0.16, 0.03, '#e1b34b')
      for (const x of [-0.15, 0, 0.15]) por(x, 1, 0.21, 0.09, 0.18, 0.03, '#e1b34b')
    } else {
      const h = 0.44
      por(0, h, 0, v.largura, 0.15, v.profundidade)
      for (const x of [-v.largura / 2 + 0.2, v.largura / 2 - 0.2]) {
        const base = pisoDaFaisca(v.x + x, v.z),
          altura = y + h - base
        por(x, base - y + altura / 2, 0, 0.16, altura, v.profundidade * 0.7, '#644b34')
      }
      por(0, 0.8, -0.28, v.largura, 0.32, 0.12, '#b58b52')
    }
  }
  // Selo ambiental da coroa nas peças recolhidas, sem conceder objetos ou missão.
  for (const p of COMPOSICAO_DA_FAISCA.filter(
    (p) => p.id.startsWith('caixa-') || p.id === 'pecas-recolhidas',
  )) {
    const caixa = ARTE_DA_FAISCA.pecas[p.peca as keyof typeof ARTE_DA_FAISCA.pecas].colisao[0]
    const y = assentamentoDaPeca(p).y + 0.45,
      z = p.z + caixa.max[2] * p.escala + 0.015
    partes.push({ p: [p.x, y, z], s: [0.3, 0.08, 0.025], cor: '#e1b34b' })
    for (const x of [-0.1, 0, 0.1])
      partes.push({ p: [p.x + x, y + 0.08, z], s: [0.06, 0.12, 0.025], cor: '#e1b34b' })
  }
  return partes
}
function Blocos({
  cor,
  partes,
  geometria,
}: {
  cor: string
  partes: Bloco[]
  geometria: BoxGeometry
}) {
  const ref = useRef<InstancedMesh>(null)
  const material = useMemo(() => new MeshStandardMaterial({ color: cor, roughness: 0.9 }), [cor])
  useEffect(() => () => material.dispose(), [material])
  useLayoutEffect(() => {
    const mesh = ref.current!,
      o = new Object3D()
    partes.forEach((b, i) => {
      o.position.set(...b.p)
      o.scale.set(...b.s)
      o.rotation.z = b.giro ?? 0
      o.updateMatrix()
      mesh.setMatrixAt(i, o.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
    return () => mesh.dispose()
  }, [partes])
  return (
    <instancedMesh
      ref={ref}
      args={[geometria, material, partes.length]}
      castShadow
      receiveShadow
      dispose={null}
    />
  )
}
/** Carpintaria de referência: forma/função em teste, sem interação de campanha. */
export function AmbienteDaVila() {
  const { grupos, geo } = useMemo(() => {
    const grupos = new Map<string, Bloco[]>()
    for (const p of partesDaVila()) {
      if (!grupos.has(p.cor)) grupos.set(p.cor, [])
      grupos.get(p.cor)!.push(p)
    }
    return { grupos, geo: new BoxGeometry(1, 1, 1) }
  }, [])
  useEffect(() => () => geo.dispose(), [geo])
  return (
    <>
      {[...grupos].map(([cor, partes]) => (
        <Blocos key={cor} cor={cor} partes={partes} geometria={geo} />
      ))}
      {VOLUMES_DA_VILA.filter((v) => v.id !== 'correio' && v.id !== 'bancada').map((v) => {
        const b = baseDoVolume(v),
          h = v.altura + b.alto - b.baixo
        return (
          <RigidBody key={v.id} type="fixed" colliders={false} position={[v.x, b.baixo, v.z]}>
            <CuboidCollider
              args={[v.largura / 2, h / 2, v.profundidade / 2]}
              position={[0, h / 2, 0]}
            />
          </RigidBody>
        )
      })}
    </>
  )
}
