import { buttonVariants } from '@sistemazero/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@sistemazero/ui/card'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getEnv } from '@/lib/env'
import { getSession } from '@/server/session'
import { CenariosClient } from './cenarios-client'

/** Onde a oficina mora em cada comunidade (a mesma rota nas duas). */
const ROTA_DA_OFICINA = '/molda/cenarios'

/**
 * Cenários 3D. A oficina mora na plataforma (Molda › Cenários, no Kids e na comunidade adulta) e
 * guarda tudo na conta: aqui fica o atalho para ela. O editor antigo do piloto, que roda só numa
 * máquina com o ambiente local montado, continua abrindo quando `CENARIOS_RUNTIME_URL` existe.
 */
export default async function CenariosPage() {
  const user = await getSession()
  if (!user) redirect('/login')
  if (user.status !== 'active' || !['admin', 'superadmin'].includes(user.role)) redirect('/admin')
  const env = getEnv()
  const runtimeUrl =
    env.CENARIOS_RUNTIME_URL ??
    (env.NODE_ENV === 'development' ? 'http://127.0.0.1:4531/runtime/entrada.js' : null)
  if (runtimeUrl) return <CenariosClient runtimeUrl={runtimeUrl} />

  const destinos = [
    { nome: 'Abrir no Kids', base: env.KIDS_COMMUNITY_URL },
    { nome: 'Abrir na comunidade adulta', base: env.COMMUNITY_URL },
  ].flatMap((d) =>
    d.base ? [{ nome: d.nome, href: `${d.base.replace(/\/+$/, '')}${ROTA_DA_OFICINA}` }] : [],
  )

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col justify-center gap-4 p-6">
      <Link
        href="/admin"
        className="inline-flex items-center gap-2 self-start text-muted-foreground text-sm hover:text-foreground"
      >
        <ArrowLeft aria-hidden="true" className="size-4" /> Voltar ao painel
      </Link>
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-2xl">Cenários 3D</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p>
            A oficina de cenários agora mora na plataforma, dentro do Molda. Os mundos, os cenários
            e as bibliotecas de modelos ficam guardados na conta, e a equipe compartilha o espaço
            Equipe Sistema Zero.
          </p>
          <p className="text-muted-foreground text-sm">
            Por enquanto só a equipe abre. Ela pede o seu login na comunidade, que é separado do
            login deste painel.
          </p>
          {destinos.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {destinos.map((destino, indice) => (
                <a
                  key={destino.href}
                  href={destino.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonVariants({ variant: indice === 0 ? 'default' : 'outline' })}
                >
                  {destino.nome} <ExternalLink aria-hidden="true" className="size-4" />
                </a>
              ))}
            </div>
          ) : (
            <p className="text-sm">
              Abra <code>{ROTA_DA_OFICINA}</code> no endereço da comunidade. Este painel ainda não
              sabe o endereço dela neste ambiente.
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
