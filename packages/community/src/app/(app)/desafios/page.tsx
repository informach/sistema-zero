import Link from 'next/link'
import { getCreativeToolsState } from '@/server/creative-tools'
import { shell } from '@/server/shell'

export const dynamic = 'force-dynamic'
export default async function AdultChallengesPage() {
  const [challenge, access, state] = await Promise.all([
    shell.members.getChallengeReadonly().catch(() => null),
    shell.members.checkChallengeAccessReadonly().catch(() => null),
    getCreativeToolsState(),
  ])
  if (challenge?.status !== 200 || challenge.body?.audience !== 'adult')
    return <p role="status">Desafio indisponível agora. Tente novamente mais tarde.</p>
  const { challenge: theme, entered } = challenge.body
  const canParticipate =
    state.kind === 'ready' &&
    state.studioAvailable &&
    access?.status === 200 &&
    access.body?.access?.['adult-clube-dos-criadores'] === true
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Desafio do mês</h1>
        <p className="mt-2 text-muted-foreground">
          Crie um jogo, compartilhe sua versão e conheça as ideias da comunidade.
        </p>
      </header>
      <section className="space-y-4 rounded-3xl bg-card p-6">
        <h2 className="text-2xl font-semibold">
          {theme.emoji} {theme.title}
        </h2>
        <p>{theme.description}</p>
        <p className="text-sm font-semibold">
          {entered
            ? 'Você já participou neste mês. Seu jogo está na mostra.'
            : 'Ao publicar seu jogo, marque a opção de participar do desafio.'}
        </p>
        <div className="flex flex-wrap gap-5 font-semibold text-primary">
          <Link href="/mural-dos-criadores-adulto?desafio=1">Ver jogos do desafio</Link>
          {canParticipate ? (
            <Link href="/estudio">Criar meu jogo</Link>
          ) : (
            <Link href="/progresso">Consultar requisitos e acesso</Link>
          )}
        </div>
      </section>
    </div>
  )
}
