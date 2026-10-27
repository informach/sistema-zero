import { useFrame } from '@react-three/fiber'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { useMemo, useRef } from 'react'
import { BoxGeometry, EdgesGeometry, type Group } from 'three'
import { useJogo } from '../estado/contexto'
import { ITENS } from '../sistemas/itens'
import { cozinhar, RECEITAS, receitaPossivel } from '../sistemas/receitas'
import { useInterativo } from './interativos'
import { ALTURA_DA_TERRA, BANCADA } from './medidas'

/**
 * A bancada de cozinhar chega como PROJETO AZUL: já funciona (dá para cozinhar) e espera a
 * aparência que a pessoa vai fazer no Pinta ou no Molda, ou comprar pronta (fase seguinte).
 */
export function Bancada() {
  const { loja } = useJogo()
  const brilho = useRef<Group>(null)
  const caixa = useMemo(() => new BoxGeometry(2.2, 1.0, 1.0), [])
  const arestas = useMemo(() => new EdgesGeometry(caixa), [caixa])
  useFrame(({ clock }) => {
    if (brilho.current) brilho.current.position.y = 0.5 + Math.sin(clock.elapsedTime * 2) * 0.03
  })
  useInterativo('bancada', {
    x: BANCADA.x,
    z: BANCADA.z,
    raio: 2.2,
    rotulo: () => {
      const r = receitaPossivel(loja.getState().salvamento.inventario)
      return r ? `Cozinhar ${r.nome.toLowerCase()}` : 'Ver as receitas'
    },
    agir: () => {
      const s = loja.getState()
      const r = receitaPossivel(s.salvamento.inventario)
      if (!r) {
        const lista = RECEITAS.map(
          (x) =>
            `${x.nome}: ${Object.entries(x.precisa)
              .map(([id, q]) => `${q} ${ITENS[id]?.nome.toLowerCase()}`)
              .join(' e ')}`,
        ).join('. ')
        s.dizer(`Ainda falta ingrediente. ${lista}.`)
        return
      }
      s.mudar((sv) => {
        const inv = cozinhar(sv.inventario, r)
        return inv ? { ...sv, inventario: inv } : sv
      })
      s.dizer(`Ficou pronto: ${r.nome.toLowerCase()}. Clique nele embaixo para comer.`)
    },
  })
  return (
    <group position={[BANCADA.x, ALTURA_DA_TERRA, BANCADA.z]}>
      <group ref={brilho}>
        <mesh geometry={caixa}>
          <meshBasicMaterial color="#5aa9ff" transparent opacity={0.18} depthWrite={false} />
        </mesh>
        <lineSegments geometry={arestas}>
          <lineBasicMaterial color="#2f6df6" />
        </lineSegments>
      </group>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[1.1, 0.5, 0.5]} position={[0, 0.5, 0]} />
      </RigidBody>
    </group>
  )
}
