import { Check, LayoutDashboard, Trophy } from 'lucide-react'
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
 * O desafio do mês (Estúdio à noite, 25/10/2026): o palco com a faixa amarela, o tema, os três passos da
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
      <section className="sz-band border-(--cta) border-t-[6px]">
        <div className="sz-page flex flex-col gap-4 pt-7 pb-10">
          <BackLink href="/mural-dos-criadores-adulto" label="Mural dos Criadores" />
          <div className="flex flex-wrap items-center gap-3">
            <span className="sz-kicker text-(--cta)">
              {month ? `Desafio de ${month}` : 'Desafio do mês'}
            </span>
            {entered ? (
              <span className="sz-chip sz-chip-ok">
                <Check aria-hidden />
                Participou neste mês
              </span>
            ) : (
              <span className="sz-chip">Ainda não participou neste mês</span>
            )}
          </div>
          <h1 className="sz-h1 max-w-4xl">{theme.title}</h1>
          <p className="sz-lead m-0 max-w-3xl">{theme.description}</p>
          <div className="mt-1 flex flex-wrap gap-3">
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
          <section aria-labelledby="como-participar" className="mt-5 flex flex-col gap-4">
            <h2 id="como-participar" className="sz-h3">
              Como participar
            </h2>
            <ol className="m-0 grid list-none gap-4 p-0 md:grid-cols-3">
              {STEPS.map((step, index) => (
                <li key={step.title} className="sz-card-sm flex flex-col gap-3 p-5">
                  <span aria-hidden className="sz-num sz-num-acao">
                    {index + 1}
                  </span>
                  <strong className="sz-h4">{step.title}</strong>
                  <span className="text-[0.9rem] text-muted-foreground">{step.text}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </section>
      <PageBody>
        <section
          aria-labelledby="sua-participacao"
          className="sz-card flex flex-wrap items-center gap-4 p-6 md:p-7"
        >
          <span
            aria-hidden
            className={
              entered
                ? 'inline-flex size-14 flex-none items-center justify-center rounded-2xl bg-(--pen-sucesso) text-white'
                : 'inline-flex size-14 flex-none items-center justify-center rounded-2xl bg-(--aviso-tint) text-(--aviso-texto)'
            }
          >
            {entered ? <Check className="size-7" /> : <Trophy className="size-7" />}
          </span>
          <div className="flex min-w-0 flex-[1_1_20rem] flex-col gap-1">
            <h2 id="sua-participacao" className="sz-h3">
              A sua participação
            </h2>
            <p className="m-0 text-muted-foreground">
              {entered
                ? 'Você já participou neste mês. Seu jogo está no Mural.'
                : 'Ao publicar seu jogo, marque a opção de participar do desafio.'}
            </p>
          </div>
        </section>
      </PageBody>
    </>
  )
}
