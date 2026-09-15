'use client'

import {
  type InteractiveBlock,
  type LearningAttemptView,
  type LearningBlockProgress,
  learningHints,
  type PublicInteractiveBlock,
} from '@sistemazero/core/learning'
import {
  castText,
  type DemonstrationSession,
  type ExperimentSession,
  evaluateDemonstration,
  evaluateExperimentation,
  isSceneAction,
  SCENE_LIMITS,
  type SceneActivity,
  type SceneCommand,
  sceneGoals,
  sceneHint,
  sceneReadout,
  sceneScript,
  sceneSituation,
  sceneTrial,
} from '@sistemazero/core/learning/scene'
import {
  Camera,
  Check,
  Ear,
  FlaskConical,
  Lightbulb,
  MonitorPlay,
  Pause,
  Play,
  RotateCcw,
  StepForward,
  Undo2,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react'
import { apiSend } from '../lib/api'
import {
  hasLessonMediaFocus,
  registerLessonMedia,
  requestLessonMediaFocus,
} from '../lib/lesson-media-focus'
import {
  archiveSceneDraft,
  readSceneDraft,
  SceneController,
  writeSceneDraft,
} from '../lib/scene-controller'
import type { LessonBlockView } from '../lib/types'
import { ExperienceComparison, ExperienceScene } from './experience-scene'
import { ExplorationPieces } from './exploration-pieces'
import { ExplorationStage, SceneButton } from './exploration-stage'
import { useLessonPlayer } from './lesson-player-context'
import { useLessonPreview } from './lesson-preview-context'

export function SceneActivityView({
  block,
  content,
  activity,
  previewContent,
}: {
  block: LessonBlockView
  content: PublicInteractiveBlock
  activity: SceneActivity
  previewContent?: InteractiveBlock
}) {
  const player = useLessonPlayer()
  const rehearsal = useLessonPreview()
  const id = useId()
  const hints = learningHints({ activity, hints: content.hints })
  const saved = player?.learningProgress?.blocks.find(
    (p) => p.blockId === block.id && p.revision === block.blockRevision,
  )
  const scope = player?.viewerId
    ? `${player.viewerId}:${player.lessonId}:${block.id}:${block.blockRevision}`
    : null
  const [tabId] = useState(() => {
    if (typeof window === 'undefined' || !scope) return crypto.randomUUID()
    try {
      const key = `sz:experience-tab:${scope}`
      const stored = sessionStorage.getItem(key) ?? crypto.randomUUID()
      sessionStorage.setItem(key, stored)
      return stored
    } catch {
      return crypto.randomUUID()
    }
  })
  const [controller] = useState(() =>
    SceneController.create(activity, tabId, saved?.answers ?? rehearsal?.answers[block.id] ?? {}),
  )
  const session = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  )
  const [ready, setReady] = useState(!scope)
  const [running, setRunning] = useState(false)
  const [slow, setSlow] = useState(false)
  const [muted, setMuted] = useState(true)
  const [hint, setHint] = useState(0)
  /** A coluna escolhida na cena do espelho. Ela é do CONTROLE, não do mundo: enquanto a criança
   *  arrasta o deslizante nada é pintado, e o motor só recebe o traço no clique. */
  const [coluna, setColuna] = useState(3)
  /**
   * ⭐ A PREVISÃO: o que ela acha que vai acontecer, antes de mexer.
   *
   * ⚠️ Fica no `sessionStorage` e sobe junto da tentativa, mas NÃO entra no checkpoint da cena:
   * o motor não sabe dela, e não deve saber. Ela também não decide nada — quem responde a
   * previsão é a própria cena quando roda, que é o ciclo do Brilliant (prever, mexer, ver).
   */
  const [prediction, setPrediction] = useState(() => {
    if (typeof window === 'undefined' || !scope) return ''
    try {
      return sessionStorage.getItem(`sz:scene-prediction:${scope}`) ?? ''
    } catch {
      return ''
    }
  })
  const previsaoPendente = Boolean(content.prediction) && !prediction
  const [status, setStatus] = useState(scope ? 'Recuperando sua experiência…' : 'Prévia de autoria')
  const [error, setError] = useState('')
  const [conflict, setConflict] = useState(false)
  const [compared, setCompared] = useState(false)
  const [registered, setRegistered] = useState(!!saved?.result?.passed)
  // ⚠️ A frase de sucesso é um LATCH, não um espelho de `result.passed`. Duas das catorze
  // cenas (`layers` e `jump-sound`) exigem que a montagem FIQUE no estado descoberto, então
  // com a cena viva depois da conclusão mexer de novo faria `passed` voltar a false — e o
  // cartão "Descoberta registrada" piscaria e sumiria na cara de quem acabou de acertar.
  // Concluir é um acontecimento; ele não se desfaz (o servidor também nunca rebaixa).
  const [conclusao, setConclusao] = useState(saved?.result?.passed ? saved.result.feedback : '')
  const [reduced, setReduced] = useState(false)
  const owner = useRef(Symbol('experience'))
  const audio = useRef<AudioContext | null>(null)
  const narration = useRef<HTMLAudioElement>(null)
  const saving = useRef(false)
  const attemptId = useRef(crypto.randomUUID())
  const flush = useRef<() => Promise<void>>(async () => {})
  const action = useRef<(command: SceneCommand) => void>(() => {})
  const cacheKey = scope ? `${scope}:${tabId}` : null
  const base = player
    ? `/api/members/lessons/${encodeURIComponent(player.lessonId)}/blocks/${encodeURIComponent(block.id)}`
    : null
  const demoMode = activity.type === 'demonstration'
  const demo = demoMode ? (session as DemonstrationSession) : null
  const lab = demoMode ? null : (session as ExperimentSession)

  const state = session.state
  const m = activity.scene
  const reference = ['gravity', 'impulse', 'hitbox', 'jump-sound'].includes(m)
  const demoStep = demo ? sceneScript(activity)[demo.step] : null
  const result = demo
    ? evaluateDemonstration(demo.viewed)
    : evaluateExperimentation(activity.scene, state, true, activity.cast)
  const goals = sceneGoals(activity.scene, state, activity.cast)
  // ⚠️ A instrução NÃO é mais substituída pela pista (14/09/2026). As duas dividiam o mesmo
  // balão, então pedir ajuda APAGAVA o enunciado — e quem mais precisa da pista é justamente
  // quem ainda vai reler o que foi pedido. Hoje a instrução fica onde está e a pista entra
  // abaixo, com o degrau à vista.
  const instruction = demoStep?.caption ?? content.instructions
  const hintText = hint
    ? content.hints.length
      ? (hints[hint - 1] ?? '')
      : sceneHint(activity.scene, state, hint, activity.cast)
    : ''

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => {
      setReduced(media.matches)
      if (media.matches) setRunning(false)
    }
    update()
    media.addEventListener('change', update)
    const unregister = registerLessonMedia(owner.current, () => {
      narration.current?.pause()
      setRunning(false)
      return audio.current?.suspend()
    })
    return () => {
      media.removeEventListener('change', update)
      unregister()
      void audio.current?.close()
    }
  }, [])
  useEffect(() => {
    if (!cacheKey) return
    let mounted = true
    void readSceneDraft(cacheKey)
      .then(async (draft) => {
        if (mounted) {
          if (draft && !controller.restore(draft)) {
            await archiveSceneDraft(cacheKey, draft)
            // ⚠️ Sem inventar a causa: o rascunho pode estar atrás da conta por outra aba, mas
            // também por um fechar de aba em que o envio chegou e a gravação local não — e aí
            // dizer "outra aba" manda a criança (e quem a ajuda) procurar o que não existe.
            setError(
              'A versão da sua conta estava mais adiantada que a cópia deste navegador. Continuamos da versão da conta; a cópia anterior ficou guardada aqui.',
            )
          }
          setStatus('Sua experiência está pronta.')
        }
      })
      .catch(() => {
        if (mounted)
          setError(
            'O navegador não permitiu guardar uma cópia local. O salvamento na conta continua disponível.',
          )
      })
      .finally(() => {
        if (mounted) setReady(true)
      })
    return () => {
      mounted = false
    }
  }, [cacheKey, controller])

  action.current = (command) => {
    // ⚠️ SEM `result.passed` aqui (14/09/2026): cumprir o objetivo não encerra a cena. A
    // criança que chegou no resultado apertando botão de qualquer jeito precisa poder
    // desfazer, recomeçar e refazer para entender — e um guard mudo aqui esvaziaria os
    // botões mesmo com o `fieldset` liberado. Quem registra a conclusão é o `flush`, uma
    // vez só; continuar mexendo nunca a desfaz (ver o `case when` do `recordAttempt`).
    if (!ready || conflict) return
    const events = controller.dispatch(command)
    if (
      events.some((e) => e.type === 'sound') &&
      !muted &&
      audio.current &&
      hasLessonMediaFocus(owner.current) &&
      audio.current.state === 'running'
    ) {
      const oscillator = audio.current.createOscillator()
      const gain = audio.current.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(620, audio.current.currentTime)
      oscillator.frequency.exponentialRampToValueAtTime(920, audio.current.currentTime + 0.08)
      gain.gain.setValueAtTime(0.08, audio.current.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, audio.current.currentTime + 0.14)
      oscillator.connect(gain)
      gain.connect(audio.current.destination)
      oscillator.start()
      oscillator.stop(audio.current.currentTime + 0.15)
      oscillator.onended = () => {
        oscillator.disconnect()
        gain.disconnect()
      }
    }
  }
  async function enableSound() {
    if (!muted) {
      setMuted(true)
      await audio.current?.suspend()
      return
    }
    try {
      audio.current ??= new AudioContext()
      await audio.current.resume()
      if (await requestLessonMediaFocus(owner.current)) setMuted(false)
    } catch {
      setError(
        'O som não abriu neste navegador. Você pode acompanhar pelos contadores de sons e saltos.',
      )
    }
  }
  const dispatch = (command: SceneCommand) => {
    action.current(command)
    if (command.type === 'jump' && !reduced) setRunning(true)
  }
  useEffect(() => {
    if (
      ready &&
      demoMode &&
      !(controller.getSnapshot() as DemonstrationSession).viewed &&
      controller.getSnapshot().state.evidence.actions === 0
    )
      controller.dispatch({ type: 'start' })
  }, [ready, demoMode, controller])
  useEffect(() => {
    if (!result.passed) return
    setConclusao(result.feedback)
    if (!demoMode) setRunning(false)
    // ⚠️ Fechar a atividade grava NA HORA, sem esperar a batida de um segundo. A criança acabou
    // de ver "concluído": um segundo de "guardando" depois disso é tempo em que ela fecha a aba
    // e perde o registro — e, na prévia do professor, é a seção que não destrava ao vivo.
    void flush.current()
  }, [demoMode, result.passed, result.feedback])
  flush.current = async () => {
    if (!ready || conflict) return
    if (saving.current) {
      if (cacheKey)
        await writeSceneDraft(cacheKey, controller.draft()).catch(() =>
          setError('Não foi possível guardar a cópia local.'),
        )
      return
    }
    saving.current = true
    try {
      // Persist the retry identifier BEFORE the request. A lost response must not create a new command.
      const segment = controller.segment()
      if (cacheKey)
        await writeSceneDraft(cacheKey, controller.draft()).catch(() =>
          setError(
            'Não foi possível atualizar a cópia neste navegador. Mantenha a aula aberta até salvar na conta.',
          ),
        )
      if (!base || !player) {
        // ⚠️ O registro da tentativa NÃO pode depender de haver comando novo. O `previewConfirm`
        // já consumiu os pendentes na primeira ida; se ela falhou, na segunda não sobra segmento
        // e o botão "Tentar salvar" virava um clique morto — o professor conclui que a atividade
        // não registra, quando o que não funciona é a repetição.
        if (segment) {
          const confirmadas = controller.previewConfirm()
          rehearsal?.onChange(
            block.id,
            confirmadas,
            Math.min(controller.getSnapshot().state.evidence.hints, hints.length),
          )
        }
        // ⚠️ E o avaliador é o DO TIPO: cobrar as metas da cena de quem só assistiu nunca
        // registraria uma demonstração no ensaio.
        if (!registered && result.passed && previewContent) {
          if (rehearsal) await rehearsal.onAttempt(block.id, previewContent, controller.answers())
          setRegistered(true)
        }
        return
      }
      if (segment) {
        setStatus('Guardando sua experiência…')
        const progress = await apiSend<LearningBlockProgress>(
          `${base}/learning-progress`,
          'POST',
          {
            revision: block.blockRevision,
            answers: segment,
            hintsUsed: Math.min(controller.getSnapshot().state.evidence.hints, hints.length),
            positionSeconds: null,
          },
          { 'x-sz-viewer': player.viewerId ?? '' },
          { keepalive: true },
        )
        controller.acknowledge(progress.answers)
        player.onLearningProgress?.(progress)
      }
      // ⚠️ Quem decide é o avaliador DO TIPO (`result`), não o da experimentação. Cobrar as metas
      // da cena de quem só assistiu nunca registra a demonstração: medido, em `jump-sound` e
      // `controls` o roteiro do modelo termina SEM fechar as metas, e nas outras doze só fecha
      // por coincidência do último passo — um roteiro autoral quebra a coincidência nos dois
      // sentidos (registra antes do fim, ou nunca).
      if (!registered && result.passed) {
        const response = await apiSend<{
          attempt: LearningAttemptView
          progress: LearningBlockProgress
        }>(
          `${base}/learning-attempts`,
          'POST',
          {
            id: attemptId.current,
            revision: block.blockRevision,
            // A previsão viaja com a tentativa: o relatório do professor quer saber o que a
            // turma achou que ia acontecer, e isso não cabe no checkpoint da cena.
            answers: prediction ? { ...controller.answers(), prediction } : controller.answers(),
            hintsUsed: Math.min(controller.getSnapshot().state.evidence.hints, hints.length),
          },
          { 'x-sz-viewer': player.viewerId ?? '' },
        )
        setRegistered(response.attempt.result.passed)
        // ⚠️ Com a cena viva depois da conclusão, existe uma janela estreita nas duas cenas
        // que pedem montagem ASSENTADA: a criança mexe antes de o registro subir, o servidor
        // reavalia pelo checkpoint DELE e grava `passed:false`. Como o `attemptId` é um por
        // montagem, `findAttempt` devolveria essa mesma tentativa para sempre e a conclusão
        // nunca mais registraria. Sortear um id novo só DEPOIS da resposta preserva o motivo
        // de ele existir (repetir um pedido perdido não pode criar tentativa nova).
        if (!response.attempt.result.passed) attemptId.current = crypto.randomUUID()
        player.onLearningProgress?.(response.progress)
        player.refreshAfterLearning?.()
      }
      // ⚠️ Com `.catch()`: esta era a única gravação local SEM rede-de-proteção, e num navegador
      // sem IndexedDB (aba privada, armazenamento bloqueado) ela derrubava o resto do bloco — a
      // criança lia "aguardando conexão" com o POST tendo voltado 200.
      let copiaLocal = true
      if (cacheKey)
        await writeSceneDraft(cacheKey, controller.draft()).catch(() => {
          copiaLocal = false
        })
      setStatus('Experiência salva na sua conta.')
      setError(
        copiaLocal ? '' : 'O resultado foi salvo na conta. A cópia neste navegador não guardou.',
      )
    } catch (e) {
      const stale = typeof e === 'object' && e !== null && 'status' in e && e.status === 409
      if (stale) {
        setConflict(true)
        setRunning(false)
        setError(
          'Esta experiência foi atualizada em outra aba ou mudou de versão. Sua cópia ficou guardada neste navegador. Reabra a aula para continuar da versão salva.',
        )
      } else if (!player) {
        // ⚠️ No ensaio de autoria não existe conexão a aguardar: a falha veio do próprio ensaio
        // (o professor pediu "falhar na próxima confirmação") ou do avaliador. Traduzir isso
        // para "aguardando conexão" esconde dele exatamente o que ele mandou acontecer.
        setStatus('')
        setError(
          e instanceof Error && e.message
            ? e.message
            : 'Não foi possível registrar este resultado na prévia.',
        )
      } else {
        setStatus('Aguardando conexão para salvar na conta.')
        setError('Suas ações continuam neste navegador. Vamos tentar salvar novamente.')
      }
    } finally {
      saving.current = false
    }
  }
  useEffect(() => {
    if (!ready) return
    const timer = setInterval(() => {
      void flush.current()
    }, 1000)
    const save = () => {
      void flush.current()
    }
    const hidden = () => {
      if (document.hidden) {
        setRunning(false)
        narration.current?.pause()
        save()
      }
    }
    window.addEventListener('online', save)
    window.addEventListener('pagehide', save)
    document.addEventListener('visibilitychange', hidden)
    return () => {
      clearInterval(timer)
      window.removeEventListener('online', save)
      window.removeEventListener('pagehide', save)
      document.removeEventListener('visibilitychange', hidden)
      save()
    }
  }, [ready])
  useEffect(() => {
    if (!running || !ready || conflict) return
    let frame = 0
    let last: number | null = null
    let elapsed = 0
    const tick = (now: number) => {
      if (document.hidden) {
        last = null
        elapsed = 0
        frame = requestAnimationFrame(tick)
        return
      }
      if (last !== null) elapsed += Math.min((now - last) / 1000, 0.1) * (slow ? 0.5 : 1)
      last = now
      if (elapsed >= 0.04) {
        const current = controller.getSnapshot()
        // Numa demonstração o relógio serve ao roteiro; numa experimentação, ao mundo.
        if (demoMode && (current as DemonstrationSession).ready) {
          setRunning(false)
          return
        }
        action.current(
          demoMode ? { type: 'tick', seconds: elapsed } : { type: 'advance', seconds: elapsed },
        )
        elapsed = 0
        // Acabou o salto: parar o relógio em vez de rodar à toa.
        if (
          !demoMode &&
          ['gravity', 'impulse', 'jump-sound'].includes(m) &&
          controller.getSnapshot().state.flight.time === null
        ) {
          setRunning(false)
          return
        }
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [controller, running, ready, conflict, slow, m, demoMode])

  return (
    /* ⚠️ A cena NÃO desenha cartão. Quem desenha é o app, pelo gancho `sz-lesson-scene`:
       no kids todo bloco já é um cartão, e a cena fazia o segundo dentro dele — duas molduras
       aninhadas empurram o desenho para dentro e a criança lê duas bordas antes do que importa.
       Adulto e ensaio do admin vestem este gancho no globals.css deles. */
    <section aria-labelledby={`${id}-title`} className="sz-lesson-scene space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {/* `sz-lesson-chip` + `data-chip`: gancho ESTÁVEL do tema (invariante 8). No kids
              ele vira a MESMA pílula colorida dos outros blocos (Assista, Responda, Crie);
              aqui fica só a linha de sempre, com o ícone. O rótulo é VERBO, como os demais
              chips da aula: a criança lê o que fazer, não o nome do formato. */}
          <p
            className="sz-lesson-chip mb-1 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[.16em] text-primary"
            data-chip={demoMode ? 'demonstration' : 'experimentation'}
          >
            {demoMode ? (
              <MonitorPlay size={14} aria-hidden />
            ) : (
              <FlaskConical size={14} aria-hidden />
            )}
            {demoMode ? 'Observe' : 'Experimente'}
          </p>
          <h3 id={`${id}-title`} className="text-xl font-bold sm:text-2xl">
            {content.title}
          </h3>
        </div>
        {!demoMode && (
          /* ⚠️ UM medidor, não uma insígnia por meta: com `role="img"` em cada bolinha o leitor
             de tela anunciava as metas uma a uma a cada descoberta. Aqui ele lê "2 de 3
             descobertas" e as bolinhas ficam sendo o que são — desenho. */
          <div
            className="flex gap-1"
            role="meter"
            aria-valuemin={0}
            aria-valuemax={goals.length}
            aria-valuenow={goals.filter((g) => g.complete).length}
            aria-label={`${goals.filter((g) => g.complete).length} de ${goals.length} descobertas`}
          >
            {goals.map((g) => (
              <span
                key={g.id}
                title={g.label}
                aria-hidden
                className={`grid h-8 w-8 place-items-center rounded-full border ${g.complete ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-muted'}`}
              >
                {g.complete ? <Check size={16} /> : '·'}
              </span>
            ))}
          </div>
        )}
      </header>
      <div className="space-y-4">
        <div className="min-h-16 rounded-2xl bg-primary/5 px-4 py-3" aria-live="polite">
          {player?.renderInstruction ? (
            player.renderInstruction(instruction, 'speaking')
          ) : (
            <p className="text-sm font-medium leading-relaxed sm:text-base">{instruction}</p>
          )}
        </div>
        {content.prediction && (
          <fieldset
            className={`space-y-2 rounded-2xl border p-4 ${
              previsaoPendente ? 'border-primary bg-primary/5' : 'border-border'
            }`}
          >
            <legend className="px-1 text-xs font-bold uppercase tracking-[.14em] text-primary">
              Antes de mexer
            </legend>
            <p className="font-medium">{content.prediction.prompt}</p>
            {content.prediction.choices.map((choice) => (
              <label
                key={choice.id}
                className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-border p-3 has-checked:border-primary has-checked:bg-primary/10"
              >
                <input
                  type="radio"
                  name={`${id}-prediction`}
                  value={choice.id}
                  checked={prediction === choice.id}
                  className="accent-primary"
                  onChange={() => {
                    setPrediction(choice.id)
                    if (scope)
                      try {
                        sessionStorage.setItem(`sz:scene-prediction:${scope}`, choice.id)
                      } catch {
                        /* aba privada: a previsão vale para esta sessão mesmo assim */
                      }
                  }}
                />
                {choice.label}
              </label>
            ))}
            <p className="text-sm text-muted-foreground">
              {previsaoPendente
                ? 'Escolha um palpite para abrir a cena. Não tem nota: errar aqui é parte da descoberta.'
                : 'Agora mexa na cena e veja se foi isso mesmo que aconteceu.'}
            </p>
          </fieldset>
        )}
        {hintText && (
          /* A escada de três degraus já estava escrita no catálogo de cada cena; o que faltava
             era ela aparecer COMO escada. Dizer "1 de 3" é o que deixa a criança decidir se
             pede a próxima ou tenta de novo. */
          <div
            className="flex gap-3 rounded-2xl border border-amber-600/30 bg-amber-500/10 px-4 py-3"
            role="status"
          >
            <Lightbulb size={18} className="mt-0.5 shrink-0 text-amber-700" aria-hidden />
            <p className="text-sm leading-relaxed">
              <span className="font-semibold">
                Pista {Math.min(hint, hints.length)} de {hints.length}.
              </span>{' '}
              {hintText}
            </p>
          </div>
        )}
        {/* ⚠️ `<fieldset disabled>` desabilita TODO `<button>` descendente por HTML nativo —
            e daqui até o fecho estão também Ligar som e Ouvir instrução, que não são da
            experimentação. Por isso ele nunca pode olhar `result.passed`: a cena concluída
            ficava sem desfazer, sem recomeçar, sem pista e MUDA, inclusive ao reabrir a aula
            (o checkpoint salvo faz `passed` já nascer true). */}
        <fieldset disabled={!ready || conflict} className="min-w-0 space-y-4">
          {/* ⚠️ A previsão TRAVA a cena, e é o único caso em que travar ajuda: a graça de prever
              é que o palpite venha antes de ver. Depois de respondida, nada mais trava.
              ⚠️⚠️ E ela trava o PALCO, não o bloco inteiro: o rodapé fica de fora de propósito,
              porque lá estão "Ouvir instrução" e "Ligar som". Travar a fala gravada do professor
              enquanto se pede um palpite deixaria sem saída justamente quem ainda não lê. */}
          <fieldset disabled={previsaoPendente} className="min-w-0 space-y-4">
            {/* O teto da cena. Ela não ocupa mais o cartão inteiro: fica centralizada e com
              largura de leitura, como no Brilliant. O token vive em `styles/scene.css`. */}
            <div
              className={`mx-auto w-full max-w-scene ${
                demoStep?.highlight === 'scene'
                  ? 'rounded-2xl ring-2 ring-primary ring-offset-4 ring-offset-card'
                  : ''
              }`}
            >
              {/* A faixa de estado. Os números que a criança vai digitar no bloco do Estúdio
                (x, impulso, limite, placar) não apareciam em lugar nenhum do palco: ela mexia
                e via o desenho mudar, sem nada ligar o VALOR ao que aconteceu. A régua é do
                core (`sceneReadout`), então vale igual no aluno e no ensaio do admin.
                ⚠️⚠️ Ela NÃO é `aria-hidden` (achado do full review): a primeira versão a
                escondia "para não repetir o que a frase diz", mas a faixa é conteúdo ESTÁTICO —
                quem anuncia a cada mudança é o `role="status"` da frase, que é outro elemento.
                Escondida, ela tirava de quem usa leitor de tela justamente os números que a
                cena existe para mostrar, e numa cena sobre acessibilidade isso é contradição.
                A `<dl>` dá a relação nome/valor de graça. */}
              <dl className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-t-2xl border border-scene-card-line border-b-0 bg-scene-card px-3 py-2 text-xs text-scene-ink sm:text-sm">
                {sceneReadout(activity.scene, state, activity.cast).map((r) => (
                  <div key={r.label} className="flex items-baseline gap-1.5">
                    <dt className="text-scene-ink-soft">{r.label}</dt>
                    <dd
                      className={`font-semibold tabular-nums ${
                        r.tone === 'a'
                          ? 'text-scene-a'
                          : r.tone === 'b'
                            ? 'text-scene-b-ink'
                            : r.tone === 'alert'
                              ? 'text-scene-alert'
                              : ''
                      }`}
                    >
                      {r.value}
                    </dd>
                  </div>
                ))}
              </dl>
              {reference ? (
                <ExperienceScene
                  activity={activity}
                  state={state}
                  // O `!demoMode` FICA: é ele que separa os dois tipos de bloco (na
                  // demonstração a criança assiste, não toca). O `!result.passed` saiu.
                  onJump={
                    !demoMode && m !== 'hitbox'
                      ? (input) => dispatch({ type: 'jump', input })
                      : undefined
                  }
                  onDistance={
                    !demoMode && m === 'hitbox'
                      ? (distance) => dispatch({ type: 'move', distance })
                      : undefined
                  }
                />
              ) : (
                <fieldset disabled={demoMode}>
                  <ExplorationStage
                    activity={activity}
                    state={state}
                    dispatch={dispatch}
                    paused={!running}
                  />
                </fieldset>
              )}
            </div>
            {/* ⚠️ Era aqui que morava "Siga a missão e observe o resultado", a MESMA frase nas
              catorze cenas e em todo estado — ela aparecia sempre que o motor não tivesse
              escrito um `caption` para aquela ação, que é o caso comum. `sceneSituation`
              mantém o acontecimento do motor na frente e, sem ele, descreve o que está na
              tela AGORA. */}
            <p
              role="status"
              className="min-h-6 text-center text-sm font-medium text-muted-foreground"
            >
              {sceneSituation(activity.scene, state, activity.cast)}
            </p>
            {demoMode ? (
              <div className="flex flex-wrap items-center justify-center gap-2 rounded-2xl bg-primary/5 p-3">
                <span className="mr-2 text-sm font-semibold">
                  Etapa {(demo?.step ?? 0) + 1} de {sceneScript(activity).length}
                </span>
                <SceneButton onClick={() => setRunning((v) => !v)} disabled={!demo || demo.ready}>
                  {running ? <Pause size={16} /> : <Play size={16} />}
                  {running ? 'Pausar' : 'Observar'}
                </SceneButton>
                <SceneButton
                  onClick={() => dispatch({ type: 'tick', seconds: 0.2 })}
                  disabled={!demo || demo.ready}
                >
                  <StepForward size={16} />
                  Um passo
                </SceneButton>
                {(demo?.step ?? 0) < sceneScript(activity).length - 1 && (
                  <SceneButton
                    disabled={!demo?.ready}
                    onClick={() => {
                      dispatch({ type: 'next' })
                      setRunning(!reduced)
                    }}
                  >
                    Próxima etapa
                  </SceneButton>
                )}
                <SceneButton
                  onClick={() => {
                    dispatch({ type: 'start' })
                    setRunning(!reduced)
                  }}
                >
                  <RotateCcw size={16} />
                  Rever desde o começo
                </SceneButton>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-border bg-background p-3">
                  {['gravity', 'impulse', 'jump-sound'].includes(m) && (
                    <SceneButton
                      className="!border-primary !bg-primary !px-6 !text-primary-foreground"
                      onClick={() => dispatch({ type: 'jump', input: 'tap' })}
                    >
                      ↑ Pular com toque
                    </SceneButton>
                  )}
                  {m === 'jump-sound' && (
                    <SceneButton
                      onClick={() => dispatch({ type: 'jump', input: 'key' })}
                      onKeyDown={(e) => {
                        if (e.code === 'Space') {
                          e.preventDefault()
                          if (!e.repeat) dispatch({ type: 'jump', input: 'key' })
                        }
                      }}
                    >
                      Tecla Espaço
                    </SceneButton>
                  )}
                  {/* ⚠️⚠️ Quem diz se a cena tem relógio é a RÉGUA DE LEGALIDADE do core, e não
                    uma lista escrita aqui: a lista à mão já tinha deixado `stage-size` com um
                    "Um passo" que não fazia nada (o motor recusa `advance` fora das cenas com
                    tempo), e cada cena nova teria que lembrar de entrar nela. Um play parado é
                    um botão que promete o que a cena não faz. */}
                  {isSceneAction({ type: 'advance', seconds: 0.2 }, m) && (
                    <>
                      <SceneButton
                        aria-label={running ? 'Pausar experiência' : 'Continuar experiência'}
                        onClick={() => setRunning((v) => !v)}
                      >
                        {running ? <Pause size={18} /> : <Play size={18} />}
                      </SceneButton>
                      <SceneButton onClick={() => dispatch({ type: 'advance', seconds: 0.2 })}>
                        <StepForward size={16} />
                        Um passo
                      </SceneButton>
                      <SceneButton aria-pressed={slow} onClick={() => setSlow((v) => !v)}>
                        ½ velocidade
                      </SceneButton>
                    </>
                  )}
                  {reference && (
                    <SceneButton
                      onClick={() => {
                        dispatch({ type: 'capture' })
                        setCompared(true)
                      }}
                    >
                      <Camera size={16} />
                      Guardar para comparar
                    </SceneButton>
                  )}
                </div>
                <div
                  className={`space-y-3 ${demoStep?.highlight === 'tools' ? 'rounded-2xl ring-2 ring-primary' : ''}`}
                >
                  {(m === 'impulse' || m === 'gravity') && (
                    <label
                      className="flex flex-wrap items-center gap-4 rounded-2xl border border-border p-4 text-sm font-semibold"
                      htmlFor={`${id}-force`}
                    >
                      Impulso{' '}
                      <output className="text-lg text-amber-700">{state.flight.force}</output>
                      <input
                        id={`${id}-force`}
                        aria-label="Impulso do salto"
                        type="range"
                        min="5"
                        max="14"
                        step="1"
                        value={state.flight.force}
                        disabled={m === 'gravity'}
                        onChange={(e) =>
                          dispatch({ type: 'impulse', force: Number(e.target.value) })
                        }
                        className="h-11 min-w-32 flex-1 accent-amber-600"
                      />
                      {m === 'gravity' && (
                        <span className="font-normal text-muted-foreground">
                          O impulso fica igual para comparar a gravidade.
                        </span>
                      )}
                    </label>
                  )}
                  {m === 'coordinates' && (
                    /* ⭐ Os dois controles que a Aula 1 pedia e que o vídeo não dava. Cada eixo
                     tem deslizante, botões de passo e o valor à vista — os três levam ao MESMO
                     lugar, que é a régua desta casa desde a cena da colisão: quem não arrasta
                     (teclado, leitor de tela) chega à mesma descoberta. */
                    <div className="grid gap-3 sm:grid-cols-2">
                      {[
                        {
                          eixo: 'x' as const,
                          label: 'x, de esquerda a direita',
                          value: state.place.x,
                          max: SCENE_LIMITS.placeX.max,
                          cor: 'text-scene-a',
                        },
                        {
                          eixo: 'y' as const,
                          label: 'y, de cima a baixo',
                          value: state.place.y,
                          max: SCENE_LIMITS.placeY.max,
                          cor: 'text-scene-b-ink',
                        },
                      ].map((item) => {
                        const place = (valor: number) =>
                          dispatch({
                            type: 'place',
                            x: item.eixo === 'x' ? valor : state.place.x,
                            y: item.eixo === 'y' ? valor : state.place.y,
                            // ⚠️ Um eixo por vez: o outro vem do estado, nunca do controle. É o
                            // que faz a descoberta ser sobre UM número.
                          })
                        const passo = (delta: number) =>
                          place(Math.max(0, Math.min(item.max, item.value + delta)))
                        return (
                          <div
                            key={item.eixo}
                            className="rounded-2xl border border-border p-4 text-sm font-semibold"
                          >
                            <label
                              className="flex justify-between gap-2"
                              htmlFor={`${id}-${item.eixo}`}
                            >
                              {item.label}
                              <output className={`text-lg tabular-nums ${item.cor}`}>
                                {item.value}
                              </output>
                            </label>
                            <div className="mt-2 flex items-center gap-2">
                              <SceneButton
                                className="!min-w-11 !px-2"
                                aria-label={`Diminuir ${item.eixo} em 20`}
                                onClick={() => passo(-20)}
                              >
                                −
                              </SceneButton>
                              <input
                                id={`${id}-${item.eixo}`}
                                aria-label={item.label}
                                className="h-11 min-w-0 flex-1 accent-primary"
                                type="range"
                                min={0}
                                max={item.max}
                                step={1}
                                value={item.value}
                                onChange={(e) => place(Number(e.target.value))}
                              />
                              <SceneButton
                                className="!min-w-11 !px-2"
                                aria-label={`Aumentar ${item.eixo} em 20`}
                                onClick={() => passo(20)}
                              >
                                +
                              </SceneButton>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  {m === 'stage-size' && (
                    <div className="space-y-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        {[
                          {
                            eixo: 'width' as const,
                            label: 'largura da tela',
                            value: state.stage.width,
                            min: SCENE_LIMITS.stageWidth.min,
                            max: SCENE_LIMITS.stageWidth.max,
                            cor: 'text-scene-a',
                          },
                          {
                            eixo: 'height' as const,
                            label: 'altura da tela',
                            value: state.stage.height,
                            min: SCENE_LIMITS.stageHeight.min,
                            max: SCENE_LIMITS.stageHeight.max,
                            cor: 'text-scene-b-ink',
                          },
                        ].map((item) => (
                          <label
                            key={item.eixo}
                            className="rounded-2xl border border-border p-4 text-sm font-semibold"
                          >
                            <span className="flex justify-between gap-2">
                              {item.label}
                              <output className={`text-lg tabular-nums ${item.cor}`}>
                                {item.value}
                              </output>
                            </span>
                            <input
                              aria-label={item.label}
                              className="mt-2 h-11 w-full accent-primary"
                              type="range"
                              min={item.min}
                              max={item.max}
                              step={10}
                              value={item.value}
                              onChange={(e) =>
                                dispatch({
                                  type: 'stage',
                                  width:
                                    item.eixo === 'width'
                                      ? Number(e.target.value)
                                      : state.stage.width,
                                  height:
                                    item.eixo === 'height'
                                      ? Number(e.target.value)
                                      : state.stage.height,
                                })
                              }
                            />
                          </label>
                        ))}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border p-4">
                        <SceneButton
                          className={
                            state.stage.border
                              ? ''
                              : '!border-primary !bg-primary !text-primary-foreground'
                          }
                          aria-pressed={state.stage.border}
                          onClick={() => dispatch({ type: 'border', visible: !state.stage.border })}
                        >
                          {state.stage.border ? 'Esconder a borda' : 'Mostrar a borda da tela'}
                        </SceneButton>
                        <SceneButton
                          onClick={() => dispatch({ type: 'stage', width: 480, height: 270 })}
                        >
                          Usar 480 por 270
                        </SceneButton>
                      </div>
                    </div>
                  )}
                  {m === 'draw-loop' && (
                    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border p-4">
                      {/* ⚠️ Uma chave de cada vez, e o relógio à parte: é avançando o tempo que a
                        criança vê a diferença entre congelado, rastro e movimento. */}
                      <SceneButton
                        aria-pressed={state.render.loop}
                        className={state.render.loop ? '!border-primary !text-primary' : ''}
                        onClick={() => dispatch({ type: 'loop', on: !state.render.loop })}
                      >
                        Desenhar a cada quadro: {state.render.loop ? 'ligado' : 'desligado'}
                      </SceneButton>
                      <SceneButton
                        aria-pressed={state.render.erase}
                        className={state.render.erase ? '!border-primary !text-primary' : ''}
                        onClick={() => dispatch({ type: 'erase', on: !state.render.erase })}
                      >
                        Limpar antes: {state.render.erase ? 'ligado' : 'desligado'}
                      </SceneButton>
                    </div>
                  )}
                  {m === 'screen-reader' && (
                    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border p-4">
                      {/* ⚠️ Ícone de ESCUTA, não de som: "Ligar som" (o efeito sonoro da cena)
                        fica no mesmo rodapé, e dois botões com o mesmo alto-falante na mesma
                        tela leem como o mesmo controle. */}
                      <SceneButton
                        className="!border-primary !bg-primary !px-6 !text-primary-foreground"
                        onClick={() => dispatch({ type: 'listen' })}
                      >
                        <Ear size={16} />
                        Ouvir a tela
                      </SceneButton>
                      <span className="text-sm text-muted-foreground">
                        O programa lê o que estiver escrito. Ele não enxerga o desenho.
                      </span>
                    </div>
                  )}
                  {m === 'frames' && (
                    <div className="w-full space-y-3">
                      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border p-4">
                        {[1, 2].map((n) => (
                          <SceneButton
                            key={n}
                            aria-pressed={state.animation.frame === n}
                            className={
                              state.animation.frame === n ? '!border-primary !text-primary' : ''
                            }
                            onClick={() => dispatch({ type: 'frame', index: n })}
                          >
                            {`Quadro ${n}`}
                          </SceneButton>
                        ))}
                        {/* ⚠️ Ligar a troca LIGA O RELÓGIO junto (e parar para). Sem isso a
                          criança apertava "Ligar a troca", nada se mexia e a saída era descobrir
                          sozinha que faltava apertar o play ali do lado: dois interruptores para
                          uma coisa só. O passo e a pausa continuam à mão, para ela olhar uma
                          troca de cada vez. */}
                        <SceneButton
                          className="!border-primary !bg-primary !px-6 !text-primary-foreground"
                          aria-pressed={state.animation.playing}
                          onClick={() => {
                            const ligando = !state.animation.playing
                            dispatch({ type: 'play', on: ligando })
                            setRunning(ligando)
                          }}
                        >
                          {state.animation.playing ? 'Parar a troca' : 'Ligar a troca'}
                        </SceneButton>
                      </div>
                      <label
                        className="block rounded-2xl border border-border p-4 text-sm font-semibold"
                        htmlFor={`${id}-rate`}
                      >
                        <span className="flex justify-between gap-2">
                          trocas por segundo
                          <output className="text-lg tabular-nums text-scene-b-ink">
                            {state.animation.rate}
                          </output>
                        </span>
                        <input
                          id={`${id}-rate`}
                          aria-label="trocas por segundo"
                          className="mt-2 h-11 w-full accent-primary"
                          type="range"
                          min={SCENE_LIMITS.rate.min}
                          max={SCENE_LIMITS.rate.max}
                          step={1}
                          value={state.animation.rate}
                          onChange={(e) =>
                            dispatch({ type: 'rate', perSecond: Number(e.target.value) })
                          }
                        />
                      </label>
                    </div>
                  )}
                  {m === 'onion-skin' && (
                    <div className="w-full space-y-3">
                      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border p-4">
                        {[1, 2].map((n) => (
                          <SceneButton
                            key={n}
                            aria-pressed={state.animation.frame === n}
                            className={
                              state.animation.frame === n ? '!border-primary !text-primary' : ''
                            }
                            onClick={() => dispatch({ type: 'frame', index: n })}
                          >
                            {`Quadro ${n}`}
                          </SceneButton>
                        ))}
                        <SceneButton
                          aria-pressed={state.animation.onion}
                          className={state.animation.onion ? '!border-primary !text-primary' : ''}
                          onClick={() => dispatch({ type: 'onion', on: !state.animation.onion })}
                        >
                          Fantasma: {state.animation.onion ? 'ligado' : 'desligado'}
                        </SceneButton>
                      </div>
                      {/* ⚠️ Uma variável por vez, como na cena da colisão: o passo é do desenho do
                        quadro 2, então no quadro 1 ele fica fechado COM O MOTIVO escrito. Mexer
                        nele ali mudaria um desenho que não está na tela. */}
                      <label
                        className="block rounded-2xl border border-border p-4 text-sm font-semibold"
                        htmlFor={`${id}-shift`}
                      >
                        <span className="flex justify-between gap-2">
                          passo do quadro 2
                          <output className="text-lg tabular-nums text-scene-b-ink">
                            {state.animation.shift}
                          </output>
                        </span>
                        <input
                          id={`${id}-shift`}
                          aria-label="passo do quadro 2"
                          className="mt-2 h-11 w-full accent-primary"
                          type="range"
                          min={SCENE_LIMITS.shift.min}
                          max={SCENE_LIMITS.shift.max}
                          step={4}
                          disabled={state.animation.frame !== 2}
                          value={state.animation.shift}
                          onChange={(e) =>
                            dispatch({ type: 'shift', offset: Number(e.target.value) })
                          }
                        />
                        {state.animation.frame !== 2 && (
                          <span className="mt-1 block text-xs font-normal text-muted-foreground">
                            Vá para o quadro 2 para mover o desenho dele.
                          </span>
                        )}
                      </label>
                    </div>
                  )}
                  {m === 'symmetry' && (
                    <div className="w-full space-y-3">
                      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-border p-4">
                        <label
                          className="min-w-40 flex-1 text-sm font-semibold"
                          htmlFor={`${id}-col`}
                        >
                          <span className="flex justify-between gap-2">
                            coluna do traço
                            <output className="text-lg tabular-nums text-scene-a">{coluna}</output>
                          </span>
                          <input
                            id={`${id}-col`}
                            aria-label="coluna do traço"
                            className="mt-2 h-11 w-full accent-primary"
                            type="range"
                            min={SCENE_LIMITS.column.min}
                            max={SCENE_LIMITS.column.max}
                            step={1}
                            value={coluna}
                            onChange={(e) => setColuna(Number(e.target.value))}
                          />
                        </label>
                        <SceneButton
                          className="!border-primary !bg-primary !px-6 !text-primary-foreground"
                          onClick={() => dispatch({ type: 'paint', column: coluna })}
                        >
                          Pintar aqui
                        </SceneButton>
                        <SceneButton
                          aria-pressed={state.mirror.on}
                          className={state.mirror.on ? '!border-primary !text-primary' : ''}
                          onClick={() =>
                            dispatch({
                              type: 'mirror',
                              on: !state.mirror.on,
                              line: state.mirror.line,
                            })
                          }
                        >
                          Espelho: {state.mirror.on ? 'ligado' : 'desligado'}
                        </SceneButton>
                      </div>
                      <label
                        className="block rounded-2xl border border-border p-4 text-sm font-semibold"
                        htmlFor={`${id}-axis`}
                      >
                        <span className="flex justify-between gap-2">
                          linha do eixo
                          <output className="text-lg tabular-nums text-scene-b-ink">
                            {state.mirror.line}
                          </output>
                        </span>
                        <input
                          id={`${id}-axis`}
                          aria-label="linha do eixo"
                          className="mt-2 h-11 w-full accent-primary"
                          type="range"
                          min={SCENE_LIMITS.mirrorLine.min}
                          max={SCENE_LIMITS.mirrorLine.max}
                          step={1}
                          disabled={!state.mirror.on}
                          value={state.mirror.line}
                          onChange={(e) =>
                            dispatch({
                              type: 'mirror',
                              on: state.mirror.on,
                              line: Number(e.target.value),
                            })
                          }
                        />
                        {!state.mirror.on && (
                          <span className="mt-1 block text-xs font-normal text-muted-foreground">
                            Ligue o espelho para escolher onde ele fica.
                          </span>
                        )}
                      </label>
                    </div>
                  )}
                  {m === 'pixel-vector' && (
                    <div className="w-full space-y-3">
                      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border p-4">
                        {(['pixel', 'vector'] as const).map((kind) => (
                          <SceneButton
                            key={kind}
                            aria-pressed={state.pixels.kind === kind}
                            className={
                              state.pixels.kind === kind ? '!border-primary !text-primary' : ''
                            }
                            onClick={() =>
                              dispatch({ type: 'inspect', kind, zoom: state.pixels.zoom })
                            }
                          >
                            {kind === 'pixel' ? 'Olhar a de pixel' : 'Olhar a de vetor'}
                          </SceneButton>
                        ))}
                      </div>
                      <label
                        className="block rounded-2xl border border-border p-4 text-sm font-semibold"
                        htmlFor={`${id}-zoom`}
                      >
                        <span className="flex justify-between gap-2">
                          lupa
                          <output className="text-lg tabular-nums text-scene-b-ink">
                            {state.pixels.zoom} vezes
                          </output>
                        </span>
                        <input
                          id={`${id}-zoom`}
                          aria-label="lupa"
                          className="mt-2 h-11 w-full accent-primary"
                          type="range"
                          min={SCENE_LIMITS.zoom.min}
                          max={SCENE_LIMITS.zoom.max}
                          step={1}
                          value={state.pixels.zoom}
                          onChange={(e) =>
                            dispatch({
                              type: 'inspect',
                              kind: state.pixels.kind,
                              zoom: Number(e.target.value),
                            })
                          }
                        />
                      </label>
                    </div>
                  )}
                  {m === 'sheet-vs-sprite' && (
                    <div className="w-full space-y-3">
                      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border p-4">
                        {[1, 2, 3, 4].map((cell) => (
                          <SceneButton
                            key={cell}
                            aria-pressed={state.sheet.cell === cell}
                            className={
                              state.sheet.cell === cell ? '!border-primary !text-primary' : ''
                            }
                            onClick={() => dispatch({ type: 'cut', cell })}
                          >
                            {`Pedaço ${cell}`}
                          </SceneButton>
                        ))}
                      </div>
                      <label
                        className="block rounded-2xl border border-border p-4 text-sm font-semibold"
                        htmlFor={`${id}-sprite`}
                      >
                        <span className="flex justify-between gap-2">
                          tamanho no jogo
                          <output className="text-lg tabular-nums text-scene-b-ink">
                            {state.sheet.size}
                          </output>
                        </span>
                        <input
                          id={`${id}-sprite`}
                          aria-label="tamanho no jogo"
                          className="mt-2 h-11 w-full accent-primary"
                          type="range"
                          min={SCENE_LIMITS.sprite.min}
                          max={SCENE_LIMITS.sprite.max}
                          step={8}
                          value={state.sheet.size}
                          onChange={(e) =>
                            dispatch({ type: 'sprite', size: Number(e.target.value) })
                          }
                        />
                      </label>
                    </div>
                  )}
                  {m === 'lives' && (
                    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border p-4">
                      <SceneButton
                        className="!border-primary !bg-primary !px-6 !text-primary-foreground"
                        disabled={state.lifeline.lives === 0}
                        onClick={() => dispatch({ type: 'collide' })}
                      >
                        {castText('Bater no cacto', activity.cast)}
                      </SceneButton>
                      <span className="text-sm text-muted-foreground">
                        {state.lifeline.lives === 0
                          ? 'Sem vidas. Use Recomeçar para jogar de novo.'
                          : 'Os fios ficam logo abaixo: eles decidem o que a batida faz.'}
                      </span>
                    </div>
                  )}
                  {m === 'hitbox' && (
                    /* ⭐ Uma variável por vez. Os dois controles nasciam abertos, e duas medidas
                     soltas ao mesmo tempo não ensinam qual causou o quê: a criança aproximava
                     o cacto, alargava a área e ficava sem saber qual das duas fez as áreas
                     encostarem. A largura abre depois da PRIMEIRA descoberta sobre distância
                     (`contact` ou `separate`), que é justamente quando a pergunta seguinte
                     ("e se o desenho ficar igual e só a área mudar?") passa a fazer sentido.
                     ⚠️ Fechado NÃO é escondido: o controle continua na tela, com o motivo
                     escrito. Sumir com ele faria a cena parecer outra a cada descoberta. */
                    <div className="grid gap-3 sm:grid-cols-2">
                      {[
                        {
                          // ⚠️ Os rótulos dos controles TAMBÉM passam pelo elenco: sem isto a
                          // criança de uma turma de nave lia "distância do asteroide" na faixa
                          // de estado e "Distância do cacto" no controle logo abaixo, na mesma
                          // tela. Achado do full review de 14/09/2026.
                          label: castText('Distância do cacto', activity.cast),
                          value: state.contact.distance,
                          min: 20,
                          max: 260,
                          field: 'distance',
                          locked: false,
                        },
                        {
                          label: castText('Largura da área do Dino', activity.cast),
                          value: state.contact.width,
                          min: 24,
                          max: 120,
                          field: 'width',
                          locked: !goals.some(
                            (g) => (g.id === 'contact' || g.id === 'separate') && g.complete,
                          ),
                        },
                      ].map((item) => (
                        <label
                          key={item.field}
                          className={`rounded-2xl border border-border p-4 text-sm font-semibold ${
                            item.locked ? 'opacity-60' : ''
                          }`}
                        >
                          <span className="flex justify-between gap-2">
                            {item.label}
                            <output>{item.value}</output>
                          </span>
                          <input
                            aria-label={item.label}
                            className="mt-2 h-11 w-full accent-primary"
                            type="range"
                            min={item.min}
                            max={item.max}
                            step="1"
                            value={item.value}
                            disabled={item.locked}
                            onChange={(e) =>
                              dispatch(
                                item.field === 'width'
                                  ? { type: 'resize', width: Number(e.target.value) }
                                  : { type: 'move', distance: Number(e.target.value) },
                              )
                            }
                          />
                          {item.locked && (
                            <span className="mt-2 block font-normal text-muted-foreground">
                              Abre quando você descobrir o que a distância faz.
                            </span>
                          )}
                        </label>
                      ))}
                    </div>
                  )}
                  <ExplorationPieces
                    activity={activity}
                    state={state}
                    dispatch={dispatch}
                    more={false}
                  />
                </div>
              </>
            )}
            {demo && demoStep?.highlight === 'tools' && (
              <fieldset disabled className="rounded-2xl border-2 border-primary p-3">
                <legend className="px-2 text-sm font-semibold">Observe a montagem</legend>
                {['gravity', 'impulse'].includes(m) && (
                  <p className="mb-3 text-sm">
                    Impulso {state.flight.force} · gravidade{' '}
                    {state.flight.gravity ? 'ligada' : 'desligada'}
                  </p>
                )}
                <ExplorationPieces activity={activity} state={state} dispatch={dispatch} more />
              </fieldset>
            )}
            {demo && reference && demoStep?.highlight === 'compare' && (
              <div className="rounded-2xl border-2 border-primary p-3">
                <ExperienceComparison
                  activity={activity}
                  trials={[demo.before ?? sceneTrial(demo.state, 'Antes desta etapa')]}
                  current={state}
                />
              </div>
            )}
          </fieldset>
          {/* ⭐ O rodapé tem UMA ação principal (14/09/2026). Antes eram quatro botões do mesmo
              tamanho e do mesmo cinza — Desfazer, Recomeçar, Uma pista e Ligar som —, e nenhum
              deles era o caminho para a frente: a criança que travava lia quatro saídas
              iguais. Agora as ferramentas ficam à esquerda, discretas, e "Uma pista" é a única
              com destaque, à direita, no mesmo lugar em toda cena.
              ⚠️ Os NOMES acessíveis não mudaram: eles são o contrato dos testes e de quem
              navega por leitor de tela. O que mudou é o peso. */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
            <div className="flex flex-wrap items-center gap-2">
              {!demoMode && (
                <>
                  <SceneButton
                    className="!border-transparent !bg-transparent !shadow-none !font-normal !text-muted-foreground hover:!border-border"
                    onClick={() => {
                      setRunning(false)
                      dispatch({ type: 'undo' })
                    }}
                    disabled={!(lab?.past ?? []).length}
                  >
                    <Undo2 size={16} />
                    Desfazer
                  </SceneButton>
                  <SceneButton
                    className="!border-transparent !bg-transparent !shadow-none !font-normal !text-muted-foreground hover:!border-border"
                    onClick={() => {
                      setRunning(false)
                      dispatch({ type: 'reset' })
                    }}
                  >
                    <RotateCcw size={16} />
                    Recomeçar
                  </SceneButton>
                </>
              )}
              <SceneButton
                className="!border-transparent !bg-transparent !shadow-none !font-normal !text-muted-foreground hover:!border-border"
                onClick={() => void enableSound()}
                aria-pressed={!muted}
              >
                {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                {muted ? 'Ligar som' : 'Silenciar'}
              </SceneButton>
              {activity.instructionAudioUrl && (
                <>
                  <audio ref={narration} src={activity.instructionAudioUrl} preload="none">
                    <track
                      kind="captions"
                      srcLang="pt-BR"
                      label="Instrução"
                      src={`data:text/vtt;charset=utf-8,${encodeURIComponent(`WEBVTT\n\n00:00:00.000 --> 24:00:00.000\n${content.instructions}`)}`}
                    />
                  </audio>
                  <SceneButton
                    className="!border-transparent !bg-transparent !shadow-none !font-normal !text-muted-foreground hover:!border-border"
                    onClick={async () => {
                      if (await requestLessonMediaFocus(owner.current)) {
                        try {
                          await narration.current?.play()
                        } catch {
                          setError('Não foi possível ouvir a instrução agora.')
                        }
                      }
                    }}
                  >
                    Ouvir instrução
                  </SceneButton>
                </>
              )}
            </div>
            {!demoMode && (
              <SceneButton
                className="!border-primary !px-6 !text-primary"
                onClick={() => {
                  const level = Math.min(hints.length, hint + 1)
                  setHint(level)
                  // ⚠️ A AÇÃO tem três degraus (`SCENE_LIMITS.hint`), mas a caixa de pistas do
                  // editor aceita dez. Com quatro pistas escritas, o quarto clique mandava
                  // `level: 4`, o motor recusava e o `dispatch` estourava DENTRO do onClick da
                  // criança — e o degrau nunca era contado, então o relatório dizia "3 pistas"
                  // para quem consultou cinco. A tela mostra todas; a evidência satura em três.
                  dispatch({ type: 'hint', level: Math.min(level, SCENE_LIMITS.hint.max) })
                }}
              >
                <Lightbulb size={16} />
                Uma pista
              </SceneButton>
            )}
          </div>
        </fieldset>
        {reference && (lab?.trials ?? []).length > 0 && (
          <details
            open={compared}
            onToggle={(e) => setCompared(e.currentTarget.open)}
            className="rounded-2xl border border-border p-4"
          >
            <summary className="cursor-pointer text-sm font-semibold">
              O que mudou? Compare suas experiências
            </summary>
            <div className="mt-4">
              <ExperienceComparison
                activity={activity}
                trials={lab?.trials ?? []}
                current={state}
              />
            </div>
          </details>
        )}
        {conclusao && (
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <p className="font-semibold">{conclusao}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {demoMode
                ? 'Você acompanhou o conceito em funcionamento.'
                : 'Você concluiu a investigação proposta nesta atividade.'}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {registered
                ? activity.type === 'demonstration'
                  ? 'Exemplo registrado.'
                  : 'Descoberta registrada.'
                : 'Guardando este resultado…'}
            </p>
          </div>
        )}
        <footer className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>{status}</span>
          {error && (
            <button
              type="button"
              onClick={() => void flush.current()}
              disabled={conflict}
              className="min-h-11 underline"
            >
              Tentar salvar
            </button>
          )}
        </footer>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
    </section>
  )
}
