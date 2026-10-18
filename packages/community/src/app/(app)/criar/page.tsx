import Link from 'next/link'
import { getCreativeToolsState } from '@/server/creative-tools'
export const dynamic = 'force-dynamic'
export default async function CreatePage() {
  const state = await getCreativeToolsState()
  const tools = [
    {
      href: '/estudio',
      name: 'Estúdio',
      capability: 'studio' as const,
      ref: 'estudio-completo',
      description: 'Crie e programe seus jogos com os blocos que conquistou nos cursos.',
    },
    {
      href: '/pinta',
      name: 'Pinta',
      capability: 'pinta' as const,
      ref: 'pinta',
      description: 'Desenhe personagens, cenários e imagens para seus jogos.',
    },
    {
      href: '/pensa',
      name: 'Pensa',
      capability: 'pensa' as const,
      ref: 'pensa',
      description: 'Planeje seus jogos com assistência disponível após a formação avançada.',
    },
    {
      href: '/molda',
      name: 'Molda',
      capability: 'molda' as const,
      ref: 'molda',
      description: 'Crie modelos, texturas e ambientes 3D.',
    },
  ]
  return (
    <div className="space-y-6">
      <header>
        <h1 className="sz-display text-3xl">Criar</h1>
        <p className="mt-2 text-muted-foreground">
          Suas ferramentas e seus projetos, conectados à sua conta.
        </p>
      </header>
      {state.kind === 'unavailable' ? (
        <p role="status">Não foi possível atualizar o acesso às ferramentas. Tente novamente.</p>
      ) : null}
      <div className="grid gap-4 md:grid-cols-3">
        {tools.map((tool) => {
          const available =
            state.kind === 'ready' &&
            state.access[tool.ref] === true &&
            state.journey.capabilities.includes(tool.capability) &&
            (tool.capability !== 'studio' || state.tier.hasPalette) &&
            (tool.capability !== 'pensa' || state.journey.capabilities.includes('ai'))
          return (
            <section key={tool.href} className="flex flex-col gap-4 rounded-3xl bg-card p-6">
              <h2 className="text-xl font-semibold">{tool.name}</h2>
              <p className="flex-1 text-muted-foreground">{tool.description}</p>
              <p className="text-sm">
                {available
                  ? 'Disponível na sua conta'
                  : state.kind === 'ready'
                    ? 'Ainda não liberado'
                    : 'Acesso em consulta'}
              </p>
              <Link href={tool.href} prefetch={false} className="font-semibold text-primary">
                {available ? 'Abrir' : 'Consultar acesso'}
              </Link>
            </section>
          )
        })}
      </div>
      <nav className="flex flex-wrap gap-5 font-semibold text-primary">
        <Link href="/mural-dos-criadores-adulto">Mostra de jogos</Link>
        <Link href="/desafios">Desafio do mês</Link>
        <Link href="/como-fazer">Como fazer</Link>
      </nav>
      <Link href="/progresso" prefetch={false} className="font-semibold text-primary">
        Ver jornada e conquistas
      </Link>
    </div>
  )
}
