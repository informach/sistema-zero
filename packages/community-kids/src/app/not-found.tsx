import Link from 'next/link'
import { KidsMascot } from '@/components/kids/mascot'

/** Página 404 da área do aluno — tom kids (mascote + Baloo), igual ao resto do app. */
export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <KidsMascot expression="thinking" className="size-24" />
      <div>
        <h1 className="sz-display text-2xl">Opa, não achei essa página!</h1>
        <p className="mt-1 text-muted-foreground">
          O endereço pode estar errado ou a página mudou de lugar. 😊
        </p>
      </div>
      <Link href="/" className="sz-btn-gradient h-11 px-6 text-base">
        Voltar para o início
      </Link>
    </div>
  )
}
