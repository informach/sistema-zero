import { Home } from 'lucide-react'
import { KidsBand } from '@/components/kids/kids-band'
import { KidsPageHeader } from '@/components/kids/kids-page-header'
import { RoomBuilder } from '@/components/kids/room/room-builder'
import { getAvatarReadonly } from '@/server/members'

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
        <KidsPageHeader
          eyebrow="Meu espaço"
          eyebrowIcon={Home}
          title="Meu quarto"
          subtitle="Monte do seu jeito! Arraste as peças e deixe tudo com a sua cara."
        />
      </KidsBand>
      <KidsBand tone="lilas">
        <RoomBuilder avatarPhotoUrl={avatarPhotoUrl} />
      </KidsBand>
    </>
  )
}
