import { KidsLockedPensa } from '@/components/kids/kids-locked-pensa'
import { KidsPensaUnavailable } from '@/components/kids/kids-pensa-unavailable'
import { PensaClient } from '@/components/kids/pensa-client'
import { checkPensaAccessReadonly, checkPintaAccessReadonly } from '@/server/members'
import { getSession } from '@/server/session'

export const dynamic = 'force-dynamic'

/**
 * Pensa — produto vendável (igual ao Estúdio Completo): quem tem o produto planeja
 * seus jogos aqui; quem não, vê o recado gentil. O gate é resolvido no SERVIDOR
 * (sem acesso → o app nem é carregado). `pensa` = ref do produto (ver
 * `PENSA_ACCESS_REF` no member-shell). Acesso resolve pela CONTA (o responsável compra).
 *
 * São 3 estados, NÃO 2 (mesma régua do /estudio): members RESPONDEU (200) e não tem o
 * produto → bloqueio real (`KidsLockedPensa`); gateway/token soluçou (status ≠ 200) →
 * "tente de novo" (`KidsPensaUnavailable`) — não mentir "não liberado" a quem comprou.
 */
export default async function PensaPage() {
  // `session.id` = o PERFIL ativo (kids) → o Modo Missão semeia/abre o projeto do
  // Estúdio no MESMO namespace do IndexedDB que o /estudio usa (fase R do Pensa).
  // A posse do PINTA (produto à parte) só liga o "Desenhar no Pinta" das missões:
  // best-effort — soluço na checagem degrada escondendo o botão, nunca trava a página.
  const [res, pintaRes, session] = await Promise.all([
    checkPensaAccessReadonly(),
    checkPintaAccessReadonly().catch(() => null),
    getSession(),
  ])
  if (res.status !== 200) return <KidsPensaUnavailable />
  const hasAccess = res.body?.access?.pensa === true
  const pintaOwned = pintaRes?.status === 200 && pintaRes.body?.access?.pinta === true
  return hasAccess ? (
    <PensaClient viewerId={session?.id ?? null} pintaOwned={pintaOwned} />
  ) : (
    <KidsLockedPensa />
  )
}
