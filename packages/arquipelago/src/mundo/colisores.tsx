import {
  RigidBody,
  RoundCuboidCollider,
  RoundCylinderCollider,
  TrimeshCollider,
} from '@react-three/rapier'
import { bordaQueCabe, type ColisorDaIlha, soParaOCorpo } from './colisores-da-ilha'
import { GRUPO_SO_DO_CORPO } from './grupos'

/**
 * Um corpo fixo com os colisores da lista (no referencial do grupo onde ele está), com as bordas
 * arredondadas (o personagem escorrega pela quina em vez de enganchar). O que é fino ou macio só
 * segura o corpo e a câmera passa (`soParaOCorpo`).
 */
export function Colisores({ lista }: { lista: readonly ColisorDaIlha[] }) {
  return (
    <RigidBody type="fixed" colliders={false}>
      {lista.map((c) => {
        if (c.forma === 'malha') {
          return <TrimeshCollider key={c.nome} args={[c.vertices, c.indices]} />
        }
        const grupos = soParaOCorpo(c.nome) ? GRUPO_SO_DO_CORPO : undefined
        if (c.forma === 'cilindro') {
          const b = bordaQueCabe(c.meiaAltura, c.raio)
          return (
            <RoundCylinderCollider
              key={c.nome}
              collisionGroups={grupos}
              args={[c.meiaAltura - b, c.raio - b, b]}
              position={c.posicao}
              quaternion={c.rotacao}
            />
          )
        }
        const [x, y, z] = c.meio
        const b = bordaQueCabe(x, y, z)
        return (
          <RoundCuboidCollider
            key={c.nome}
            collisionGroups={grupos}
            args={[x - b, y - b, z - b, b]}
            position={c.posicao}
            quaternion={c.rotacao}
          />
        )
      })}
    </RigidBody>
  )
}
