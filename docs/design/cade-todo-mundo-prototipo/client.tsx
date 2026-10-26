import { Button } from '@sistemazero/ui/button'
import {
  Check,
  CheckCircle2,
  ChevronDown,
  Circle,
  CircleDot,
  FlaskConical,
  Info,
  Lightbulb,
  RotateCcw,
  Target,
  Undo2,
} from 'lucide-react'
import { type ReactNode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { KidsQuiz } from '../../../packages/community-kids/src/components/kids/kids-quiz'
import { publicInteractiveBlock } from '../../../packages/core/src/learning'
import { openScene, sceneGoals, stepScene } from '../../../packages/core/src/learning/scene'
import { DialogueBlockView } from '../../../packages/member-shell/src/components/dialogue-block'
import { SceneButton } from '../../../packages/member-shell/src/components/exploration-stage'
import { LessonCopyProvider } from '../../../packages/member-shell/src/components/lesson-copy-context'
import { SceneActivityView } from '../../../packages/member-shell/src/components/scene-activity'
import { SCENE_VIEW, SceneCanvas } from '../../../packages/member-shell/src/components/scene-canvas'
import {
  ConsoleActions,
  ConsoleFala,
  ConsoleMundo,
  ConsolePrancha,
  ConsoleVisual,
  SceneConsole,
} from '../../../packages/member-shell/src/components/scene-console'
import { SceneDescobertas } from '../../../packages/member-shell/src/components/scene-descobertas'
import { FoundCounterStage } from '../../../packages/member-shell/src/components/scene-found-counter'
import { SceneReadoutBand } from '../../../packages/member-shell/src/components/scene-frame'
import { TouchResponseStage } from '../../../packages/member-shell/src/components/scene-touch-response'
import { SceneWorkspace } from '../../../packages/member-shell/src/components/scene-workspace'
import { KIDS_LESSON_COPY } from '../../../packages/member-shell/src/lib/lesson-copy-kids'
import { jardimSpriteRect, jardimSvgUrl } from '../../../packages/studio/src/arte/jardim-assets'
import aula1 from '../../aulas-interativas/cade-todo-mundo/cade-todo-mundo-aula-1.manifesto.json'
import aula2 from '../../aulas-interativas/cade-todo-mundo/cade-todo-mundo-aula-2.manifesto.json'
import certificado from '../../aulas-interativas/cade-todo-mundo/cade-todo-mundo-certificado.manifesto.json'
import { CONFIGS, gameStep, newGame, OBJECTIVES } from './data'
import { PrototypeMascot } from './shared'
import {
  CounterValue,
  LearningRecap,
  PredictionQuiz,
  TouchRule,
  type ValueUpdate,
} from './teaching'

const native = (which: string) =>
  [...aula1.blocks, ...aula2.blocks].find((b) => b.key === which)!.content as any
const pairNames = ['arbusto', 'pedras', 'flores']

function Instruction({ text }: { text: string }) {
  return (
    <DialogueBlockView
      content={{ kind: 'dialogue', text }}
      speech={{ texts: [text], fallbackToBrowser: true }}
      mascot={<PrototypeMascot className="size-16 sm:size-20" />}
    />
  )
}

/** The same SceneCanvas and original drawing geometry; only the second target is new. */
function TwoTargets({ found, onTap }: { found: number[]; onTap: (id: number) => void }) {
  const pairs = [
    { animal: 'coelho', cover: 'arbusto', x: 175 },
    { animal: 'raposa', cover: 'pedras', x: 385 },
  ] as const
  return (
    <SceneCanvas
      view={SCENE_VIEW}
      mundo="jardim"
      titulo="Dois esconderijos, a mesma regra"
      descricao="Toque em um esconderijo e acompanhe escolhido."
      overlay={
        <div className="absolute inset-x-0 top-0" style={{ aspectRatio: '560 / 300' }}>
          {pairs.map((p, id) => {
            const box = jardimSpriteRect(p.cover, p.x, 251)
            return (
              <button
                type="button"
                key={id}
                aria-label={
                  found.includes(id)
                    ? `Tocar de novo no lugar de ${p.animal}`
                    : `Tocar ${id ? 'nas pedras' : 'no arbusto'}`
                }
                className="absolute cursor-pointer rounded-[50%] focus-visible:outline-4 focus-visible:outline-primary"
                style={{
                  left: (box.x / 560) * 100 + '%',
                  top: (box.y / 300) * 100 + '%',
                  width: (box.w / 560) * 100 + '%',
                  height: (box.h / 300) * 100 + '%',
                }}
                onClick={() => onTap(id)}
              />
            )
          })}
        </div>
      }
    >
      <image
        data-fundo="jardim"
        href={jardimSvgUrl('jardim', { cobrir: true })}
        width="560"
        height="300"
        preserveAspectRatio="xMidYMid slice"
      />
      {pairs.map((p, id) => {
        const a = jardimSpriteRect(p.animal, p.x, 238),
          b = jardimSpriteRect(p.cover, p.x, 251)
        return (
          <g key={id}>
            <image href={jardimSvgUrl(p.animal)} x={a.x} y={a.y} width={a.w} height={a.h} />
            {!found.includes(id) && (
              <image href={jardimSvgUrl(p.cover)} x={b.x} y={b.y} width={b.w} height={b.h} />
            )}
          </g>
        )
      })}
    </SceneCanvas>
  )
}

function Experiment({
  kind,
  onComplete,
}: {
  kind: 'touch-response' | 'found-counter'
  onComplete: () => void
}) {
  const source = native(kind === 'touch-response' ? 'experiencia-toque' : 'experiencia-achados')
  const activity = source.activity
  const initial = () => ({
    state: openScene(activity),
    two: false,
    found: [] as number[],
    chosen: null as number | null,
    other: false,
    repeat: false,
    update: { before: 0, after: 0, kind: 'initial' } as ValueUpdate,
    trace: 'A busca começa com achados em 0.',
    status:
      kind === 'touch-response'
        ? 'O arbusto está visível.'
        : 'Os três personagens estão escondidos.',
  })
  const [value, setValue] = useState(initial),
    [past, setPast] = useState<ReturnType<typeof initial>[]>([]),
    [hint, setHint] = useState(false),
    [checked, setChecked] = useState(false)
  const goals = [
    ...sceneGoals(kind, value.state),
    {
      id: kind === 'touch-response' ? 'second-target' : 'repeat',
      label:
        kind === 'touch-response'
          ? 'Outro esconderijo recebeu o toque e foi escolhido'
          : 'Repetir o toque não executou outra soma',
      complete: kind === 'touch-response' ? value.other : value.repeat,
    },
  ]
  const complete = goals.every((g) => g.complete),
    done = goals.filter((g) => g.complete).length
  const change = (next: typeof value) => {
    setPast((p) => [...p.slice(-18), value])
    setValue(next)
    setChecked(false)
  }
  const dispatch = (action: any) => {
    const old = value.state.match.points ?? 0
    const repeated =
      action.type === 'find-character' && (value.state.match.foundIds ?? []).includes(action.id)
    const state = stepScene(activity, value.state, action)
    const after = state.match.points ?? 0
    const trace =
      kind === 'found-counter'
        ? action.type === 'restart-search'
          ? 'Nova busca: achados recebe 0.'
          : repeated
            ? 'Toque repetido: nenhuma soma. O valor continua ' + after + '.'
            : action.type === 'look-around'
              ? 'Toque no vazio: nenhuma soma. O valor continua ' + after + '.'
              : old + ' + 1 → ' + after
        : value.trace
    change({
      ...value,
      state,
      repeat: value.repeat || repeated,
      chosen: kind === 'touch-response' && action.type === 'start' ? 0 : value.chosen,
      trace,
      update:
        kind === 'found-counter'
          ? {
              before: old,
              after,
              kind:
                action.type === 'restart-search'
                  ? 'reset'
                  : repeated
                    ? 'repeat'
                    : action.type === 'look-around'
                      ? 'empty'
                      : 'add',
            }
          : value.update,
      status:
        kind === 'touch-response'
          ? action.type === 'connect'
            ? action.enabled
              ? 'A reação está ligada. Toque no arbusto.'
              : 'A reação está desligada.'
            : state.match.screen === 'playing'
              ? 'O arbusto ficou invisível e o coelho apareceu.'
              : 'Você tocou, e nada aconteceu.'
          : repeated
            ? 'O esconderijo invisível não recebe outro toque; a contagem continua igual.'
            : state.caption || 'Uma nova busca começou.',
    })
  }
  const tapSecond = (id: number) => {
    if (!value.state.match.touch) {
      change({ ...value, chosen: id, status: 'O toque aconteceu, mas a reação está desligada.' })
      return
    }
    if (value.found.includes(id)) {
      change({ ...value, chosen: id, status: 'Esse esconderijo já ficou invisível.' })
      return
    }
    change({
      ...value,
      chosen: id,
      found: [...value.found, id],
      other: value.other || id === 1,
      status: 'Escolhido agora: ' + pairNames[id] + '. Só esse esconderijo ficou invisível.',
    })
  }
  const hudState =
    kind === 'touch-response' && value.two
      ? {
          ...value.state,
          match: { ...value.state.match, screen: value.found.includes(0) ? 'playing' : 'start' },
        }
      : value.state
  const reset = () => {
    setValue(initial())
    setPast([])
    setChecked(false)
    setHint(false)
  }
  const discovered = value.state.evidence.discoveries
  const needsConnection =
    kind === 'touch-response' &&
    !complete &&
    !value.state.match.touch &&
    discovered.includes('no-response')
  const needsOtherTarget =
    kind === 'touch-response' &&
    !complete &&
    Boolean(value.state.match.touch) &&
    discovered.includes('responds') &&
    !value.two
  const needsRestart =
    kind === 'found-counter' &&
    !complete &&
    goals.filter((goal) => goal.id !== 'back-to-zero').every((goal) => goal.complete)
  const text =
    kind === 'touch-response'
      ? complete
        ? 'Você viu a regra em outro esconderijo. Experimente os toques na ordem que quiser.'
        : needsConnection
          ? 'Agora ligue a reação ao toque. O mesmo toque poderá executar uma ação.'
          : value.two
            ? 'Agora toque nas pedras. Qual esconderijo deve ficar invisível? Observe o escolhido na ligação.'
            : discovered.includes('responds')
              ? 'O toque executou a reação. Clique em Testar com outro esconderijo para conferir a mesma regra em outro lugar.'
              : value.state.match.touch
                ? 'Toque no arbusto mais uma vez. A reação está ligada. Observe o que muda.'
                : discovered.includes('no-response')
                  ? 'Agora ligue a reação ao toque. O mesmo toque poderá executar uma ação.'
                  : 'Primeiro, toque no arbusto. Observe o jardim com a reação desligada.'
      : complete
        ? 'Agora explore do seu jeito. Acompanhe o valor que fica guardado entre um toque e outro.'
        : !discovered.includes('first-find')
          ? 'Encontre um personagem. Olhe o valor guardado em achados e o placar.'
          : !discovered.includes('second-find')
            ? 'Encontre outro personagem. O jogo vai somar ao valor que já estava guardado.'
            : !discovered.includes('no-find')
              ? 'Toque no espaço vazio do jardim. O valor guardado vai mudar?'
              : !value.repeat
                ? 'Toque de novo onde um personagem apareceu. Observe se a regra de somar é executada.'
                : 'Clique em Recomeçar a busca. Observe o valor inicial e os esconderijos.'
  return (
    <div className="sz-lesson-block">
      <SceneWorkspace
        labelledBy={'proposal-' + kind}
        header={
          <div>
            <p
              className="sz-lesson-chip mb-1 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[.16em] text-primary"
              data-chip="experimentation"
            >
              <FlaskConical size={14} />
              Experimente
            </p>
            <h3 id={'proposal-' + kind} className="sz-display text-xl font-bold sm:text-2xl">
              {source.title}
            </h3>
          </div>
        }
      >
        <div className="sz-scene-workspace-body space-y-4">
          <SceneConsole>
            <ConsoleVisual>
              <SceneReadoutBand
                activity={activity}
                state={hudState as any}
                placa={
                  <div className="sz-scene-placas flex flex-wrap items-center gap-2">
                    <span
                      className="sz-scene-placa sz-scene-momento"
                      data-momento={complete ? 'descobriu' : 'sua-vez'}
                    >
                      {complete ? 'Você descobriu' : 'Sua vez'}
                    </span>
                  </div>
                }
              >
                {/* biome-ignore lint/a11y/useSemanticElements: uses the application's existing segmented discovery meter. */}
                <div
                  className="sz-scene-medidor"
                  role="meter"
                  aria-valuemin={0}
                  aria-valuemax={goals.length}
                  aria-valuenow={done}
                  aria-label={`${done} de ${goals.length} descobertas`}
                >
                  <span aria-hidden>
                    Descobertas {done} de {goals.length}
                  </span>
                  {goals.map((g) => (
                    <span
                      key={g.id}
                      className="sz-scene-medidor-bolinha rounded-full"
                      data-feita={g.complete || undefined}
                    />
                  ))}
                </div>
              </SceneReadoutBand>
              <ConsoleMundo>
                {kind === 'touch-response' ? (
                  value.two ? (
                    <TwoTargets found={value.found} onTap={tapSecond} />
                  ) : (
                    <TouchResponseStage state={value.state} dispatch={dispatch} />
                  )
                ) : (
                  <FoundCounterStage state={value.state} dispatch={dispatch} />
                )}
              </ConsoleMundo>
              <div className="sz-scene-mundo-rodape">
                <div className="sz-scene-mundo-ferramentas min-w-0">
                  <SceneButton
                    tom="ferramenta"
                    disabled={!past.length}
                    onClick={() => {
                      const previous = past.at(-1)
                      if (previous) {
                        setValue(previous)
                        setPast((p) => p.slice(0, -1))
                        setChecked(false)
                      }
                    }}
                  >
                    <Undo2 size={16} />
                    Desfazer
                  </SceneButton>
                  {kind === 'touch-response' && (
                    <SceneButton className="max-w-full whitespace-normal" onClick={reset}>
                      <RotateCcw size={16} />
                      Recomeçar com a reação desligada
                    </SceneButton>
                  )}
                </div>
                <p className="sz-scene-situacao" role="status">
                  <Info size={16} aria-hidden />
                  <span>{value.status}</span>
                </p>
              </div>
            </ConsoleVisual>
            <ConsoleActions>
              <ConsoleFala>
                <Instruction text={text} />
              </ConsoleFala>
              {hint && (
                <div className="sz-scene-pista flex gap-3 rounded-2xl border border-amber-600/30 bg-amber-500/10 px-4 py-3">
                  <Lightbulb size={18} />
                  <p className="text-sm">
                    {kind === 'touch-response'
                      ? value.two
                        ? 'Toque nas pedras: só elas devem ficar invisíveis.'
                        : 'Primeiro toque sem reação. Depois ligue a reação e toque outra vez.'
                      : 'Encontre dois personagens, toque no vazio, toque no mesmo lugar e recomece a busca.'}
                  </p>
                </div>
              )}
              <ConsolePrancha>
                <p className="sz-scene-prancha-titulo">Sua vez</p>
                <div className="space-y-3">
                  {kind === 'touch-response' ? (
                    <>
                      <div className="flex flex-wrap gap-2">
                        <SceneButton
                          tom={needsConnection ? 'gesto' : 'ferramenta'}
                          className="sz-scene-acao-principal"
                          aria-pressed={value.state.match.touch}
                          fechado={!value.state.evidence.discoveries.includes('no-response')}
                          onClick={() =>
                            dispatch({
                              type: 'connect',
                              port: 'touch',
                              enabled: !value.state.match.touch,
                            })
                          }
                        >
                          {value.state.match.touch
                            ? 'Desligar a reação ao toque'
                            : 'Ligar a reação ao toque'}
                        </SceneButton>
                        {value.state.evidence.discoveries.includes('responds') && !value.two && (
                          <SceneButton
                            tom={needsOtherTarget ? 'gesto' : 'ferramenta'}
                            className="sz-scene-acao-principal"
                            onClick={() =>
                              change({
                                ...value,
                                two: true,
                                found: [],
                                chosen: null,
                                status: 'A mesma regra continua ligada. Agora toque nas pedras.',
                              })
                            }
                          >
                            Testar com outro esconderijo
                          </SceneButton>
                        )}
                      </div>
                      <TouchRule
                        enabled={Boolean(value.state.match.touch)}
                        chosen={value.chosen === null ? null : pairNames[value.chosen]}
                      />
                    </>
                  ) : (
                    <>
                      <CounterValue
                        value={value.state.match.points ?? 0}
                        update={value.update}
                        trace={value.trace}
                      />
                      <SceneButton
                        tom={needsRestart ? 'gesto' : 'ferramenta'}
                        className="w-full whitespace-normal"
                        onClick={() => dispatch({ type: 'restart-search' })}
                      >
                        <RotateCcw size={16} aria-hidden />
                        Recomeçar a busca
                      </SceneButton>
                    </>
                  )}
                </div>
              </ConsolePrancha>
              <SceneDescobertas
                goals={goals as any}
                resposta={
                  checked
                    ? complete
                      ? 'Você fez todos os testes. Pode seguir para a próxima parte.'
                      : 'Ainda falta: ' +
                        goals
                          .filter((g) => !g.complete)
                          .map((g) =>
                            g.id === 'second-target'
                              ? 'testar outro esconderijo'
                              : g.id === 'repeat'
                                ? 'tocar de novo no mesmo lugar'
                                : g.pedido || 'testar a cena',
                          )
                          .join(' ')
                    : ''
                }
              >
                {!complete && (
                  <SceneButton onClick={() => setHint((v) => !v)}>
                    <Lightbulb size={16} />
                    Uma pista
                  </SceneButton>
                )}
                <SceneButton
                  tom={complete ? 'gesto' : 'ferramenta'}
                  className="ml-auto"
                  onClick={() => (complete ? onComplete() : setChecked(true))}
                >
                  {complete ? (
                    'Continuar'
                  ) : (
                    <>
                      <Check size={16} />
                      Conferir
                    </>
                  )}
                </SceneButton>
              </SceneDescobertas>
            </ConsoleActions>
          </SceneConsole>
          {complete && <LearningRecap kind={kind} />}
          <p className="text-sm text-muted-foreground">Prévia: nada é guardado.</p>
        </div>
      </SceneWorkspace>
    </div>
  )
}

function ObjectiveDemo({ lesson, current = false }: { lesson: 1 | 2; current?: boolean }) {
  const [example, setExample] = useState('correct'),
    [game, setGame] = useState(newGame),
    [results, setResults] = useState<boolean[] | null>(null),
    [open, setOpen] = useState(false)
  const [message, setMessage] = useState('Teste o jogo antes de verificar.')
  const config = { ...CONFIGS[example], ...(lesson === 1 ? { count: 'off' } : {}) }
  const objectives = current
    ? (lesson === 1 ? aula1 : aula2).sections
        .flatMap((section) => (section.completion as any).projectChecks ?? [])
        .map((check: any) => ({
          label: check.label,
          test: check.id === 'somar-achado' ? OBJECTIVES[2][1].test : OBJECTIVES[1][0].test,
          feedback:
            check.id === 'somar-achado'
              ? 'Confira se a soma está dentro do evento do toque.'
              : 'Confira a reação dentro do evento do esconderijo.',
        }))
    : OBJECTIVES[lesson]
  const tap = (id: number | null) => {
    setGame((g) => gameStep(g, id, config))
    setMessage(
      id === null ? 'Você tocou no vazio.' : 'Você tocou no lugar de ' + pairNames[id] + '.',
    )
  }
  const state = {
    ...openScene({ scene: 'found-counter' }),
    match: {
      ...openScene({ scene: 'found-counter' }).match,
      points: game.points,
      foundIds: game.found,
    },
  }
  return (
    <div className="space-y-3">
      <div className="sz-lesson-block space-y-3">
        <p
          className="sz-lesson-chip text-xs font-bold uppercase tracking-[.16em] text-primary"
          data-chip="studio"
        >
          Estúdio · Pré-visualização
        </p>
        <div className="max-w-scene mx-auto">
          <FoundCounterStage
            state={state as any}
            dispatch={(a: any) => tap(a.type === 'find-character' ? a.id : null)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            onClick={() => {
              setGame(newGame())
              setMessage('O jogo recomeçou; as regras foram mantidas.')
            }}
          >
            Recomeçar o jogo
          </Button>
          <p className="text-sm text-muted-foreground" role="status">
            {message}
          </p>
        </div>
        {lesson === 2 && game.points >= config.threshold && (
          <p className="text-center font-bold">Você achou todo mundo!</p>
        )}
      </div>
      <section className="sz-lesson-objectives flex shrink-0 flex-col gap-2 rounded-xl border bg-card px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <h3 className="sz-lesson-objectives-title min-w-0 font-semibold">
            <button
              type="button"
              className="flex min-h-11 items-center gap-2 rounded-lg text-left"
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
            >
              <Target className="size-4 shrink-0 text-primary" />
              <span className="flex flex-wrap items-baseline gap-x-3">
                <span>Objetivos desta parte</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {results ? results.filter(Boolean).length : 0} de {objectives.length}
                </span>
              </span>
              <ChevronDown className={'size-4 shrink-0 ' + (open ? 'rotate-180' : '')} />
            </button>
          </h3>
          <Button
            className="sz-lesson-objectives-action"
            variant={results ? 'outline' : 'default'}
            onClick={() => {
              const next = objectives.map((o: any) => o.test(config))
              setResults(next)
              if (next.some((v) => !v)) setOpen(true)
            }}
          >
            Verificar esta parte
          </Button>
        </div>
        <div
          hidden={!open}
          className="sz-lesson-objectives-details max-h-48 space-y-3 overflow-y-auto overscroll-contain pr-1"
        >
          <ul className="sz-lesson-objectives-list space-y-2">
            {objectives.map((o: any, i: number) => {
              const state = results ? (results[i] ? 'passed' : 'failed') : 'unchecked'
              const Icon =
                state === 'passed' ? CheckCircle2 : state === 'failed' ? CircleDot : Circle
              return (
                <li
                  key={i}
                  className="sz-lesson-objective flex items-start gap-2.5 text-sm"
                  data-state={state}
                >
                  <Icon
                    className={
                      'sz-lesson-objective-icon mt-0.5 size-5 shrink-0 ' +
                      (state === 'passed'
                        ? 'text-success'
                        : state === 'failed'
                          ? 'text-primary'
                          : 'text-muted-foreground')
                    }
                  />
                  <span className="min-w-0 flex-1">
                    {o.carry && (
                      <span className="mb-1 block text-xs font-bold text-primary">
                        Regra da aula anterior
                      </span>
                    )}
                    <span className="sz-lesson-objective-label">{o.label}</span>
                    {state === 'failed' && (
                      <span className="sz-lesson-objective-hint mt-1 flex items-start gap-1.5 text-muted-foreground">
                        <Lightbulb className="mt-0.5 size-3.5 shrink-0" />
                        <span>
                          <b>Dica:</b> {o.feedback}
                        </span>
                      </span>
                    )}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
        <p
          role="status"
          className="sz-lesson-objectives-feedback text-sm empty:hidden"
          data-tone={results ? (results.every(Boolean) ? 'ok' : 'falta') : undefined}
        >
          {results
            ? results.every(Boolean)
              ? 'Objetivo cumprido!'
              : 'Ainda falta ajustar seu jogo. Veja os objetivos acima.'
            : ''}
        </p>
      </section>
      <details className="rounded-xl border border-dashed border-border bg-card px-4 py-3 text-sm">
        <summary className="cursor-pointer font-semibold">
          Só nesta prévia: experimentar um projeto com erro
        </summary>
        <label className="mt-3 block">
          Projeto de exemplo
          <select
            className="mt-2 w-full rounded-lg border border-input bg-background p-2"
            value={example}
            onChange={(event) => {
              setExample(event.target.value)
              setGame(newGame())
              setResults(null)
              setMessage('Projeto de exemplo alterado.')
            }}
          >
            {(lesson === 1
              ? ['correct', 'none', 'fixed', 'all']
              : ['correct', 'noCount', 'everyTap', 'setOne', 'early']
            ).map((key) => (
              <option key={key} value={key}>
                {CONFIGS[key].label}
              </option>
            ))}
          </select>
        </label>
        <p className="mt-2 text-xs text-muted-foreground">
          Recorte da pré-visualização e do cartão real de objetivos. O seletor é apenas para esta
          avaliação.
        </p>
      </details>
    </div>
  )
}

const choices = [
  ['touch', 'O toque faz o jogo responder'],
  ['counter', 'Quantos você já encontrou?'],
  ['quiz', 'Revisão final'],
  ['objectives1', 'Objetivos · Aula 1'],
  ['objectives2', 'Objetivos · Aula 2'],
]
function App() {
  const [part, setPart] = useState('touch'),
    [mode, setMode] = useState('proposal'),
    [generation, setGeneration] = useState(0)
  useEffect(() => {
    document.documentElement.dataset.prototypeMode = mode
  }, [mode])
  const changeMode = (next: string) => {
    document.documentElement.dataset.prototypeMode = next
    setMode(next)
    setGeneration((v) => v + 1)
  }
  const source = native(part === 'touch' ? 'experiencia-toque' : 'experiencia-achados')
  const content = publicInteractiveBlock(source)
  const oldQuiz = certificado.blocks.find((b) => b.key === 'quiz-revisao-final')!.content
  return (
    <LessonCopyProvider value={KIDS_LESSON_COPY}>
      <main className="prototype-page sz-lesson-sections">
        <div className="prototype-review rounded-xl border border-border bg-card p-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-semibold">
              Cadê Todo Mundo?{' '}
              <span className="font-normal text-muted-foreground">· prévia para avaliação</span>
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={mode === 'current' ? 'default' : 'outline'}
                aria-pressed={mode === 'current'}
                onClick={() => changeMode('current')}
              >
                Atual
              </Button>
              <Button
                size="sm"
                variant={mode === 'proposal' ? 'default' : 'outline'}
                aria-pressed={mode === 'proposal'}
                onClick={() => changeMode('proposal')}
              >
                Com a proposta
              </Button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-3">
            <label className="flex min-w-0 flex-1 items-center gap-2">
              Trecho
              <select
                id="part"
                className="min-w-0 flex-1 rounded-lg border border-input bg-background p-2"
                value={part}
                onChange={(e) => {
                  setPart(e.target.value)
                  setGeneration((v) => v + 1)
                }}
              >
                {choices.map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <Button variant="outline" size="sm" onClick={() => setGeneration((v) => v + 1)}>
              Reiniciar prévia
            </Button>
          </div>
        </div>
        <div key={part + mode + generation} data-preview={mode}>
          {(part === 'touch' || part === 'counter') &&
            (mode === 'current' ? (
              <div className="sz-lesson-block">
                <SceneActivityView
                  block={
                    {
                      id: 'preview-' + part + '-' + generation,
                      kind: 'interactive',
                      sortOrder: 0,
                      content,
                    } as any
                  }
                  content={content}
                  activity={content.activity as any}
                  previewContent={source}
                />
              </div>
            ) : (
              <Experiment
                kind={part === 'touch' ? 'touch-response' : 'found-counter'}
                onComplete={() => {
                  setPart(part === 'touch' ? 'counter' : 'quiz')
                  setGeneration((v) => v + 1)
                }}
              />
            ))}
          {part === 'quiz' && (
            <div className="sz-lesson-block kids-unit-lime flex flex-col gap-3">
              <p
                className="sz-lesson-chip text-xs font-bold uppercase tracking-[.16em] text-primary"
                data-chip="quiz"
              >
                Responda
              </p>
              {mode === 'current' ? (
                <KidsQuiz blockId="prototype-quiz" content={oldQuiz as any} quizState={null} />
              ) : (
                <PredictionQuiz
                  onComplete={() => {
                    setPart('objectives1')
                    setGeneration((v) => v + 1)
                  }}
                />
              )}
            </div>
          )}
          {part.startsWith('objectives') && (
            <ObjectiveDemo lesson={part === 'objectives1' ? 1 : 2} current={mode === 'current'} />
          )}
        </div>
        <details className="mt-4 rounded-xl border border-dashed border-border bg-card p-3 text-sm prototype-notes">
          <summary className="cursor-pointer font-semibold">
            Notas da proposta e impacto no roteiro
          </summary>
          <p className="mt-2 text-muted-foreground">
            A moldura, as fontes, a paleta, o Zappy, o palco, os botões, a ampliação e a lista de
            descobertas usam os componentes e o CSS atuais. No toque, entram a ligação visível e o
            teste em outro esconderijo. Em Achados, entram a leitura do valor guardado, a última
            atualização e o toque repetido. O quiz recupera a previsão, o botão “Ver o que
            acontece”, a transformação da cena, a correção imediata e novas tentativas em cada
            pergunta, usando as cartas e os botões no padrão atual. Nos objetivos, muda o que se
            confere, dentro do mesmo cartão.
          </p>
          <p className="mt-2 text-muted-foreground">
            Os roteiros mantêm a estrutura. As falas precisam acompanhar apenas as novas indicações
            e testes. Esta prévia é local, com mascote em sua imagem oficial e sem gravações novas
            de voz.
          </p>
        </details>
      </main>
    </LessonCopyProvider>
  )
}
document.documentElement.dataset.prototypeMode = 'proposal'
createRoot(document.getElementById('root')!).render(<App />)
