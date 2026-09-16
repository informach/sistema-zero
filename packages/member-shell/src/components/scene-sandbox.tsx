'use client'

import {
  cloneScene,
  type ExperimentationActivity,
  type ExperimentCommand,
  type ExperimentSession,
  openScene,
  type SceneActivity,
  type SceneCommand,
  type SceneEvent,
  type SceneState,
  sceneClockReachedStop,
  sceneConnectRunsClock,
  sceneGoalIds,
  sceneJumpLeftView,
  sceneScript,
  sceneSituation,
  sceneStart,
  stepExperiment,
} from '@sistemazero/core/learning/scene'
import { RotateCcw, Undo2 } from 'lucide-react'
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { ExplorationPieces } from './exploration-pieces'
import { ExplorationStage, SceneButton } from './exploration-stage'
import { botoesDoMundo, SceneReadoutBand } from './scene-frame'
import { LessonSceneControls } from './scene-lesson-controls'
import { LugarReservado } from './scene-lugar-reservado'
import { estadoVistoDaCena, relogioDaCena, useSceneClock } from './use-scene-clock'

/**
 * "Agora é sua vez": a bancada da cena, num rascunho LOCAL, a partir de onde a demonstração parou.
 *
 * ⭐⭐ Decisão autorizada pela dona (Raio-X, lote 2, 16/09/2026). A demonstração era passiva do
 * começo ao fim ("Observar", esperar, "Próxima etapa") e fechava num cartão de relatório. Agora ela
 * termina num GESTO da criança: as mesmas peças da experimentação, partindo do estado final.
 *
 * ⚠️⚠️ NÃO grava e NÃO avalia, e é deliberado: a demonstração já foi registrada quando ela viu tudo,
 * e a sessão guardada no servidor é a do ROTEIRO (o members rejoga os comandos dela). Um comando de
 * experimentação misturado ali seria recusado e travaria a gravação. Por isso esta bancada não tem
 * controlador, nem batida de um segundo, nem medidor de descobertas: é só o motor, em memória.
 */
