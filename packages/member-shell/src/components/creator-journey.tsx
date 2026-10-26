import type { CreatorJourneyView } from '@sistemazero/core/journey'
import {
  ArrowRight,
  Award,
  BookOpen,
  Check,
  Circle,
  Compass,
  Gamepad2,
  Layers,
  Lock,
  Palette,
  Sparkles,
  Target,
  Trophy,
  WandSparkles,
} from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'
import {
  CREATOR_POST_LABELS,
  type CreatorJourneySkin,
  type CreatorMasteryView,
  type CreatorStageView,
  creatorCurrentStage,
  creatorJourneyHint,
  creatorPostHref,
  creatorStageSummary,
} from '../lib/creator-journey-presentation'
import type { CatalogCourseView, MyCourseView } from '../lib/types'

type Entry = {
  courseId: string
  title?: string
  state: 'locked' | 'available' | 'completed' | 'unavailable' | 'retained'
}
const surface = (skin: CreatorJourneySkin) => (skin === 'kids' ? 'kids-carta' : 'sz-card')
const action = (skin: CreatorJourneySkin) => (skin === 'kids' ? 'sz-btn-gradient px-6' : 'sz-btn')
const title = 'sz-display font-bold text-xl md:text-2xl'
const icons = [Sparkles, Layers, WandSparkles, Compass, Gamepad2, Layers, Trophy]

function Checkpoint({ complete, children }: { complete: boolean; children: ReactNode }) {
  const Icon = complete ? Check : Circle
  return (
    <li className="flex items-start gap-2.5">
      <Icon
        aria-hidden
        className={`mt-0.5 size-5 shrink-0 ${complete ? 'text-primary' : 'text-muted-foreground'}`}
      />
      <span>{children}</span>
    </li>
  )
}

export function CreatorJourneySummary({
  view,
  skin,
  catalog = [],
  courses = [],
}: {
  view: CreatorJourneyView
  skin: CreatorJourneySkin
  catalog?: readonly CatalogCourseView[]
  courses?: readonly MyCourseView[]
}) {
  const current = creatorCurrentStage(view)
  const suggested = current
    ? [
        current.base2d,
        current.base3d,
        current.mission,
        ...(current.powersCompleted < current.minimumPowers
          ? current.powers.flatMap((power) => power.courses)
          : []),
      ]
        .filter((entry) => entry.state === 'available')
        .flatMap((entry) => {
          const mine = courses.find(
            (course) => course.courseId === entry.courseId && course.careerLock?.locked !== true,
          )
          const listed = catalog.find(
            (course) =>
              course.courseId === entry.courseId &&
              course.hasAccess &&
              course.careerLock?.locked !== true,
          )
          return mine || listed
            ? [{ course: mine ?? listed!, lessonId: mine?.continueLessonId ?? null }]
            : []
        })[0]
    : null
  return (
    <section
      aria-label="Seu próximo passo na jornada"
      className={`${surface(skin)} flex flex-col gap-4 p-5 md:p-6`}
    >
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={
            skin === 'adult'
              ? 'sz-chip sz-chip-novo'
              : 'rounded-full bg-primary/10 px-3 py-1 font-bold text-primary'
          }
        >
          {CREATOR_POST_LABELS[view.level]}
        </span>
        <span className="text-sm text-muted-foreground">Jornada do Criador</span>
      </div>
      <h2 className={title}>
        {suggested?.course.title ?? (current ? 'Seu próximo passo' : 'Continue criando como Lenda')}
      </h2>
      <p>{creatorJourneyHint(view)}</p>
      {current ? (
        <p className="text-sm font-semibold text-muted-foreground">
          {creatorStageSummary(current)}
        </p>
      ) : null}
      <Link
        href={
          suggested
            ? `/cursos/${encodeURIComponent(suggested.course.courseSlug)}${suggested.lessonId ? `/aulas/${encodeURIComponent(suggested.lessonId)}` : ''}`
            : current
              ? creatorPostHref(current.level, skin)
              : '/maestrias'
        }
        className={`${action(skin)} self-start`}
        prefetch={false}
      >
        {suggested
          ? suggested.lessonId
            ? 'Continuar meu curso'
            : 'Começar este curso'
          : current
            ? 'Ver meu posto'
            : 'Escolher uma maestria'}
        <ArrowRight className="size-5" aria-hidden />
      </Link>
      {suggested && current ? (
        <Link
          href={creatorPostHref(current.level, skin)}
          className="inline-flex min-h-11 items-center font-bold text-primary underline underline-offset-4"
        >
          Ver todos os passos do posto
        </Link>
      ) : null}
    </section>
  )
}

