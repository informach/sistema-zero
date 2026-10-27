import { AvatarRig } from '@sistemazero/avatar-quarto/avatar/avatar-rig'
import { DEFAULT_AVATAR_SLOTS } from '@sistemazero/avatar-quarto/avatar/catalog'
import { Suspense, useMemo, useRef, useState } from 'react'
import { type Group, Vector3 } from 'three'
import { useEstado } from '../estado/contexto'

/**
 * O avatar da plataforma, o mesmo `AvatarRig` do Meu avatar. O rig põe os pés no chão medindo o
 * corpo em coordenadas de MUNDO e subtraindo da posição LOCAL (feito para o pódio na origem).
 * Aqui o avatar anda pelo mundo, então refazemos a conta no espaço do pai quando ele fica em pé.
 */
export function AvatarDoJogo({ pose }: { pose: string }) {
  const slotsDoJogo = useEstado((s) => s.avatar.slots)
  const slots = useMemo(() => ({ ...DEFAULT_AVATAR_SLOTS, ...slotsDoJogo }), [slotsDoJogo])
  const personagem = useRef<Group>(null)
  const [emPe, setEmPe] = useState(false)

  const aoFicarEmPe = () => {
    const g = personagem.current
    if (g?.parent) {
      // O rig deixou position = -(centro x, pé y, centro z) medidos no MUNDO.
      const noMundo = new Vector3(-g.position.x, -g.position.y, -g.position.z)
      g.parent.updateWorldMatrix(true, false)
      const noPai = g.parent.worldToLocal(noMundo)
      g.position.set(-noPai.x, -noPai.y, -noPai.z)
    }
    setEmPe(true)
  }

  return (
    <group visible={emPe}>
      <Suspense fallback={null}>
        <AvatarRig slots={slots} pose={pose} charRef={personagem} onStood={aoFicarEmPe} />
      </Suspense>
    </group>
  )
}
