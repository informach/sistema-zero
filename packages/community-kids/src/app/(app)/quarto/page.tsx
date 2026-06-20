import { RoomBuilder } from '@/components/kids/room/room-builder'
import type { AvatarConfig } from '@/lib/avatar-catalog'
import { getAvatarReadonly } from '@/server/members'

export const dynamic = 'force-dynamic'

/**
 * "Meu quarto": a criança monta o quarto virtual (móveis/tema/bichinho), arrasta as
 * peças e salva. O avatar dela aparece dentro do quarto. Sempre em sessão de perfil.
 */
export default async function QuartoPage() {
  const avatarRes = await getAvatarReadonly()
  const avatarConfig: AvatarConfig | null =
    avatarRes.status === 200 && avatarRes.body
      ? { style: avatarRes.body.style, parts: avatarRes.body.equipped }
      : null

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <div>
        <h1 className="sz-display text-2xl">Meu quarto</h1>
        <p className="mt-1 text-muted-foreground text-sm">
          Monte do seu jeito! Arraste as peças e deixe tudo com a sua cara. 🏠
        </p>
      </div>
      <RoomBuilder avatarConfig={avatarConfig} />
    </div>
  )
}
