import { CapsuleCollider } from '@react-three/rapier'
import { capsulaDoEspaco, type EspacoDoBicho } from '../sistemas/espaco-dos-bichos'
import { GRUPO_SO_DO_CORPO } from './grupos'

export function ColisorDoEspaco({ espaco, pe = 0 }: { espaco: EspacoDoBicho; pe?: number }) {
  const c = capsulaDoEspaco(espaco)
  return (
    <CapsuleCollider
      args={[c.meiaAltura, c.raio]}
      position={[0, pe + c.y, 0]}
      collisionGroups={GRUPO_SO_DO_CORPO}
    />
  )
}
