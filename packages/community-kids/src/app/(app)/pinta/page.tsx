import { KidsLockedPinta } from '@/components/kids/kids-locked-pinta'
import { KidsPintaUnavailable } from '@/components/kids/kids-pinta-unavailable'
import { PintaClient } from '@/components/kids/pinta-client'
import { checkPintaAccessReadonly } from '@/server/members'
import { getSession } from '@/server/session'

export const dynamic = 'force-dynamic'

/**
 * Pinta — produto vendável (igual ao Estúdio Completo/Pensa): a criança desenha os
 * assets dos jogos (personagens com animações, cenários, peças) e manda pro Estúdio.
 * O gate é resolvido no SERVIDOR (sem acesso → o app nem carrega); os DADOS são
 * locais ao navegador (IndexedDB por perfil) — zero backend próprio.
 *
 * São 3 estados, NÃO 2 (mesma régua do /estudio): members RESPONDEU (200) e não tem
 * o produto → bloqueio real (`KidsLockedPinta`); gateway/token soluçou (status ≠
 * 200) → "tente de novo" (`KidsPintaUnavailable`) — não mentir "não liberado" a quem
 * comprou. A MESMA ida também resolve `estudio-completo` → `studioOwned` (só muda a
 * copy do sucesso do "Usar no Estúdio").
 */
export default async function PintaPage() {
  // `session.id` = o PERFIL ativo (kids) → a galeria do Pinta e a biblioteca
  // "Meus desenhos" do Estúdio usam o MESMO namespace do IndexedDB do /estudio.
  const [res, session] = await Promise.all([checkPintaAccessReadonly(), getSession()])
  if (res.status !== 200) return <KidsPintaUnavailable />
  const hasAccess = res.body?.access?.pinta === true
  const studioOwned = res.body?.access?.['estudio-completo'] === true
  return hasAccess ? (
    <PintaClient viewerId={session?.id ?? null} studioOwned={studioOwned} />
  ) : (
    <KidsLockedPinta />
  )
}
