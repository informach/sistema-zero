import { ResetForm } from './reset-form'

export const dynamic = 'force-dynamic'

/**
 * Define/redefine a senha via token single-use (?token=...). Serve DOIS fluxos:
 * o "esqueci minha senha" e o 1º acesso pós-compra (e-mail de boas-vindas).
 */
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams
  return <ResetForm token={token ?? ''} />
}
