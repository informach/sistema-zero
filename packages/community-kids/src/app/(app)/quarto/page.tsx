import { KidsBand } from '@/components/kids/kids-band'
import { RoomBuilder } from '@/components/kids/room/room-builder'
import { getAvatarReadonly } from '@/server/members'
import { QuartoHeader } from './quarto-header'

export const dynamic = 'force-dynamic'

/**
 * "Meu quarto": a criança monta o quarto virtual (móveis/tema/bichinho), arrasta as
 * peças e salva. O avatar dela aparece dentro do quarto. Sempre em sessão de perfil.
 */
export default async function QuartoPage() {
  const avatarRes = await getAvatarReadonly()
  const avatarPhotoUrl =
    avatarRes.status === 200 && avatarRes.body ? (avatarRes.body.photoUrl ?? null) : null

  return (
    <>
      <KidsBand tone="creme">
        <QuartoHeader />
      </KidsBand>
      <KidsBand tone="lilas">
        <RoomBuilder avatarPhotoUrl={avatarPhotoUrl} />
      </KidsBand>
    </>
  )
}
