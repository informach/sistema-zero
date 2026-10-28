import { KidsBand } from '@/components/kids/kids-band'
import { RoomBuilder } from '@/components/kids/room/room-builder'
import { getAvatarReadonly } from '@/server/members'
import { QUARTO_FAIXA, QuartoHeader } from './quarto-header'

export const dynamic = 'force-dynamic'

/**
 * "Meu quarto": a criança monta o quarto virtual (móveis/tema/personagem), arrasta as
 * peças e salva. O avatar dela aparece dentro do quarto. Sempre em sessão de perfil.
 */
export default async function QuartoPage() {
  const avatarRes = await getAvatarReadonly()
  const avatarPhotoUrl =
    avatarRes.status === 200 && avatarRes.body ? (avatarRes.body.photoUrl ?? null) : null

  return (
    // Uma faixa só (27/10/2026), como o avatar: a seta e o título moram na barra de cima do
    // editor, e a faixa não tem o teto de largura das outras páginas (`QUARTO_FAIXA`): o quarto
    // ocupa a área toda e só encolhe quando o menu da esquerda abre.
    <KidsBand tone="lilas" innerClassName={QUARTO_FAIXA}>
      <RoomBuilder avatarPhotoUrl={avatarPhotoUrl} header={<QuartoHeader />} />
    </KidsBand>
  )
}