export function CreatorJourneyMap({
  view,
  skin,
}: {
  view: CreatorJourneyView
  skin: CreatorJourneySkin
}) {
  return (
    <section aria-label="Mapa da Jornada do Criador" className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className={title}>Um jogo. Duas dimensões. Novas possibilidades.</h2>
        <Link
          href="/maestrias"
          className="inline-flex min-h-11 items-center gap-2 font-bold text-primary underline underline-offset-4"
        >
          Conhecer as maestrias
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
      <p className="max-w-3xl text-muted-foreground">
        Em cada posto, crie as versões 2D e 3D, aplique a lógica em uma missão e amplie o jogo com
        poderes. Os extras ficam para explorar no seu ritmo.
      </p>
      <ol className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {view.stages.map((stage, index) => {
          const Icon = icons[index] ?? Gamepad2
          const current = view.level === stage.level
          const stageColor =
            skin === 'kids' ? `var(--level-${stage.level})` : `var(--etapa-${index + 1})`
          const status = stage.completed
            ? 'Concluído'
            : current
              ? 'Você está aqui'
              : stage.available
                ? 'Disponível'
                : 'Próximo posto'
          return (
            <li key={stage.level}>
              <Link
                href={creatorPostHref(stage.level, skin)}
                prefetch={false}
                aria-current={current ? 'step' : undefined}
                className={`${surface(skin)} flex h-full flex-col gap-3 p-5 transition-colors hover:bg-muted/50 ${current ? 'outline-2 outline-offset-2 outline-primary' : ''}`}
                style={{ borderTop: `4px solid ${stageColor}` }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`relative grid size-12 place-items-center overflow-hidden bg-primary/10 text-primary ${skin === 'kids' ? 'rounded-full' : 'rounded-2xl'}`}
                  >
                    <Icon className="size-6" aria-hidden />
                    {skin === 'kids' ? (
                      <img
                        src={`/jornada/${stage.level}.webp`}
                        alt=""
                        width={48}
                        height={48}
                        className="absolute inset-0 size-full object-cover"
                      />
                    ) : null}
                  </span>
                  <span className="font-mono text-sm text-muted-foreground">0{index + 1}</span>
                </div>
                <span
                  className={
                    skin === 'adult' && current
                      ? 'sz-chip sz-chip-novo self-start'
                      : 'font-bold text-sm text-primary'
                  }
                >
                  {status}
                </span>
                <h3 className="sz-display text-xl font-bold">{stage.title}</h3>
                {stage.genre ? <p className="font-bold text-sm">{stage.genre}</p> : null}
                {stage.goal ? <p className="text-sm text-muted-foreground">{stage.goal}</p> : null}
                {stage.base2d.title || stage.base3d.title ? (
                  <p className="text-sm">
                    <span className="font-semibold">Seus jogos:</span>{' '}
                    {[stage.base2d.title, stage.base3d.title].filter(Boolean).join(' + ')}
                  </p>
                ) : null}
                <p className="text-sm text-muted-foreground">
                  {stage.available || stage.completed
                    ? creatorStageSummary(stage)
                    : `2 bases + missão + ${stage.minimumPowers} poderes`}
                </p>
                <span className="mt-auto inline-flex items-center gap-2 text-sm font-bold">
                  Conhecer o posto
                  <ArrowRight className="size-4" aria-hidden />
                </span>
              </Link>
            </li>
          )
        })}
        <li>
          <Link
            href="/maestrias"
            className={`${surface(skin)} flex h-full flex-col gap-3 p-5`}
            style={{
              borderTop: `4px solid ${skin === 'kids' ? 'var(--level-god)' : 'var(--etapa-lenda)'}`,
            }}
          >
            <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Award aria-hidden className="size-6" />
            </span>
            <span className="font-bold text-sm text-primary">
              {view.level === 'god' ? 'Seu título conquistado' : 'O horizonte da jornada'}
            </span>
            <h3 className="sz-display text-xl font-bold">Lenda</h3>
            <p className="text-sm text-muted-foreground">
              Seis áreas para aprofundar os seus jogos. Você pode começar as maestrias antes de
              chegar aqui, conforme a entrada de cada área.
            </p>
            <span className="mt-auto inline-flex items-center gap-2 text-sm font-bold">
              Explorar maestrias
              <ArrowRight aria-hidden className="size-4" />
            </span>
          </Link>
        </li>
      </ol>
    </section>
  )
}

