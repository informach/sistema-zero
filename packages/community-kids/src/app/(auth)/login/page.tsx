import { GraduationCap, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AUTH_CARD } from '@/components/kids/auth-card'
import { entryLinks, entryRedirect } from '@/lib/entry-destination'
import { getSession } from '@/server/session'

export const dynamic = 'force-dynamic'

/**
 * A escolha de público é para quem ainda precisa ENTRAR. Uma sessão válida segue direto: a
 * criança para a área dela (ou a fase do link), o responsável para a área dos pais. Serviço
 * de sessão fora do ar não prende ninguém aqui: a escolha aparece.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams
  const session = await getSession().catch(() => null)
  const target = entryRedirect(session, next)
  if (target) redirect(target)
  const links = entryLinks(next)
  return (
    <section className={`${AUTH_CARD} p-6 sm:p-8`} aria-labelledby="entry-title">
      <h1 id="entry-title" className="sz-display text-3xl text-foreground">
        Quem vai entrar?
      </h1>
      <p className="mt-2 text-muted-foreground">
        Escolha o seu espaço na Comunidade dos Criadores.
      </p>
      <div className="mt-6 grid gap-4">
        <Link
          href={links.student}
          className="kid-pop flex items-center gap-4 rounded-2xl border-2 border-primary bg-primary/10 p-5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
        >
          <GraduationCap className="size-8 shrink-0 text-primary" aria-hidden="true" />
          <span>
            <strong className="sz-display block text-2xl">Eu sou aluno</strong>
            <span className="text-sm">Entre para continuar suas aventuras.</span>
          </span>
        </Link>
        <Link
          href={links.parent}
          className="kid-pop flex items-center gap-4 rounded-2xl border-2 border-border bg-card p-5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
        >
          <ShieldCheck className="size-8 shrink-0" aria-hidden="true" />
          <span>
            <strong className="sz-display block text-2xl">Eu sou responsável</strong>
            <span className="text-sm">Preparar o acesso e acompanhar os filhos.</span>
          </span>
        </Link>
      </div>
      <Link
        href="/ajuda/entrar"
        className="mt-6 flex min-h-11 items-center justify-center text-center text-sm underline underline-offset-4"
      >
        Preciso de ajuda para entrar
      </Link>
    </section>
  )
}
