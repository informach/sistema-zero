import { CreatorMasteryHub } from '@sistemazero/member-shell/components/creator-journey'
import { PageBand, PageBody } from '@/components/community/page'
import { shell } from '@/server/shell'

export const dynamic = 'force-dynamic'
export default async function MasteriesPage() {
  const result = await shell.members.getCreatorMasteriesReadonly().catch(() => null)
  return (
    <>
      <PageBand
        kicker="Sua criação vai mais longe"
        title="Maestrias para os seus jogos"
        lead="Escolha uma linguagem, uma dimensão ou as ferramentas de arte dos seus jogos. Cada área tem três níveis, prática e avaliação do seu projeto."
        back={{ href: '/cursos', label: 'Voltar à jornada' }}
      />
      <PageBody>
        {result?.status !== 200 ? (
          <p role="status">
            Não foi possível consultar suas maestrias agora. Suas conquistas continuam guardadas.
            Tente novamente em alguns instantes.
          </p>
        ) : !result.body.configured ? (
          <p role="status">
            As áreas de maestria estão sendo preparadas. Seus cursos e conquistas continuam
            disponíveis na jornada.
          </p>
        ) : (
          <>
            <section className="sz-card space-y-3 p-6">
              <h2 className="sz-h2">Uma área por interesse</h2>
              <p>
                Você não precisa esperar a Lenda. Cada área abre no ponto da jornada que prepara
                você para começar. Os níveis II e III pedem o nível anterior da mesma área.
              </p>
              <p className="text-muted-foreground">
                Blocos, Ponte e Pro são formas de construir dentro da mesma área. Em Arte e
                Modelagem, você cria os assets de um jogo que já funciona.
              </p>
            </section>
            <CreatorMasteryHub areas={result.body.areas} skin="adult" />
          </>
        )}
      </PageBody>
    </>
  )
}
