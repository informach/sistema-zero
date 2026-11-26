import { getSession } from '@/server/session'
import { OriginClient } from './origin-client'

export const dynamic = 'force-dynamic'

/** Origem das vendas (Negócio). O papel só decide a tela; quem confere é o gateway (admin+). */
export default async function OrigemDasVendasPage() {
  const session = await getSession()
  return <OriginClient currentRole={session?.role ?? ''} />
}
