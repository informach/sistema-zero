import { Blocks, Compass, Layers } from 'lucide-react'
import { AdultMasteryHub } from '@/components/community/journey/creator'
import { StageMedal } from '@/components/community/journey/stepper'
import { PageBand, PageBody } from '@/components/community/page'
import { shell } from '@/server/shell'

export const dynamic = 'force-dynamic'

const NOTES = [
  {
    Icon: Compass,
    title: 'Uma área por interesse',
    text: 'Você não precisa esperar a Lenda: cada área abre no ponto da jornada que prepara você para começar.',
  },
  {
    Icon: Layers,
    title: 'Três níveis em ordem',
    text: 'Os níveis II e III pedem o nível anterior da mesma área.',
  },
  {
    Icon: Blocks,
    title: 'Do seu jeito de criar',
    text: 'Blocos, Ponte e Pro são formas de construir dentro da mesma área. Em Arte e Modelagem, você cria os assets de um jogo que já funciona.',
  },
]

/** As Maestrias no palco do Estúdio à noite: o selo da Lenda, as três regras e um cartão por área. */
export default async function MasteriesPage() {
  const [result, gamification] = await Promise.all([
    shell.members.getCreatorMasteriesReadonly().catch(() => null),
    shell.members.getGamificationReadonly({ withRanking: true }).catch(() => null),
  ])
  const view =
    gamification?.status === 200 ? (gamification.body?.journey?.curriculum ?? undefined) : undefined
  const legend = view?.level === 'god'
  const total = (view?.stages.length ?? 7) + 1
  return (
    <>
      <PageBand
        kicker={legend ? 'Você chegou à Lenda' : 'Sua criação vai mais longe'}
        title="Maestrias para os seus jogos"
        lead="Escolha uma linguagem, uma dimensão ou as ferramentas de arte dos seus jogos. Cada área tem três níveis, prática e avaliação do seu projeto pela equipe."
        back={{ href: '/cursos', label: 'Voltar à jornada' }}
        actions={<StageMedal badge={{ position: total, total, title: null }} big crown />}
      >
        <ul className="m-0 mt-4 grid list-none gap-3 p-0 md:grid-cols-3">
          {NOTES.map(({ Icon, title, text }) => (
            <li key={title} className="sz-card-sm flex items-start gap-3.5 p-4">
              <span
                aria-hidden="true"
                className="inline-flex size-11 flex-none items-center justify-center rounded-xl bg-(--carta-2) text-(--cta)"
              >
                <Icon className="size-6" />
              </span>
              <span className="flex min-w-0 flex-col">
                <strong>{title}</strong>
                <span className="text-[0.9rem] text-muted-foreground">{text}</span>
              </span>
            </li>
          ))}
        </ul>
      </PageBand>
      <PageBody>
        {result?.status !== 200 ? (
          <p role="status" className="sz-card m-0 p-6">
            Não foi possível consultar suas maestrias agora. Suas conquistas continuam guardadas.
            Tente novamente em alguns instantes.
          </p>
        ) : !result.body.configured ? (
          <p role="status" className="sz-card m-0 p-6">
            As áreas de maestria estão sendo preparadas. Seus cursos e conquistas continuam
            disponíveis na jornada.
          </p>
        ) : (
          <section aria-labelledby="areas" className="flex flex-col gap-5">
            <h2 id="areas" className="sz-h2">
              Escolha a sua área
            </h2>
            <AdultMasteryHub areas={result.body.areas} view={view} />
          </section>
        )}
      </PageBody>
    </>
  )
}
