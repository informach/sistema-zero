import { PalettePicker } from '@sistemazero/member-shell/components/palette-picker'
import { isReadonlyImpersonation } from '@sistemazero/member-shell/lib/act'
import { paletteValueOf } from '@sistemazero/member-shell/lib/palette-cookie'
import { Card, CardContent, CardHeader, CardTitle } from '@sistemazero/ui/card'
import { cookies } from 'next/headers'
import { PALETTE_COOKIE } from '@/lib/cookies'
import { getMeReadonly } from '@/server/auth'
import { getSession } from '@/server/session'
import { ProfileClient } from './profile-client'

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  // Dados frescos do banco (trazem `phone`); fallback nas claims da sessão.
  // SOMENTE-LEITURA: página é Server Component (refresh/escrita de cookie aqui
  // lança) — o proxy já renovou o access antes do render; 401 residual degrada.
  const session = await getSession()
  const { status, body } = await getMeReadonly()
  const user =
    status === 200 && body?.user ? body.user : session ? { ...session, phone: undefined } : null

  if (!user) return null

  // A cor vem do MESMO espelho que o layout raiz leu — sem GET na montagem do seletor.
  const paletteEscolhida = paletteValueOf((await cookies()).get(PALETTE_COOKIE)?.value)

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <h1 className="sz-display text-2xl">Meu perfil</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Seus dados de acesso e informações pessoais.
        </p>
      </div>
      {/* Renderizado pela PÁGINA (servidor), não pelo formulário do cliente: a cor não é dado
          de cadastro e não deve engordar o `profile-client`. */}
      <Card>
        <CardHeader>
          <CardTitle>Cor do tema</CardTitle>
        </CardHeader>
        <CardContent>
          {/* ⚠️ `session.id` (o `sub` do JWT), NUNCA o `user.id` do /auth/me: é contra o `sub` que o
              BFF compara o `x-sz-viewer`. Divergir aqui vira 409 permanente com um recado que
              manda reabrir a página — o que não conserta nada. */}
          <PalettePicker
            viewerId={session?.id ?? user.id}
            initial={paletteEscolhida}
            readOnly={Boolean(session && isReadonlyImpersonation(session))}
          />
        </CardContent>
      </Card>
      <ProfileClient user={user} />
    </div>
  )
}
