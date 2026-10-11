import { LoginForm } from '../login-form'

// Sempre oferece autenticação: o atalho vindo da criança não reutiliza sessão adulta.
export default function ParentLoginPage() {
  return <LoginForm />
}