export function SceneSandbox({
  activity,
  inicial,
  reduzido,
  onSair,
  onEventos,
  onAnunciar,
  ferramentas,
}: {
  activity: SceneActivity
  /** O estado em que a demonstração terminou. */
  inicial: SceneState
  reduzido: boolean
  /** "↺ Ver tudo de novo": fecha a bancada e recomeça a demonstração. */
  onSair: () => void
  /**
   * Os acontecimentos dos gestos, para o player tocar o som. ⚠️ Sem isto a `jump-sound`, a única
   * cena cujo ASSUNTO é o som, ficava muda justo na vez dela (review do lote 2).
   */
  onEventos?: (events: readonly SceneEvent[]) => void
  /** A região de anúncios do player (a frase final quando o relógio para). */
  onAnunciar?: (texto: string) => void
  /** O "Ligar som", nas cenas que fazem som. */
  ferramentas?: ReactNode
}) {
  // ⚠️ A bancada fala a língua da EXPERIMENTAÇÃO: o palco só aceita gesto direto (arrastar o cacto,
  // tocar no Dino) quando a atividade é de mexer. O caso vem junto, sem metas (a demonstração não
  // tem), para o "Recomeçar" do motor não levar a outro mundo.
  const experimento = useMemo<ExperimentationActivity>(
    () => ({
      type: 'experimentation',
      scene: activity.scene,
      ...(activity.cast ? { cast: activity.cast } : {}),
      ...(activity.setup?.actions ? { setup: { actions: activity.setup.actions } } : {}),
    }),
    [activity],
  )
  const start = useMemo(() => sceneStart(experimento), [experimento])
  /**
   * ⚠️⚠️ As `lives` do Desafio contam ponto pelo ACERTO do tiro (consertos do review da onda A do lote 5):
   * o roteiro atira, e a bancada da vez precisa do tiro, sem o fio do ponto por tempo e sem o relógio.
   */
  const pontoPorAcerto = useMemo(
    () =>
      activity.scene === 'lives' &&
      sceneScript(activity).some((passo) => passo.actions.some((a) => a.type === 'shoot')),
    [activity],
  )
  const comeco = useMemo<ExperimentSession>(() => {
    // ⚠️⚠️ A demonstração das `lives` termina SEM VIDAS, e a bancada abria no fim da partida, com "Bater"
    // fechado (consertos do review da onda A do lote 5): não havia gesto nenhum. Ela abre numa partida
    // NOVA, com os fios que o roteiro deixou ligados.
    if (activity.scene === 'lives' && inicial.lifeline.lives === 0) {
      const nova = openScene(start).lifeline
      const estado = cloneScene(inicial)
      estado.lifeline = {
        ...nova,
        onHit: inicial.lifeline.onHit,
        scoring: inicial.lifeline.scoring,
      }
      estado.caption = ''
      return { state: estado, past: [], trials: [] }
    }
    return { state: cloneScene(inicial), past: [], trials: [] }
  }, [inicial, activity.scene, start])
  // ⚠️ O REF é a fonte da verdade, e o estado só redesenha: o relógio aplica um `advance` por
  // quadro, e com `setState(atualizador)` a decisão de parar o relógio (o salto acabou) dependeria
  // de quando o React roda o atualizador, que não é na hora da chamada.
  const sessaoRef = useRef(comeco)
  const [sessao, setSessao] = useState(comeco)
  const [tocando, setTocando] = useState(false)
  const [lento, setLento] = useState(false)
  const state = sessao.state
  const m = experimento.scene
  const aplicar = (proxima: ExperimentSession) => {
    sessaoRef.current = proxima
    setSessao(proxima)
  }
  const mexer = (command: SceneCommand) => {
    try {
      const passo = stepExperiment(start, sessaoRef.current, command as ExperimentCommand)
      aplicar(passo.session)
      onEventos?.(passo.events)
    } catch {
      // Um comando que o motor recusa (o gesto de uma cena vizinha) não derruba a bancada.
      return
    }
    if (command.type === 'jump') setTocando(true)
    // ⚠️ Ligar a gravidade com o Dino ainda no ar solta o tempo, como no player (lote 5 do Raio-X).
    // ⚠️⚠️ Só LIGAR (consertos do review da onda A do lote 5): a régua é do core, a mesma do player.
    if (command.type === 'connect') {
      const relogio = sceneConnectRunsClock(m, command, sessaoRef.current.state)
      if (relogio !== null) setTocando(relogio)
    }
    // O toque que começa a partida da `restart` solta o tempo, como no player (lote 5, G3).
    // ⚠️ E o da `score` (consertos do review da onda A do lote 5): o convite do palco virou botão.
    if (
      (m === 'restart' || m === 'score') &&
      command.type === 'start' &&
      sessaoRef.current.state.match.screen === 'playing'
    )
      setTocando(true)
  }
  // Tudo aberto: esta bancada não conta descoberta, então nada pode ficar fechado esperando uma.
  const metas = useMemo(() => sceneGoalIds(m).map((id) => ({ id, complete: true })), [m])

  const relogio = relogioDaCena(m, state, reduzido)
  /** O que a criança VÊ: a prévia da `frames` parada com o relógio parado (`estadoVistoDaCena`). */
  const visto = estadoVistoDaCena(m, state, tocando)
  useSceneClock({
    ativo: tocando,
    limiar: relogio.limiar,
    exato: relogio.exato,
    lento,
    onTick: (segundos) => {
      const antes = sessaoRef.current
      const passo = stepExperiment(start, antes, { type: 'advance', seconds: segundos })
      aplicar(passo.session)
      onEventos?.(passo.events)
      // Acabou o salto: o relógio para em vez de rodar à toa (como no player).
      // ⚠️ E o Dino sem gravidade que passa do alto do palco (lote 5 do Raio-X), como no player.
      // ⚠️ E a batida da `circle-collision` (consertos do review da onda B do lote 5), como no player.
      if (
        (antes.state.flight.time !== null && sessaoRef.current.state.flight.time === null) ||
        sceneJumpLeftView(m, antes.state, sessaoRef.current.state) ||
        sceneClockReachedStop(m, sessaoRef.current.state)
      ) {
        setTocando(false)
        return false
      }
      return true
    },
  })

  const botoes = botoesDoMundo({
    scene: m,
    tocando,
    lento,
    onTocar: () => setTocando((v) => !v),
    onLento: () => setLento((v) => !v),
    dispatch: mexer,
    semRelogio: pontoPorAcerto,
  })

  // ⚠️ O foco vem para a bancada quando ela abre (review do lote 2): o botão "Agora é sua vez"
  // some junto com os controles da demonstração, e o foco caía no nada.
  const raiz = useRef<HTMLElement>(null)
  useEffect(() => {
    raiz.current?.focus({ preventScroll: true })
  }, [])
  // ⚠️ Como no player: com o relógio andando a frase não é região viva, e a final é dita uma vez.
  const tocavaAntes = useRef(tocando)
  useEffect(() => {
    const antes = tocavaAntes.current
    tocavaAntes.current = tocando
    if (antes && !tocando)
      onAnunciar?.(sceneSituation(m, sessaoRef.current.state, experimento.cast))
  })

  return (
    /* ⚠️ Sem frase própria: quem diz "Sua vez!" é a caixa da INSTRUÇÃO, lá em cima, com o "Ouvir"
       ao lado. Uma segunda frase aqui empilhava duas instruções diferentes na mesma tela. */
    <section
      ref={raiz}
      tabIndex={-1}
      aria-label="Sua vez"
      className="space-y-3 rounded-2xl outline-none"
    >
      <div className="mx-auto w-full max-w-scene">
        <SceneReadoutBand activity={experimento} state={visto} relogioAndando={tocando} />
        <ExplorationStage activity={experimento} state={visto} dispatch={mexer} />
      </div>
      {/* ⚠️ Num lugar que só cresce, como no player (consertos do review da onda B do lote 5, T2): a
          frase muda de uma para duas linhas no meio dos gestos e empurrava a bancada. */}
      <LugarReservado marca="situacao">
        <p
          role={tocando ? undefined : 'status'}
          aria-live={tocando ? 'off' : undefined}
          className="min-h-6 text-center text-sm font-medium text-muted-foreground"
        >
          {sceneSituation(m, visto, experimento.cast)}
        </p>
      </LugarReservado>
      {botoes.length > 0 && <div className="flex flex-wrap justify-center gap-2">{botoes}</div>}
      <div className="space-y-3">
        <LessonSceneControls
          scene={m}
          state={visto}
          dispatch={mexer}
          cast={experimento.cast}
          goals={metas}
          tocando={tocando}
          onRunning={setTocando}
          pontoPorAcerto={pontoPorAcerto}
        />
        <ExplorationPieces
          activity={experimento}
          state={state}
          dispatch={mexer}
          more
          pontoPorAcerto={pontoPorAcerto}
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <SceneButton
            tom="discreta"
            disabled={!sessao.past.length}
            onClick={() => {
              setTocando(false)
              mexer({ type: 'undo' })
            }}
          >
            <Undo2 size={16} aria-hidden />
            Desfazer
          </SceneButton>
          <SceneButton
            tom="discreta"
            onClick={() => {
              setTocando(false)
              aplicar(comeco)
            }}
          >
            <RotateCcw size={16} aria-hidden />
            Recomeçar
          </SceneButton>
          {ferramentas}
        </div>
        <SceneButton tom="ferramenta" onClick={onSair}>
          <RotateCcw size={16} aria-hidden />
          Ver tudo de novo
        </SceneButton>
      </div>
    </section>
  )
}
