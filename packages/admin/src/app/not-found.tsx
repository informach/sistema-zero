import Link from 'next/link'

/** Página 404 do painel. */
export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-2xl font-semibold">Página não encontrada</h1>
      <p className="text-muted-foreground">O endereço que você acessou não existe ou foi movido.</p>
      <Link href="/admin" className="text-interactive hover:text-interactive-hover">
        Voltar ao painel
      </Link>
    </div>
  )
}