function CourseEntry({
  entry,
  catalog,
  label,
  skin,
  note,
}: {
  entry: Entry
  catalog: readonly CatalogCourseView[]
  label: string
  skin: CreatorJourneySkin
  note?: string
}) {
  const course = catalog.find((candidate) => candidate.courseId === entry.courseId)
  // Access remains a server fact. A retained/direct entitlement may open an otherwise future course.
  const accessible = Boolean(course?.hasAccess && course.careerLock?.locked !== true)
  const planned = entry.state === 'unavailable'
  const done = entry.state === 'completed'
  const href = course ? `/cursos/${encodeURIComponent(course.courseSlug)}` : null
  return (
    <article className={`${surface(skin)} flex min-w-0 flex-col gap-3 p-5`}>
      {course?.coverImageUrl ? (
        <img
          src={course.coverImageUrl}
          alt=""
          width={480}
          height={270}
          loading="lazy"
          className="aspect-video w-full rounded-xl object-cover"
        />
      ) : null}
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-bold text-primary">{label}</span>
        {done ? (
          <Check aria-label="Concluído" className="size-5 text-primary" />
        ) : planned ? (
          <BookOpen aria-hidden className="size-5 text-muted-foreground" />
        ) : !accessible ? (
          <Lock aria-hidden className="size-4 text-muted-foreground" />
        ) : null}
      </div>
      <h4 className="sz-display text-lg font-bold">{course?.title ?? entry.title ?? label}</h4>
      {course?.subtitle ? (
        <p className="text-sm text-muted-foreground">{course.subtitle}</p>
      ) : note ? (
        <p className="text-sm text-muted-foreground">{note}</p>
      ) : null}
      {accessible && href ? (
        <Link
          href={href}
          prefetch={false}
          className="mt-auto inline-flex min-h-11 items-center gap-2 font-bold text-primary underline underline-offset-4"
        >
          {done ? 'Revisar curso' : 'Abrir curso'}
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      ) : (
        <p className="mt-auto text-sm font-semibold text-muted-foreground">
          {planned
            ? 'Curso em preparação'
            : !course
              ? 'Não foi possível consultar este curso agora.'
              : course?.hasAccess === false
                ? 'Este curso ainda não faz parte do seu acesso.'
                : 'Veja na sua jornada os requisitos para abrir este curso.'}
        </p>
      )}
    </article>
  )
}

