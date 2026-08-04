import { meetsCreativeAppsLevel } from '@sistemazero/member-shell/server/creative-apps-access'
import { KidsCareerLockedPensa } from '@/components/kids/kids-career-locked-pensa'
import { KidsLockedPensa } from '@/components/kids/kids-locked-pensa'
import { KidsPensaUnavailable } from '@/components/kids/kids-pensa-unavailable'
import { PensaClient } from '@/components/kids/pensa-client'
import {
  checkPensaAccessReadonly,
  checkPintaAccessReadonly,
  getGamificationReadonly,
} from '@/server/members'
import { getSession } from '@/server/session'

export const dynamic = 'force-dynamic'

/**
 * Pensa — produto vendável (igual ao Estúdio Completo): quem tem o produto planeja
 * seus jogos aqui; quem não, vê o recado gentil. O gate é resolvido no SERVIDOR
 * (sem acesso → o app nem é carregado). `pensa` = ref do produto (ver
 * `PENSA_ACCESS_REF` no member-shell). Acesso resolve pela CONTA (o responsável compra).
 *
 * São 4 estados, NÃO 2 (mesma régua do /estudio): members RESPONDEU (200) e não tem o
 * produto → bloqueio real (`KidsLockedPensa`); gateway/token soluçou (status ≠ 200) →
 * "tente de novo" (`KidsPensaUnavailable`) — não mentir "não liberado" a quem comprou;
 * tem o produto mas ainda não chegou em Inventor(a) → `KidsCareerLockedPensa` (08/2026).
 * O portão de nível é reaplicado no BFF (`routes/pensa.ts`/`pensa-ai.ts`) — esta página
 * esconde, o servidor recusa.
 */
export default async function PensaPage() {
  // `session.id` = o PERFIL ativo (kids) → o Modo Missão semeia/abre o projeto do
  // Estúdio no MESMO namespace do IndexedDB que o /estudio usa (fase R do Pensa).
  // A posse do PINTA (produto à parte) só liga o "Desenhar no Pinta" das missões:
  // best-effort — soluço na checagem degrada escondendo o botão, nunca trava a página.
  // `withRanking:true` casa a chave do React.cache com a do (app)/layout — o nível sai
  // da MESMA ida que o chrome já faz, sem custo extra.
  const [res, pintaRes, session, gam] = await Promise.all([
    checkPensaAccessReadonly(),
    checkPintaAccessReadonly().catch(() => null),
    getSession(),
    getGamificationReadonly({ withRanking: true }).catch(() => null),
  ])
  if (res.status !== 200) return <KidsPensaUnavailable />
  const hasAccess = res.body?.access?.pensa === true
  if (!hasAccess) return <KidsLockedPensa />
  // Falha ao consultar o rank NÃO pode virar Faísca: rebaixar quem já conquistou o
  // degrau tiraria o produto de quem tem direito a ele. Mesma razão registrada no
  // /estudio — o estado honesto é "indisponível", não "não liberado".
  if (gam?.status !== 200) return <KidsPensaUnavailable />
  if (!meetsCreativeAppsLevel(gam.body?.level?.slug, session?.role)) {
    return <KidsCareerLockedPensa />
  }
  const pintaOwned = pintaRes?.status === 200 && pintaRes.body?.access?.pinta === true
  return <PensaClient viewerId={session?.id ?? null} pintaOwned={pintaOwned} />
}
