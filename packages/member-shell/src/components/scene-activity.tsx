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
  sceneModel,
  sceneReadout,
  sceneScript,
  sceneSituation,
  sceneTargets,
  sceneTrial,
} from '@sistemazero/core/learning/scene'
import {
  Camera,
  Check,
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
import { ExperienceComparison } from './experience-scene'
import { ExplorationPieces } from './exploration-pieces'
import { ExplorationStage, ehLaboratorio, SceneButton } from './exploration-stage'
import { useLessonPlayer } from './lesson-player-context'
import { useLessonPreview } from './lesson-preview-context'
import { tituloJaDito, useLessonSection } from './lesson-section-context'
import { LessonSceneControls } from './scene-lesson-controls'

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
  const secao = useLessonSection()
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
  /** A resposta do "Já descobri": o que ainda falta, pedido pela criança. */
  const [veredito, setVeredito] = useState('')
  /**
   * ⭐ O TERCEIRO tempo do ciclo: mexer, prever e ENUNCIAR a regra.
   *
   * ⚠️ Diferente da previsão, esta pergunta VALE: é ela que dá a palavra final sobre o `passed`,
   * e quem corrige é o servidor (o gabarito nunca chega ao navegador). Por isso o que o player
   * mostra depois de responder é o `feedback` que voltou da tentativa, e não um veredito local.
   */
  const [resposta, setResposta] = useState('')
  const [respostaFeedback, setRespostaFeedback] = useState('')
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
  // ⚠️ A frase de sucesso é a DA CENA, sempre a mesma. Semeando com `saved.result.feedback` o
  // cartão trocava de texto num F5: acertando a pergunta anexa aquele campo é a EXPLICAÇÃO que o
  // professor escreveu, e a mesma cena passava a mostrar dois títulos diferentes.
  // ⚠️ Nasce FALSO num F5: quem reabre a aula não "está revendo", está chegando. Sem isso a
  // criança abria a cena e era recebida por uma frase sobre um gesto que ela não fez.
  const [recomeçou, setRecomeçou] = useState(false)
  const [conclusao, setConclusao] = useState(
    saved?.result?.passed
      ? activity.type === 'demonstration'
        ? 'Demonstração concluída.'
        : castText(sceneModel(activity.scene).success, activity.cast)
      : '',
  )
  /** A cena fechou? É o que libera a pergunta anexa — e o que o rodapé chama de "já descobri". */
  const [reduced, setReduced] = useState(false)
  const owner = useRef(Symbol('experience'))
  const audio = useRef<AudioContext | null>(null)
  const narration = useRef<HTMLAudioElement>(null)
  const saving = useRef(false)
  const attemptId = useRef(crypto.randomUUID())
  /**
   * ⚠️⚠️ O que a última tentativa já levou.
   *
   * A gravação roda numa batida de 1 s, e a condição de envio era só `!registered &&
   * result.passed`. Quando o servidor NÃO aprova — porque a pergunta anexa ainda não foi
   * respondida, ou foi respondida errado — `registered` continua falso e a condição continua
   * verdadeira: uma tentativa NOVA por segundo, para sempre, enquanto a criança lê a pergunta.
   * Só se reenvia quando há algo diferente para contar.
   */
  const enviado = useRef('')
  // ⚠️ O flush recebe a escolha da pergunta anexa por PARÂMETRO. Ele é reatribuído a cada
  // render, então o `flush.current` que o `onChange` do rádio alcança é o do render ANTERIOR —
  // com `resposta` ainda vazia. Sem o parâmetro, o envio imediato caía no guard e só a batida
  // de um segundo salvava, que é justamente o que ele existe para evitar.
  const flush = useRef<(escolha?: string) => Promise<void>>(async () => {})
  const action = useRef<(command: SceneCommand) => void>(() => {})
  const cacheKey = scope ? `${scope}:${tabId}` : null
  const base = player
    ? `/api/members/lessons/${encodeURIComponent(player.lessonId)}/blocks/${encodeURIComponent(block.id)}`
    : null
  const demoMode = activity.type === 'demonstration'
  /**
   * ⭐ O TERCEIRO formato: a cena rodando o roteiro dela inteiro, com um ▶ e nada mais.
   *
   * Entre o parágrafo de texto e a bancada manipulável faltava um degrau — os dois segundos de
   * animação, sem áudio e sem etapas, que a criança dispara e repete quantas vezes quiser. O
   * motor é o mesmo da demonstração guiada; muda só o que aparece em volta.
   */
  const inline = activity.type === 'demonstration' && activity.presentation === 'inline'
  const demo = demoMode ? (session as DemonstrationSession) : null
  const lab = demoMode ? null : (session as ExperimentSession)

  const state = session.state
  const m = activity.scene
  // ⚠️ A MESMA lista do palco: são as cenas do laboratório, e são elas que rendem a comparação
  // guardada ("Guardar para comparar"). Duas cópias da lista já divergiram uma vez.
  const reference = ehLaboratorio(m)
  const roteiro = sceneScript(activity)
  const demoStep = demo ? roteiro[demo.step] : null
  // ⚠️ As metas que ESTA atividade cobra: o `setup.goals` do professor, quando há. Sem isto o
  // player mostraria as três descobertas do modelo numa missão que só pede uma — e a barra de
  // progresso nunca fecharia, enquanto o servidor daria a atividade por concluída.
  const targets = sceneTargets(activity)
  const result = demo
    ? evaluateDemonstration(demo.viewed)
    : evaluateExperimentation(activity.scene, state, true, activity.cast, targets)
  const goals = sceneGoals(activity.scene, state, activity.cast, targets)
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
    // ⚠️ O estado de "está revendo" é ligado pelo RECOMEÇAR e desligado pelo primeiro gesto que
    // volta a mexer no mundo. `hint` não conta: pedir uma pista não é recomeçar a investigação.
    if (command.type === 'reset') setRecomeçou(true)
    else if (command.type !== 'hint') setRecomeçou(false)
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
  flush.current = async (escolha?: string) => {
    if (!ready || conflict) return
    if (saving.current) {
      if (cacheKey)
        await writeSceneDraft(cacheKey, controller.draft()).catch(() =>
          setError('Não foi possível guardar a cópia local.'),
        )
      return
    }
    saving.current = true
    const escolhida = escolha ?? resposta
    // ⚠️⚠️ O envio olha o LATCH, não o `result.passed` vivo — o mesmo que a pergunta anexa usa
    // para aparecer. Em `layers` e `jump-sound` o avaliador volta a reprovar quando a montagem
    // sai do estado descoberto, e é o botão em DESTAQUE do rodapé ("Ver de novo") que faz isso:
    // a criança respondia a pergunta depois de rever a cena e nenhuma requisição saía, sem erro
    // na tela e sem o "Tentar salvar". Concluir é um acontecimento e não se desfaz — o servidor
    // também nunca rebaixa um `passed:true`.
    const descobriu = Boolean(conclusao) || result.passed
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
        if (!registered && descobriu && previewContent && (!content.checkpoint || escolhida)) {
          // ⚠️⚠️ As MESMAS respostas do caminho com servidor. Mandando só o que o controlador
          // guarda, a escolha da pergunta anexa não chegava ao avaliador: o ensaio do professor
          // gravava `passed:false` com o recado de "ainda não respondeu" para quem tinha acabado
          // de responder, a seção não destravava, e ele não conseguia conferir a explicação que
          // escreveu — que é a feature inteira.
          const respostas = {
            ...controller.answers(),
            ...(prediction ? { prediction } : {}),
            ...(escolhida ? { checkpoint: escolhida } : {}),
          }
          const avaliado = rehearsal
            ? await rehearsal.onAttempt(block.id, previewContent, respostas)
            : null
          // ⚠️ E o veredito é o DELE: `setRegistered(true)` incondicional dava por registrado o
          // que o ensaio tinha acabado de reprovar.
          if (avaliado && content.checkpoint) setRespostaFeedback(avaliado.feedback)
          setRegistered(avaliado ? avaliado.passed : true)
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
      const assinatura = `${escolhida}|${state.evidence.discoveries.join(',')}`
      if (
        !registered &&
        descobriu &&
        (!content.checkpoint || escolhida) &&
        enviado.current !== assinatura
      ) {
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
            answers: {
              ...controller.answers(),
              // A previsão viaja com a tentativa: o relatório do professor quer saber o que a
              // turma achou que ia acontecer, e isso não cabe no checkpoint da cena.
              ...(prediction ? { prediction } : {}),
              // ⚠️ E a resposta da pergunta anexa, em chave PRÓPRIA (`checkpoint`): a sessão da
              // cena mora em `sceneCheckpoint`, e é essa separação que permite as duas conviverem.
              ...(escolhida ? { checkpoint: escolhida } : {}),
            },
            hintsUsed: Math.min(controller.getSnapshot().state.evidence.hints, hints.length),
          },
          { 'x-sz-viewer': player.viewerId ?? '' },
        )
        // ⚠️⚠️ O carimbo é gravado DEPOIS da resposta, nunca antes. Ele existe para impedir que
        // a batida de um segundo reenvie a mesma tentativa; carimbado antes do `await`, uma
        // falha de rede o deixava igual à assinatura para sempre — e como a assinatura só muda
        // com resposta ou descoberta nova (e descoberta não se desfaz), a criança ficava presa
        // em "Aguardando conexão" sem NENHUMA nova tentativa de envio. O POST é idempotente
        // pelo `attemptId`, então repetir é seguro; não repetir é que não era.
        enviado.current = assinatura
        setRegistered(response.attempt.result.passed)
        // Com pergunta anexa, é o servidor quem diz se a frase escolhida explica o que aconteceu.
        if (content.checkpoint) setRespostaFeedback(response.attempt.result.feedback)
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
  // ⚠️ A descoberta está feita, mas o bloco ainda cobra a frase que a explica. É o único estado
  // em que a cena e o servidor discordam de propósito, e por isso ele tem nome.
  /**
   * ⚠️⚠️ Ela já descobriu, e o palco voltou ao começo.
   *
   * Acontece o tempo todo: "Ver de novo" é a ação em DESTAQUE do rodapé e faz `reset`, que volta
   * ao caso. O cartão de sucesso é um latch (concluir é acontecimento e não se desfaz), então a
   * tela passava a afirmar "Você concluiu a investigação proposta nesta atividade" em cima de um
   * palco vazio — o prêmio por terminar era uma tela que diz o que ela não mostra.
   *
   * ⚠️⚠️ E o sinal é o GESTO (`recomeçou`), nunca o `result.passed`. A primeira versão usou o
   * avaliador como atalho e funcionou em DUAS cenas de 45: `reset` preserva as descobertas de
   * propósito (recomeçar volta o mundo, não a história), então `passed` continua verdadeiro em
   * todas menos `layers` e `jump-sound` — as únicas que exigem a montagem assentada. O teste
   * que devia ter pego isso usava justamente `layers`.
   */
  const revendo = Boolean(conclusao) && recomeçou && !demoMode
  /**
   * Os botões que moram na caixa da cena, como LISTA.
   *
   * ⚠️⚠️ É a lista que responde se a caixa deve existir (`botoesDaCena.length > 0`). Um booleano
   * à parte repetindo as condições de dentro esconde o defeito pior: um botão acrescentado e
   * esquecido no booleano não renderiza, sem erro e sem teste vermelho.
   *
   * ⚠️ Quem diz se a cena tem relógio é a RÉGUA DE LEGALIDADE do core, e não uma lista escrita
   * aqui: a lista à mão já tinha deixado `stage-size` com um "Um passo" que não fazia nada (o
   * motor recusa `advance` fora das cenas com tempo), e cada cena nova teria que lembrar de
   * entrar nela. Um play parado é um botão que promete o que a cena não faz.
   */
  /**
   * ⚠️⚠️ Quem SALTA é a régua de legalidade do core, como o relógio logo abaixo — nunca uma lista
   * de cenas escrita aqui. Ela dava exatamente estas três hoje (medido), então a troca não muda
   * nada AGORA: o que ela tira é a manutenção. Uma cena nova que aceite `jump` já nasce com o
   * botão, e uma que deixe de aceitar já nasce sem ele — que é o oposto do que acabou de custar
   * ~120 linhas mortas no palco compartilhado, onde a lista à mão nunca foi revisitada.
   */
  const salta = isSceneAction({ type: 'jump', input: 'tap' }, m)
  const botoesDaCena = [
    salta && (
      <SceneButton
        key="pular-toque"
        tom="gesto"
        onClick={() => dispatch({ type: 'jump', input: 'tap' })}
      >
        ↑ Pular com toque
      </SceneButton>
    ),
    m === 'jump-sound' && (
      <SceneButton
        key="tecla-espaco"
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
    ),
    isSceneAction({ type: 'advance', seconds: 0.2 }, m) && (
      <SceneButton
        key="tocar"
        aria-label={running ? 'Pausar experiência' : 'Continuar experiência'}
        onClick={() => setRunning((v) => !v)}
      >
        {running ? <Pause size={18} /> : <Play size={18} />}
      </SceneButton>
    ),
    isSceneAction({ type: 'advance', seconds: 0.2 }, m) && (
      <SceneButton key="um-passo" onClick={() => dispatch({ type: 'advance', seconds: 0.2 })}>
        <StepForward size={16} />
        Um passo
      </SceneButton>
    ),
    isSceneAction({ type: 'advance', seconds: 0.2 }, m) && (
      <SceneButton key="meia-velocidade" aria-pressed={slow} onClick={() => setSlow((v) => !v)}>
        ½ velocidade
      </SceneButton>
    ),
    reference && (
      <SceneButton
        key="guardar"
        onClick={() => {
          dispatch({ type: 'capture' })
          setCompared(true)
        }}
      >
        <Camera size={16} />
        Guardar para comparar
      </SceneButton>
    ),
  ].filter(Boolean)

  const pendente = Boolean(content.checkpoint) && Boolean(conclusao) && !registered
  // ⚠️ Errar não é "ainda não respondeu". O core já separa os dois recados; o cartão dizia
  // "escolha a frase que explica" para quem tinha escolhido — contradizendo, duas linhas
  // abaixo, a região que mostrava o "não é essa" que veio do servidor.
  const errou = pendente && Boolean(respostaFeedback)
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
          // ⭐ Na apresentação INLINE não há "Próxima etapa": o ▶ roda o roteiro inteiro de uma
          // vez, como os dois segundos de animação que o Brilliant põe no meio do texto. Só o
          // FIM do roteiro para o relógio; no meio dele, o player emenda a etapa seguinte.
          if (inline && (current as DemonstrationSession).step < roteiro.length - 1) {
            action.current({ type: 'next' })
          } else {
            setRunning(false)
            return
          }
        }
        action.current(
          demoMode ? { type: 'tick', seconds: elapsed } : { type: 'advance', seconds: elapsed },
        )
        elapsed = 0
        // Acabou o salto: parar o relógio em vez de rodar à toa.
        if (!demoMode && salta && controller.getSnapshot().state.flight.time === null) {
          setRunning(false)
          return
        }
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [controller, running, ready, conflict, slow, salta, demoMode, inline, roteiro.length])

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
          {/* ⚠️ O título CONTINUA existindo — ele é o nome acessível da `<section>` (o
              `aria-labelledby`), e sem ele quem usa leitor de tela perde a âncora. O que some é
              a REPETIÇÃO: quando o cabeçalho da seção já disse a mesma frase, ele vira
              `sr-only`. Era o caso da Aula 1 do Corre Dino, onde a mesma pergunta aparecia duas
              vezes em 130px de distância. */}
          <h3
            id={`${id}-title`}
            className={
              tituloJaDito(content.title, secao) ? 'sr-only' : 'text-xl font-bold sm:text-2xl'
            }
          >
            {content.title}
          </h3>
        </div>
        {!demoMode && (
          /* ⚠️ UM medidor, não uma insígnia por meta: com `role="img"` em cada bolinha o leitor
             de tela anunciava as metas uma a uma a cada descoberta. Aqui ele lê "2 de 3
             descobertas" e as bolinhas ficam sendo o que são — desenho. */
          <div
            className="flex items-center gap-2"
            role="meter"
            aria-valuemin={0}
            aria-valuemax={goals.length}
            aria-valuenow={goals.filter((g) => g.complete).length}
            aria-label={`${goals.filter((g) => g.complete).length} de ${goals.length} descobertas`}
          >
            {/* ⚠⚠ As bolinhas sozinhas não diziam a ninguém o que eram: quem enxerga via dois
                círculos azuis no alto do cartão e quem usa leitor de tela ouvia "2 de 3
                descobertas". A conta agora está escrita, e é `aria-hidden` porque o `role="meter"`
                em volta já anuncia a mesma coisa — a mesma regra da faixa de estado. */}
            <span aria-hidden className="text-xs font-semibold text-muted-foreground">
              {goals.filter((g) => g.complete).length} de {goals.length} descobertas
            </span>
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
            /* ⚠️ O segundo Zappy da tela vira texto. Quando a seção já tem um balão de fala
               num bloco próprio, o avatar aqui não acrescenta voz nenhuma — acrescenta uma
               segunda moldura, um segundo rosto e mais 90px antes do palco. A instrução
               continua inteira; o que sai é a repetição do mensageiro. */
            secao?.temDialogo ? (
              // ⚠️ `whitespace-pre-line` e `text-base` como no balão que ele substitui: sem os
              // dois, uma instrução escrita em mais de uma linha vira parágrafo corrido e o
              // tamanho no celular encolhe. O que sai é o mensageiro, não a forma do recado.
              <p className="whitespace-pre-line text-pretty text-base font-medium leading-relaxed">
                {instruction}
              </p>
            ) : (
              player.renderInstruction(instruction, 'speaking')
            )
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
              {/* ⚠️ Cartão INTEIRO, com os quatro cantos. Antes eram `rounded-t-2xl` +
                  `border-b-0` (o desenho de quem encosta no palco) junto de um `mb-2` que
                  afastava os dois: sem a borda de baixo e sem encostar em nada, a faixa lia como
                  um cartão cortado ao meio. O palco tem `rounded-2xl` próprio, então encostar
                  duplicaria o canto — quem cede é a faixa.
                  ⚠️⚠️ E ela é CROMO, por isso veste o APP (cartão, linha e tinta dele), não o
                  papel da cena: usava o creme `scene-card` com a linha oliva `scene-card-line` e
                  era o único elemento de outra família visual encostado no conteúdo — foi ela que
                  a dona apontou no print. O MUNDO, dentro do palco, continua ilustrado. */}
              <dl className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl border border-border bg-card px-3 py-2 text-xs text-foreground sm:text-sm">
                {sceneReadout(activity.scene, state, activity.cast).map((r) => (
                  <div key={r.label} className="flex items-baseline gap-1.5">
                    <dt className="text-muted-foreground">{r.label}</dt>
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
              {/* ⚠⚠ UM caminho para as 45: quem sabe qual é o palco de cada cena é o palco. O
                  player escolhia o laboratório de saltos à parte, e era o único lugar do sistema
                  que sabia disso. O `fieldset` continua aqui porque a trava é do BLOCO: na
                  demonstração a criança assiste, não toca. */}
              <fieldset disabled={demoMode}>
                <ExplorationStage activity={activity} state={state} dispatch={dispatch} />
              </fieldset>
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
            {inline ? (
              // A apresentação inline tem UM botão. Sem etapas, sem passo a passo, sem pausa:
              // é a animação curta que a criança repete quantas vezes quiser.
              <div className="flex justify-center">
                <SceneButton
                  tom="gesto"
                  onClick={() => {
                    dispatch({ type: 'start' })
                    // ⚠️⚠️ Quem pediu MENOS MOVIMENTO não fica sem cena: aqui não há "Um passo"
                    // nem "Próxima etapa" para clicar, então com a animação desligada o ▶ toca
                    // o roteiro inteiro de uma vez e mostra o RESULTADO. Sem isto, a criança
                    // clicava e nada acontecia — para sempre, e sem outro caminho.
                    if (reduced) {
                      for (let i = 0; i < 400; i++) {
                        const atual = controller.getSnapshot() as DemonstrationSession
                        if (atual.viewed) break
                        if (atual.ready) dispatch({ type: 'next' })
                        else dispatch({ type: 'tick', seconds: 0.2 })
                      }
                      return
                    }
                    setRunning(true)
                  }}
                  disabled={running}
                >
                  <Play size={16} />
                  {demo?.viewed ? 'Ver de novo' : 'Ver acontecer'}
                </SceneButton>
              </div>
            ) : demoMode ? (
              <div className="flex flex-wrap items-center justify-center gap-2 rounded-2xl bg-primary/5 p-3">
                <span className="mr-2 text-sm font-semibold">
                  Etapa {(demo?.step ?? 0) + 1} de {roteiro.length}
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
                {(demo?.step ?? 0) < roteiro.length - 1 && (
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
                {/* ⚠️⚠️ A caixa pergunta aos FILHOS se há o que mostrar, e não a uma lista de
                    cenas escrita à parte. A primeira versão repetia as condições de dentro num
                    booleano, e a falha silenciosa dela é pior que o defeito consertado: um
                    botão acrescentado aqui e esquecido lá simplesmente NÃO renderiza — sem
                    erro, sem caixa vazia, sem teste vermelho. Caixa vazia se vê; botão que
                    nunca apareceu, não. */}
                {botoesDaCena.length > 0 && (
                  <div className="flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-border bg-background p-3">
                    {botoesDaCena}
                  </div>
                )}
                <div
                  className={`space-y-3 ${demoStep?.highlight === 'tools' ? 'rounded-2xl ring-2 ring-primary' : ''}`}
                >
                  <LessonSceneControls
                    scene={m}
                    state={state}
                    dispatch={dispatch}
                    cast={activity.cast}
                    goals={goals}
                    onRunning={setRunning}
                  />
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
                    tom="discreta"
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
                    tom="discreta"
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
              <SceneButton tom="discreta" onClick={() => void enableSound()} aria-pressed={!muted}>
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
                    tom="discreta"
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
              {!demoMode && (
                <SceneButton
                  tom="discreta"
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
            {/* ⭐⭐ A ação PRINCIPAL do rodapé (15/09/2026). O ajuste de 14/09 acertou em tirar os
                quatro botões cinzentos iguais, mas o único que sobrou em destaque foi "Uma pista"
                — ou seja, o lugar mais visível da tela convidava a PEDIR AJUDA. No Brilliant
                aquele canto é sempre o caminho para a frente (Conferir → Continuar), e a ajuda é
                secundária. Aqui a cena se avalia sozinha o tempo todo, então o que faltava era o
                gesto de FECHAMENTO: dizer "já descobri" e ouvir o que ainda falta, nomeado como
                ação. Depois de concluída, o mesmo lugar vira o prêmio: ver a coisa inteira rodar
                de novo, com as descobertas guardadas. */}
            {!demoMode && (
              <SceneButton
                // ⚠️⚠️ É a ação em DESTAQUE da tela: "Já descobri" é o gesto de fechamento e "Ver
                // de novo" é o prêmio, um degrau abaixo. Sem o tom, os dois viravam botão de
                // ferramenta — a inversão de hierarquia que a dona apontou no print.
                tom={conclusao ? 'ligado' : 'gesto'}
                className={conclusao ? 'border-primary px-6 text-primary' : undefined}
                onClick={() => {
                  if (conclusao) {
                    setRunning(false)
                    setVeredito('')
                    dispatch({ type: 'reset' })
                    return
                  }
                  // Guarda só o PEDIDO: o texto sai do `result` vivo, senão o balão continuaria
                  // cobrando uma meta que a criança acabou de fechar.
                  setVeredito('pedido')
                }}
              >
                {conclusao ? (
                  <>
                    <Play size={16} />
                    Ver de novo
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    Já descobri
                  </>
                )}
              </SceneButton>
            )}
          </div>
          {/* ⚠️ A região existe SEMPRE: `aria-live` montada junto do texto não é anunciada de
              forma confiável — vários leitores só observam o que já estava na árvore. */}
          <p
            // A resposta do "Já descobri" fica num lugar só, e diz o que FAZER — o
            // `feedback` da avaliação é o rótulo da meta que ainda não aconteceu.
            className={
              veredito && !conclusao
                ? 'rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm'
                : 'sr-only'
            }
            aria-live="polite"
          >
            {veredito && !conclusao && (
              <>
                <span className="font-semibold">Ainda falta: </span>
                {result.feedback}
              </>
            )}
          </p>
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
        {/* ⭐⭐ O TERCEIRO tempo do ciclo (mexer → prever → ENUNCIAR a regra).
            ⚠️ Ela só aparece depois de a cena fechar: perguntar "por quê?" antes da descoberta é
            pedir adivinhação, e a régua do servidor é a mesma — enquanto a cena não fecha, a
            pergunta não reprova ninguém. ⚠️ Quem corrige é o SERVIDOR: o gabarito nunca chega ao
            navegador, então o que aparece depois de responder é o `feedback` que voltou de lá. */}
        {/* ⚠️⚠️ Contra o LATCH, não contra o `result.passed` vivo. Em `layers` e `jump-sound` o
            avaliador local volta a reprovar quando a criança mexe depois de concluir (a montagem
            precisa ficar ASSENTADA), e a pergunta SUMIA da tela — enquanto o cartão logo abaixo,
            que já usava o latch, seguia dizendo "a explicação fica logo acima". O bloco ficava
            intransponível até ela adivinhar que precisava recompor o arranjo. */}
        {content.checkpoint && conclusao && (
          <fieldset className="space-y-2 rounded-2xl border-2 border-primary/30 p-4">
            <legend className="px-1 text-xs font-bold uppercase tracking-[.14em] text-primary">
              Agora explique
            </legend>
            <p className="font-medium">{content.checkpoint.prompt}</p>
            {/* ⚠️ Depois de um F5 a escolha não volta: a sessão da cena é guardada em
                `answers.sceneCheckpoint`, e a resposta da pergunta viaja na TENTATIVA, que o
                members de propósito não deixa atropelar a sessão. Mostrar os rádios vazios E
                desabilitados era a pior saída das três — parecia que a resposta tinha sumido. */}
            {registered && !resposta ? (
              /* ⚠⚠ "Esta pergunta já está resolvida", e não "você já respondeu": desde que a
                 pergunta passou a ser HERDADA do modelo, todo bloco de cena concluído ANTES
                 disso cai aqui — e a criança que nunca viu pergunta nenhuma leria uma frase
                 sobre um gesto que ela não fez. A frase precisa ser verdadeira nos dois casos:
                 no da resposta perdida no F5 e no do bloco que fechou antes de a pergunta
                 existir. O que vale para os dois é que ela não espera mais nada. */
              <p role="status" className="rounded-xl bg-muted/50 p-3 text-sm">
                Esta pergunta já está resolvida.
              </p>
            ) : (
              content.checkpoint.choices.map((choice) => (
                <label
                  key={choice.id}
                  htmlFor={`${id}-pergunta-${choice.id}`}
                  className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-border p-3 has-checked:border-primary has-checked:bg-primary/10"
                >
                  <input
                    id={`${id}-pergunta-${choice.id}`}
                    type="radio"
                    name={`${id}-pergunta`}
                    className="accent-primary"
                    checked={resposta === choice.id}
                    // ⚠️ O conflito 409 trava o `flush` inteiro: sem isto os rádios ficavam
                    // clicáveis e MUDOS, enquanto o "Tentar salvar" do rodapé já estava desligado.
                    disabled={registered || conflict || !ready}
                    onChange={() => {
                      setResposta(choice.id)
                      setRespostaFeedback('')
                      // ⚠️ Id novo por RESPOSTA: o servidor reavalia a tentativa pelo checkpoint
                      // dele, e com o id fixo a primeira resposta errada seria devolvida para
                      // sempre pelo `findAttempt` — a criança acertaria e continuaria reprovada.
                      if (!registered) attemptId.current = crypto.randomUUID()
                      void flush.current(choice.id)
                    }}
                  />
                  {choice.label}
                </label>
              ))
            )}
            {/* ⚠️⚠️ A explicação do professor é o TERCEIRO tempo do ciclo, e ela chega aqui:
                acertando, o `feedback` que volta do servidor É o `explanation`. Com o guard de
                `!registered` ela nunca renderizava — a criança que ERRAVA recebia recado e a que
                ACERTAVA não recebia nada, com o incentivo invertido. A região existe sempre, com
                o texto por dentro: `aria-live` montada junto do conteúdo não anuncia. */}
            <p
              role="status"
              aria-live="polite"
              className={respostaFeedback ? 'rounded-xl bg-muted/50 p-3 text-sm' : 'sr-only'}
            >
              {respostaFeedback}
            </p>
          </fieldset>
        )}
        {conclusao && (
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <p className="font-semibold">{conclusao}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {/* ⚠️ Com pergunta anexa, a descoberta está feita mas o bloco NÃO está concluído —
                  quem dá a palavra final é o servidor (`withAttachedQuestion`). Dizer "concluiu"
                  aqui punha duas telas contando histórias diferentes: o cartão dava por encerrado
                  o que a seção continuava cobrando. */}
              {demoMode
                ? 'Você acompanhou o conceito em funcionamento.'
                : errou
                  ? 'A descoberta está feita. Falta acertar a frase que explica o que aconteceu.'
                  : pendente
                    ? 'Falta uma coisa: escolher a frase que explica o que aconteceu.'
                    : revendo
                      ? 'Você já fez esta descoberta. Agora está mexendo de novo, à vontade.'
                      : 'Você concluiu a investigação proposta nesta atividade.'}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {pendente
                ? errou
                  ? 'Você pode escolher outra: a pergunta fica logo acima.'
                  : 'A explicação fica logo acima.'
                : registered
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
