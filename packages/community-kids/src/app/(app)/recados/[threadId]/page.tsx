import { isVoiceInputConfigured } from '@sistemazero/member-shell/server/openrouter-transcribe'
import { redirect } from 'next/navigation'
import { getSession } from '@/server/session'
import { shell } from '@/server/shell'
import { RecadoThreadClient } from './recado-thread-client'

export const dynamic = 'force-dynamic'

/**
 * Uma conversa com o professor. A carga + a resposta + o "marcar lido" são do CLIENT
 * (apiGet/apiSend nos shims) — evita escrita de cookie em Server Component e mantém a
 * troca de mensagens interativa. As faixas moram no client porque o cabeçalho mostra
 * o título e o tipo da conversa, que só chegam com a carga.
 */
export default async function RecadoThreadPage({
  params,
}: {
  params: Promise<{ threadId: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/login')
  const { threadId } = await params
  // Falar em vez de escrever (14/10/2026): a escolha dos pais, lida no próprio perfil da
  // criança. Só a criança fala (nunca a sessão de suporte), e só com a fala ligada no servidor.
  let voiceEnabled = false
  if (session.kids?.kind === 'student' && !session.act && isVoiceInputConfigured()) {
    const mine = await shell.auth.getMyProfileReadonly()
    const profile = mine.status === 200 ? mine.body?.profile : null
    voiceEnabled = profile?.id === session.id && profile.voiceInputEnabled === true
  }
  return (
    <RecadoThreadClient threadId={threadId} viewerId={session.id} voiceEnabled={voiceEnabled} />
  )
}
