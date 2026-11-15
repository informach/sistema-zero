import { redirect } from 'next/navigation'
import { ProfilesUnavailable } from '@/components/kids/profiles-unavailable'
import { listReadonly } from '@/server/profiles'
import { getSession } from '@/server/session'
import { childHref } from '../parent-routes'

export const dynamic = 'force-dynamic'

/**
 * O Acompanhamento virou a aba Progresso da página de cada filho (redesenho de 14/11/2026). O
 * endereço continua vivo só para os e-mails enviados antes do redesenho (resumo da semana e
 * lembrete de renovação, que hoje apontam para a Família) e os links salvos: leva ao Progresso do
 * filho pedido (`?crianca=`) ou do primeiro; sem filhos, à Família. Pode sair quando esses
 * e-mails antigos ficarem para trás (alguns meses depois do redesenho).
 */
export default async function AcompanhamentoPage({
  searchParams,
}: {
  searchParams: Promise<{ crianca?: string }>
}) {
  const session = await getSession()
  if (session?.kids?.kind !== 'parent') redirect('/login/responsavel')
  const profilesRes = await listReadonly()
  if (profilesRes.status !== 200) return <ProfilesUnavailable />
  const profiles = profilesRes.body?.profiles ?? []
  const pedido = (await searchParams).crianca
  const alvo = profiles.find((profile) => profile.id === pedido) ?? profiles[0]
  redirect(alvo ? childHref(alvo.id, 'progresso') : '/pais/familia')
}
