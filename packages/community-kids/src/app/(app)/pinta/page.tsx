import { meetsCreativeAppsLevel } from '@sistemazero/member-shell/server/creative-apps-access'
import { KidsCareerLockedPinta } from '@/components/kids/kids-career-locked-pinta'
import { KidsLockedPinta } from '@/components/kids/kids-locked-pinta'
import { KidsPintaUnavailable } from '@/components/kids/kids-pinta-unavailable'
import { PintaClient } from '@/components/kids/pinta-client'
import { checkPintaAccessReadonly, getGamificationReadonly } from '@/server/members'
import { getSession } from '@/server/session'

export const dynamic = 'force-dynamic'

/**
 * Pinta — produto vendável (igual ao Estúdio Completo/Pensa): a criança desenha os
 * assets dos jogos (personagens com animações, cenários, peças) e manda pro Estúdio.
 * O gate é resolvido no SERVIDOR (sem acesso → o app nem carrega); os DADOS são
 * locais ao navegador (IndexedDB por perfil) — zero backend próprio.
 *
 * São 4 estados, NÃO 2 (mesma régua do /estudio): members RESPONDEU (200) e não tem
 * o produto → bloqueio real (`KidsLockedPinta`); gateway/token soluçou (status ≠
 * 200) → "tente de novo" (`KidsPintaUnavailable`) — não mentir "não liberado" a quem
 * comprou; tem o produto mas ainda não chegou em Inventor(a) → `KidsCareerLockedPinta`
 * (08/2026). A MESMA ida também resolve `estudio-completo` → `studioOwned` (só muda a
 * copy do sucesso do "Usar no Estúdio").
 *
 * ⚠️ Aqui a página é a superfície INTEIRA do portão, e isso não é meio-gate: o Pinta
 * não tem backend nenhum (galeria no IndexedDB por perfil, ponte para o Estúdio
 * client-side), então não existe rota para contornar.
 */
export default async function PintaPage() {
  // `session.id` = o PERFIL ativo (kids) → a galeria do Pinta e a biblioteca
  // "Meus desenhos" do Estúdio usam o MESMO namespace do IndexedDB do /estudio.
  // `withRanking:true` casa a chave do React.cache com a do (app)/layout — o nível
  // sai da MESMA ida que o chrome já faz, sem custo extra.
  const [res, session, gam] = await Promise.all([
    checkPintaAccessReadonly(),
    getSession(),
    getGamificationReadonly({ withRanking: true }).catch(() => null),
  ])
  if (res.status !== 200) return <KidsPintaUnavailable />
  const hasAccess = res.body?.access?.pinta === true
  if (!hasAccess) return <KidsLockedPinta />
  // Falha ao consultar o rank NÃO pode virar Faísca: rebaixar quem já conquistou o
  // degrau tiraria o produto de quem tem direito a ele. Mesma razão registrada no
  // /estudio — o estado honesto é "indisponível", não "não liberado".
  if (gam?.status !== 200) return <KidsPintaUnavailable />
  if (!meetsCreativeAppsLevel(gam.body?.level?.slug, session?.role)) {
    return <KidsCareerLockedPinta />
  }
  const studioOwned = res.body?.access?.['estudio-completo'] === true
  return <PintaClient viewerId={session?.id ?? null} studioOwned={studioOwned} />
}
