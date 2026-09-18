'use client'

import {
  evaluateLearning,
  type InteractiveBlock,
  type LearningAttemptView,
  type LearningBlockProgress,
  learningHints,
  type PublicInteractiveBlock,
} from '@sistemazero/core/learning'
import {
  type DemonstrationSession,
  type ExperimentSession,
  evaluateDemonstration,
  evaluateExperimentation,
  falaDaInstrucao,
  falasDaCena,
  SCENE_LIMITS,
  type SceneActivity,
  type SceneCast,
  type SceneCommand,
  type SceneEvent,
  type SceneHintStep,
  type SceneState,
  sceneClockShouldStop,
  sceneDefaultGoalIds,
  sceneEmitsSound,
  sceneGestureRunsClock,
  sceneGoals,
  sceneHint,
  sceneHintDone,
  sceneHintStep,
  sceneScript,
  sceneSetupGoals,
  sceneShowsComparison,
  sceneSituation,
  sceneSuccess,
  sceneTargets,
  sceneTrial,
  textoFalado,
} from '@sistemazero/core/learning/scene'
import {
  AlertTriangle,
  ArrowDown,
  Camera,
  Check,
  Eye,
  FlaskConical,
  Lightbulb,
  MonitorPlay,
  Pause,
  Play,
  RotateCcw,
  Undo2,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from 'react'
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
import { DialogueBlockView, type DialogueSpeech } from './dialogue-block'
import { ExperienceComparison } from './experience-scene'
import { ExplorationPieces } from './exploration-pieces'
import { ExplorationStage, SceneButton } from './exploration-stage'
import { useLessonPlayer } from './lesson-player-context'
import { useLessonPreview } from './lesson-preview-context'
import { tituloJaDito, useLessonSection } from './lesson-section-context'
import { RelogioDaArteProvider } from './scene-arte'
import { SceneConclusion, SceneRevisitBanner } from './scene-conclusion'
import { ConsoleFala, ConsoleMundo, ConsolePrancha, SceneConsole } from './scene-console'
import { MontagemTravada, rotuloDaDemonstracao, SceneDemoControls } from './scene-demo-controls'
import { SomDaBancada } from './scene-dino-controls'
import { botoesDoMundo, estadosDaCena, SceneReadoutBand } from './scene-frame'
import { LessonSceneControls } from './scene-lesson-controls'
import { LugarReservado } from './scene-lugar-reservado'
import {
  anuncioDaEscolha,
  apagarPalpite,
  fraseDoPalpite,
  guardarPalpite,
  lerPalpite,
  PalpiteContexto,
  PalpiteOpcoes,
  PalpitePergunta,
  ScenePrediction,
  vereditoDoPalpite,
} from './scene-prediction'
import { ScenePredictionPreview } from './scene-prediction-preview'
import { SceneSandbox } from './scene-sandbox'
import { estadoVistoDaCena, relogioDaCena, tempoDeLeitura, useSceneClock } from './use-scene-clock'

/**
 * O player das cenas de aula: experimentação e demonstração.
 *
 * O palpite vem antes da descoberta: a criança recebe contexto e uma prévia segura, formula a
 * hipótese e só então a cena completa, os controles e a instrução prática são montados. A escolha
 * pode ser trocada enquanto a criança ainda não fez um gesto na cena.
 * Na revisita, uma faixa "✓ Você já descobriu isto." que fala DELA e nunca do palco.
 *
 * As peças moram em arquivos próprios: `scene-prediction` (o palpite), `scene-conclusion` (a faixa
 * e a pergunta), `scene-demo-controls` (a demonstração guiada), `scene-sandbox` ("Agora é sua vez"),
 * `scene-frame` (a faixa de estado e os botões do mundo), `use-scene-clock` e `use-scene-voice`.
 */
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
  /** Roteiros estáticos da projeção pública; fala dinâmica fica inteira no plano B do navegador. */
  const falasFixasDoZappy = useMemo(() => falasDaCena(content), [content])
  const rehearsal = useLessonPreview()
  const secao = useLessonSection()
  const id = useId()
  /**
   * ⚠️⚠️ A MISSÃO RESTRITA sem pistas do professor (review do lote 2). A escada do modelo foi
   * escrita para as metas de FÁBRICA: no Dia 1 do Desafio, que cobra só "y maior leva para baixo",
   * a primeira pista mandava "Mexa só no x", e quem pedia ajuda ia para o eixo errado. Ali a escada
   * é UM degrau, tirado da meta que falta ("Tente: aumente só o y."), e nenhuma dica de meta que a
   * aula não cobra aparece. ⚠️ Só o player encolhe a escada: o members confere `hintsUsed` contra
   * os três degraus do modelo, e um a menos aqui nunca passa desse teto.
   */
  // ⚠️ Pela leitura tolerante (`sceneSetupGoals`): a meta que saiu do catálogo não conta como missão.
  const alvosDoProfessor =
    activity.type === 'experimentation'
      ? sceneSetupGoals(activity.scene, activity.setup?.goals)
      : undefined
  const missaoRestrita =
    content.hints.length === 0 &&
    Boolean(alvosDoProfessor?.length) &&
    !mesmoConjunto(alvosDoProfessor ?? [], sceneDefaultGoalIds(activity.scene))
  const hints = missaoRestrita ? [''] : learningHints({ activity, hints: content.hints })
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
  /**
   * ⚠️⚠️ O resultado que JÁ estava guardado quando a atividade abriu. É ele, e só ele, que separa a
   * REVISITA de uma chegada: congelado no primeiro render, para que concluir agora não transforme a
   * tela numa revisita no meio do gesto. O ensaio do admin entra junto (`results`): sem isso a
   * revisita do ensaio era diferente da do aluno, que é justamente o que ele existe para mostrar.
   */
  const [guardado] = useState(() => saved?.result ?? rehearsal?.results[block.id] ?? null)
  const demoMode = activity.type === 'demonstration'
  const revisita = Boolean(guardado?.passed) && !demoMode
  const [ready, setReady] = useState(!scope)
  const [running, setRunning] = useState(false)
  const [slow, setSlow] = useState(false)
  const [muted, setMuted] = useState(true)
  /**
   * ⚠️ O degrau da pista VOLTA do servidor no F5 (lote 2): era estado local, e a criança que tinha
   * lido "Pista 2 de 3" reabria a aula no degrau zero, enquanto a evidência guardada contava duas.
   */
  const [hint, setHint] = useState(() =>
    Math.min(hints.length, saved?.hintsUsed ?? rehearsal?.hintsUsed[block.id] ?? 0),
  )
  /**
   * A pista CONGELADA no clique, com as metas a que ela serve (full review de experiência, M1).
   *
   * ⚠️⚠️ A caixa era recalculada a cada gesto: a frase da situação na frente mudava, e o degrau de trás
   * continuava mandando fazer o que a criança tinha acabado de fazer ("Tela de 800 por 480, com a borda à
   * vista. … Aperte o botão da borda."). Congelada como o "Conferir", ela só muda no clique; quando o
   * degrau fica cumprido, vira "✓ Feito! Se precisar, peça outra pista.". Num F5 (o degrau volta do
   * servidor) não há clique: a caixa segue calculada com a cena de agora.
   */
  const [pistaCongelada, setPistaCongelada] = useState<{
    nivel: number
    passo: SceneHintStep
  } | null>(null)
  /**
   * O que o "Conferir" respondeu, CONGELADO no clique.
   *
   * ⚠️⚠️ Era calculado a cada render a partir das metas vivas, dentro de uma região `aria-live`. No
   * gesto que concluía, a região mudava por um quadro para "Ainda não." + a REGRA da cena, e quem usa
   * leitor de tela ouvia a resposta da pergunta (e um "Ainda não" que contradizia a conclusão) antes
   * de "Você descobriu!" (review do lote 2). Congelado, ele só muda no clique; e sai no gesto seguinte.
   */
  const [conferiu, setConferiu] = useState('')
  /**
   * ⭐ O TERCEIRO tempo do ciclo: mexer, prever e ENUNCIAR a regra.
   *
   * ⚠️ Diferente da previsão, esta pergunta VALE: é ela que dá a palavra final sobre o `passed`,
   * e quem corrige é o servidor (o gabarito nunca chega ao navegador). Por isso o que o player
   * mostra depois de responder é o `feedback` que voltou da tentativa, e não um veredito local.
   */
  const [resposta, setResposta] = useState('')
  const [respostaFeedback, setRespostaFeedback] = useState('')
  const [respostaCerta, setRespostaCerta] = useState<boolean | null>(null)
  /**
   * ⭐ A PREVISÃO: o que ela acha que vai acontecer, antes de mexer.
   *
   * ⚠️ Sobe junto da tentativa, mas NÃO entra no checkpoint da cena: o motor não sabe dela, e não
   * deve saber. Ela não decide nada. Mora no `localStorage` do perfil (ver `lerPalpite`).
   */
  const [prediction, setPrediction] = useState(() => lerPalpite(scope, content.prediction))
  /** Um aviso que NÃO é erro ("Continuamos de onde você parou."). */
  const [aviso, setAviso] = useState('')
  const [error, setError] = useState('')
  const [conflict, setConflict] = useState(false)
  const [compared, setCompared] = useState(false)
  const [registered, setRegistered] = useState(Boolean(guardado?.passed))
  /**
   * ⚠️⚠️ A frase do sucesso, VESTIDA pelo elenco, num lugar só (lote 1 do Raio-X). O efeito da
   * conclusão sobrescrevia o latch com o `result.feedback` cru do catálogo: numa turma de nave o
   * cartão dizia "É o mesmo Dino", ao vivo e depois do F5.
   */
  // ⚠️ `sceneSuccess` (consertos do review da onda A do lote 5): a missão restrita tem a frase dela.
  const fraseDeSucesso = demoMode
    ? 'Você viu tudo!'
    : sceneSuccess(activity.scene, activity.cast, sceneTargets(activity))
  /**
   * ⚠️⚠️ A conclusão é um LATCH, não um espelho de `result.passed`. Duas cenas (`layers` e
   * `jump-sound`) exigem que a montagem FIQUE no estado descoberto, então mexer depois de concluir
   * faz `passed` voltar a false. Concluir é um acontecimento; ele não se desfaz (o servidor também
   * nunca rebaixa). É o latch que libera a pergunta E o envio da tentativa.
   */
  const [conclusao, setConclusao] = useState(guardado?.passed ? fraseDeSucesso : '')
  const [reduced, setReduced] = useState(false)
  /** "Agora é sua vez": o estado final da demonstração, quando a bancada local está aberta. */
  const [suaVez, setSuaVez] = useState<SceneState | null>(null)
  const [avisoDescoberta, setAvisoDescoberta] = useState('')
  /**
   * O palpite retomado NO INSTANTE em que a cena responde, colado ao aviso da descoberta.
   * ⚠️ Some no gesto seguinte, como o aviso: a frase manda OLHAR algo que só é verdade agora
   * (review do lote 2). Lá em cima fica a linha no passado.
   */
  const [palpiteNaHora, setPalpiteNaHora] = useState('')
  /**
   * A resposta subiu com a cena FORA do estado descoberto e o servidor não a corrigiu (`layers` e
   * `jump-sound` pedem a montagem assentada). ⚠️ Não é resposta errada (review do lote 2).
   */
  const [aguardaCena, setAguardaCena] = useState(false)
  /** O servidor não registrou o que subiu sem pergunta (a demonstração, a cena sem pergunta). */
  const [recusado, setRecusado] = useState(false)
  /** A pergunta está à vista: o "Continuar ↓" só existe quando ela NÃO está. */
  const [perguntaVisivel, setPerguntaVisivel] = useState(false)
  const [anuncio, setAnuncio] = useState({ texto: '', vez: 0 })
  const [focar, setFocar] = useState<'pergunta' | 'faixa' | null>(null)
  const owner = useRef(Symbol('experience'))
  const audio = useRef<AudioContext | null>(null)
  const perguntaRef = useRef<HTMLLegendElement>(null)
  const faixaRef = useRef<HTMLParagraphElement>(null)
  const dialogoDoPalpiteRef = useRef<HTMLDivElement>(null)
  const dialogoDaDescobertaRef = useRef<HTMLDivElement>(null)
  const principalRef = useRef<HTMLButtonElement>(null)
  const focarPrincipal = useRef(false)
  /** Só os gestos de escolher ou trocar movem foco. Hidratação e revisita não interferem. */
  const focarDialogoDoPalpite = useRef(false)
  const focarDialogoDaDescoberta = useRef(false)
  /**
   * ⚠️⚠️ Houve GESTO dela nesta tela? Anunciar, mover o foco e mostrar "✓ Descoberta" só depois de
   * um gesto: num F5 o checkpoint volta com metas feitas, e roubar o foco (ou anunciar "Você
   * descobriu!") para quem só está chegando é mentir sobre o que acabou de acontecer.
   */
  const gesto = useRef(false)
  const concluiuAntes = useRef(Boolean(guardado?.passed))
  /** O tempo que a legenda de uma parte da demonstração inline já ficou na tela. */
  const espera = useRef(0)
  const fila = useRef<string[]>([])
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
  /** A mesma assinatura SEM o estado da montagem: uma resposta nova, ou só a montagem que mexeu. */
  const enviadoChave = useRef('')
  /** Quantas vezes a demonstração chegou ao FIM nesta tela: cada volta pode reenviar. */
  const vezesAteOFim = useRef(0)
  /** A escolha da pergunta que vale AGORA: a resposta de uma escolha anterior não pinta a nova. */
  const respostaAtual = useRef('')
  // ⚠️ O flush recebe a escolha da pergunta anexa por PARÂMETRO. Ele é reatribuído a cada
  // render, então o `flush.current` que o clique da opção alcança é o do render ANTERIOR —
  // com `resposta` ainda vazia. Sem o parâmetro, o envio imediato caía no guard e só a batida
  // de um segundo salvava, que é justamente o que ele existe para evitar.
  const flush = useRef<(escolha?: string) => Promise<void>>(async () => {})
  const action = useRef<(command: SceneCommand) => void>(() => {})
  const cacheKey = scope ? `${scope}:${tabId}` : null
  const base = player
    ? `/api/members/lessons/${encodeURIComponent(player.lessonId)}/blocks/${encodeURIComponent(block.id)}`
    : null
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
  /** O que a criança VÊ (`estadoVistoDaCena`): a prévia da `frames` parada com o relógio parado. */
  const visto = estadoVistoDaCena(m, state, running && ready && !conflict)
  // ⚠️⚠️ A lista ÚNICA do core (`SCENE_COMPARISONS`), a mesma que o admin lê para oferecer "Comparação"
  // (full review de 16/09/2026): duas cópias já tinham divergido DUAS vezes. Hoje só a `hitbox`: a
  // `impulse` guarda as duas marcas no próprio palco, e na `gravity` a comparação é o pulo pontilhado.
  const reference = sceneShowsComparison(m)
  const roteiro = sceneScript(activity)
  const demoStep = demo ? roteiro[demo.step] : null
  // ⚠️ As metas que ESTA atividade cobra: o `setup.goals` do professor, quando há. Sem isto o
  // player mostraria as três descobertas do modelo numa missão que só pede uma.
  const targets = sceneTargets(activity)
  // ⚠️ Com a `pilha` (full review de experiência, A1): na `layers` do Meu Jeito os pedidos falam do
  // painel Camadas do Pinta, e o "Conferir" repete o pedido.
  const result = demo
    ? evaluateDemonstration(demo.viewed)
    : evaluateExperimentation(activity.scene, state, true, activity.cast, targets, activity.pilha)
  const goals = sceneGoals(activity.scene, state, activity.cast, targets, activity.pilha)
  const feitas = goals.filter((g) => g.complete).length
  const temPergunta = Boolean(content.checkpoint)
  /** "Ligar som" só onde há som: a régua é do core (ver `sceneEmitsSound`). */
  const somDaCena = sceneEmitsSound(m)
  const bloqueado = !ready || conflict

  /**
   * O palpite: pendente, congelado ou retomado.
   *
   * ⚠️⚠️ O palpite NÃO tranca a REVISITA (lote 2): numa sessão nova a atividade concluída reabria
   * atrás de "escolha um palpite", e ali ela já sabia a resposta.
   */
  const palpite = content.prediction
  const previsaoPendente = Boolean(palpite) && !prediction && !revisita
  const revelado =
    Boolean(conclusao) ||
    (palpite?.revealOn ? state.evidence.discoveries.includes(palpite.revealOn) : false)
  // Trocar o palpite só antes de ver: nenhum gesto na cena e nenhuma meta caída.
  // ⚠️ `actions` conta também as PISTAS (cada clique é uma ação no motor): pedir ajuda não é ver,
  // e apagava o "trocar" (review do lote 2).
  const trocavel =
    !revelado &&
    !conclusao &&
    !gesto.current &&
    state.evidence.actions - state.evidence.hints <= 0 &&
    feitas === 0
  /**
   * ⚠️⚠️ Os avisos da descoberta NÃO reservam lugar no fluxo (full review de experiência, M2). O lugar
   * reservado dos consertos da onda B (T2) trocou um defeito que se via (a bancada pulava) por um vão
   * vazio de 36 a 140 px entre o palco e os botões, que parecia página quebrada: no celular o primeiro
   * controle da `world` ia para y 1129 numa janela de 900. Hoje os avisos são SOBREPOSTOS ao pé do palco
   * (`AvisosDaCena`), e a frase da situação continua sendo o único texto entre o palco e a bancada.
   */
  /** As frases de situação que a cena costuma atingir: o molde do lugar da frase (M3). */
  const situacoesDaCena = useMemo(
    () => estadosDaCena(activity).map((e) => sceneSituation(activity.scene, e, activity.cast)),
    [activity],
  )

  /**
   * A legenda da demonstração DEPOIS de ver, nunca antes (lote 2).
   *
   * ⚠️⚠️ Ela descreve o RESULTADO da parte, e aparecia desde a abertura: na `velocity` a legenda
   * dizia "Velocidade 5: a cada quadro ele anda" com a faixa marcando velocidade 0. Antes de tocar,
   * a parte 1 mostra a instrução do professor (que nunca aparecia) e as outras, um convite neutro.
   */
  const legendaDaDemonstracao = () => {
    if (!demo || !demoStep) return content.instructions
    if (demo.ready) return demoStep.caption
    if (demo.step === 0) return content.instructions
    // Na inline as partes emendam sozinhas: fica a legenda da parte que acabou de ser vista.
    if (inline) return roteiro[demo.step - 1]?.caption ?? content.instructions
    // ⚠️ O convite diz o NOME do botão (review do lote 2): "aperte ▶ e olhe" chegava à voz como
    // "aperte e olhe", sem o que apertar.
    // ⚠️ Com a bancada em destaque a parte mostra a MONTAGEM também (consertos do review da onda A do
    // lote 5): "olhe a cena" era o convite mesmo quando o que mudava era a peça.
    return running
      ? demoStep.highlight === 'tools'
        ? `Parte ${demo.step + 1}: olhe a montagem e a cena.`
        : `Parte ${demo.step + 1}: olhe a cena.`
      : `Parte ${demo.step + 1}: é só apertar ${rotuloDaDemonstracao(demo, roteiro.length, false).texto}.`
  }
  // ⚠️ Na bancada do "Agora é sua vez" a instrução é a DELA: a legenda da última parte ficava
  // sobre a bancada que ela estava mexendo (review do lote 2).
  const instruction = suaVez
    ? 'Sua vez! Mexa à vontade. Aqui é só para brincar.'
    : demoMode
      ? legendaDaDemonstracao()
      : content.instructions
  /**
   * Cada etapa recebe seu próprio balão e sua própria fila de voz. O app Kids acrescenta o
   * mascote; fora dele o mesmo diálogo continua legível e falável sem duplicar a semântica.
   */
  const renderDialogue = (text: string, speech: DialogueSpeech) => {
    /**
     * A fala só recebe MP3 se continua sendo exatamente a fala estática gerada na autoria. Uma
     * legenda de parte, pista ou convite montado durante a cena pode mudar com o estado e nunca
     * pode reutilizar um áudio antigo só porque se parece com uma instrução.
     */
    const roteiro =
      speech.texts.length === 1
        ? falasFixasDoZappy.find((fala) => fala.visibleText === textoFalado(speech.texts[0] ?? ''))
            ?.speechText
        : undefined
    const fala = { ...speech, vozes: activity.vozes, roteiros: roteiro ? [roteiro] : undefined }
    if (player?.renderInstruction) return player.renderInstruction(text, 'speaking', fala)
    return <DialogueBlockView content={{ kind: 'dialogue', text }} speech={fala} />
  }
  /**
   * O degrau `nivel` da escada, com a cena de AGORA: o texto e as metas a que ele serve (M1). A pista do
   * professor não sabe a que meta serve (`metas` vazio): ela nunca vira "Feito".
   */
  const passoDaPista = (nivel: number): SceneHintStep => {
    if (!nivel) return { texto: '', metas: [] }
    if (content.hints.length) return { texto: hints[nivel - 1] ?? '', metas: [] }
    if (missaoRestrita) {
      const falta = goals.find((g) => !g.complete)
      const situacao = sceneSituation(activity.scene, visto, activity.cast).trim()
      if (falta?.pedido)
        return {
          texto: `${situacao ? `${situacao} ` : ''}Tente: ${minusculaInicial(falta.pedido, activity.cast)}`,
          metas: [falta.id],
        }
    }
    return sceneHintStep(activity.scene, visto, nivel, activity.cast, activity.pilha)
  }
  // ⚠️ A instrução NÃO é substituída pela pista (14/09/2026): quem pede ajuda é quem vai relê-la.
  // ⚠️ A caixa mostra a pista CONGELADA no clique (M1), e "✓ Feito!" quando o degrau dela foi cumprido.
  const pistaDaCaixa =
    pistaCongelada && pistaCongelada.nivel === hint ? pistaCongelada.passo : passoDaPista(hint)
  const pistaFeita = Boolean(hint) && sceneHintDone(pistaDaCaixa, state)
  const hintText = pistaFeita
    ? hint >= hints.length
      ? '✓ Feito!'
      : PISTA_FEITA
    : pistaDaCaixa.texto

  /**
   * ⚠️ Anúncios da MOLDURA numa região própria, sempre montada: só acontecimentos ("Descoberta 1
   * de 2.", "Você descobriu! Agora responda a pergunta."). A frase de situação continua sendo o
   * narrador do mundo. Dois anúncios no mesmo gesto (o palpite retomado e a descoberta) saem juntos,
   * numa fala só: a segunda atualização atropelaria a primeira antes de o leitor terminar.
   */
  const anunciar = (texto: string) => {
    if (!texto) return
    fila.current.push(texto)
    if (fila.current.length > 1) return
    queueMicrotask(() => {
      const falas = fila.current.join(' ')
      fila.current = []
      setAnuncio((a) => ({ texto: falas, vez: a.vez + 1 }))
    })
  }

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => {
      setReduced(media.matches)
      if (media.matches) setRunning(false)
    }
    update()
    media.addEventListener('change', update)
    const unregister = registerLessonMedia(owner.current, () => {
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
    const alvo = previsaoPendente
      ? focarDialogoDoPalpite.current
        ? dialogoDoPalpiteRef.current
        : null
      : focarDialogoDaDescoberta.current
        ? dialogoDaDescobertaRef.current
        : null
    if (!alvo) return
    focarDialogoDoPalpite.current = false
    focarDialogoDaDescoberta.current = false
    alvo.focus({ preventScroll: true })
  }, [previsaoPendente])
  useEffect(() => {
    if (!cacheKey) return
    let mounted = true
    void readSceneDraft(cacheKey)
      .then(async (draft) => {
        if (mounted && draft && !controller.restore(draft)) {
          await archiveSceneDraft(cacheKey, draft)
          // ⚠️ Sem inventar a causa (outra aba, um fechar de aba no meio do envio…) e sem tom de
          // erro: para a criança o que importa é que nada se perdeu.
          if (mounted) setAviso('Continuamos de onde você parou.')
        }
      })
      // ⚠️ Sem armazenamento local (aba privada): a gravação na conta continua, e isso não é
      // assunto da criança (lote 2). Mostrar "o navegador não permitiu guardar uma cópia local"
      // só assustava.
      .catch(() => {})
      .finally(() => {
        if (mounted) setReady(true)
      })
    return () => {
      mounted = false
    }
  }, [cacheKey, controller])

  /** O bipe do salto, nas cenas que fazem som (a bancada do "Agora é sua vez" também toca). */
  const tocarSom = (events: readonly SceneEvent[]) => {
    if (
      somDaCena &&
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
  action.current = (command) => {
    // ⚠️ SEM `result.passed` aqui (14/09/2026): cumprir o objetivo não encerra a cena. Quem
    // registra a conclusão é o `flush`, uma vez só; continuar mexendo nunca a desfaz.
    // ⚠️⚠️ COM o palpite (review do lote 2): o `fieldset disabled` não alcança o gesto DIRETO no
    // desenho (o Dino é um `<g role="button">` que pula no toque e no Espaço, o cacto se arrasta),
    // e na Aula 3 a criança via a resposta antes de escolher. A trava mora no ponto único dos gestos.
    if (!ready || conflict || previsaoPendente) return
    tocarSom(controller.dispatch(command))
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
      setError('O som não ligou neste aparelho.')
    }
  }
  const dispatch = (command: SceneCommand) => {
    // ⚠️ Recusado ANTES de marcar o gesto: um "Recomeçar" que não chega à cena não pode apagar o
    // "trocar" do palpite.
    if (!ready || conflict || previsaoPendente) return
    action.current(command)
    // ⚠️ `hint` não é gesto na cena: pedir uma pista não pode apagar o aviso de uma descoberta,
    // nem congelar o palpite.
    if (command.type !== 'hint') {
      gesto.current = true
      setAvisoDescoberta('')
      setPalpiteNaHora('')
      setConferiu('')
      setAviso('')
    }
    // ⚠️⚠️ O que o gesto faz com o ▶ é régua do CORE, a mesma do "Agora é sua vez"
    // (`sceneGestureRunsClock`): pular solta o tempo também com menos movimento (sem isso a Aula 3
    // deixava o Dino parado no chão), ligar um fio com o Dino no ar solta, desligar a gravidade acima
    // do topo para, e o toque que começa a partida da `restart` e da `score` solta.
    const relogio = sceneGestureRunsClock(m, command, controller.getSnapshot().state)
    if (relogio !== null) setRunning(relogio)
  }
  // Soltar o tempo também é gesto: a descoberta que o relógio traz é dela.
  useEffect(() => {
    if (running) gesto.current = true
  }, [running])
  useEffect(() => {
    if (
      ready &&
      demoMode &&
      !(controller.getSnapshot() as DemonstrationSession).viewed &&
      controller.getSnapshot().state.evidence.actions === 0
    )
      controller.dispatch({ type: 'start' })
  }, [ready, demoMode, controller])

  // ── Os acontecimentos, na ordem em que são anunciados ─────────────────────────────────
  // ⚠️ A ordem dos efeitos É a ordem da fala: o palpite retomado, a descoberta, a conclusão.
  const reveladoAntes = useRef(revelado)
  useEffect(() => {
    const antes = reveladoAntes.current
    reveladoAntes.current = revelado
    if (!revelado || antes || !palpite || !prediction || !gesto.current) return
    const frase = fraseDoPalpite(palpite, prediction)
    setPalpiteNaHora(frase)
    anunciar(frase)
  })
  const feitasAntes = useRef(feitas)
  useEffect(() => {
    const antes = feitasAntes.current
    feitasAntes.current = feitas
    // ⚠️ "✓ Descoberta N de M" só DEPOIS do gesto e nunca antes: é a meta caindo agora. A que
    // fecha a cena fica com o anúncio da conclusão, que diz mais.
    if (demoMode || feitas <= antes || !gesto.current || result.passed) return
    const texto = `Descoberta ${feitas} de ${goals.length}`
    // A resposta do "Conferir" era sobre a meta que ACABOU de cair: ela sai, e o aviso entra.
    setConferiu('')
    setAvisoDescoberta(texto)
    // ⚠️ Com o relógio andando a frase da situação não é região viva (ela mudaria a cada fatia), e o
    // anúncio dizia "Descoberta 2 de 4." sem dizer o quê (full review de experiência, B7): ele leva a frase.
    anunciar(
      running ? `${texto}: ${sceneSituation(activity.scene, visto, activity.cast)}` : `${texto}.`,
    )
  })
  // ⚠️ Os avisos sobre o palco SAEM sozinhos (full review de experiência, M2): parados ali, cobririam um
  // pedaço do desenho até o próximo gesto.
  useEffect(() => {
    if (!avisoDescoberta) return
    const t = setTimeout(() => setAvisoDescoberta(''), SELO_MS)
    return () => clearTimeout(t)
  }, [avisoDescoberta])
  useEffect(() => {
    if (!palpiteNaHora) return
    const t = setTimeout(() => setPalpiteNaHora(''), tempoDoPalpite(palpiteNaHora))
    return () => clearTimeout(t)
  }, [palpiteNaHora])
  /**
   * ⚠️ Enquanto o relógio anda, a frase da situação NÃO é região viva (review do lote 2): ela muda a
   * cada tique, e quem usa leitor de tela recebia vinte frases por segundo ("o Dino foi de 60 para
   * 62", "…65"…). Quando o relógio PARA, a frase final é dita uma vez.
   */
  const tocavaAntes = useRef(running)
  useEffect(() => {
    const antes = tocavaAntes.current
    tocavaAntes.current = running
    if (antes && !running) anunciar(sceneSituation(activity.scene, visto, activity.cast))
  })
  const fimAntes = useRef(false)
  useEffect(() => {
    const fim = Boolean(demo?.ready && demo.step >= roteiro.length - 1)
    if (fim && !fimAntes.current) vezesAteOFim.current += 1
    fimAntes.current = fim
  })
  // ⚠️ A legenda de uma parte NÃO passa pela região de anúncios: a caixa da instrução já é
  // `aria-live` e troca para a legenda quando a parte termina. Anunciar pelas duas falaria duas vezes.
  // biome-ignore lint/correctness/useExhaustiveDependencies: roda na CONCLUSÃO, e não a cada anúncio ou render
  useEffect(() => {
    if (!result.passed) return
    const primeira = !concluiuAntes.current
    concluiuAntes.current = true
    setConclusao(fraseDeSucesso)
    /**
     * ⚠️⚠️ Concluir NÃO para o relógio (consertos do review da onda B do lote 5, T1). Aqui havia um
     * `setRunning(false)` da época em que concluir ENCERRAVA a experimentação (`c0983e06`, antes da cena
     * viva de 14/09). Nas cenas em que o mundo anda sozinho a última meta cai no PRIMEIRO quadro do que a
     * criança devia olhar, e a cena congelava ali, na hora do "Agora explique": o anel da `group-loop`
     * pulava uma vez e parava em 0,25 s, a `contact` ficava em "encostando há 1 quadro", os tiros da
     * `cooldown` paravam no ar. O relógio agora só para pelo que já o parava: o ▶ dela, o salto que
     * pousa, a aba escondida, outra mídia da aula e o conflito de gravação.
     * ⚠️ Sem lista de cenas: o congelamento era o mesmo em toda cena com tempo, e a lista à mão é
     * justamente o que esta moldura aprendeu a não escrever.
     */
    if (primeira && gesto.current) {
      if (demoMode) anunciar('Você viu tudo!')
      else {
        // ⚠️⚠️ O foco vai para a pergunta depois do gesto que conclui (nunca num F5). Antes ele
        // ficava no fio que ela tinha acabado de ligar, e a pergunta nascia ~600px abaixo, sem aviso.
        anunciar(
          content.checkpoint ? 'Você descobriu! Agora responda a pergunta.' : 'Você descobriu!',
        )
        setFocar(content.checkpoint ? 'pergunta' : 'faixa')
      }
    }
    // ⚠️ Fechar a atividade grava NA HORA, sem esperar a batida de um segundo: um segundo de
    // "guardando" depois de ver "concluído" é tempo em que ela fecha a aba e perde o registro.
    void flush.current()
  }, [demoMode, result.passed, fraseDeSucesso])
  useEffect(() => {
    if (!focar) return
    const alvo = focar === 'pergunta' ? perguntaRef.current : faixaRef.current
    if (!alvo) return
    alvo.focus({ preventScroll: true })
    // ⚠️⚠️ Rola só o NECESSÁRIO, e só se a pergunta está fora da janela (review do lote 2). Com
    // `block: 'center'` a tela andava sempre, e o próximo toque de quem tocava em série caía numa
    // OPÇÃO da pergunta, no mesmo ponto da tela (a pergunta também ignora o toque dos primeiros
    // instantes: `TEMPO_PARA_LER_A_PERGUNTA_MS`).
    if (!estaNaJanela(alvo))
      alvo.scrollIntoView?.({ behavior: reduced ? 'auto' : 'smooth', block: 'nearest' })
    setFocar(null)
  })
  // O "Continuar ↓" pergunta se a pergunta está à vista (sem observador, ele aparece).
  // biome-ignore lint/correctness/useExhaustiveDependencies: a pergunta nasce com a conclusão
  useEffect(() => {
    const alvo = perguntaRef.current
    if (!alvo || typeof IntersectionObserver === 'undefined') {
      setPerguntaVisivel(false)
      return
    }
    const observador = new IntersectionObserver(
      ([visto]) => setPerguntaVisivel(Boolean(visto?.isIntersecting)),
      { threshold: 1 },
    )
    observador.observe(alvo)
    return () => observador.disconnect()
  }, [Boolean(conclusao), registered])
  useEffect(() => {
    if (!focarPrincipal.current || !principalRef.current) return
    focarPrincipal.current = false
    principalRef.current.focus({ preventScroll: true })
  })

  /**
   * ⚠️⚠️ O servidor RECUSOU o que este player produz (full review final de dados e deploy, MÉDIO-1).
   *
   * Um 400/422 numa gravação de cena não é falha de rede: tentar de novo não resolve, e "Sem
   * internet… a gente guarda quando voltar" prometia o que nunca acontece. A cena para, a conclusão
   * que o servidor recusou sai da tela e a saída é o "Abrir de novo". Sem "versão" no texto (lote 2):
   * para a criança, a atividade mudou.
   */
  const servidorRecusou = () => {
    setConflict(true)
    setRunning(false)
    if (!demoMode) setConclusao('')
    setError(ATIVIDADE_MUDOU)
  }

  /** O que volta da correção (servidor ou ensaio), pintado na tela. */
  const aplicarResultado = (
    resultado: { passed: boolean; feedback: string },
    escolhida: string,
    assentada: boolean,
  ) => {
    if (!content.checkpoint || !escolhida) {
      setRegistered(resultado.passed)
      setRecusado(!resultado.passed)
      return
    }
    // ⚠️ Uma resposta ANTERIOR que chega depois de ela escolher outra não pinta a nova de âmbar: a
    // próxima batida manda a escolha de agora. Uma anterior que PASSOU vale (o servidor guardou).
    if (respostaAtual.current !== escolhida && !resultado.passed) return
    setRegistered(resultado.passed)
    if (resultado.passed && respostaAtual.current !== escolhida) {
      respostaAtual.current = escolhida
      setResposta(escolhida)
    }
    if (!resultado.passed && !assentada) {
      setAguardaCena(true)
      setRespostaFeedback('')
      setRespostaCerta(null)
      return
    }
    setAguardaCena(false)
    setRespostaFeedback(resultado.feedback)
    setRespostaCerta(resultado.passed)
  }

  flush.current = async (escolha?: string) => {
    if (!ready || conflict) return
    if (saving.current) {
      // ⚠️ Cópia local que não grava não é assunto da criança: a conta segue guardando.
      if (cacheKey) await writeSceneDraft(cacheKey, controller.draft()).catch(() => {})
      return
    }
    saving.current = true
    const escolhida = escolha ?? resposta
    // ⚠️⚠️ O envio olha o LATCH, não o `result.passed` vivo — o mesmo que a pergunta anexa usa
    // para aparecer. Em `layers` e `jump-sound` o avaliador volta a reprovar quando a montagem sai
    // do estado descoberto, e a criança respondia a pergunta depois de "Recomeçar" sem que nenhuma
    // requisição saísse.
    const descobriu = Boolean(conclusao) || result.passed
    try {
      // Persist the retry identifier BEFORE the request. A lost response must not create a new command.
      const segment = controller.segment()
      if (cacheKey) await writeSceneDraft(cacheKey, controller.draft()).catch(() => {})
      if (!base || !player) {
        // ⚠️ O registro da tentativa NÃO pode depender de haver comando novo. O `previewConfirm`
        // já consumiu os pendentes na primeira ida; se ela falhou, na segunda não sobra segmento
        // e o botão "Tentar salvar" virava um clique morto.
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
          // ⚠️⚠️ As MESMAS respostas do caminho com servidor, com a escolha da pergunta junto.
          const respostas = {
            ...controller.answers(),
            ...(prediction ? { prediction } : {}),
            ...(escolhida ? { checkpoint: escolhida } : {}),
          }
          // ⚠️⚠️ Sem ensaio em volta, o avaliador de VERDADE (lote 2). A prévia sem provedor dava
          // `registered = true` a qualquer resposta: o professor que testava ali concluía que toda
          // opção passava e nunca lia a explicação que ele mesmo escreveu.
          const assentada = result.passed
          const avaliado = rehearsal
            ? await rehearsal.onAttempt(block.id, previewContent, respostas)
            : evaluateLearning(previewContent, respostas)
          aplicarResultado(avaliado, escolhida, assentada)
        }
        return
      }
      if (segment) {
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
      // ⚠️ Quem decide é o avaliador DO TIPO (`result`), não o da experimentação: em `jump-sound` e
      // `controls` o roteiro do modelo termina SEM fechar as metas.
      // ⚠️⚠️ A assinatura leva também o ESTADO DA MONTAGEM (review do lote 2): em `layers` e
      // `jump-sound`, a resposta certa dada depois de "Recomeçar" subia com a cena desfeita e o
      // servidor a recusava. Remontar não mudava "escolha|descobertas", e nada era reenviado. ⚠️ E
      // com a montagem desfeita só uma RESPOSTA NOVA sobe: mexer de novo não repete a tentativa.
      // ⚠️ Na demonstração, cada volta até o fim é uma assinatura nova: o servidor que recusou uma
      // vez (janela de deploy) ganha outra chance quando ela vê tudo de novo.
      const assentada = result.passed
      const chave = demoMode
        ? String(vezesAteOFim.current)
        : `${escolhida}|${state.evidence.discoveries.join(',')}`
      const assinatura = `${chave}|${assentada ? 1 : 0}`
      if (
        !registered &&
        descobriu &&
        (!content.checkpoint || escolhida) &&
        enviado.current !== assinatura &&
        (assentada || enviadoChave.current !== chave)
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
        // ⚠️⚠️ O carimbo é gravado DEPOIS da resposta, nunca antes: carimbado antes do `await`, uma
        // falha de rede o deixava igual à assinatura para sempre, e a criança ficava presa sem
        // nenhuma nova tentativa de envio. O POST é idempotente pelo `attemptId`.
        enviado.current = assinatura
        enviadoChave.current = chave
        // Com pergunta anexa, é o servidor quem diz se a frase escolhida explica o que aconteceu.
        aplicarResultado(response.attempt.result, escolhida, assentada)
        // ⚠️ Nas duas cenas que pedem montagem ASSENTADA, a criança pode mexer antes de o registro
        // subir e o servidor gravar `passed:false`. Com o id fixo, `findAttempt` devolveria essa
        // mesma tentativa para sempre: um id novo só DEPOIS da resposta.
        if (!response.attempt.result.passed) attemptId.current = crypto.randomUUID()
        player.onLearningProgress?.(response.progress)
        player.refreshAfterLearning?.()
      }
      // ⚠️ Com `.catch()`: sem IndexedDB (aba privada) a cópia local derrubava o resto do bloco.
      if (cacheKey) await writeSceneDraft(cacheKey, controller.draft()).catch(() => {})
      setError('')
    } catch (e) {
      const status = typeof e === 'object' && e !== null && 'status' in e ? e.status : undefined
      if (status === 409) {
        setConflict(true)
        setRunning(false)
        // ⚠️ Curto e sem "aba", "versão" ou "cópia deste navegador" (lote 2): a saída é um botão.
        // ⚠️ "mudou ou" (full review final de dados e deploy, BAIXO-6): depois de um deploy o 409 é
        // quase sempre revisão nova do bloco (reimportação) ou regra nova, e não outra aba.
        setError('Esta atividade mudou ou está aberta em outro lugar.')
      } else if (player && (status === 400 || status === 422)) {
        // ⚠️⚠️ Pedido mal formado ou grande demais: tentar de novo não resolve (MÉDIO-1).
        servidorRecusou()
      } else if (!player) {
        // ⚠️ No ensaio de autoria não existe conexão a aguardar: a falha veio do próprio ensaio (o
        // professor pediu "falhar na próxima confirmação") ou do avaliador.
        setError(
          e instanceof Error && e.message
            ? e.message
            : 'Não foi possível registrar este resultado na prévia.',
        )
      } else {
        setError('Sem internet agora. Pode continuar: a gente guarda quando voltar.')
      }
    } finally {
      saving.current = false
    }
  }

  /**
   * O botão principal da demonstração guiada: "Ver a parte N", "Pausar", "Ver tudo de novo".
   *
   * ⚠️⚠️ Menos movimento COERENTE (lote 2): antes "Observar" animava mesmo com
   * `prefers-reduced-motion`, e "Próxima etapa" e "Rever desde o começo" não tocavam nada. Hoje
   * nenhum botão deixa de tocar.
   * ⚠️⚠️ E com menos movimento a parte TOCA, em passos de 0,2 s (`relogioDaCena`), em vez de saltar
   * para o fim (review do lote 2). Aplicada de uma vez, a parte 3 da `frames` dizia "trocando
   * devagar, dá para ver que são dois" sobre UM quadro parado, e o palpite "conferia" uma troca que
   * nunca aconteceu na frente dela. Trocar um quadro por segundo não é o movimento que a preferência
   * evita; o que some é a suavidade.
   */
  const principalDaDemonstracao = () => {
    gesto.current = true
    if (running) {
      setRunning(false)
      return
    }
    const atual = controller.getSnapshot() as DemonstrationSession
    if (atual.ready && atual.step >= roteiro.length - 1) action.current({ type: 'start' })
    else if (atual.ready) action.current({ type: 'next' })
    espera.current = 0
    setRunning(true)
  }
  const botoesDaCena = [
    ...botoesDoMundo({
      scene: m,
      tocando: running,
      lento: slow,
      onTocar: () => setRunning((v) => !v),
      onLento: () => setSlow((v) => !v),
      dispatch,
      gestoEmDestaque: !(conclusao && temPergunta && !registered && !revisita),
    }),
  ]
  /**
   * "Guardar este jeito" DEPOIS das medidas (full review de experiência, B14): na `hitbox` ele era o
   * primeiro controle da bancada, e o Tab e o olho chegavam nele antes da Distância e da área, que são a
   * tarefa. Peso de ferramenta discreta (consertos do review da onda A do lote 5).
   */
  const guardarEsteJeito = reference ? (
    <SceneButton
      tom="discreta"
      onClick={() => {
        dispatch({ type: 'capture' })
        setCompared(true)
      }}
    >
      <Camera size={16} aria-hidden />
      Guardar este jeito
    </SceneButton>
  ) : null

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
  /**
   * De quanto em quanto tempo o ▶ manda um tique.
   *
   * ⚠️⚠️ Com MENOS MOVIMENTO, o relógio anda em passos de 0,2 s: a cena continua acontecendo, aos
   * saltos visíveis. ⚠️ Não é mais por cena (lote 4 do Raio-X): o `draw-loop` tinha uma ponte de
   * 0,25 s aqui, e hoje o motor conta os quadros no ritmo da cena qualquer que seja a fatia.
   * ⚠️ A exceção é a prévia da `frames` com menos movimento (`relogioDaCena`, consertos do review da
   * onda B do lote 5): uma fatia do tamanho de UM quadro da animação.
   */
  const relogio = relogioDaCena(m, state, reduced)
  /**
   * O relógio da ARTE: quanto a cena já andou, em milissegundos.
   *
   * ⭐⭐ É o que faz as perninhas do Dino correrem e a chama pulsar (decisão dela: "anda só quando
   * o tempo da cena anda"). Anda no MESMO tique que move o mundo, então não há um segundo laço:
   * o palco já re-renderiza ali, e o número entra de carona nesse render.
   * ⚠️ Ele NÃO é estado da cena: é apresentação, e o motor não sabe que existe. Pôr um contador de
   * tempo no `SceneState` obrigaria hidratação, validação, clone e `esquecerOGesto` a conhecê-lo —
   * cinco pontos de contrato para um Dino que mexe a perna.
   */
  const [tempoDaArte, setTempoDaArte] = useState(0)
  useSceneClock({
    ativo: running && ready && !conflict,
    limiar: relogio.limiar,
    exato: relogio.exato,
    lento: slow,
    onTick: (elapsed) => {
      const current = controller.getSnapshot()
      // Numa demonstração o relógio serve ao roteiro; numa experimentação, ao mundo.
      if (demoMode && (current as DemonstrationSession).ready) {
        const parte = current as DemonstrationSession
        // ⭐ Na INLINE não há "Ver a parte N": o ▶ emenda as partes. ⚠️ Cada uma SEGURA pelo tempo
        // de leitura da legenda antes de a próxima tocar (lote 2).
        if (!inline || parte.step >= roteiro.length - 1) {
          setRunning(false)
          return false
        }
        espera.current += elapsed
        if (espera.current < tempoDeLeitura(roteiro[parte.step]?.caption ?? '')) return true
        espera.current = 0
        action.current({ type: 'next' })
      }
      setTempoDaArte((v) => v + elapsed * 1000)
      const antesDoTique = controller.getSnapshot().state
      action.current(
        demoMode ? { type: 'tick', seconds: elapsed } : { type: 'advance', seconds: elapsed },
      )
      // ⚠️⚠️ Parar o ▶ em vez de rodar à toa é régua do CORE, a mesma do "Agora é sua vez"
      // (`sceneClockShouldStop`): o salto acabou (ou nem começou), o Dino sem gravidade passou do alto do
      // palco (parado ali, a criança liga a gravidade e vê o Dino voltar), ou a `circle-collision` bateu.
      if (!demoMode && sceneClockShouldStop(m, antesDoTique, controller.getSnapshot().state)) {
        setRunning(false)
        return false
      }
      return true
    },
  })

  /** "Conferir": responde com o que FAZER, nunca com a conclusão da meta. */
  const respostaDoConferir = () => {
    const falta = goals.find((g) => !g.complete)
    // ⚠️⚠️ Metas feitas e cena SEM concluir (consertos do review da onda A do lote 5): na `layers` e na
    // `jump-sound` a montagem precisa ficar no arranjo do jogo, e o "Conferir" não dizia nada. O avaliador
    // já sabe o gesto (`pedidoDoArranjo`), e é ele que responde, nunca a regra.
    if (!falta && !result.passed && result.feedback)
      return `Ainda não. Tente: ${minusculaInicial(result.feedback, activity.cast)}`
    // ⚠️ Sem meta faltando não há o que conferir (e a REGRA da cena nunca sai por aqui).
    if (!falta) return ''
    // ⚠️⚠️ O `pedido` (o gesto), e NUNCA o `label` (a conclusão): "Ainda falta: Dino existe sem
    // aparecer" entregava a descoberta a quem apertava o botão maior da tela. Meta sem pedido cai
    // na primeira pista, que diz onde ela está e o que tentar.
    if (falta.pedido) return `Ainda não. Tente: ${minusculaInicial(falta.pedido, activity.cast)}`
    return `Ainda não. ${sceneHint(m, state, 1, activity.cast, activity.pilha)}`
  }
  const podeContinuar = Boolean(conclusao) && !revisita && temPergunta && !registered
  const fimDaDemonstracao = Boolean(demo?.ready && demo.step >= roteiro.length - 1)
  /** A inline parou NO MEIO do roteiro (pausada): o botão continua dali. */
  const inlineNoMeio = Boolean(
    demo && !fimDaDemonstracao && (demo.step > 0 || demo.action > 0 || demo.elapsed > 0),
  )
  const rodape = !scope
    ? 'Prévia: nada é guardado.'
    : !ready
      ? 'Abrindo…'
      : // ⚠️ Na bancada do "Agora é sua vez" nada é guardado, e "✓ Guardado" embaixo dela mentia.
        conflict || error || suaVez
        ? ''
        : aviso ||
          (conclusao && registered
            ? '✓ Guardado'
            : conclusao && recusado
              ? // ⚠️ "Guardando…" para sempre mentia quando o servidor recusou (review do lote 2).
                demoMode
                ? 'Ainda não ficou guardado. Veja de novo até o fim.'
                : 'Ainda não ficou guardado.'
              : conclusao && !aguardaCena && (!temPergunta || (resposta && respostaCerta === null))
                ? 'Guardando…'
                : '')
  const anelDaCena = running && demoStep?.highlight === 'scene'
  /**
   * ⚠️⚠️ "Ligar som" só nas cenas que FAZEM som (a régua do core), e fora de qualquer `fieldset`:
   * num conflito de gravação ele morria junto com a cena. Sem `aria-pressed` (lote 2): o rótulo já
   * diz a próxima ação, e as duas camadas diziam coisas diferentes ("Silenciar, botão, pressionado").
   */
  /** Na experimentação da cena do som, ele é uma chave da bancada (`SomDaBancada`). */
  const somNaBancada = somDaCena && !demoMode
  const botaoDeSom = somDaCena ? (
    <SceneButton tom="discreta" onClick={() => void enableSound()}>
      {muted ? <VolumeX size={16} aria-hidden /> : <Volume2 size={16} aria-hidden />}
      {muted ? 'Ligar som' : 'Silenciar'}
    </SceneButton>
  ) : null

  /**
   * A fala do Zappy com a instrução.
   *
   * ⚠️⚠️ É uma const porque ela aparece em DOIS lugares mutuamente exclusivos: dentro do console
   * (a experimentação e a demonstração) e acima do "Agora é sua vez", que NÃO tem instrução
   * própria de propósito (`scene-sandbox.tsx`: "quem diz 'Sua vez!' é a caixa da INSTRUÇÃO").
   * Duplicar o JSX duplicaria o `dialogoDaDescobertaRef`, que é alvo de foco.
   */
  const blocoDaInstrucao = (
    <div ref={dialogoDaDescobertaRef} tabIndex={-1} className="outline-none">
      {renderDialogue(instruction, {
        texts: [falaDaInstrucao(instruction)],
        audioUrl: activity.instructionAudioUrl,
        fallbackToBrowser: true,
      })}
    </div>
  )

  /**
   * O HUD e a PRANCHA são os mesmos nos dois momentos do console — o palpite e a experiência —,
   * então moram aqui e não em cada ramo: duplicar o JSX faria as duas telas divergirem no
   * primeiro conserto.
   */
  const hudDaCena = (
    <SceneReadoutBand
      activity={activity}
      state={visto}
      colada
      relogioAndando={running && ready && !conflict}
      valoresEscondidos={previsaoPendente}
      placa={
        /* ⚠️⚠️ A PLACA do palpite (achado do review deste lote): o cartão de palpite que o
              console substituiu tinha uma legenda à vista dizendo "Seu palpite" / "Antes de
              assistir", e ela ficou pelo caminho — a criança via um balão do Zappy e duas opções,
              sem nada que dissesse em que momento da atividade ela estava. Aqui ela é a pílula do
              começo da faixa, que é onde a maquete a pôs. */
        previsaoPendente ? (
          <span className="sz-scene-placa sz-scene-placa--palpite">
            {demoMode ? 'Antes de assistir' : 'Seu palpite'}
          </span>
        ) : null
      }
    >
      {!demoMode && !previsaoPendente && (
        /* ⚠️ UM medidor, não uma insígnia por meta. ⚠️ Sem `title` nas bolinhas
             (lote 2): no mouse o tooltip mostrava o rótulo da meta, que é a conclusão,
             antes do gesto. ⚠️ E nada de medidor no PALPITE: a contagem de descobertas
             começa no primeiro gesto, e ali ainda não houve nenhum. */
        <div
          className="flex items-center gap-2"
          role="meter"
          aria-valuemin={0}
          aria-valuemax={goals.length}
          aria-valuenow={feitas}
          aria-label={`${feitas} de ${goals.length} descobertas`}
        >
          <span aria-hidden className="text-sm font-semibold text-muted-foreground">
            Descobertas {feitas} de {goals.length}
          </span>
          {/* ⚠️ A N-ésima bolinha acende com a N-ésima descoberta (full review de
                experiência, B6): "Descobertas 1 de 2" com a SEGUNDA acesa lia como erro.
                Qual meta caiu não é assunto do medidor. */}
          {goals.map((g, i) => (
            <span
              key={g.id}
              aria-hidden
              className={`grid size-6 place-items-center rounded-full border ${i < feitas ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-muted'}`}
            >
              {i < feitas ? <Check size={14} /> : null}
            </span>
          ))}
        </div>
      )}
    </SceneReadoutBand>
  )
  const pranchaDaCena = (fechada: boolean) => (
    <ConsolePrancha fechada={fechada}>
      {/* ⚠️⚠️ A caixa pergunta aos FILHOS se há o que mostrar (`botoesDaCena` é uma
            LISTA): um booleano à parte esconderia um botão acrescentado aqui. */}
      {botoesDaCena.length > 0 && (
        /* ⚠️ Sem caixa própria (review do lote 2): era mais uma superfície entre o palco e
             a bancada, numa tela que já passava de quatro. */
        <div className="flex flex-wrap items-center justify-center gap-3">{botoesDaCena}</div>
      )}

      <div className="space-y-3">
        {somNaBancada && (
          /* ⚠️⚠️ Na cena cujo ASSUNTO é o som, o som é uma CHAVE da bancada, acima da
               peça (consertos do review da onda A do lote 5): ele nascia desligado num
               "Ligar som" discreto do rodapé, e a instrução mandava contar os sons. Só a
               `jump-sound` faz som (`sceneEmitsSound`), então o rodapé não repete o
               controle na experimentação; na demonstração ele segue lá. */
          <SomDaBancada ligado={!muted} onToggle={() => void enableSound()} />
        )}
        <LessonSceneControls
          scene={m}
          state={visto}
          dispatch={dispatch}
          cast={activity.cast}
          goals={goals}
          tocando={running}
          onRunning={setRunning}
        />
        <ExplorationPieces activity={activity} state={state} dispatch={dispatch} more={false} />
        {guardarEsteJeito && <div className="flex justify-start">{guardarEsteJeito}</div>}
      </div>
    </ConsolePrancha>
  )

  /**
   * Os controles da DEMONSTRAÇÃO moram na prancha do console, como a bancada da experimentação:
   * são o que a criança toca nesse momento. Antes ficavam soltos abaixo da moldura.
   */
  const blocoDaDemonstracao =
    demoMode && demo ? (
      inline ? (
        /* A apresentação inline tem UM botão: a animação curta que a criança repete. */
        <div className="flex items-center justify-center gap-2">
          {/* ⚠️⚠️ O botão NÃO desliga enquanto toca (review do lote 2): desabilitado, ele
      tirava o foco de quem tinha acabado de apertar. Tocando, ele PAUSA; pausada no
      meio, CONTINUA; no começo ou no fim, toca do começo. ⚠️ E fica fechado com o
      palpite pendente: a previsão escrita pelo professor vale aqui também. ⚠️ Com
      menos movimento ele toca em passos de 0,2 s, como a guiada. */}
          <SceneButton
            tom="gesto"
            className="min-w-11"
            disabled={bloqueado}
            onClick={() => {
              if (running) {
                setRunning(false)
                return
              }
              if (inlineNoMeio) gesto.current = true
              else {
                dispatch({ type: 'start' })
                espera.current = 0
              }
              setRunning(true)
            }}
          >
            {running ? <Pause size={16} aria-hidden /> : <Play size={16} aria-hidden />}
            {running
              ? 'Pausar'
              : inlineNoMeio
                ? 'Continuar'
                : demo.viewed
                  ? 'Ver de novo'
                  : 'Ver acontecer'}
          </SceneButton>
          {demo.viewed && (
            /* Sem cartão no fim da inline: um ✓ pequeno, com o nome para quem ouve. */
            <span className="flex items-center text-success-foreground">
              <Check size={18} aria-hidden />
              <span className="sr-only">Você viu tudo.</span>
            </span>
          )}
        </div>
      ) : (
        <>
          <SceneDemoControls
            principalRef={principalRef}
            demo={demo}
            total={roteiro.length}
            tocando={running}
            lento={slow}
            bloqueado={bloqueado}
            onPrincipal={principalDaDemonstracao}
            onLento={() => setSlow((v) => !v)}
            ferramentas={botaoDeSom}
            onSuaVez={
              fimDaDemonstracao && demo.viewed
                ? () => {
                    setRunning(false)
                    setSuaVez(state)
                  }
                : undefined
            }
          />
          {demoStep?.highlight === 'tools' && (
            <MontagemTravada activity={activity} state={state} goals={goals} acesa={running} />
          )}
          {reference && demoStep?.highlight === 'compare' && (
            <div
              className={`rounded-2xl bg-background p-3 ${running ? 'ring-2 ring-primary' : ''}`}
            >
              <ExperienceComparison
                activity={activity}
                trials={[demo.before ?? sceneTrial(demo.state, 'Antes desta etapa')]}
                current={state}
              />
            </div>
          )}
        </>
      )
    ) : null

  return (
    /* ⚠️ A cena NÃO desenha cartão. Quem desenha é o app, pelo gancho `sz-lesson-scene`: no kids
       todo bloco já é um cartão, e a cena fazia o segundo dentro dele. */
    <section aria-labelledby={`${id}-title`} className="sz-lesson-scene space-y-4">
      <header className="space-y-3">
        <div>
          {/* `sz-lesson-chip` + `data-chip`: gancho ESTÁVEL do tema (invariante 8). O rótulo é
              VERBO, como os demais chips da aula. */}
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
          {/* ⚠️ O título CONTINUA existindo (é o nome acessível da `<section>`); quando o
              cabeçalho da seção já disse a mesma frase, ele vira `sr-only`. */}
          <h3
            id={`${id}-title`}
            className={
              tituloJaDito(content.title, secao) ? 'sr-only' : 'text-xl font-bold sm:text-2xl'
            }
          >
            {content.title}
          </h3>
        </div>
        {revisita && (
          <SceneRevisitBanner
            regra={fraseDeSucesso}
            explicacao={guardado?.verifiedBy === 'server' ? guardado.feedback : undefined}
          />
        )}
      </header>
      <div className="space-y-4">
        {previsaoPendente && palpite ? (
          /* ⭐⭐ O PALPITE mora no MESMO console (18/09/2026, a "Proposta B"): a ordem é contexto →
          mundo → pergunta → opções, e a cena fica NO MEIO dos dois balões de propósito — juntar
          os dois faria a criança responder antes de olhar. A prancha fica À VISTA e fechada, em
          vez de sumir: ela vê o que vai poder mexer, e o bloco não muda de altura ao responder. */
          <SceneConsole palpite>
            {hudDaCena}
            <ConsoleFala>
              <PalpiteContexto
                prediction={palpite}
                demonstracao={demoMode}
                renderDialogue={renderDialogue}
                dialogueRef={dialogoDoPalpiteRef}
              />
            </ConsoleFala>
            <ConsoleMundo>
              <ScenePredictionPreview activity={activity} contextLabel={palpite.context.label} />
            </ConsoleMundo>
            <ConsoleFala>
              <PalpitePergunta prediction={palpite} renderDialogue={renderDialogue} />
            </ConsoleFala>
            <div className="px-3.5 pb-3">
              <PalpiteOpcoes
                prediction={palpite}
                escolha={prediction}
                bloqueado={bloqueado}
                demonstracao={demoMode}
                onEscolher={(escolha) => {
                  focarDialogoDaDescoberta.current = true
                  setPrediction(escolha)
                  guardarPalpite(scope, palpite, escolha)
                  anunciar(anuncioDaEscolha(palpite, escolha, demoMode))
                }}
              />
            </div>
            {!demoMode && pranchaDaCena(true)}
          </SceneConsole>
        ) : (
          <>
            {palpite && !(revisita && !prediction) && (
              <ScenePrediction
                prediction={palpite}
                escolha={prediction}
                demonstracao={demoMode}
                trocavel={trocavel}
                revelado={revelado}
                onTrocar={() => {
                  focarDialogoDoPalpite.current = true
                  focarDialogoDaDescoberta.current = false
                  gesto.current = false
                  setRunning(false)
                  action.current({ type: 'reset' })
                  apagarPalpite(scope)
                  setPrediction('')
                  setHint(0)
                  setPistaCongelada(null)
                  setConferiu('')
                  setPalpiteNaHora('')
                  setAvisoDescoberta('')
                  setAviso('')
                }}
              />
            )}
            {suaVez ? (
              <SceneSandbox
                activity={activity}
                inicial={suaVez}
                reduzido={reduced}
                onEventos={tocarSom}
                onAnunciar={anunciar}
                ferramentas={botaoDeSom}
                /* ⚠️ A fala vai DENTRO do console da vez, como na experimentação: ela ficava
                   solta acima dele, a última sobra do desenho de antes do console. */
                fala={blocoDaInstrucao}
                onSair={() => {
                  setSuaVez(null)
                  gesto.current = true
                  action.current({ type: 'start' })
                  espera.current = 0
                  // ⚠️ O foco vai para o principal ("Pausar"): a bancada some com o botão clicado.
                  focarPrincipal.current = true
                  setRunning(true)
                }}
              />
            ) : (
              <>
                {/* ⚠️ `<fieldset disabled>` desabilita TODO `<button>` descendente por HTML nativo, e
                por isso ele nunca pode olhar `result.passed`: a cena concluída ficava sem
                desfazer, sem recomeçar e sem pista, inclusive ao reabrir a aula. */}
                <fieldset disabled={bloqueado} className="min-w-0 space-y-4">
                  <fieldset className="min-w-0 space-y-4">
                    {/* ⭐⭐ O CONSOLE: HUD, fala do Zappy, mundo, frase e prancha numa moldura Só
                    (18/09/2026, a "Proposta B" que ela aprovou na maquete). O anel de destaque da
                    demonstração vai na moldura inteira, como ia na antiga. */}
                    <SceneConsole destacado={anelDaCena}>
                      {hudDaCena}
                      <ConsoleFala>{blocoDaInstrucao}</ConsoleFala>
                      {/* ⭐⭐ A PISTA mora colada na fala do Zappy, e não no pé do bloco.
                      Relato dela na maquete: "não consegui ver onde apareceu a pista". Ela
                      nascia depois do rodapé, longe da instrução que a criança acabou de ler e
                      fora do console — quem pede ajuda é justamente quem vai reler a instrução.
                      Aqui ela cai onde os olhos já estão. */}
                      {hintText && !conclusao && (
                        /* A escada de três degraus aparece COMO escada, logo abaixo do botão que a pediu e
                         sem empurrar o palco. A caixa some quando a cena conclui. ⚠️ Sem `role="status"`:
                         o texto é recalculado com a cena (o nível 1 cita a situação), e a cada "+100" o
                         leitor ouvia a situação duas vezes. Quem anuncia a pista é o clique. */
                        <div
                          data-pista={pistaFeita ? 'feita' : 'aberta'}
                          /* ⚠️ `mx`/`mb`: dentro do console ela é irmã da fala, e sem o respiro
                             encostava nas duas bordas e no mundo logo abaixo. */
                          className="mx-3.5 mb-2.5 flex gap-3 rounded-2xl border border-amber-600/30 bg-amber-500/10 px-4 py-3"
                        >
                          {pistaFeita ? (
                            <Check
                              size={18}
                              className="mt-0.5 shrink-0 text-success-foreground"
                              aria-hidden
                            />
                          ) : (
                            <Lightbulb
                              size={18}
                              className="mt-0.5 shrink-0 text-amber-700"
                              aria-hidden
                            />
                          )}
                          <p className="text-sm leading-relaxed">
                            {!pistaFeita && (
                              <>
                                <span className="font-semibold">
                                  Pista {Math.min(hint, hints.length)} de {hints.length}.
                                </span>{' '}
                              </>
                            )}
                            {hintText}
                          </p>
                        </div>
                      )}
                      {/* ⚠️ O anel de destaque só enquanto a parte TOCA (lote 2): 96 dos 107 passos com
                      destaque usam `scene`, e o anel sempre aceso virava moldura e parava de
                      apontar. */}
                      <ConsoleMundo>
                        {/* ⚠️⚠️ UM caminho para as 45: quem sabe qual é o palco de cada cena é o palco.
                        O `fieldset` é a trava do BLOCO: na demonstração a criança assiste. */}
                        <fieldset disabled={demoMode}>
                          <RelogioDaArteProvider value={tempoDaArte}>
                            <ExplorationStage
                              activity={activity}
                              state={visto}
                              dispatch={dispatch}
                            />
                          </RelogioDaArteProvider>
                        </fieldset>
                        {/* ⚠️⚠️ Os avisos SOBREPOSTOS ao pé do palco (full review de experiência, M2), sem
                        lugar reservado no fluxo: ver `AvisosDaCena`. */}
                        {(avisoDescoberta || palpiteNaHora) && (
                          <AvisosDaCena
                            selo={avisoDescoberta}
                            achou={palpite ? palpiteNaHora : ''}
                            veredito={palpite ? vereditoDoPalpite(palpite, prediction) : null}
                            onFechar={() => {
                              setAvisoDescoberta('')
                              setPalpiteNaHora('')
                            }}
                          />
                        )}
                      </ConsoleMundo>
                      {/* ⚠️ A frase da SITUAÇÃO é o narrador do mundo: descreve o que está na tela agora.
                    ⚠️ Num lugar que só cresce (consertos do review da onda B do lote 5, T2): ela passa
                    de uma para duas linhas e volta no meio dos gestos, e a bancada ia junto. */}
                      {/* ⚠️⚠️ E o MOLDE são as frases que a cena atinge (full review de experiência, M3):
                    só crescer não bastava, porque a PRIMEIRA vez que a frase passava a duas linhas a
                    bancada descia 16 px no toque (o "Avançar 1 quadro" da `draw-loop` no celular). */}
                      <LugarReservado
                        marca="situacao"
                        molde={
                          <div className="grid" aria-hidden>
                            {situacoesDaCena.map((frase, i) => (
                              // biome-ignore lint/suspicious/noArrayIndexKey: cada frase é um lugar fixo do molde
                              <p key={i} className={`${CLASSE_DA_SITUACAO} [grid-area:1/1]`}>
                                {frase}
                              </p>
                            ))}
                          </div>
                        }
                        chave={situacoesDaCena.join('|')}
                      >
                        <p
                          role={running ? undefined : 'status'}
                          aria-live={running ? 'off' : undefined}
                          className={CLASSE_DA_SITUACAO}
                        >
                          {sceneSituation(activity.scene, visto, activity.cast)}
                        </p>
                      </LugarReservado>
                      {/* ⭐⭐ A conclusão cai no MESMO lugar das opções do palpite: logo abaixo do
                    mundo, dentro do console. É o lugar da conversa — a cena mostra em cima, e
                    ali embaixo se fala sobre ela. Antes ela nascia DEPOIS do rodapé, fora da
                    moldura: a mesma distância que fez a pista passar despercebida.
                    ⚠️ A cena NÃO acaba: o mundo segue vivo e a prancha segue aberta. */}
                      {/* ⚠️ A caixa só existe COM conclusão: vazia, as margens dela colapsavam em
                    12px de vão morto entre a frase e a prancha, em toda cena e o tempo todo. */}
                      {!demoMode && !revisita && conclusao && (
                        <div className="sz-scene-console-conversa">
                          <SceneConclusion
                            pergunta={content.checkpoint}
                            regra={fraseDeSucesso}
                            resposta={resposta}
                            certa={respostaCerta}
                            feedback={respostaFeedback}
                            aguardaCena={aguardaCena}
                            bloqueada={registered || conflict || !ready}
                            faixaRef={faixaRef}
                            perguntaRef={perguntaRef}
                            onResponder={(escolha) => {
                              respostaAtual.current = escolha
                              setResposta(escolha)
                              setRespostaFeedback('')
                              setRespostaCerta(null)
                              setAguardaCena(false)
                              // ⚠️ Id novo por RESPOSTA: o servidor reavalia a tentativa pelo checkpoint dele, e
                              // com o id fixo a primeira resposta errada seria devolvida para sempre.
                              if (!registered) attemptId.current = crypto.randomUUID()
                              void flush.current(escolha)
                            }}
                          />
                        </div>
                      )}
                      {demoMode
                        ? blocoDaDemonstracao && (
                            <ConsolePrancha>{blocoDaDemonstracao}</ConsolePrancha>
                          )
                        : pranchaDaCena(false)}
                    </SceneConsole>
                    {/* A comparação abre logo abaixo do botão que a pediu, não no pé do cartão.
                    ⚠️ FORA do console: é uma gaveta da AULA, e dentro dele viraria uma quinta faixa. */}
                    {!demoMode && reference && (lab?.trials ?? []).length > 0 && (
                      <details
                        open={compared}
                        onToggle={(e) => setCompared(e.currentTarget.open)}
                        className="rounded-2xl bg-background p-4"
                      >
                        <summary className="min-h-11 cursor-pointer text-sm font-semibold">
                          Compare: o que você guardou × agora
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
                  </fieldset>
                </fieldset>
                {!demoMode && (
                  /* ⭐ A linha de ações: ferramentas à esquerda, o caminho para a frente à direita.
                   ⚠️ Os NOMES acessíveis das ferramentas são o contrato dos testes e de quem navega
                   por leitor de tela; abaixo de 480px elas ficam só com o ícone. */
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1">
                      {/* ⭐ `tom="ferramenta"` (contorno), e não `discreta` (fantasma): o kids mantém
                      o fantasma PLANO de propósito, e relato dela na maquete foi que as três liam
                      como "três textos" — nem parado nem no hover diziam que dá para clicar. O
                      contorno já existe e já ganha o relevo e o levantar do próprio app. */}
                      {/* ⚠️ Fechados com o palpite pendente, com o motivo do véu (review do lote 2): um
                      "Recomeçar" antes do palpite contava como gesto e apagava o "trocar". ⚠️ E
                      `min-w-11`: só com o ícone, abaixo de 480px, mediam 42px de largura. */}
                      <SceneButton
                        tom="ferramenta"
                        className="min-w-11"
                        onClick={() => {
                          setRunning(false)
                          dispatch({ type: 'undo' })
                        }}
                        disabled={bloqueado || !(lab?.past ?? []).length}
                      >
                        <Undo2 size={16} aria-hidden />
                        <span className="max-[30rem]:sr-only">Desfazer</span>
                      </SceneButton>
                      {/* ⚠️⚠️ UM botão só para voltar ao começo (lote 2). "Recomeçar" e "Ver de novo"
                        faziam o mesmo `reset`, lado a lado, e "Ver de novo" prometia assistir. */}
                      <SceneButton
                        tom="ferramenta"
                        className="min-w-11"
                        disabled={bloqueado}
                        onClick={() => {
                          setRunning(false)
                          dispatch({ type: 'reset' })
                        }}
                      >
                        <RotateCcw size={16} aria-hidden />
                        <span className="max-[30rem]:sr-only">Recomeçar</span>
                      </SceneButton>
                      {/* ⚠️⚠️ "Uma pista" SOME depois de concluir (a caixa da pista já sumia, e o botão
                      virava um clique mudo que ainda CONTAVA pista no relatório do professor) e fica
                      fechado com o palpite pendente: várias pistas respondem o palpite (review do
                      lote 2). */}
                      {!conclusao && (
                        <SceneButton
                          tom="ferramenta"
                          className="min-w-11"
                          // ⚠️ Desliga no último degrau: o quarto clique não fazia nada.
                          disabled={bloqueado || hint >= hints.length}
                          onClick={() => {
                            const level = Math.min(hints.length, hint + 1)
                            setHint(level)
                            // ⚠️ Uma caixa de ajuda por vez: a pista toma o lugar da resposta do Conferir.
                            setConferiu('')
                            // ⚠️ A AÇÃO tem três degraus (`SCENE_LIMITS.hint`), mas o editor aceita dez
                            // pistas: a tela mostra todas, e a evidência satura em três.
                            dispatch({
                              type: 'hint',
                              level: Math.min(level, SCENE_LIMITS.hint.max),
                            })
                            // ⚠️ A pista é CONGELADA no clique (full review de experiência, M1) e dita
                            // UMA vez, pela região da moldura: a caixa não é região viva.
                            const passo = passoDaPista(level)
                            setPistaCongelada({ nivel: level, passo })
                            anunciar(`Pista ${level} de ${hints.length}. ${passo.texto}`)
                          }}
                        >
                          <Lightbulb size={16} aria-hidden />
                          <span className="max-[30rem]:sr-only">Uma pista</span>
                        </SceneButton>
                      )}
                      {somNaBancada ? null : botaoDeSom}
                    </div>
                    {!revisita &&
                      (conclusao ? (
                        // ⚠️ Só com a pergunta FORA da janela (review do lote 2): com ela logo abaixo, o
                        // único azul da tela focava de novo o mesmo lugar e nada se via.
                        podeContinuar &&
                        !perguntaVisivel && (
                          <SceneButton
                            tom="gesto"
                            // ⚠️ `ml-auto`: numa linha que quebra (quatro ferramentas numa coluna
                            // estreita), o caminho para a frente continua no canto DIREITO.
                            className="ml-auto"
                            disabled={bloqueado}
                            onClick={() => {
                              setFocar('pergunta')
                            }}
                          >
                            Continuar
                            <ArrowDown size={16} aria-hidden />
                          </SceneButton>
                        )
                      ) : (
                        /* ⚠️⚠️ "Conferir", e não "Já descobri": a cena se avalia sozinha e fecha no
                         gesto, então o botão nunca concluía nada. Contorno, porque enquanto a cena
                         espera um gesto o azul cheio é o do gesto. Antes do palpite fica fechado,
                         com o motivo do véu. */
                        <SceneButton
                          tom="ferramenta"
                          className="ml-auto"
                          disabled={bloqueado}
                          onClick={() => setConferiu(respostaDoConferir())}
                        >
                          <Check size={16} aria-hidden />
                          Conferir
                        </SceneButton>
                      ))}
                  </div>
                )}
                {/* ⚠️ A região existe SEMPRE: `aria-live` montada junto do texto não é anunciada. */}
                <p
                  className={
                    conferiu && !conclusao && !demoMode
                      ? 'rounded-2xl bg-primary/5 px-4 py-3 text-sm'
                      : 'sr-only'
                  }
                  aria-live="polite"
                >
                  {conferiu && !conclusao && !demoMode ? conferiu : ''}
                </p>
              </>
            )}
          </>
        )}
        {/* O rodapé só fala de gravação: um problema (com ícone e saída) ou "✓ Guardado". */}
        <footer className="flex min-h-6 flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
          <span>{rodape}</span>
          {error && !conflict && (
            <button
              type="button"
              onClick={() => void flush.current()}
              className="min-h-11 font-semibold underline"
            >
              Tentar salvar
            </button>
          )}
          {!error && !conflict && !suaVez && conclusao && recusado && !registered && (
            <button
              type="button"
              onClick={() => {
                // ⚠️ Esquecer o carimbo é o que deixa a mesma assinatura subir de novo.
                enviado.current = ''
                enviadoChave.current = ''
                void flush.current()
              }}
              className="min-h-11 font-semibold underline"
            >
              Tentar de novo
            </button>
          )}
          {conflict && (
            <SceneButton tom="ferramenta" onClick={() => window.location.reload()}>
              Abrir de novo
            </SceneButton>
          )}
        </footer>
        {error && (
          <p role="alert" className="flex items-start gap-2 text-sm text-destructive">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden />
            {error}
          </p>
        )}
        {/* A região de anúncios da moldura: montada sempre, o texto entra depois. */}
        <p aria-live="polite" className="sr-only">
          <span key={anuncio.vez}>{anuncio.texto}</span>
        </p>
      </div>
    </section>
  )
}

/** As classes da frase da situação: a de verdade e as do molde do lugar dela (M3) são as MESMAS. */
const CLASSE_DA_SITUACAO = 'min-h-6 text-center text-sm font-medium text-muted-foreground'

/**
 * Os avisos que entram no instante do gesto: o selo da descoberta e o palpite retomado.
 *
 * ⭐⭐ SOBREPOSTOS ao pé do palco, dentro da moldura (full review de experiência, M2). Eles moravam num lugar
 * reservado no fluxo, embaixo do palco, e o lugar ficava VAZIO em 88 de 88 medidas logo depois do palpite
 * (36 a 140 px de buraco branco entre o desenho e os botões). Agora não ocupam lugar nenhum:
 * - **não escondem o que a criança está olhando**: são `pointer-events-none` (o toque no Dino, o arrasto
 *   do cacto e da alça atravessam), ficam numa faixa estreita da borda de baixo, e o selo SAI sozinho em
 *   `SELO_MS`; a frase do palpite sai no tempo de leitura dela (`tempoDoPalpite`), no gesto seguinte ou
 *   no ✕. A linha "Seu palpite: X. Não era isso." lá em cima continua dizendo o veredito;
 * - ⚠️ o selo é visual só: quem ouve recebe o mesmo acontecimento pela região de anúncios, e duas regiões
 *   falando a mesma frase a diriam duas vezes. O conjunto é `aria-hidden`, menos o ✕ (que tem nome).
 * ⚠️⚠️ O palpite retomado mora AQUI, junto do gesto que o respondeu (review do lote 2): lá em cima ele
 * ficava fora da janela nas bancadas longas e no celular.
 */
function AvisosDaCena({
  selo,
  achou,
  veredito,
  onFechar,
}: {
  selo: string
  achou: string
  veredito: 'acertou' | 'errou' | null
  onFechar: () => void
}) {
  if (!selo && !achou) return null
  return (
    <div
      data-avisos-sobre-o-palco=""
      className="pointer-events-none absolute inset-x-2 bottom-2 flex flex-col items-end gap-2"
    >
      {selo && (
        <p
          aria-hidden
          className="flex w-fit items-center gap-2 rounded-full bg-card/95 px-3 py-1 text-sm font-semibold text-success-foreground shadow-sm ring-1 ring-success/40"
        >
          <Check size={16} aria-hidden />
          {selo}
        </p>
      )}
      {achou && (
        <div
          className={`flex w-fit max-w-full items-start gap-2 rounded-2xl px-3 py-2 text-sm font-semibold shadow-sm ${
            veredito === 'errou'
              ? 'bg-amber-100/95 text-amber-950'
              : veredito === 'acertou'
                ? 'bg-card/95 text-success-foreground ring-1 ring-success/40'
                : 'bg-card/95'
          }`}
        >
          {veredito === 'acertou' ? (
            <Check size={16} className="mt-0.5 shrink-0" aria-hidden />
          ) : (
            <Eye size={16} className="mt-0.5 shrink-0" aria-hidden />
          )}
          <p aria-hidden className="min-w-0">
            {achou}
          </p>
          {/* ✕ para quem quer ver o desenho embaixo agora, sem esperar o tempo de leitura. */}
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar o aviso"
            className="pointer-events-auto -my-1 -mr-1 grid min-h-9 min-w-9 shrink-0 place-items-center rounded-full text-base leading-none hover:bg-foreground/10"
          >
            <span aria-hidden>✕</span>
          </button>
        </div>
      )}
    </div>
  )
}

/** Quanto o selo "✓ Descoberta N de M" fica sobre o palco (M2). */
const SELO_MS = 2000

/**
 * Quanto a frase do palpite retomado fica sobre o palco: o dobro do tempo de leitura da demonstração
 * inline, entre 5 e 10 s (é a criança de 8 anos lendo "Você achou: … Olhe a tela: …" e olhando o desenho).
 */
function tempoDoPalpite(frase: string): number {
  return Math.min(10000, Math.max(5000, tempoDeLeitura(frase) * 2000))
}

/**
 * O que a caixa da pista diz quando o degrau dela foi cumprido (full review de experiência, M1): a pista
 * mandava fazer o que a criança tinha acabado de fazer. ⚠️ Sem ponto de exclamação duplo nem jargão.
 */
const PISTA_FEITA = '✓ Feito! Se precisar, peça outra pista.'

/** O recado de quando o servidor recusa o que este player produz (`servidorRecusou`). */
const ATIVIDADE_MUDOU = 'Esta atividade mudou.'

/** Os dois conjuntos de metas são o MESMO (a ordem não importa). */
function mesmoConjunto(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((x) => b.includes(x))
}

/** O elemento está inteiro dentro da janela? Sem medida (fora do navegador), está. */
function estaNaJanela(el: Element): boolean {
  const r = el.getBoundingClientRect()
  const altura = window.innerHeight || document.documentElement.clientHeight
  return r.top >= 0 && r.bottom <= altura
}

/**
 * O pedido depois de "Tente:", com a inicial minúscula ("Ainda não. Tente: crie o Dino…").
 * ⚠️ Nome próprio fica como está: "Dino", "Zappy" e os nomes do elenco começam maiúsculos de
 * propósito, e "Tente: dino" leria como um erro de digitação.
 */
function minusculaInicial(texto: string, cast?: SceneCast): string {
  const primeira = /^\p{Lu}[\p{Ll}]+/u.exec(texto)?.[0]
  if (!primeira) return texto
  const nomes = new Set(
    ['Dino', 'Zappy', cast?.hero?.name, cast?.obstacle?.name, cast?.scenery?.name]
      .filter((n): n is string => Boolean(n))
      .map((n) => n.toLowerCase()),
  )
  if (nomes.has(primeira.toLowerCase())) return texto
  return texto.charAt(0).toLocaleLowerCase('pt-BR') + texto.slice(1)
}
