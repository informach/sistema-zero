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
    <div className="flex w-full flex-col gap-4">
      <div>
        <h1 className="sz-display text-2xl">Meu quarto</h1>
        <p className="mt-1 text-muted-foreground text-sm">
          Monte do seu jeito! Arraste as peças e deixe tudo com a sua cara. 🏠
        </p>
      </div>
      <RoomBuilder avatarPhotoUrl={avatarPhotoUrl} />
    </div>
  )
}
