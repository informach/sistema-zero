import { Mail } from 'lucide-react'
import { redirect } from 'next/navigation'
import { getSession } from '@/server/session'
import { RecadosScreen } from './recados-screen'

export const dynamic = 'force-dynamic'

/**
 * Caixa de entrada adulta do canal professor↔aluno. No computador, a direita espera a escolha:
 * abrir sozinha a conversa mais recente a marcaria como lida sem a pessoa ter lido.
 */
export default async function RecadosPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  return (
    <RecadosScreen>
      <div className="sz-card flex min-h-[18rem] flex-col items-center justify-center gap-3 px-8 py-12 text-center">
        <span className="sz-tile">
          <Mail className="size-7" aria-hidden />
        </span>
        <p className="m-0 sz-h3">Escolha uma conversa para ler</p>
        <p className="m-0 max-w-md text-muted-foreground">
          As respostas da equipe às suas dúvidas e entregas ficam aqui, guardadas na sua conta.
        </p>
      </div>
    </RecadosScreen>
  )
}
