import {
  evaluateLearning,
  type InteractiveBlock,
  type LearningAnswers,
} from '@sistemazero/core/learning'
import { LearningHtml } from '@sistemazero/member-shell/components/learning-html'
import { LessonSections } from '@sistemazero/member-shell/components/lesson-sections'
import type { LessonDetailView } from '@sistemazero/member-shell/lib/types'
import { createEmptyProject, type Project, StudioLesson } from '@sistemazero/studio'
import { Check, Lock, Rocket, Star } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import catalog from '../../../../docs/aulas-interativas/desafio-primeiro-jogo-v6/catalogo.json'
import day1Config from '../../../../docs/aulas-interativas/desafio-primeiro-jogo-v6/dia-1/configuracao-estudio.json'
import day1 from '../../../../docs/aulas-interativas/desafio-primeiro-jogo-v6/dia-1/manifesto.json'
import day2Config from '../../../../docs/aulas-interativas/desafio-primeiro-jogo-v6/dia-2/configuracao-estudio.json'
import day2 from '../../../../docs/aulas-interativas/desafio-primeiro-jogo-v6/dia-2/manifesto.json'
import day3Config from '../../../../docs/aulas-interativas/desafio-primeiro-jogo-v6/dia-3/configuracao-estudio.json'
import day3 from '../../../../docs/aulas-interativas/desafio-primeiro-jogo-v6/dia-3/manifesto.json'
import day4Config from '../../../../docs/aulas-interativas/desafio-primeiro-jogo-v6/dia-4/configuracao-estudio.json'
import day4 from '../../../../docs/aulas-interativas/desafio-primeiro-jogo-v6/dia-4/manifesto.json'
import day5Config from '../../../../docs/aulas-interativas/desafio-primeiro-jogo-v6/dia-5/configuracao-estudio.json'
import day5 from '../../../../docs/aulas-interativas/desafio-primeiro-jogo-v6/dia-5/manifesto.json'
import { courseProjects } from '../../../../docs/aulas-interativas/qa/desafio-projetos-qa'

const manifests = [day1, day2, day3, day4, day5]
const studioConfigs = [day1Config, day2Config, day3Config, day4Config, day5Config]
const projects = courseProjects()
const experiments = manifests.flatMap((day) =>
  day.blocks.flatMap((block) =>
    'content' in block &&
    block.content?.kind === 'interactive' &&
    block.content.activity?.type === 'html'
      ? [{ key: block.key, content: block.content as InteractiveBlock }]
      : [],
  ),
)

const DAY_LABELS = [
  'A nave ganha vida',
  'O tiro nasce na nave',
  'Asteroides entram em cena',
  'Pontos e vidas',
  'Vitória, derrota e recomeço',
] as const

function getDay(): number {
  const requested = Number(new URLSearchParams(location.search).get('day') ?? 4)
  return Math.min(5, Math.max(1, Number.isFinite(requested) ? requested : 4))
}

function projectForDay(day: number): Project {
  const snapshot = projects[day]
  if (!snapshot) throw new Error(`Projeto do dia ${day} não encontrado`)
  return {
    ...createEmptyProject(`desafio-dia-${day}`, `Nave contra Asteroides · Dia ${day}`),
    blocksState: structuredClone(snapshot.blocksState),
    installedExtensions: [{ id: 'game-2d', version: '1.0.0', installedAt: 0 }],
  }
}

function CaptureShell({
  eyebrow,
  title,
  description,
  children,
  capture = 'showcase',
}: {
  eyebrow: string
  title: string
  description: string
  children: ReactNode
  capture?: string
}) {
  return (
    <main className="min-h-screen bg-background px-8 py-7 text-foreground">
      <section
        data-capture={capture}
        className="mx-auto w-[1180px] overflow-hidden rounded-[28px] border border-border bg-card shadow-xl"
      >
        <header className="border-b border-border bg-[var(--pen-chao-alt)] px-8 py-6">
          <p className="mb-2 text-sm font-bold uppercase tracking-[0.16em] text-primary">
            {eyebrow}
          </p>
          <h1 className="sz-display text-3xl leading-tight">{title}</h1>
          <p className="mt-2 max-w-4xl text-base text-muted-foreground">{description}</p>
        </header>
        {children}
      </section>
    </main>
  )
}

