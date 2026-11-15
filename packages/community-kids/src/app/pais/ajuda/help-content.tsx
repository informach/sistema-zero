import { ChevronDown, ChevronRight, LifeBuoy, MessagesSquare } from 'lucide-react'
import Link from 'next/link'
import type { TeacherThreadSummaryView } from '@/lib/types'
import { PRIMARY_ACTION } from '../_components/parent-actions'
import { ParentShell } from '../_components/parent-shell'
import { ParentPageTitle, ParentSection } from '../_components/parent-ui'
import { PARENT_DOUBTS_TITLE } from '../parent-routes'

const STEPS = [
  {
    title: 'Em Família, abra a página do seu filho ou da sua filha',
    text: 'Se ainda não existe um perfil, use Adicionar filho(a) e informe o nome e a data de nascimento.',
  },
  {
    title: 'Na aba Aparelhos, clique em Autorizar aparelho',
    text: 'Escolha Neste aparelho, se for usado este navegador, ou Em outro aparelho.',
  },
  {
    title: 'Dê um nome ao aparelho e escolha por quanto tempo',
    text: 'No computador de casa, 90 dias evita novos pedidos. Num aparelho emprestado, prefira somente hoje. A data de término aparece antes de você confirmar.',
  },
  {
    title: 'Neste aparelho: Autorizar este aparelho',
    text: 'Na hora de passar o computador, clique em Ir para a área da criança. Isso fecha a sua entrada de responsável neste navegador.',
  },
  {
    title: 'Em outro aparelho: Gerar código',
    text: 'No outro computador, abra o endereço que aparece junto do código e digite o código, ou deixe que eles digitem. O código vale 10 minutos e libera um navegador só. Depois, clique em Conferir.',
  },
  {
    title: 'Pronto: a entrada é sem a sua senha',
    text: 'No aparelho autorizado, basta clicar em Eu sou criador(a) e no próprio nome, até o prazo acabar.',
  },
] as const

/** Dúvidas sobre os cursos para pais (14/11/2026). */
const COURSE_QUESTIONS: { question: string; answer: string }[] = [
  {
    question: 'Os cursos para pais estão incluídos na assinatura?',
    answer:
      'Sim. Quem assina a Comunidade dos Criadores tem todos os cursos para pais. Quem não assina pode comprar um curso só ou receber de presente.',
  },
  {
    question: 'Meus filhos veem o que eu faço nos cursos?',
    answer:
      'Não. O seu progresso fica na sua conta, separado do perfil de cada um, e não aparece na área deles.',
  },
  {
    question: 'Fazer um curso gasta os créditos do Zappy?',
    answer:
      'Não. Nas aulas, as falas do Zappy são escritas pela nossa equipe, e as suas dúvidas são respondidas por pessoas da equipe.',
  },
  {
    question: 'Como recebo o certificado?',
    answer:
      'Quando o curso tem certificado, ele fica na última aula. Depois de concluir as aulas, é só clicar em Baixar meu certificado.',
  },
]

const DOUBT_STATUS: Record<NonNullable<TeacherThreadSummaryView['workflowStatus']>, string> = {
  waiting_teacher: 'Aguardando a equipe',
  waiting_student: 'Respondida',
  resolved: 'Resolvida',
}

function dayLabel(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'short',
    timeZone: 'America/Sao_Paulo',
  })
}

