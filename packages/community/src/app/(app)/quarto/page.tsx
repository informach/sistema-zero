import { RoomBuilder } from '@sistemazero/member-shell/components/cosmetics/room/room-builder'
import Link from 'next/link'
import { getAvatarReadonly } from '@/server/members'

export const dynamic = 'force-dynamic'
export default async function AdultRoomPage() {
  const avatar = await getAvatarReadonly()
  return (
    <div className="space-y-6">
      <div>
        <Link href="/progresso" className="text-sm text-primary underline">
          Voltar ao progresso
        </Link>
        <h1 className="mt-3 text-3xl font-bold">Meu espaço 3D</h1>
        <p className="mt-2 text-muted-foreground">
          Monte seu ambiente com os itens e troféus conquistados na comunidade.
        </p>
      </div>
      <RoomBuilder avatarPhotoUrl={avatar.status === 200 ? avatar.body?.photoUrl : undefined} />
    </div>
  )
}
