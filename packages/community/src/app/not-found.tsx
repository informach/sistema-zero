import Link from 'next/link'

/** Página 404 da área do aluno. */
export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-2xl font-semibold">Página não encontrada</h1>
      <p className="text-muted-foreground">O endereço que você acessou não existe ou foi movido.</p>
      <Link href="/home" className="text-interactive hover:text-interactive-hover">
        Ir para o início
      </Link>
    </div>
  )
}
