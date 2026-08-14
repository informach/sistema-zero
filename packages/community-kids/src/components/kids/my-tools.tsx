import type { StudioDrawer } from '@sistemazero/member-shell/server/studio-unlocks'
import { buttonVariants } from '@sistemazero/ui/button'
import { Wrench } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/cn'

/**
 * "Minhas ferramentas" (/perfil): as GAVETAS da caixa de ferramentas do Estúdio que a
 * criança já conquistou nos cursos.
 *
 * É a cara visível do currículo (08/2026): cada curso concluído E publicado no Mural
 * entrega os blocos que ele ensinou, para sempre. Mostrar GAVETA em vez de lista de
 * blocos é o que torna a recompensa legível — "ganhei 💥 Colisões" é uma conquista;
 * "ganhei 6 blocos" não é.
 *
 * Sem nenhuma ferramenta a seção some: quem ainda não concluiu curso nenhum usa o
 * Estúdio pelo perfil do nível, e prometer uma lista vazia só desanimaria.
 */
export function MyTools({
  drawers,
  studioOwned,
}: {
  drawers: readonly StudioDrawer[]
  /** Estúdio Completo comprado (produto à parte)? Só então o atalho aparece. */
  studioOwned: boolean
}) {
  if (drawers.length === 0) return null
  const total = drawers.reduce((sum, drawer) => sum + drawer.count, 0)

  return (
    <section
      aria-label="Minhas ferramentas"
      className="rounded-3xl border-2 border-border bg-card p-5 md:p-6"
    >
      <h2 className="sz-display flex items-center gap-2 text-xl">
        <Wrench className="size-5 text-primary" aria-hidden />
        Minhas ferramentas
      </h2>
      <p className="mt-1 text-muted-foreground text-sm">
        {drawers.length === 1
          ? `Você conquistou 1 gaveta com ${total} ${total === 1 ? 'bloco' : 'blocos'} no seu Estúdio.`
          : `Você conquistou ${drawers.length} gavetas com ${total} blocos no seu Estúdio.`}
      </p>
      <ul className="mt-4 flex flex-wrap gap-2">
        {drawers.map((drawer) => (
          <li
            key={drawer.name}
            className="inline-flex items-center gap-2 rounded-full border-2 border-border bg-background px-3 py-1.5 font-bold text-sm"
          >
            {drawer.name}
            <span className="rounded-full bg-primary/10 px-2 py-0.5 font-semibold text-primary text-xs">
              {drawer.count}
            </span>
          </li>
        ))}
      </ul>
      {studioOwned ? (
        <Link
          href="/estudio"
          prefetch={false}
          className={cn(buttonVariants({ variant: 'default' }), 'mt-4 h-11 rounded-full px-6')}
        >
          Abrir o Estúdio
        </Link>
      ) : null}
    </section>
  )
}
