import { ArquipelagoDesafioPro } from '@sistemazero/member-shell/components/arquipelago-desafio-pro'
import { redirect } from 'next/navigation'
import { getSession } from '@/server/session'

export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * O desafio Pro do Arquipélago na rota isolada do modo Código (lacunas, 01/11/2026). A página do
 * jogo abre esta rota num quadro com `?embed=arquipelago`; ela herda os cabeçalhos de
 * `/estudio/pro/*` (isolamento e a regra com o WebContainer), e o serviço do jogo continua sendo
 * quem autoriza o desafio. Fora do quadro do jogo, o componente não abre.
 */
export default async function DesafioProPage({
  params,
  searchParams,
}: {
  params: Promise<{ desafioId: string }>
  searchParams: Promise<{ revisao?: string }>
}) {
  const [{ desafioId }, query, session] = await Promise.all([params, searchParams, getSession()])
  const revisao = Number(query.revisao)
  if (!session || !UUID.test(desafioId) || !Number.isInteger(revisao) || revisao < 1)
    redirect('/arquipelago')
  return (
    <ArquipelagoDesafioPro
      desafioId={desafioId}
      revisao={revisao}
      jogadorId={session.id}
      audience="adult"
    />
  )
}