function TrailPreview() {
  const completed = 2
  return (
    <CaptureShell
      eyebrow="Desafio do Primeiro Jogo"
      title="Seu projeto, passo a passo"
      description="A próxima etapa fica clara. O progresso permanece guardado para a criança continuar de onde parou."
      capture="trail"
    >
      <div className="grid grid-cols-[310px_1fr] gap-7 p-8">
        <aside className="rounded-3xl bg-[var(--pen-chao-alt)] p-6">
          <div className="grid size-14 place-items-center rounded-2xl bg-primary text-primary-foreground">
            <Rocket className="size-7" />
          </div>
          <h2 className="sz-display mt-5 text-2xl">Nave contra Asteroides</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Em cada etapa, uma parte nova passa a funcionar. No final, o jogo tem começo, desafio e
            resultado.
          </p>
          <div className="mt-6 rounded-2xl bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between text-sm font-bold">
              <span>Progresso</span>
              <span>{completed}/5 etapas</span>
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-muted">
              <div className="h-full w-2/5 rounded-full bg-primary" />
            </div>
          </div>
        </aside>
        <section className="unit-cyan">
          <header className="kids-unit-banner px-6 py-5">
            <p className="text-xs font-bold uppercase tracking-widest">Projeto guiado</p>
            <div className="mt-1 flex items-end justify-between gap-3">
              <h2 className="sz-display text-xl">Seu primeiro jogo em 5 dias</h2>
              <span className="sz-display whitespace-nowrap text-sm">{completed}/5 etapas</span>
            </div>
          </header>
          <ol className="mt-5 grid gap-3">
            {DAY_LABELS.map((label, index) => {
              const state = index < completed ? 'done' : index === completed ? 'current' : 'locked'
              return (
                <li
                  key={label}
                  className={`flex items-center gap-4 rounded-2xl border p-4 ${
                    state === 'current'
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-background'
                  }`}
                >
                  <span
                    className={`kids-node size-14 shrink-0 ${
                      state === 'done'
                        ? 'kids-node--done'
                        : state === 'current'
                          ? 'kids-node--current'
                          : 'kids-node--locked'
                    }`}
                  >
                    {state === 'done' ? (
                      <Check className="size-6" strokeWidth={3} />
                    ) : state === 'current' ? (
                      <Star className="size-6 fill-current" />
                    ) : (
                      <Lock className="size-5" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Dia {index + 1} · {catalog[index + 1]?.minutes}
                    </p>
                    <h3 className="mt-1 font-bold">{label}</h3>
                  </div>
                  <span className="rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground">
                    {state === 'done'
                      ? 'Concluído'
                      : state === 'current'
                        ? 'Continuar'
                        : 'Próxima etapa'}
                  </span>
                </li>
              )
            })}
          </ol>
        </section>
      </div>
    </CaptureShell>
  )
}

const lesson: LessonDetailView = {
  id: 'desafio-dia-1',
  slug: 'dia-1',
  courseSlug: 'desafio-primeiro-jogo',
  moduleId: 'desafio',
  title: 'Dia 1 · A nave ganha vida',
  completed: false,
  positionSeconds: null,
  estimatedMinutes: 25,
  attachments: [],
  blocks: [
    {
      id: 'observar',
      kind: 'rich_text',
      sortOrder: 0,
      content: {
        kind: 'rich_text',
        markdown:
          'Antes de montar, observe onde a nave aparece. Na tela do jogo, x indica a posição de um lado para o outro e y indica a altura.',
      },
    },
    {
      id: 'montar',
      kind: 'rich_text',
      sortOrder: 1,
      content: {
        kind: 'rich_text',
        markdown:
          'Agora crie o palco, coloque a nave e faça o desenho aparecer. Teste depois de cada pequena mudança.',
      },
    },
    { id: 'projeto', kind: 'studio', sortOrder: 2, content: { kind: 'studio' } },
  ],
  sections: [
    {
      id: 'observar-secao',
      title: '1. Observe antes de montar',
      blockIds: ['observar'],
      workspaceBlockId: null,
      externalTool: null,
    },
    {
      id: 'montar-secao',
      title: '2. Monte e teste no Estúdio',
      blockIds: ['montar', 'projeto'],
      workspaceBlockId: 'projeto',
      externalTool: null,
    },
  ],
}

function LessonPreview() {
  return (
    <CaptureShell
      eyebrow="Aula guiada"
      title="Uma tarefa pequena de cada vez"
      description="A criança entende o que vai fazer, executa a etapa e testa o resultado antes de seguir."
      capture="lesson"
    >
      <div className="p-8">
        <LessonSections
          kids
          lesson={lesson}
          renderBlocks={(blocks) =>
            blocks.map((block) => (
              <div key={block.id} className="rounded-2xl border border-border bg-background p-5">
                {block.kind === 'studio' ? (
                  <div className="flex items-center gap-4">
                    <span className="grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground">
                      <Rocket className="size-6" />
                    </span>
                    <div>
                      <p className="font-bold">Estúdio do Dia 1</p>
                      <p className="text-sm text-muted-foreground">
                        O projeto abre aqui, dentro da aula, com os blocos desta etapa.
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="leading-relaxed">
                    {String((block.content as { markdown: string }).markdown)}
                  </p>
                )}
              </div>
            ))
          }
        />
      </div>
    </CaptureShell>
  )
}

function ExperiencePreview() {
  const current = experiments.find((experiment) => experiment.key === 'experiencia-protecao')
  const [answers, setAnswers] = useState<LearningAnswers>({})
  if (current?.content.activity.type !== 'html') return null
  return (
    <CaptureShell
      eyebrow="Experimento interativo"
      title="Ela vê a ideia acontecer antes de usar no jogo"
      description="Aqui, a criança compara o que acontece com e sem proteção entre as batidas. Depois, leva essa lógica para o próprio projeto."
      capture="experience"
    >
      <div className="grid grid-cols-[1fr_350px] gap-6 p-8">
        <LearningHtml
          html={current.content.activity.html}
          title={current.content.title}
          answers={answers}
          onChange={setAnswers}
        />
        <aside className="rounded-3xl border border-border bg-[var(--pen-chao-alt)] p-6">
          <p className="text-xs font-bold uppercase tracking-wider text-primary">
            Pense sobre o teste
          </p>
          <h2 className="sz-display mt-2 text-xl">{current.content.checkpoint?.prompt}</h2>
          <div className="mt-5 space-y-3">
            {current.content.checkpoint?.choices.map((choice) => (
              <label
                key={choice.id}
                className="flex min-h-14 items-center gap-3 rounded-2xl border border-border bg-card p-4"
              >
                <input
                  type="radio"
                  name={current.key}
                  checked={answers.checkpoint === choice.id}
                  onChange={() => setAnswers({ ...answers, checkpoint: choice.id })}
                />
                <span className="text-sm font-semibold">{choice.label}</span>
              </label>
            ))}
          </div>
          {answers.checkpoint ? (
            <p className="mt-4 rounded-2xl bg-card p-4 text-sm" role="status">
              {evaluateLearning(current.content, answers).feedback}
            </p>
          ) : null}
        </aside>
      </div>
    </CaptureShell>
  )
}

function MaterialsPreview() {
  return (
    <CaptureShell
      eyebrow="Materiais do Desafio"
      title="A criança cria. Os pais sabem como acompanhar."
      description="Os materiais de apoio ficam no próprio curso e podem ser consultados durante os 30 dias de acesso."
      capture="materials"
    >
      <div className="grid grid-cols-2 gap-6 p-8">
        <article className="rounded-3xl border border-border bg-background p-6">
          <p className="text-xs font-bold uppercase tracking-wider text-primary">Para a criança</p>
          <h2 className="sz-display mt-2 text-2xl">Caderno do Aluno</h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            Um material de consulta para conferir os bloquinhos usados no projeto e acompanhar cada
            etapa.
          </p>
          <div className="mt-6 rounded-2xl bg-[var(--pen-chao-alt)] p-5">
            <p className="text-sm font-bold">Neste material</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>✓ Consulta dos blocos usados</li>
              <li>✓ Apoio durante a montagem</li>
              <li>✓ Material para abrir junto com as aulas</li>
            </ul>
          </div>
        </article>
        <article className="rounded-3xl border border-border bg-background p-6">
          <p className="text-xs font-bold uppercase tracking-wider text-primary">Para a família</p>
          <h2 className="sz-display mt-2 text-2xl">Mapa dos Pais</h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            Um guia direto para acompanhar a jornada, mesmo sem entender de programação ou
            tecnologia.
          </p>
          <div className="mt-6 rounded-2xl bg-[var(--pen-chao-alt)] p-5">
            <p className="text-sm font-bold">Como usar</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>✓ Entenda como acompanhar a jornada</li>
              <li>✓ Saiba o que observar em cada etapa</li>
              <li>✓ Apoie mesmo sem entender de tecnologia</li>
            </ul>
          </div>
        </article>
      </div>
    </CaptureShell>
  )
}

function StudioPreview() {
  const day = getDay()
  const config = studioConfigs[day - 1]!
  return (
    <CaptureShell
      eyebrow={`Dia ${day} · ${DAY_LABELS[day - 1]}`}
      title="A explicação e a criação ficam no mesmo lugar"
      description="A paleta mostra os comandos desta etapa. A criança monta com blocos e acompanha o jogo funcionando ao lado."
      capture="studio-shell"
    >
      <div className="bg-[var(--pen-chao-alt)] p-6">
        <div
          data-capture="studio"
          className="h-[720px] overflow-hidden rounded-2xl border border-border bg-card shadow-lg"
        >
          <StudioLesson
            key={day}
            initialProject={projectForDay(day)}
            persistence="none"
            allowedModes={['blocks']}
            initialMode="blocks"
            level="iniciante-2d"
            allowBlocks={config.allowBlocks}
            allowLevelReveal={false}
            blockUnloadWhenDirty={false}
            features={{
              ai: false,
              console: false,
              download: false,
              export: false,
              extensions: false,
              professional: false,
              terminal: false,
            }}
            theme="light"
          />
        </div>
      </div>
    </CaptureShell>
  )
}

function LegacyExperimentPreview() {
  const [index, setIndex] = useState(0)
  const [mount, setMount] = useState(0)
  const [answers, setAnswers] = useState<Record<string, LearningAnswers>>({})
  const current = experiments[index]!
  const value = answers[current.key] ?? {}
  if (current.content.activity.type !== 'html') return null
  return (
    <main className="mx-auto max-w-4xl space-y-4 p-3">
      <h1 className="text-xl font-bold">Ensaio local · Desafio do Primeiro Jogo</h1>
      <div className="flex flex-wrap gap-3">
        <select
          className="min-h-11 max-w-full rounded-xl border border-border bg-card px-3"
          aria-label="Experimento"
          value={index}
          onChange={(event) => setIndex(Number(event.target.value))}
        >
          {experiments.map((experiment, optionIndex) => (
            <option key={experiment.key} value={optionIndex}>
              {experiment.key}
            </option>
          ))}
        </select>
        <button
          className="min-h-11 rounded-xl border border-border bg-card px-3"
          type="button"
          onClick={() => setMount((value) => value + 1)}
        >
          Reabrir com o estado guardado
        </button>
      </div>
      <LearningHtml
        key={`${current.key}-${mount}`}
        html={current.content.activity.html}
        title={current.key}
        answers={value}
        onChange={(next) => setAnswers((previous) => ({ ...previous, [current.key]: next }))}
      />
    </main>
  )
}

function Preview() {
  const params = new URLSearchParams(location.search)
  const mode = params.get('showcase')
  if (mode === 'trail') return <TrailPreview />
  if (mode === 'lesson') return <LessonPreview />
  if (mode === 'experience') return <ExperiencePreview />
  if (mode === 'materials') return <MaterialsPreview />
  if (mode === 'studio') return <StudioPreview />
  if (params.has('spacing')) return <LessonPreview />
  return <LegacyExperimentPreview />
}

createRoot(document.getElementById('root')!).render(<Preview />)
