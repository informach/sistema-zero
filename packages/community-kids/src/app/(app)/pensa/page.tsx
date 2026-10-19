import {
  hasKidsCapability,
  kidsJourneyAccess,
} from '@sistemazero/member-shell/lib/kids-journey-access'
import { isVoiceInputConfigured } from '@sistemazero/member-shell/server/openrouter-transcribe'
import { KidsJourneyLockedPensa } from '@/components/kids/kids-journey-locked-pensa'
import { KidsLockedPensa } from '@/components/kids/kids-locked-pensa'
import { KidsPensaUnavailable } from '@/components/kids/kids-pensa-unavailable'
import { PensaClient } from '@/components/kids/pensa-client'
import { ToolRouteRecado } from '@/components/kids/tool-route-recado'
import { getEnv } from '@/lib/env'
import { checkPensaAccessReadonly, getGamificationReadonly } from '@/server/members'
import { getSession } from '@/server/session'
import { shell } from '@/server/shell'

export const dynamic = 'force-dynamic'

/**
 * Pensa — produto vendável (igual ao Estúdio Completo): quem tem o produto planeja
 * seus jogos aqui; quem não, vê o recado gentil. O gate é resolvido no SERVIDOR
 * (sem acesso → o app nem é carregado). `pensa` = ref do produto (ver
 * `PENSA_ACCESS_REF` no member-shell). Acesso resolve pela CONTA (o responsável compra).
 *
 * São 4 estados: indisponível, sem o produto, produto comprado mas jornada abaixo
 * de Inventor(a), e acesso completo. O gate também é reaplicado no BFF.
 */
export default async function PensaPage({
  searchParams,
}: {
  searchParams: Promise<{ plano?: string; ajuda?: string }>
}) {
  const { plano, ajuda } = await searchParams
  // `session.id` = o PERFIL ativo (kids) → o Modo Missão semeia/abre o projeto do
  // Estúdio no MESMO namespace do IndexedDB que o /estudio usa (fase R do Pensa).
  // A posse do PINTA (produto à parte) só liga o "Desenhar no Pinta" das missões:
  // best-effort — soluço na checagem degrada escondendo o botão, nunca trava a página.
  const [res, gam, session] = await Promise.all([
    checkPensaAccessReadonly(),
    getGamificationReadonly().catch(() => null),
    getSession(),
  ])
  // Os recados rolam na própria caixa: a rota trava a altura na janela (ver `ToolRouteRecado`).
  if (res.status !== 200) return <ToolRouteRecado screen={KidsPensaUnavailable} />
  const hasAccess = res.body?.access?.pensa === true
  if (!hasAccess) return <ToolRouteRecado screen={KidsLockedPensa} />
  if (gam?.status !== 200) return <ToolRouteRecado screen={KidsPensaUnavailable} />
  const journey = kidsJourneyAccess(gam.body)
  if (!journey) return <ToolRouteRecado screen={KidsPensaUnavailable} />
  if (!hasKidsCapability(journey, 'pensa') || !hasKidsCapability(journey, 'ai')) {
    return <ToolRouteRecado screen={KidsJourneyLockedPensa} />
  }
  // Contar a ideia falando (14/10/2026): a MESMA régua da fase e dos Recados (criança, sem sessão
  // de suporte, fala ligada no servidor, escolha dos pais relida no PRÓPRIO perfil). Decisão dela:
  // sem interruptor à parte para o texto que vai ao Zappy — é a dúvida da criança sobre o jogo
  // ("meu personagem não pulou"), o mesmo tipo de texto que ela já escreve à mão.
  const profile =
    session?.kids?.kind === 'student' && !session.act && isVoiceInputConfigured()
      ? await shell.auth.getMyProfileReadonly().catch(() => null)
      : null
  const perfilDaFala = profile?.status === 200 ? profile.body?.profile : null
  return (
    <PensaClient
      viewerId={session?.id}
      voiceEnabled={perfilDaFala?.id === session?.id && perfilDaFala?.voiceInputEnabled === true}
      narrationEnabled={Boolean(getEnv().ELEVENLABS_API_KEY)}
      initialProjectId={plano ?? null}
      initialHelpMissionId={ajuda ?? null}
    />
  )
}
