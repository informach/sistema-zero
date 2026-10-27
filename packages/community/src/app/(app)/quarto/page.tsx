import { AdultRoomBuilder } from '@sistemazero/member-shell/components/cosmetics/room/room-builder-adult'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { ADULT_TROPHY_HINTS } from '@/lib/adult-trophy-hints'
import { getAvatarReadonly } from '@/server/members'

export const dynamic = 'force-dynamic'

/** Para onde o voltar leva (o espaço se abre a partir de Seu progresso). */
const ROOM_BACK = { href: '/progresso', label: 'Seu progresso' } as const

export default async function AdultRoomPage() {
  const avatar = await getAvatarReadonly()
  return (
    // Como o Meu avatar 3D (27/10/2026, pedido dela): sem a faixa do topo, o voltar e o título vão
    // na mesma linha das moedas e do Salvar, e o espaço ocupa a área toda. O menu da esquerda
    // nasce recolhido aqui (`CommunityFrame`).
    <div className="sz-cos-room-page">
      {/* A pele adulta do construtor compartilhado (prancha "Meu espaço 3D", 18/10/2026). */}
      <AdultRoomBuilder
        trophyHints={ADULT_TROPHY_HINTS}
        avatarPhotoUrl={avatar.status === 200 ? avatar.body?.photoUrl : undefined}
        header={
          <>
            <Link href={ROOM_BACK.href} prefetch={false} className="sz-cos-back">
              <ChevronLeft aria-hidden="true" />
              {ROOM_BACK.label}
            </Link>
            <h1 className="sz-cos-room-title">Meu espaço 3D</h1>
          </>
        }
      />
    </div>
  )
}
