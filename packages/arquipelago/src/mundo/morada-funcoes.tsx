import { createPortal, useFrame } from '@react-three/fiber'
import type { ObjetoDaCasa } from '@sistemazero/arquipelago-contracts'
import { MORADA_CATALOG } from '@sistemazero/avatar-quarto/morada/catalog'
import { MoradaPieceView } from '@sistemazero/avatar-quarto/morada/piece'
import { Suspense, useEffect, useMemo, useRef } from 'react'
import { Box3, type Group, type Object3D, Vector3 } from 'three'
import { useEstado } from '../estado/contexto'
import { PAINEL_DA_MORADA } from '../estado/morada'
import { MORADA_AQUARIUM_FISH, moradaAquariumExhibits } from '../sistemas/morada-colecoes'
import { FosseisDoMuseu } from './fosseis-do-museu'
import { materiaisDe } from './modelos'

/** Vitrine, estante e todo o conteúdo das coleções usam exclusivamente a biblioteca Morada. */
export function MoradaFunctionDecor({ object, model }: { object: ObjetoDaCasa; model: Object3D }) {
  const localSize = useMemo(() => {
    const root = model.clone(true)
    root.position.set(0, 0, 0)
    root.updateMatrixWorld(true)
    return new Box3().setFromObject(root).getSize(new Vector3())
  }, [model])
  const corals = useEstado((s) => s.salvamento.recife.corais)
  useEffect(() => {
    if (object !== 'aquario') return
    const glasses = materiaisDe(model).filter((m) => /vidro/i.test(m.name))
    const colors = glasses.map((m) => m.color.clone())
    for (const material of glasses) material.color.set('#78c5d8')
    return () => {
      glasses.forEach((material, index) => {
        material.color.copy(colors[index]!)
      })
    }
  }, [object, model])
  if (object === 'museu')
    return createPortal(
      <group
        scale={[
          Math.min(1, localSize.x / 1.472),
          localSize.y / 0.764,
          Math.min(1, localSize.z / 0.36),
        ]}
      >
        <FosseisDoMuseu />
      </group>,
      model,
    )
  if (object !== 'aquario') return null
  const visible = moradaAquariumExhibits(corals)
  return createPortal(
    <Suspense fallback={null}>
      {visible.map(({ id, index }) => (
        <AquariumFish key={id} id={id} index={index} size={localSize} />
      ))}
    </Suspense>,
    model,
  )
}

function AquariumFish({ id, index, size }: { id: string; index: number; size: Vector3 }) {
  const root = useRef<Group>(null)
  const blocked = useEstado(
    (s) =>
      s.painelAberto !== PAINEL_DA_MORADA ||
      s.menuAberto ||
      s.ferramentaAberta ||
      s.tempoAcabou ||
      s.tempoPausado,
  )
  const time = useRef(index * 1.5)
  const piece = MORADA_CATALOG.pieces[MORADA_AQUARIUM_FISH]!
  const scale = Math.min(1.5, (size.x * 0.18) / piece.size[0], (size.z * 0.5) / piece.size[2])
  useFrame((_, delta) => {
    if (blocked || !root.current) return
    time.current += Math.min(delta, 0.1)
    const phase = time.current * 0.7
    root.current.position.set(
      Math.sin(phase) * size.x * 0.2,
      size.y * (0.2 + index * 0.18),
      Math.cos(phase) * size.z * 0.15,
    )
    root.current.rotation.y = Math.atan2(Math.cos(phase) * size.x, -Math.sin(phase) * size.z)
  })
  return (
    <group ref={root} position={[0, size.y * (0.2 + index * 0.18), 0]} scale={scale}>
      <MoradaPieceView
        instance={{
          id: `aquario-${id}`,
          pieceId: MORADA_AQUARIUM_FISH,
          position: [0, 0, 0],
          rotation: 0,
        }}
        paused={blocked}
      />
    </group>
  )
}
