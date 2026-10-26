import { CreatorMasteryHub } from '@sistemazero/member-shell/components/creator-journey'
import Link from 'next/link'
import { KidsBand } from '@/components/kids/kids-band'
import { shell } from '@/server/shell'

export const dynamic = 'force-dynamic'
export default async function MasteriesPage() {
  const result = await shell.members.getCreatorMasteriesReadonly().catch(() => null)
  return (
    <>
      <KidsBand tone="creme">
        <Link href="/cursos" className="inline-flex min-h-11 items-center font-bold text-primary">
          ← Voltar à jornada
        </Link>
        <p className="mt-5 font-bold text-primary">Novas ideias para os seus jogos</p>
        <h1 className="sz-display mt-2 text-3xl md:text-4xl">Escolha a sua maestria</h1>
        <p className="mt-3 max-w-3xl text-muted-foreground">
          Uma linguagem, uma dimensão ou a arte dos seus jogos. Escolha a área que dá vontade de
          explorar: cada uma tem três níveis e seu próprio caminho.
        </p>
      </KidsBand>
      <KidsBand tone="lilas">
        {result?.status !== 200 ? (
          <p role="status">
            Não conseguimos consultar suas maestrias agora. Suas conquistas estão guardadas. Tente
            novamente daqui a pouco.
          </p>
        ) : !result.body.configured ? (
          <p role="status">
            As maestrias estão sendo preparadas. Seus cursos e conquistas continuam disponíveis na
            jornada.
          </p>
        ) : (
          <>
            <section className="kids-carta mb-7 space-y-3 p-6">
              <h2 className="sz-display text-xl">Você pode começar antes de ser Lenda</h2>
              <p>
                Cada área abre quando as bases da jornada preparam você para ela. Aprenda, aplique
                duas oficinas e envie seu projeto para receber o retorno da equipe.
              </p>
              <p className="text-muted-foreground">
                Você pode usar blocos, Ponte e Pro. Em Arte e Modelagem, os assets que você cria
                entram em um jogo que já funciona.
              </p>
            </section>
            <CreatorMasteryHub areas={result.body.areas} skin="kids" />
          </>
        )}
      </KidsBand>
    </>
  )
}
