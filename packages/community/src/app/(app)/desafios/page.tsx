import { LayoutDashboard, Trophy } from 'lucide-react'
import Link from 'next/link'
import { challengeMonthName } from '@/components/community/community/challenge-month'
import { BackLink, PageBand, PageBody } from '@/components/community/page'
import { getCreativeToolsState } from '@/server/creative-tools'
import { shell } from '@/server/shell'

export const dynamic = 'force-dynamic'

const STEPS = [
  {
    title: 'Crie o seu jogo no Estúdio',
    text: 'Pode ser um jogo novo ou a sua versão de um jogo do Mural.',
  },
  {
    title: 'Na hora de publicar, marque “Participar do desafio”',
    text: 'A opção aparece no Compartilhar do Estúdio durante o mês do desafio.',
  },
  {
    title: 'Seu jogo entra na prateleira do desafio',
    text: 'Todos podem jogar e comentar no Mural.',
  },
] as const

/**
 * O desafio do mês (direção de arte de 18/10/2026): a faixa escura com o tema, os três passos da
 * regra que já existe (participar é marcar a opção ao publicar) e a participação de quem lê. A
 * ilustração por tema é arte nova que ainda não existe: sem ela, a faixa fica com a cor e o título.
 */
export default async function AdultChallengesPage() {
  const [challenge, access, state] = await Promise.all([
    shell.members.getChallengeReadonly().catch(() => null),
    shell.members.checkChallengeAccessReadonly().catch(() => null),
    getCreativeToolsState(),
  ])
  if (challenge?.status !== 200 || challenge.body?.audience !== 'adult')
    return (
      <>
        <PageBand
          back={{ href: '/mural-dos-criadores-adulto', label: 'Mural dos Criadores' }}
          title="Desafio do mês"
        />
        <PageBody>
          <p role="status" className="sz-card p-6 text-muted-foreground">
            Desafio indisponível agora. Tente novamente mais tarde.
          </p>
        </PageBody>
      </>
    )
  const { challenge: theme, entered } = challenge.body
  const month = challengeMonthName(theme.key)
  const canParticipate =
    state.kind === 'ready' &&
    state.studioAvailable &&
    access?.status === 200 &&
    access.body?.access?.['adult-clube-dos-criadores'] === true
  return (
    <>
      <section className="bg-(--sz-community-blue-deep) text-(--sz-community-on-action)">
        <div className="sz-page flex flex-col gap-3.5 pt-7 pb-11">
          <BackLink
            href="/mural-dos-criadores-adulto"
            label="Mural dos Criadores"
            className="text-(--sz-community-on-action) hover:text-(--sz-community-on-action) hover:underline"
          />
          <span className="sz-chip sz-chip-novo self-start">
            <Trophy aria-hidden />
            {month ? `Desafio de ${month}` : 'Desafio do mês'}
          </span>
          <h1 className="sz-h1 text-(--sz-community-on-action)">{theme.title}</h1>
          <p className="max-w-3xl text-[1.15rem] opacity-90">{theme.description}</p>
        </div>
      </section>
      <PageBody>
        <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_19rem]">
          <section
            aria-labelledby="como-participar"
            className="sz-card flex flex-col gap-5 p-6 md:p-7"
          >
            <h2 id="como-participar" className="sz-h2">
              Como participar
            </h2>
            <ol className="flex flex-col gap-4">
              {STEPS.map((step, index) => (
                <li key={step.title} className="flex items-start gap-4">
                  <span aria-hidden className="sz-num sz-num-acao">
                    {index + 1}
                  </span>
                  <span className="flex flex-col gap-1">
                    <strong>{step.title}</strong>
                    <span className="text-muted-foreground">{step.text}</span>
                  </span>
                </li>
              ))}
            </ol>
            <div className="mt-2 flex flex-wrap gap-3">
              {canParticipate ? (
                <Link href="/estudio" prefetch={false} className="sz-btn">
                  <LayoutDashboard aria-hidden />
                  Criar meu jogo
                </Link>
              ) : (
                <Link href="/progresso" prefetch={false} className="sz-btn">
                  Consultar requisitos e acesso
                </Link>
              )}
              <Link
                href="/mural-dos-criadores-adulto?desafio=1"
                prefetch={false}
                className="sz-btn-outline"
              >
                Ver jogos do desafio
              </Link>
            </div>
          </section>
          <aside aria-labelledby="sua-participacao" className="sz-card flex flex-col gap-3 p-6">
            <h2 id="sua-participacao" className="sz-h3">
              A sua participação
            </h2>
            {entered ? (
              <span className="sz-chip sz-chip-ok self-start">Participou neste mês</span>
            ) : (
              <span className="sz-chip self-start">Ainda não participou neste mês</span>
            )}
            <p className="text-[0.85rem] text-muted-foreground">
              {entered
                ? 'Você já participou neste mês. Seu jogo está no Mural.'
                : 'Ao publicar seu jogo, marque a opção de participar do desafio.'}
            </p>
          </aside>
        </div>
      </PageBody>
    </>
  )
}
