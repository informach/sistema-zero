import {
  ArrowRight,
  Blocks,
  BookOpen,
  Check,
  ChevronRight,
  CircleUserRound,
  Flame,
  Gamepad2,
  GraduationCap,
  Home,
  Images,
  LockKeyhole,
  Mail,
  MessageCircle,
  MessagesSquare,
  Palette,
  Play,
  QrCode,
  Rocket,
  Send,
  Share2,
  ShieldCheck,
  Sparkles,
  Star,
  Trophy,
  UserRound,
  WandSparkles,
  Zap,
} from 'lucide-react'
import { type ReactNode, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { KidsFeatureCard } from '../../src/components/kids/kids-feature-card'
import { KidsHero } from '../../src/components/kids/kids-hero'
import { KidsLogo } from '../../src/components/kids/kids-logo'
import { TOOL_SIGNATURE } from '../../src/lib/tool-signature'

type Screen = 'career' | 'lesson' | 'workshop' | 'mural' | 'club' | 'messages' | 'space'

const TOOL_DESCRIPTION = {
  'estudio-completo': 'Monte o jogo com blocos e veja tudo funcionar na hora.',
  pinta: 'Desenhe personagens, cenários e peças em 2D.',
  pensa: 'Transforme uma ideia em plano e organize cada missão.',
  molda: 'Crie modelos, texturas e céus para mundos 3D.',
} as const

const LEVELS = [
  { slug: 'noob', label: 'Faísca', state: 'done' },
  { slug: 'coder', label: 'Construtora', state: 'current' },
  { slug: 'hacker', label: 'Inventora', state: 'next' },
  { slug: 'explorer', label: 'Exploradora de Mundos', state: 'locked' },
  { slug: 'elite', label: 'Mestre dos Jogos', state: 'locked' },
  { slug: 'architect', label: 'Arquiteta de Mundos', state: 'locked' },
  { slug: 'champion', label: 'Gênio da Criação', state: 'locked' },
  { slug: 'god', label: 'Lenda', state: 'locked' },
] as const

function getScreen(): Screen {
  const requested = new URLSearchParams(location.search).get('screen')
  if (
    requested === 'career' ||
    requested === 'lesson' ||
    requested === 'workshop' ||
    requested === 'mural' ||
    requested === 'club' ||
    requested === 'messages' ||
    requested === 'space'
  )
    return requested
  return 'career'
}

const NAV = [
  { label: 'Início', icon: Home },
  { label: 'Jornada', icon: GraduationCap },
  { label: 'Criar', icon: Sparkles },
  { label: 'Comunidade', icon: MessagesSquare },
  { label: 'Meu espaço', icon: CircleUserRound },
] as const

function activeSection(screen: Screen): (typeof NAV)[number]['label'] {
  if (screen === 'career' || screen === 'lesson') return 'Jornada'
  if (screen === 'workshop') return 'Criar'
  if (screen === 'mural' || screen === 'club' || screen === 'messages') return 'Comunidade'
  return 'Meu espaço'
}

function Sidebar({ screen }: { screen: Screen }) {
  const active = activeSection(screen)
  return (
    <aside className="flex w-[248px] shrink-0 flex-col bg-(--menu) px-5 py-6 text-(--menu-texto)">
      <KidsLogo fundo="escuro" className="w-[196px]" />
      <nav className="mt-8 grid gap-2" aria-label="Navegação principal">
        {NAV.map(({ label, icon: Icon }) => (
          <div
            key={label}
            className={`flex h-11 items-center gap-3 rounded-xl px-3.5 font-semibold ${
              label === active ? 'kids-marca' : ''
            }`}
          >
            <Icon className="size-5" strokeWidth={1.8} />
            {label}
          </div>
        ))}
      </nav>
      <div className="mt-auto grid gap-3">
        <div className="flex items-center gap-3 rounded-xl bg-(--menu-vidro) px-3 py-2.5">
          <Mail className="size-5 text-(--pen-acao-clara)" />
          <span className="font-semibold text-sm">Recados</span>
          <span className="ml-auto grid size-5 place-items-center rounded-full bg-(--sz-hot) font-bold text-[11px] text-white">
            2
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-(--menu-vidro) px-3 py-2.5 font-bold text-sm">
          <Flame className="size-5 text-orange-400" /> 8 dias
          <span className="ml-auto flex items-center gap-1">
            <Zap className="size-4 text-yellow-300" /> 680 XP
          </span>
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-(--menu-vidro) p-3">
          <span className="grid size-10 place-items-center rounded-full bg-pink-200 font-black text-pink-800">
            B
          </span>
          <span className="min-w-0">
            <strong className="block truncate text-sm text-white">Bia</strong>
            <small className="block text-(--menu-icone)">Construtora</small>
          </span>
        </div>
      </div>
    </aside>
  )
}

function CaptureShell({ screen, children }: { screen: Screen; children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[#cbd5e1] p-7 text-foreground">
      <section
        data-capture={screen}
        className="mx-auto flex h-[720px] w-[1280px] overflow-hidden rounded-[26px] border border-border bg-background shadow-2xl"
      >
        <Sidebar screen={screen} />
        <div className="min-w-0 flex-1 overflow-hidden bg-(--chao)">{children}</div>
      </section>
    </main>
  )
}

function PageFrame({ children }: { children: ReactNode }) {
  return <div className="h-full overflow-hidden px-10 py-8">{children}</div>
}

function Eyebrow({ icon: Icon, children }: { icon: typeof Sparkles; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-card px-3.5 py-2 font-extrabold text-primary text-xs uppercase tracking-[0.1em] shadow-sm">
      <Icon className="size-4" /> {children}
    </span>
  )
}

function PageTitle({
  eyebrow,
  icon,
  title,
  subtitle,
}: {
  eyebrow: string
  icon: typeof Sparkles
  title: string
  subtitle: string
}) {
  return (
    <header>
      <Eyebrow icon={icon}>{eyebrow}</Eyebrow>
      <h1 className="sz-display mt-3 text-[2.45rem] leading-tight">{title}</h1>
      <p className="mt-2 max-w-[760px] font-medium text-muted-foreground">{subtitle}</p>
    </header>
  )
}

function CareerScreen() {
  return (
    <CaptureShell screen="career">
      <PageFrame>
        <div className="text-center">
          <h1 className="sz-display text-[2.35rem]">Cursos da Jornada do Criador</h1>
          <p className="mt-2 font-medium text-muted-foreground">
            De Faísca a Lenda. Cada aventura concluída abre um novo passo.
          </p>
          <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-(--sz-kids-amarelo) px-4 py-2 font-extrabold text-sm text-(--sz-kids-tinta)">
            <Blocks className="size-4" /> Você é Construtora
          </span>
        </div>
        <section className="kids-carta relative mt-7 h-[400px] overflow-hidden rounded-[2rem] p-7">
          <div className="absolute top-[75px] right-[10%] left-[10%] h-3 rounded-full bg-gradient-to-r from-emerald-500 via-primary to-border" />
          <div className="absolute right-[10%] bottom-[122px] left-[10%] h-3 rounded-full bg-border" />
          <div className="relative grid grid-cols-4 gap-y-5">
            {LEVELS.map((level) => (
              <div key={level.slug} className="flex min-h-[165px] flex-col items-center">
                <div
                  className={`relative grid size-[84px] place-items-center rounded-full border-[6px] bg-card shadow-lg ${
                    level.state === 'current'
                      ? 'border-primary ring-8 ring-primary/10'
                      : level.state === 'done'
                        ? 'border-emerald-600'
                        : 'border-border'
                  }`}
                >
                  <img
                    src={`/jornada/${level.slug}.webp`}
                    alt=""
                    className={`h-[70px] w-[70px] object-contain ${level.state === 'locked' ? 'grayscale opacity-65' : ''}`}
                  />
                  {level.state === 'done' ? (
                    <span className="absolute -right-1 -bottom-1 grid size-7 place-items-center rounded-full bg-emerald-600 text-white">
                      <Check className="size-4" />
                    </span>
                  ) : level.state === 'locked' ? (
                    <span className="absolute -right-1 -bottom-1 grid size-7 place-items-center rounded-full bg-slate-500 text-white">
                      <LockKeyhole className="size-3.5" />
                    </span>
                  ) : null}
                </div>
                <strong className="sz-display mt-2 text-center text-[0.92rem]">
                  {level.label}
                </strong>
                {level.state === 'current' ? (
                  <small className="mt-1 rounded-full bg-primary px-2.5 py-1 font-bold text-primary-foreground">
                    Você está aqui
                  </small>
                ) : null}
                {level.state === 'next' ? (
                  <small className="mt-1 font-bold text-primary">Próximo posto</small>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      </PageFrame>
    </CaptureShell>
  )
}

function LessonScreen() {
  const steps = [
    { title: 'Observe o que faz o jogo funcionar', done: true },
    { title: 'Monte o cenário e o personagem', done: true },
    { title: 'Faça o dinossauro correr', done: false },
    { title: 'Teste, ajuste e envie', done: false },
  ]
  return (
    <CaptureShell screen="lesson">
      <PageFrame>
        <PageTitle
          eyebrow="Aventura em andamento"
          icon={BookOpen}
          title="Corre, Dino! · Aula 3"
          subtitle="A explicação, a prática e o Estúdio ficam juntos. Bia aprende uma ideia e já vê o resultado no próprio jogo."
        />
        <div className="mt-6 grid h-[500px] grid-cols-[310px_1fr] gap-6">
          <aside className="kids-carta rounded-[1.75rem] p-5">
            <div className="flex items-center justify-between">
              <strong className="sz-display text-lg">Seu caminho</strong>
              <span className="rounded-full bg-primary/10 px-3 py-1 font-bold text-primary text-xs">
                2 de 4
              </span>
            </div>
            <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full w-1/2 rounded-full bg-primary" />
            </div>
            <ol className="mt-5 grid gap-3">
              {steps.map((step, index) => (
                <li
                  key={step.title}
                  className={`flex items-center gap-3 rounded-2xl p-3 ${index === 2 ? 'bg-primary/10 ring-2 ring-primary/25' : 'bg-background'}`}
                >
                  <span
                    className={`grid size-9 shrink-0 place-items-center rounded-full font-black ${step.done ? 'bg-emerald-600 text-white' : index === 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                  >
                    {step.done ? <Check className="size-5" /> : index + 1}
                  </span>
                  <span className="font-bold text-sm">{step.title}</span>
                </li>
              ))}
            </ol>
          </aside>
          <section className="overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-sm">
            <header className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <small className="font-bold text-primary uppercase tracking-wider">
                  Missão prática
                </small>
                <h2 className="sz-display text-xl">Faça o dinossauro correr</h2>
              </div>
              <span className="rounded-full bg-(--band-menta) px-3 py-1.5 font-bold text-sm">
                Guardado na sua conta
              </span>
            </header>
            <div className="grid h-[405px] grid-cols-[1.05fr_0.95fr]">
              <div className="border-r border-border bg-[#f8fafc] p-4">
                <div className="mb-3 flex gap-2">
                  <span className="rounded-lg bg-blue-600 px-3 py-1.5 font-bold text-white text-xs">
                    Movimento
                  </span>
                  <span className="rounded-lg bg-pink-600 px-3 py-1.5 font-bold text-white text-xs">
                    Jogo 2D
                  </span>
                </div>
                <div className="grid gap-2">
                  <div className="w-[90%] rounded-xl bg-blue-600 px-4 py-3 font-bold text-white shadow-sm">
                    quando a tecla direita estiver apertada
                  </div>
                  <div className="ml-7 w-[78%] rounded-xl bg-purple-600 px-4 py-3 font-bold text-white shadow-sm">
                    mover dinossauro 8 passos
                  </div>
                  <div className="w-[82%] rounded-xl bg-pink-600 px-4 py-3 font-bold text-white shadow-sm">
                    quando encostar no cacto
                  </div>
                  <div className="ml-7 w-[68%] rounded-xl bg-orange-500 px-4 py-3 font-bold text-white shadow-sm">
                    voltar para o início
                  </div>
                </div>
              </div>
              <div className="relative overflow-hidden bg-gradient-to-b from-sky-300 via-sky-100 to-amber-100">
                <div className="absolute top-5 left-5 rounded-full bg-white/90 px-3 py-1.5 font-black text-slate-800">
                  Pontos: 240
                </div>
                <div className="absolute right-4 bottom-16 text-6xl">🌵</div>
                <div className="absolute bottom-12 left-14 text-7xl">🦖</div>
                <div className="absolute inset-x-0 bottom-0 h-12 bg-amber-500" />
                <button
                  type="button"
                  className="absolute right-4 top-4 grid size-11 place-items-center rounded-full bg-white text-primary shadow"
                >
                  <Play className="size-5 fill-current" />
                </button>
              </div>
            </div>
          </section>
        </div>
      </PageFrame>
    </CaptureShell>
  )
}

function WorkshopScreen() {
  const tools = ['estudio-completo', 'pinta', 'pensa', 'molda'] as const
  return (
    <CaptureShell screen="workshop">
      <PageFrame>
        <PageTitle
          eyebrow="Sua oficina de criação"
          icon={Palette}
          title="Uma ideia. Muitas formas de criar."
          subtitle="As quatro ferramentas estão incluídas. Bia abre cada oficina quando conquista o posto correspondente na Jornada do Criador."
        />
        <div className="mt-5 rounded-2xl bg-(--band-menta) px-5 py-4 font-bold text-sm">
          <span className="inline-flex items-center gap-2">
            <ShieldCheck className="size-5 text-emerald-700" /> Nenhuma compra extra.
          </span>
          <span className="ml-3 text-muted-foreground">
            Estúdio e Pinta já foram conquistados. Pensa e Molda são os próximos passos.
          </span>
        </div>
        <div className="mt-6 grid grid-cols-4 gap-4">
          {tools.map((id) => {
            const tool = TOOL_SIGNATURE[id]
            const available = id === 'estudio-completo' || id === 'pinta'
            const when = id === 'pensa' ? 'Abre como Inventora' : 'Abre como Exploradora de Mundos'
            return (
              <KidsFeatureCard
                key={id}
                icon={tool.icone}
                title={tool.nome}
                description={TOOL_DESCRIPTION[id]}
                badge={available ? 'Liberado' : 'Incluído'}
                color={tool.fundo}
                ink={tool.tinta}
                fg={tool.fg}
                seloInk={tool.selo}
                className="min-h-[300px]"
                footer={
                  available ? (
                    <span className="flex items-center gap-1.5">
                      Abrir minha oficina <ArrowRight className="size-4" />
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <LockKeyhole className="size-4" /> {when}
                    </span>
                  )
                }
              />
            )
          })}
        </div>
        <div className="mt-6 grid grid-cols-[1fr_auto] items-center rounded-[1.75rem] bg-card p-5 shadow-sm">
          <div>
            <h2 className="sz-display text-xl">A oficina cresce junto com a criança</h2>
            <p className="mt-1 text-muted-foreground">
              Cada curso concluído amplia o que ela consegue imaginar, desenhar, modelar e
              construir.
            </p>
          </div>
          <span className="rounded-full bg-primary px-4 py-2 font-bold text-primary-foreground">
            Ver meu próximo posto
          </span>
        </div>
      </PageFrame>
    </CaptureShell>
  )
}

function GameThumb({ variant }: { variant: 'space' | 'dino' }) {
  return variant === 'space' ? (
    <div className="relative h-40 overflow-hidden bg-[#09152f]">
      <div
        className="absolute inset-0 opacity-70"
        style={{
          backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)',
          backgroundSize: '27px 27px',
        }}
      />
      <span className="absolute left-[44%] bottom-4 text-5xl">🚀</span>
      <span className="absolute top-6 right-16 text-4xl">☄️</span>
      <span className="absolute top-12 left-20 text-3xl">🪨</span>
    </div>
  ) : (
    <div className="relative h-40 overflow-hidden bg-gradient-to-b from-sky-300 to-amber-100">
      <span className="absolute bottom-4 left-16 text-6xl">🦖</span>
      <span className="absolute right-14 bottom-4 text-5xl">🌵</span>
      <span className="absolute top-4 left-4 rounded-full bg-white/90 px-3 py-1 font-black">
        320
      </span>
      <div className="absolute inset-x-0 bottom-0 h-7 bg-amber-500" />
    </div>
  )
}

function MuralScreen() {
  return (
    <CaptureShell screen="mural">
      <PageFrame>
        <PageTitle
          eyebrow="Comunidade · vitrine da turma"
          icon={Images}
          title="Mural dos Criadores"
          subtitle="Jogue, comente e comemore os projetos que a turma publicou."
        />
        <div className="mt-4 flex gap-2">
          <span className="kids-marca rounded-full px-4 py-2 font-bold text-sm">Em destaque</span>
          <span className="rounded-full bg-card px-4 py-2 font-bold text-sm ring-1 ring-border">
            Mais recentes
          </span>
          <span className="rounded-full bg-card px-4 py-2 font-bold text-sm ring-1 ring-border">
            Mais jogados
          </span>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-5">
          {[
            {
              title: 'Missão Galáxia',
              author: 'Bia',
              plays: 86,
              variant: 'space' as const,
              text: 'Minha nave precisa atravessar a chuva de meteoros.',
            },
            {
              title: 'Corre, Dino!',
              author: 'Theo',
              plays: 143,
              variant: 'dino' as const,
              text: 'Até onde você consegue correr sem encostar no cacto?',
            },
          ].map((game) => (
            <article key={game.title} className="kids-carta overflow-hidden rounded-[1.5rem]">
              <GameThumb variant={game.variant} />
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="sz-display text-xl">{game.title}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      por <strong className="text-foreground">{game.author}</strong> · {game.plays}{' '}
                      jogadas
                    </p>
                  </div>
                  <span className="grid size-10 place-items-center rounded-full bg-(--band-ceu) font-black text-primary">
                    {game.author[0]}
                  </span>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{game.text}</p>
                <div className="mt-4 flex gap-2">
                  <button type="button" className="sz-btn-gradient h-10 flex-1 gap-2 text-sm">
                    <Play className="size-4" /> Jogar
                  </button>
                  <button
                    type="button"
                    className="grid size-10 place-items-center rounded-xl border border-border bg-card"
                  >
                    <Share2 className="size-4" />
                  </button>
                  <button
                    type="button"
                    className="grid size-10 place-items-center rounded-xl border border-border bg-card"
                  >
                    <QrCode className="size-4" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </PageFrame>
    </CaptureShell>
  )
}

function ClubScreen() {
  return (
    <CaptureShell screen="club">
      <PageFrame>
        <Eyebrow icon={MessagesSquare}>Comunidade · conversa</Eyebrow>
        <KidsHero
          icon={MessagesSquare}
          titleAs="h1"
          title="Clube dos Criadores"
          description="Um espaço da turma para mostrar ideias, pedir ajuda e conversar sobre criação."
          className="mt-4"
          actions={
            <>
              <span className="rounded-full bg-white px-4 py-2 font-bold text-primary text-sm">
                3 respostas novas
              </span>
              <span className="rounded-full bg-white/15 px-4 py-2 font-bold text-sm">
                Combinados
              </span>
            </>
          }
        />
        <div className="mt-6 grid grid-cols-[275px_1fr] gap-5">
          <nav className="kids-carta rounded-[1.5rem] p-5">
            <p className="font-extrabold text-muted-foreground text-xs uppercase tracking-[0.12em]">
              Canais
            </p>
            <div className="mt-3 grid gap-2">
              {['Geral', 'Mostre seu jogo', 'Pedir uma ajuda', 'Ideias novas'].map(
                (name, index) => (
                  <div
                    key={name}
                    className={`flex min-h-12 items-center gap-3 rounded-xl px-4 font-bold text-sm ${index === 0 ? 'kids-marca' : 'bg-background'}`}
                  >
                    <MessageCircle className="size-4" />
                    {name}
                    {index === 2 ? (
                      <span className="ml-auto size-2 rounded-full bg-pink-500" />
                    ) : null}
                  </div>
                ),
              )}
            </div>
            <p className="mt-4 flex items-center gap-2 rounded-xl bg-(--band-menta) px-3 py-3 font-bold text-xs">
              <ShieldCheck className="size-5 text-emerald-700" />O professor acompanha as conversas.
            </p>
          </nav>
          <section className="kids-carta rounded-[1.5rem] p-5">
            <div className="flex items-center justify-between">
              <div>
                <small className="font-bold text-primary"># GERAL</small>
                <h2 className="sz-display text-xl">Conversa da turma</h2>
              </div>
              <button type="button" className="sz-btn-gradient h-10 gap-2 px-4 text-sm">
                <Send className="size-4" /> Começar conversa
              </button>
            </div>
            <div className="mt-4 grid gap-3">
              {[
                [
                  'Luna',
                  'Como vocês escolhem o nome do jogo?',
                  'Eu faço uma lista e peço para minha irmã votar.',
                ],
                [
                  'Caio',
                  'Olha a fase nova do meu jogo',
                  'Agora o chefão aparece depois de 20 pontos.',
                ],
                [
                  'Bia',
                  'Consegui fazer a nave perder vida',
                  'O bloco de colisão funcionou. Obrigada pela ajuda!',
                ],
              ].map(([name, title, text], index) => (
                <article key={title} className="flex gap-3 rounded-2xl bg-background p-4">
                  <span
                    className={`grid size-10 shrink-0 place-items-center rounded-full font-black ${index === 0 ? 'bg-pink-200 text-pink-800' : index === 1 ? 'bg-emerald-200 text-emerald-800' : 'bg-blue-200 text-blue-800'}`}
                  >
                    {name?.charAt(0)}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <strong>{name}</strong>
                      <small className="text-muted-foreground">hoje</small>
                    </div>
                    <h3 className="mt-1 font-extrabold">{title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{text}</p>
                  </div>
                  <span className="ml-auto self-center rounded-full bg-card px-3 py-1 text-xs text-muted-foreground">
                    {index + 2} respostas
                  </span>
                </article>
              ))}
            </div>
          </section>
        </div>
      </PageFrame>
    </CaptureShell>
  )
}

function MessagesScreen() {
  return (
    <CaptureShell screen="messages">
      <PageFrame>
        <PageTitle
          eyebrow="Comunidade"
          icon={Mail}
          title="Recados do professor"
          subtitle="As devolutivas ficam guardadas aqui para Bia ler, responder e continuar criando."
        />
        <section className="mt-6 grid gap-4">
          {[
            {
              tag: 'Sua entrega',
              title: 'Missão Galáxia · sistema de vidas',
              preview: 'Prof. Júlio: Bia, o teste ficou muito bom. Agora experimente...',
              unread: true,
              color: 'bg-amber-400 text-amber-950',
            },
            {
              tag: 'Seu jogo no Mural',
              title: 'Missão Galáxia foi publicada',
              preview: 'Prof. Helena: Já joguei sua nova versão. O começo ficou mais claro.',
              unread: true,
              color: 'bg-blue-600 text-white',
            },
            {
              tag: 'Dúvida na aula',
              title: 'Como repetir o movimento?',
              preview: 'Você: Consegui depois que troquei o bloco de lugar.',
              unread: false,
              color: 'bg-purple-600 text-white',
            },
          ].map((message) => (
            <article
              key={message.title}
              className="kids-carta kid-pop flex items-center gap-4 rounded-[1.25rem] p-5"
            >
              <span
                className={`grid size-14 shrink-0 place-items-center rounded-2xl ${message.color}`}
              >
                <Mail className="size-7" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-(--band-ceu) px-2.5 py-1 font-bold text-xs">
                    {message.tag}
                  </span>
                  {message.unread ? (
                    <span className="kids-marca rounded-full px-2.5 py-1 font-bold text-xs">
                      NOVO
                    </span>
                  ) : null}
                </div>
                <h2 className="sz-display mt-2 text-xl">{message.title}</h2>
                <p className="mt-1 truncate text-sm text-muted-foreground">{message.preview}</p>
              </div>
              <ChevronRight className="size-6 text-muted-foreground" />
            </article>
          ))}
        </section>
        <div className="mt-6 grid grid-cols-3 gap-4">
          {['Você envia o projeto', 'O professor olha com calma', 'A conversa continua'].map(
            (title, index) => (
              <div key={title} className="rounded-2xl bg-(--chao-alt) p-4">
                <span className="grid size-8 place-items-center rounded-full bg-primary font-black text-primary-foreground">
                  {index + 1}
                </span>
                <strong className="mt-3 block">{title}</strong>
              </div>
            ),
          )}
        </div>
      </PageFrame>
    </CaptureShell>
  )
}

function SpaceScreen() {
  return (
    <CaptureShell screen="space">
      <PageFrame>
        <PageTitle
          eyebrow="Meu espaço"
          icon={UserRound}
          title="O cantinho da Bia"
          subtitle="Aqui ficam a identidade dela, as conquistas e tudo o que mostra o caminho já percorrido."
        />
        <KidsHero
          icon={Trophy}
          title="Construtora"
          description="Você criou e publicou o seu primeiro jogo. Faltam duas aventuras para chegar ao posto de Inventora."
          className="mt-5"
          actions={
            <span className="rounded-full bg-white px-4 py-2 font-bold text-primary text-sm">
              Ver jornada
            </span>
          }
          footer={
            <div className="flex gap-3 text-sm">
              <span>🔥 8 dias seguidos</span>
              <span>⚡ 680 XP</span>
              <span>🎮 2 jogos publicados</span>
            </div>
          }
        />
        <div className="mt-6 grid grid-cols-[1fr_1.25fr] gap-5">
          <section className="kids-carta rounded-[1.5rem] p-5">
            <h2 className="sz-display text-xl">Meu avatar</h2>
            <div className="mt-4 flex items-center gap-5">
              <div className="relative grid size-32 place-items-center rounded-full bg-gradient-to-br from-pink-200 to-blue-200 text-6xl shadow-inner">
                👩🏽‍🚀
                <span className="absolute -right-1 -bottom-1 grid size-10 place-items-center rounded-full bg-primary text-white">
                  <Star className="size-5 fill-current" />
                </span>
              </div>
              <div>
                <strong className="sz-display text-2xl">Bia</strong>
                <p className="mt-1 text-sm text-muted-foreground">
                  Do jeitinho que ela escolheu aparecer para a turma.
                </p>
                <button
                  type="button"
                  className="mt-3 rounded-full bg-(--band-ceu) px-4 py-2 font-bold text-primary text-sm"
                >
                  Trocar avatar
                </button>
              </div>
            </div>
          </section>
          <section className="kids-carta rounded-[1.5rem] p-5">
            <div className="flex items-center justify-between">
              <h2 className="sz-display text-xl">Minhas conquistas</h2>
              <span className="font-bold text-primary text-sm">Ver todas</span>
            </div>
            <div className="mt-4 grid grid-cols-4 gap-3">
              {[
                [Rocket, 'Primeiro lançamento', 'bg-blue-100 text-blue-700'],
                [Gamepad2, 'Jogo publicado', 'bg-emerald-100 text-emerald-700'],
                [Flame, 'Semana criativa', 'bg-orange-100 text-orange-700'],
                [WandSparkles, 'Ideia própria', 'bg-purple-100 text-purple-700'],
              ].map(([Icon, label, color]) => {
                const BadgeIcon = Icon as typeof Rocket
                return (
                  <div key={String(label)} className="text-center">
                    <span
                      className={`mx-auto grid size-16 place-items-center rounded-2xl ${color}`}
                    >
                      <BadgeIcon className="size-8" />
                    </span>
                    <strong className="mt-2 block text-xs leading-tight">{String(label)}</strong>
                  </div>
                )
              })}
            </div>
            <div className="mt-5 flex items-center gap-4 rounded-2xl bg-(--chao-alt) p-4">
              <span className="grid size-12 place-items-center rounded-xl bg-(--sz-kids-amarelo) text-2xl">
                🏠
              </span>
              <div>
                <strong className="block">Meu quarto</strong>
                <small className="text-muted-foreground">
                  Troféus, móveis e lembranças da jornada.
                </small>
              </div>
              <ChevronRight className="ml-auto size-5 text-muted-foreground" />
            </div>
          </section>
        </div>
      </PageFrame>
    </CaptureShell>
  )
}

function App() {
  const screen = useMemo(getScreen, [])
  const [ready] = useState(true)
  if (!ready) return null
  if (screen === 'lesson') return <LessonScreen />
  if (screen === 'workshop') return <WorkshopScreen />
  if (screen === 'mural') return <MuralScreen />
  if (screen === 'club') return <ClubScreen />
  if (screen === 'messages') return <MessagesScreen />
  if (screen === 'space') return <SpaceScreen />
  return <CareerScreen />
}

createRoot(document.getElementById('root')!).render(<App />)
