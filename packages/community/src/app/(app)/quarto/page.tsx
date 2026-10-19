import { RoomBuilder } from '@sistemazero/member-shell/components/cosmetics/room/room-builder'
import { PageBand, PageBody } from '@/components/community/page'
import { getAvatarReadonly } from '@/server/members'

export const dynamic = 'force-dynamic'
export default async function AdultRoomPage() {
  const avatar = await getAvatarReadonly()
  return (
    <>
      <PageBand
        compact
        back={{ href: '/progresso', label: 'Seu progresso' }}
        title="Meu espaço 3D"
        lead="Monte seu ambiente com os itens e troféus conquistados na comunidade."
      />
      <PageBody>
        <RoomBuilder avatarPhotoUrl={avatar.status === 200 ? avatar.body?.photoUrl : undefined} />
      </PageBody>
    </>
  )
}
