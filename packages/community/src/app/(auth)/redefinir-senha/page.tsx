import { AuthAside, AuthSplitShell } from '@/components/community/auth-split-shell'
import { ResetForm } from './reset-form'

export const dynamic = 'force-dynamic'

/**
 * Cria a senha pelo link de uso único (?token=...). É a porta do 1º acesso pós-compra (e-mail e
 * WhatsApp de boas-vindas), do convite da equipe e da bolsa; o "esqueci minha senha" da tela usa
 * o código por e-mail. Sem o código no link, a página explica e leva ao passo certo.
 */
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams
  return (
    <AuthSplitShell
      aside={
        token ? (
          <AuthAside
            label="Os próximos passos"
            kicker="Primeiro acesso"
            title="Boas-vindas à comunidade"
            lead="Em três passos você chega à sua primeira aula."
            items={[
              { title: 'Crie a senha', text: 'nesta página.' },
              { title: 'Entre', text: 'com o e-mail da compra e a senha.' },
              {
                text: (
                  <>
                    No <strong className="text-white">Início</strong>, toque em{' '}
                    <strong className="text-white">Continuar</strong> no seu curso.
                  </>
                ),
              },
            ]}
          />
        ) : undefined
      }
    >
      <ResetForm token={token ?? ''} />
    </AuthSplitShell>
  )
}
