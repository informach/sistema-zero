import { AuthAside, AuthSplitShell } from '@/components/community/auth-split-shell'
import { ForgotForm } from './forgot-form'

export const dynamic = 'force-dynamic'

export default function ForgotPasswordPage() {
  return (
    <AuthSplitShell
      aside={
        <AuthAside
          label="Dicas para a senha"
          title="Uma senha fácil de lembrar e difícil de adivinhar"
          items={[
            {
              text: (
                <>
                  Use pelo menos <strong className="text-white">10 caracteres</strong>. Uma frase
                  curta funciona bem, como “café com bolo às 4”.
                </>
              ),
            },
            { text: 'Evite datas de aniversário e o seu nome.' },
            {
              text: (
                <>
                  O código vale por pouco tempo. Se demorar, toque em{' '}
                  <strong className="text-white">Reenviar código</strong>.
                </>
              ),
            },
          ]}
        />
      }
    >
      <ForgotForm />
    </AuthSplitShell>
  )
}
