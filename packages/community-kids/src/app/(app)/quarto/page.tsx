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
      {/* ⚠️ As DUAS faixas levam a classe. Só o palco crescendo deixaria o cabeçalho (título,
          seta e o próprio botão do menu) 134px indentado em relação à borda do quarto, com a
          diferença aparecendo e sumindo na animação de 300ms de UMA das faixas. */}
      <KidsBand tone="creme" className="kids-band-foco">
        <QuartoHeader />
      </KidsBand>
      {/* `kids-band-foco`: com o menu recolhido, o palco do quarto ocupa o espaço que a barra
          devolveu, em vez de só ficar mais centralizado (regra no `globals.css`). */}
      <KidsBand tone="lilas" className="kids-band-foco">
        <RoomBuilder avatarPhotoUrl={avatarPhotoUrl} />
      </KidsBand>
    </>
  )
}
