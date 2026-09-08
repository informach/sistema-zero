import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  ChildrenDashboard,
  FamilyAiCredits,
  ParentSupportCard,
} from '@/app/perfis/parent-dashboard'
import { isParentVerifiedFor } from '@/server/parent-gate'
import { getSession } from '@/server/session'

export const dynamic = 'force-dynamic'

/** Account-only accompaniment. The data endpoints independently require the same parent gate. */
export default async function ResponsavelPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.activeProfile || !(await isParentVerifiedFor(session.id)))
    redirect('/perfis?manage=1')
  return (
    <main className="mx-auto flex max-w-4xl flex-col items-center gap-7 px-4 py-8 md:px-8">
      <header className="w-full max-w-2xl">
        <p className="text-sm font-semibold text-primary">Área dos responsáveis</p>
        <h1 className="mt-2 text-3xl font-bold">Acompanhe as descobertas</h1>
        <p className="mt-3 text-muted-foreground">
          Veja o que cada criança está criando, as conquistas da carreira e o próximo passo. Uma boa
          conversa começa pedindo que ela mostre como fez o jogo.
        </p>
        <nav
          aria-label="Área dos responsáveis"
          className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold"
        >
          <Link
            href="/perfis"
            prefetch={false}
            className="inline-flex min-h-11 items-center text-primary"
          >
            Escolher uma criança
          </Link>
          <Link
            href="/perfis?manage=1"
            prefetch={false}
            className="inline-flex min-h-11 items-center text-primary"
          >
            Gerenciar perfis e conta
          </Link>
          <Link
            href="/responsavel/ajuda"
            prefetch={false}
            className="inline-flex min-h-11 items-center text-primary"
          >
            Atendimento
          </Link>
        </nav>
      </header>
      <ChildrenDashboard avatarPhotoByProfile={{}} />
      <section className="w-full max-w-2xl rounded-2xl border border-border bg-card p-5">
        <h2 className="text-lg font-bold">Para conversar sobre uma criação</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          <li>Que ideia você quis colocar neste jogo?</li>
          <li>O que precisou testar ou mudar para funcionar?</li>
          <li>O que gostaria de experimentar na próxima versão?</li>
        </ul>
      </section>
      <FamilyAiCredits />
      <ParentSupportCard />
    </main>
  )
}