/** As dúvidas que o responsável mandou de dentro das aulas dos cursos para pais. */
function CourseDoubts({ doubts }: { doubts: TeacherThreadSummaryView[] }) {
  return (
    <section
      id="duvidas"
      aria-labelledby="help-doubts"
      className="kids-carta flex scroll-mt-24 flex-col gap-2 p-6"
    >
      <h2 id="help-doubts" className="sz-display text-xl">
        {PARENT_DOUBTS_TITLE}
      </h2>
      <p className="text-muted-foreground text-sm">
        As perguntas que você mandou pelo Preciso de ajuda, dentro das aulas, e as respostas da
        nossa equipe.
      </p>
      <ul className="flex flex-col">
        {doubts.map((doubt) => (
          <li key={doubt.id} className="border-(--linha-carta) border-t">
            <Link
              href={`/pais/ajuda/duvidas/${encodeURIComponent(doubt.id)}`}
              className="flex min-h-14 items-center gap-3 py-3 text-foreground"
            >
              <span className="flex min-w-0 flex-1 flex-col">
                <strong className="truncate">{doubt.title ?? 'Dúvida na aula'}</strong>
                <span className="text-muted-foreground text-xs">
                  {dayLabel(doubt.lastMessageAt)}
                  {doubt.workflowStatus ? ` · ${DOUBT_STATUS[doubt.workflowStatus]}` : ''}
                </span>
              </span>
              {doubt.unread ? (
                <span className="kids-marca rounded-full px-2.5 py-0.5 font-bold text-xs">
                  Nova resposta
                </span>
              ) : null}
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

const QUESTIONS: { question: string; answer: React.ReactNode }[] = [
  {
    question: 'O código não funcionou',
    answer:
      'Confira as letras. O código pode ter vencido (vale 10 minutos), já ter sido usado em outro aparelho ou ser de outra criança. Gere um código novo em Acesso nos aparelhos. Não é preciso passar a sua senha para a criança.',
  },
  {
    question: 'Antes a criança entrava. Agora pede código',
    answer:
      'O responsável prepara o acesso uma vez em cada navegador. O prazo também pode ter terminado ou o acesso ter sido encerrado. Isso acontece ainda ao trocar de navegador, limpar os cookies ou usar uma janela anônima. O progresso continua guardado no perfil.',
  },
  {
    question: 'Dois irmãos usam o mesmo computador',
    answer:
      'Cada perfil é autorizado separadamente: abra Acesso nos aparelhos de cada criança e autorize o mesmo computador. São dois acessos, cada um com o seu prazo, e encerrar o de um não muda o do outro. No dia a dia, a criança usa Trocar de perfil no menu do avatar.',
  },
  {
    question: 'Quero renovar ou encerrar um acesso',
    answer:
      'Na página da criança, cada aparelho tem Renovar prazo, que mostra a data atual e a nova antes de confirmar. No menu do aparelho, Encerrar acesso tira a entrada daquele perfil naquele navegador, sem mudar os irmãos e sem apagar o progresso. Um acesso encerrado não volta: para usar o aparelho de novo, autorize outra vez.',
  },
  {
    question: 'O prazo do acesso muda a validade dos cursos?',
    answer:
      'Não. O prazo só diz por quanto tempo a criança entra sem pedir um código naquele aparelho. A validade dos cursos e da assinatura não muda.',
  },
  {
    question: 'Perdi minha senha de responsável',
    answer: (
      <>
        Você pode entrar com um código enviado ao seu e-mail. Para criar outra senha, use{' '}
        <Link
          href="/esqueci-senha"
          className="font-bold text-primary underline-offset-4 hover:underline"
        >
          Esqueci minha senha
        </Link>
        .
      </>
    ),
  },
]

/**
 * A Ajuda da área dos pais (11/10/2026). Era o link "Ver o passo a passo", que levava à ajuda do
 * LOGIN, fora da área e sem caminho de volta. Agora o passo a passo, as perguntas e o atendimento
 * moram aqui, com a barra da área no topo.
 */
export function HelpContent({
  parentName,
  doubts = [],
}: {
  parentName?: string
  /** As dúvidas dos cursos para pais; a parte só aparece depois da primeira. */
  doubts?: TeacherThreadSummaryView[]
}) {
  return (
    <ParentShell active="ajuda" parentName={parentName}>
      <ParentPageTitle
        title="Ajuda"
        text="Como preparar o acesso dos seus filhos, as respostas para as dúvidas mais comuns e a nossa equipe, sempre que precisar."
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-8">
          {doubts.length ? <CourseDoubts doubts={doubts} /> : null}
          <section aria-labelledby="help-steps" className="kids-carta flex flex-col gap-5 p-6">
            <h2 id="help-steps" className="sz-display text-xl">
              Como preparar o acesso
            </h2>
            <ol className="flex flex-col gap-4">
              {STEPS.map((step, index) => (
                <li key={step.title} className="flex gap-4">
                  <span className="kids-marca sz-display flex size-9 shrink-0 items-center justify-center rounded-full">
                    {index + 1}
                  </span>
                  <span>
                    <strong className="block">{step.title}</strong>
                    <span className="text-muted-foreground text-sm">{step.text}</span>
                  </span>
                </li>
              ))}
            </ol>
          </section>
          <ParentSection title="Dúvidas sobre o acesso" id="help-questions">
            <div className="flex flex-col gap-2">
              {QUESTIONS.map((item) => (
                <details key={item.question} className="kids-carta group px-5">
                  <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 font-bold [&::-webkit-details-marker]:hidden">
                    {item.question}
                    <ChevronDown
                      className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                      aria-hidden="true"
                    />
                  </summary>
                  <p className="pb-4 text-muted-foreground text-sm">{item.answer}</p>
                </details>
              ))}
            </div>
          </ParentSection>
          <ParentSection title="Dúvidas sobre os cursos para pais" id="help-courses">
            <div className="flex flex-col gap-2">
              {COURSE_QUESTIONS.map((item) => (
                <details key={item.question} className="kids-carta group px-5">
                  <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 font-bold [&::-webkit-details-marker]:hidden">
                    {item.question}
                    <ChevronDown
                      className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                      aria-hidden="true"
                    />
                  </summary>
                  <p className="pb-4 text-muted-foreground text-sm">{item.answer}</p>
                </details>
              ))}
            </div>
          </ParentSection>
        </div>
        <aside className="flex flex-col gap-4">
          <section
            aria-labelledby="help-team"
            className="kids-marca flex flex-col gap-3 rounded-(--raio-carta) p-6"
          >
            <LifeBuoy className="size-8" aria-hidden="true" />
            <h2 id="help-team" className="sz-display text-xl">
              Fale com a nossa equipe
            </h2>
            <p className="kids-marca-suave text-sm">
              Conta, pagamento, acesso ou qualquer outra coisa: abra um chamado e acompanhe a
              resposta aqui mesmo.
            </p>
            <Link
              href="/pais/ajuda/atendimento"
              className="kids-marca-inverso flex min-h-11 items-center justify-center gap-2 rounded-full font-bold text-sm"
            >
              <MessagesSquare className="size-4" aria-hidden="true" /> Abrir o atendimento
            </Link>
          </section>
          <section className="kids-carta flex flex-col gap-2 p-5 text-sm">
            <h2 className="font-extrabold">O acesso em três passos</h2>
            <p className="text-muted-foreground">
              Crie o perfil, autorize o computador que vai ser usado, e a entrada passa a ser sem a
              sua senha.
            </p>
            <Link href="/pais/familia" className={`${PRIMARY_ACTION} mt-1 self-start`}>
              Ir para Família
            </Link>
          </section>
        </aside>
      </div>
    </ParentShell>
  )
}
