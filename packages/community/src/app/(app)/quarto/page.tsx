import { AdultRoomBuilder } from '@sistemazero/member-shell/components/cosmetics/room/room-builder-adult'
import { PageBand, PageBody } from '@/components/community/page'
import { ADULT_TROPHY_HINTS } from '@/lib/adult-trophy-hints'
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
        {/* A pele adulta do construtor compartilhado (prancha "Meu espaço 3D", 18/10/2026). */}
        <AdultRoomBuilder
          trophyHints={ADULT_TROPHY_HINTS}
          avatarPhotoUrl={avatar.status === 200 ? avatar.body?.photoUrl : undefined}
        />
      </PageBody>
    </>
  )
}