export function CreatorPost({
  stage,
  catalog,
  skin,
}: {
  stage: CreatorStageView
  catalog: readonly CatalogCourseView[]
  skin: CreatorJourneySkin
}) {
  return (
    <div className="space-y-10">
      <section
        aria-labelledby="requisitos-posto"
        className={`${surface(skin)} space-y-4 p-5 md:p-7`}
      >
        <h2 id="requisitos-posto" className={title}>
          O que conta para avançar
        </h2>
        <ul className="grid gap-3 md:grid-cols-3">
          <Checkpoint complete={stage.pairCompleted}>Concluir as bases 2D e 3D</Checkpoint>
          <Checkpoint complete={stage.mission.state === 'completed'}>
            Concluir a missão nas duas dimensões
          </Checkpoint>
          <Checkpoint complete={stage.powersCompleted >= stage.minimumPowers}>
            Aplicar {stage.minimumPowers}{' '}
            {stage.minimumPowers === 1 ? 'poder' : 'poderes distintos'} · {stage.powersCompleted}{' '}
            {stage.powersCompleted === 1 ? 'feito' : 'feitos'}
          </Checkpoint>
        </ul>
        <p className="text-sm text-muted-foreground">
          Cada curso concluído acrescenta seus blocos ao Estúdio. Extras e publicação no Mural são
          opcionais.
        </p>
        {stage.earned &&
        (!stage.pairCompleted ||
          stage.mission.state !== 'completed' ||
          stage.powersCompleted < stage.minimumPowers) ? (
          <p className="font-semibold text-primary">
            Seu posto já conquistado está preservado. Você pode explorar o novo conteúdo no seu
            ritmo.
          </p>
        ) : null}
        {!stage.available && !stage.earned ? (
          <p role="status" className="text-sm font-semibold">
            Você pode conhecer o que vem pela frente. Os cursos abrem conforme a jornada; acessos
            avulsos já concedidos continuam disponíveis.
          </p>
        ) : null}
      </section>
      <section aria-labelledby="bases-posto" className="space-y-4">
        <div className="flex items-start gap-3">
          <Layers aria-hidden className="mt-1 size-6 text-primary" />
          <div>
            <h2 id="bases-posto" className={title}>
              1. Construa o jogo base
            </h2>
            <p className="mt-1 text-muted-foreground">
              Comece pela versão 2D. Depois, leve o mesmo raciocínio para o espaço 3D.
            </p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <CourseEntry entry={stage.base2d} catalog={catalog} skin={skin} label="Base 2D" />
          <CourseEntry entry={stage.base3d} catalog={catalog} skin={skin} label="Base 3D" />
        </div>
      </section>
      <section aria-labelledby="ampliar-posto" className="space-y-5">
        <div>
          <h2 id="ampliar-posto" className={title}>
            2. Aplique e amplie
          </h2>
          <p className="mt-1 text-muted-foreground">
            {stage.pairCompleted
              ? 'O par está concluído. Escolha por onde continuar: missão ou poderes.'
              : 'Concluir as duas bases abre a missão, todos os poderes e os extras deste posto.'}
          </p>
        </div>
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <section aria-labelledby="missao-posto" className="space-y-3">
            <h3 id="missao-posto" className="sz-display flex items-center gap-2 text-lg font-bold">
              <Target aria-hidden className="size-5 text-primary" />
              Missão do posto
            </h3>
            <p className="text-sm text-muted-foreground">
              Use as mesmas mecânicas em outro contexto, em 2D e 3D. Os poderes não são
              pré-requisito.
            </p>
            <CourseEntry
              entry={stage.mission}
              catalog={catalog}
              skin={skin}
              label="Missão · 2D e 3D"
            />
          </section>
          <section aria-labelledby="poderes-posto" className="space-y-3">
            <h3 id="poderes-posto" className="sz-display flex items-center gap-2 text-lg font-bold">
              <WandSparkles aria-hidden className="size-5 text-primary" />
              Poderes · escolha {stage.minimumPowers}
            </h3>
            <p className="text-sm text-muted-foreground">
              Adicione mecânicas ao jogo base dentro da aula. Versões equivalentes de um poder
              contam uma vez.
            </p>
            {stage.powers.map((power) => (
              <details key={power.mechanicId} className={`${surface(skin)} p-4`}>
                <summary className="min-h-11 cursor-pointer font-bold">
                  <span className="ml-1">{power.title}</span>
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    {power.completed
                      ? 'Aplicado'
                      : power.available
                        ? 'Disponível'
                        : 'Depois das bases'}
                  </span>
                </summary>
                <div className="mt-3 grid gap-3">
                  {power.courses.map((entry) => (
                    <CourseEntry
                      key={entry.courseId}
                      entry={entry}
                      catalog={catalog}
                      label="Curso do poder"
                      skin={skin}
                    />
                  ))}
                </div>
              </details>
            ))}
          </section>
        </div>
      </section>
      {stage.extras.length ? (
        <section aria-labelledby="extras-posto" className="space-y-4">
          <div>
            <h2 id="extras-posto" className={title}>
              Extras para explorar
            </h2>
            <p className="mt-1 text-muted-foreground">
              Outros jogos, ferramentas e ideias deste nível. Você escolhe: eles não são necessários
              para subir de posto.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {stage.extras.map((extra) => (
              <CourseEntry
                key={extra.courseId}
                entry={extra}
                catalog={catalog}
                label="Extra opcional"
                skin={skin}
              />
            ))}
          </div>
        </section>
      ) : null}
      <Link
        href="/maestrias"
        className="inline-flex min-h-11 items-center gap-2 font-bold text-primary underline underline-offset-4"
      >
        Conhecer as áreas de maestria
        <ArrowRight aria-hidden className="size-4" />
      </Link>
    </div>
  )
}

