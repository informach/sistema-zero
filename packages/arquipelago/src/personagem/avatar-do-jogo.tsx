import { useFrame } from '@react-three/fiber'
import { avatarDoPack } from '@sistemazero/avatar-quarto/avatar/pack-catalog'
import { PackAvatarRig, PackRigBoundary } from '@sistemazero/avatar-quarto/avatar/pack-rig'
import { type RefObject, Suspense, useMemo, useRef, useState } from 'react'
import { type Group, Vector3 } from 'three'
import { useEstado } from '../estado/contexto'
import type { EntradaDaLocomocao } from '../sistemas/locomocao'
import { LanternaNaMao } from './lanterna-na-mao'

/**
 * O avatar da plataforma no jogo: o boneco do pack Cute Characters (13/11/2026), o mesmo
 * `PackAvatarRig` do Meu avatar. O rig põe os pés no chão medindo o corpo em coordenadas de MUNDO e
 * subtraindo da posição LOCAL (feito para o pódio na origem). Aqui o avatar anda pelo mundo, então
 * refazemos a conta no espaço do pai quando ele fica em pé.
 *
 * ⚠️ Enquanto o plano do jogo não chega, o boneco fica PARADO (a pose de parado do pack): as
 * animações de movimento (`locomocao.glb`), os patins, as mãos no cipó (`bracos.ts`) e a lanterna
 * na mão foram feitos para o esqueleto Mixamo do avatar antigo. Os patins não aparecem; as mãos e a
 * lanterna procuram os ossos antigos e, sem eles, ficam como estão (nada quebra). O tamanho do
 * boneco (1,15 m; o antigo tinha 2,13 m) também é do plano do jogo.
 */
export function AvatarDoJogo({
  depoisDaPose,
  comLanterna = false,
}: {
  movimento: RefObject<EntradaDaLocomocao>
  /** Mexe nos ossos depois da pose de cada quadro (os braços para cima no cipó e no tronco). */
  depoisDaPose?: () => void
  /** Os patins nos pés: ainda não aparecem no boneco do pack (veja acima). */
  comPatins?: boolean
  /** A lanterna acesa na mão direita (fase2-06). */
  comLanterna?: boolean
}) {
  const slotsDoJogo = useEstado((s) => s.avatar.slots)
  const slots = useMemo(() => avatarDoPack(slotsDoJogo), [slotsDoJogo])
  const personagem = useRef<Group>(null)
  const [emPe, setEmPe] = useState(false)
  const visualRef = useRef<Group>(null)

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
    <group ref={visualRef} name="avatar-visual" visible={emPe}>
      <PackRigBoundary>
        <Suspense fallback={null}>
          <PackAvatarRig slots={slots} charRef={personagem} onStood={aoFicarEmPe} />
          {depoisDaPose ? <DepoisDaPose fazer={depoisDaPose} /> : null}
        </Suspense>
      </PackRigBoundary>
      {comLanterna && emPe ? (
        <Suspense fallback={null}>
          <LanternaNaMao avatar={visualRef} personagem={personagem} />
        </Suspense>
      ) : null}
    </group>
  )
}

/**
 * Roda a cada quadro DEPOIS da pose: monta logo depois do avatar, dentro do mesmo `Suspense`, então
 * o `useFrame` dele entra depois do mixer (os braços no cipó mexem por cima das animações).
 */
function DepoisDaPose({ fazer }: { fazer: () => void }) {
  useFrame(fazer)
  return null
}
