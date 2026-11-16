import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { BoxGeometry, type InstancedMesh, MeshStandardMaterial, Object3D } from 'three'
import { assentamentoDaPeca } from '../../sistemas/assentamento-da-faisca'
import { COMPOSICAO_DA_FAISCA } from '../../sistemas/composicao-faisca'
import { ARTE_DA_FAISCA } from './arte.generated'

interface Bloco {
  p: [number, number, number]
  s: [number, number, number]
  cor: string
  giro?: number
}
function partesDaVila() {
  const partes: Bloco[] = []
  // Selo ambiental da coroa nas peças recolhidas, sem conceder objetos ou missão.
  for (const p of COMPOSICAO_DA_FAISCA.filter(
    (p) => !p.apoio && (p.id.startsWith('caixa-') || p.id === 'pecas-recolhidas'),
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
/** Selos da coroa nas caixas; mobiliário e barreira usam as peças reais da coleção. */
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
    </>
  )
}