const areaIcon = (id: string) =>
  id === 'arte2d' ? Palette : id === 'modelagem3d' ? Layers : Gamepad2
export function CreatorMasteryHub({
  areas,
  skin,
}: {
  areas: readonly CreatorMasteryView[]
  skin: CreatorJourneySkin
}) {
  return (
    <section aria-label="Áreas de maestria" className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {areas.map((area) => {
        const Icon = areaIcon(area.id)
        const completed = area.levels.filter((level) => level.completed || level.earned).length
        return (
          <Link
            key={area.id}
            href={`/maestrias/${encodeURIComponent(area.id)}`}
            className={`${surface(skin)} flex flex-col gap-4 p-6`}
          >
            <span className="grid size-12 place-items-center rounded-xl bg-primary/10 text-primary">
              <Icon aria-hidden className="size-6" />
            </span>
            <h2 className={title}>{area.title}</h2>
            <p className="text-sm text-muted-foreground">
              {completed
                ? `${completed} de 3 níveis conquistados`
                : area.available
                  ? 'Área disponível para começar'
                  : `Abre depois das bases de ${CREATOR_POST_LABELS[area.opensAfterPair]}`}
            </p>
            <ol aria-label="Níveis da área" className="flex gap-2">
              {area.levels.map((level) => (
                <li
                  key={level.level}
                  className={`grid size-10 place-items-center rounded-full border font-bold ${level.completed || level.earned ? 'bg-primary text-primary-foreground' : 'border-border'}`}
                  aria-label={`Nível ${level.level}${level.completed || level.earned ? ', conquistado' : ''}`}
                >
                  {level.level === 1 ? 'I' : level.level === 2 ? 'II' : 'III'}
                </li>
              ))}
            </ol>
            <span className="mt-auto flex items-center gap-2 font-bold text-primary">
              Explorar área
              <ArrowRight aria-hidden className="size-4" />
            </span>
          </Link>
        )
      })}
    </section>
  )
}

