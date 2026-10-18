import { getEnv } from '@/lib/env'
import { AtendimentoClient } from './atendimento-client'

export const dynamic = 'force-dynamic'

export default function AtendimentoPage() {
  return <AtendimentoClient appUrl={getEnv().HELPDESK_APP_URL ?? null} />
}
