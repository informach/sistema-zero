import { FolderOpen, Mail, MonitorPlay } from 'lucide-react'
import { redirect } from 'next/navigation'
import { AuthAlert } from '@/components/community/auth/auth-fields'
import { AuthAside, AuthSplitShell } from '@/components/community/auth-split-shell'
import { getSession } from '@/server/session'
import { LoginForm } from './login-form'

export const dynamic = 'force-dynamic'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>
}) {
  const user = await getSession()
  if (user) redirect('/')
  const { erro } = await searchParams
  return (
    <AuthSplitShell
      aside={
        <AuthAside
          label="O que você encontra na comunidade"
          title="Seus cursos, seus projetos e a equipe num lugar só"
          items={[
            {
              icon: MonitorPlay,
              title: 'Aulas com o Estúdio ao lado.',
              text: 'Você assiste e monta o seu jogo na mesma tela.',
            },
            {
              icon: Mail,
              title: 'Recados com a equipe.',
              text: 'Travou numa aula? Mande a dúvida dali mesmo e a resposta chega nos Recados.',
            },
            {
              icon: FolderOpen,
              title: 'Projetos guardados na sua conta.',
              text: 'Você continua de onde parou, em qualquer computador.',
            },
          ]}
        />
      }
    >
      <LoginForm
        notice={
          // O link de acesso de suporte (gerado no painel) já foi usado ou venceu.
          erro === 'impersonacao' ? (
            <AuthAlert tone="error">
              <strong>Este link de acesso não vale mais.</strong> Gere um novo no painel da equipe.
            </AuthAlert>
          ) : undefined
        }
      />
    </AuthSplitShell>
  )
}