export function CreatorMasteryArea({
  area,
  catalog,
  skin,
  submission,
}: {
  area: CreatorMasteryView
  catalog: readonly CatalogCourseView[]
  skin: CreatorJourneySkin
  submission?: (level: CreatorMasteryView['levels'][number]) => ReactNode
}) {
  const currentLevel = area.levels.find(
    (level) => level.available && !level.completed && !level.earned,
  )?.level
  return (
    <div className="space-y-8">
      <section className={`${surface(skin)} space-y-3 p-6`}>
        <h2 className={title}>Como conquistar cada nível</h2>
        <p>
          Núcleo concluído ou crédito validado, duas oficinas distintas entre três e um projeto
          aprovado em todos os critérios essenciais.
        </p>
        <p className="text-muted-foreground">
          {area.id === 'arte2d' || area.id === 'modelagem3d'
            ? 'O jogo base já funciona com formas de protótipo. Você cria seus assets e aprende a integrá-los: tamanho, origem, animação, colisão e leitura durante a partida.'
            : 'Você pode usar blocos, Ponte e Pro. Um conceito novo começa com blocos e o código correspondente. Trocar de editor não concede um nível.'}
        </p>
        {!area.available ? (
          <p className="font-semibold text-primary">
            Esta área abre depois das duas bases de {CREATOR_POST_LABELS[area.opensAfterPair]}.{' '}
            <Link
              href={creatorPostHref(area.opensAfterPair, skin)}
              className="underline underline-offset-4"
            >
              Ver o posto de entrada
            </Link>
          </p>
        ) : null}
        <p className="text-sm text-muted-foreground">
          O nível II pede o I desta área; o III pede o II. Nenhuma outra linguagem ou dimensão é
          obrigatória. Projetos anteriores podem ser apresentados para validação.
        </p>
      </section>
      {area.levels.map((level) => (
        <details
          key={level.level}
          open={level.level === currentLevel}
          className={`${surface(skin)} p-5 md:p-6`}
        >
          <summary className="cursor-pointer list-none rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">
            <div className="flex flex-wrap items-center gap-3">
              <span className="grid size-12 place-items-center rounded-full bg-primary/10 font-bold text-primary">
                {level.level === 1 ? 'I' : level.level === 2 ? 'II' : 'III'}
              </span>
              <h2 id={`nivel-${level.level}`} className={title}>
                {level.title}
              </h2>
              <span className="text-sm font-bold text-primary">
                {level.earned || level.completed
                  ? 'Conquistado'
                  : level.available
                    ? 'Disponível'
                    : area.available
                      ? `Depois do nível ${level.level - 1}`
                      : `Depois das bases de ${CREATOR_POST_LABELS[area.opensAfterPair]}`}
              </span>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Núcleo {level.nucleusCompleted ? 'concluído ou validado' : 'por concluir'} ·{' '}
              {level.workshopsCompleted}/2 oficinas · projeto{' '}
              {level.approval === 'approved'
                ? 'aprovado'
                : level.approval === 'changes-requested'
                  ? 'com ajustes pedidos'
                  : 'por avaliar'}
            </p>
            <p className="mt-2 text-sm font-bold text-primary">
              Ver cursos, critérios e entrega <span aria-hidden>⌄</span>
            </p>
          </summary>
          <div className="mt-6 space-y-6 border-t border-border pt-6">
            <ul className="grid gap-3 md:grid-cols-3">
              <Checkpoint complete={level.nucleusCompleted}>Núcleo ou crédito validado</Checkpoint>
              <Checkpoint complete={level.workshopsCompleted >= 2}>
                {level.workshopsCompleted}/2 oficinas distintas
              </Checkpoint>
              <Checkpoint complete={level.approval === 'approved'}>
                Projeto aprovado pela equipe
              </Checkpoint>
            </ul>
            <div className="grid gap-4 md:grid-cols-2">
              {level.nucleusCourses.map((entry) => (
                <CourseEntry
                  key={entry.courseId}
                  entry={entry}
                  catalog={catalog}
                  label="Núcleo da maestria"
                  skin={skin}
                />
              ))}
            </div>
            <section className="space-y-3">
              <h3 className="sz-display text-lg font-bold">Escolha duas oficinas</h3>
              <div className="grid gap-4 lg:grid-cols-3">
                {level.workshops.map((workshop) => (
                  <div key={workshop.id} className={`${surface(skin)} space-y-3 p-4`}>
                    <h4 className="font-bold">{workshop.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {workshop.completed
                        ? 'Oficina aplicada'
                        : 'Uma aplicação distinta no seu jogo'}
                    </p>
                    {workshop.courses.map((entry) => (
                      <CourseEntry
                        key={entry.courseId}
                        entry={entry}
                        catalog={catalog}
                        label="Oficina"
                        skin={skin}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </section>
            <section className={`${surface(skin)} space-y-4 p-5 md:p-6`}>
              <h3 className="sz-display text-lg font-bold">Seu projeto · critérios essenciais</h3>
              {level.project ? (
                <CourseEntry
                  entry={level.project}
                  catalog={catalog}
                  label="Guia de projeto · opcional"
                  skin={skin}
                />
              ) : null}
              <ul className="space-y-3">
                {level.rubric.criteria.map((criterion) => (
                  <Checkpoint
                    key={criterion.id}
                    complete={level.approvedCriteriaIds.includes(criterion.id)}
                  >
                    {criterion.title.replace(/^O aluno\b|^A aluna\b/, 'Você')}
                  </Checkpoint>
                ))}
              </ul>
              <p className="text-sm text-muted-foreground">
                A equipe avalia uma versão salva do projeto e devolve comentários. Se precisar
                ajustar, você envia uma nova versão; seu trabalho anterior fica registrado.
              </p>
              {submission?.(level)}
            </section>
          </div>
        </details>
      ))}
    </div>
  )
}
