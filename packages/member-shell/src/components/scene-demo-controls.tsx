'use client'

import type {
  DemonstrationSession,
  SceneActivity,
  SceneState,
} from '@sistemazero/core/learning/scene'
import { Check, Hand, Pause, Play, RotateCcw } from 'lucide-react'
import { type ReactNode, type Ref, useLayoutEffect, useRef, useState } from 'react'
import { ExplorationPieces } from './exploration-pieces'
import { SceneButton } from './exploration-stage'
import { LessonSceneControls } from './scene-lesson-controls'

/**
 * Os controles da demonstração GUIADA: um botão principal que muda com o estado, e uma ferramenta.
 *
 * ⭐⭐ Lote 2 do Raio-X (16/09/2026). Eram quatro botões do mesmo peso e nenhum principal
 * ("Observar", "Um passo", "Próxima etapa", "Rever desde o começo"), a fileira quebrava em duas
 * linhas na coluna de 600px e "Rever desde o começo" já aparecia antes de haver o que rever.
 * - ⚠️⚠️ "Um passo" SAIU: era 0,2 s do relógio do roteiro, e antes de cada ação que não é tempo há
 *   um respiro de 0,45 s. Três cliques na abertura da `velocity` e o Dino não andava: dois cliques
 *   mudos seguidos ensinam que o botão está quebrado.
 * - O rótulo diz o que o clique FAZ agora: "Ver a parte 2", "Pausar", "Ver tudo de novo".
 */
export function rotuloDaDemonstracao(
  demo: DemonstrationSession,
  total: number,
  tocando: boolean,
): { texto: string; fim: boolean } {
  const fim = demo.ready && demo.step >= total - 1
  if (tocando) return { texto: 'Pausar', fim: false }
  if (fim) return { texto: 'Ver tudo de novo', fim: true }
  // ⚠️ Pausada no MEIO de uma parte, o clique continua dali (review do lote 2): voltar a dizer "Ver
  // a parte 2" prometia recomeçar a parte, e a voz lia um convite para algo que já estava tocando.
  if (!demo.ready && (demo.action > 0 || demo.elapsed > 0))
    return { texto: `Continuar a parte ${demo.step + 1}`, fim: false }
  return { texto: `Ver a parte ${demo.ready ? demo.step + 2 : demo.step + 1}`, fim: false }
}

export function SceneDemoControls({
  demo,
  total,
  tocando,
  lento,
  bloqueado,
  descrito,
  onPrincipal,
  onLento,
  ferramentas,
  onSuaVez,
  principalRef,
}: {
  demo: DemonstrationSession
  total: number
  tocando: boolean
  lento: boolean
  /** O palpite ainda não veio (ou a gravação está travada): nada toca. */
  bloqueado: boolean
  /** O motivo do bloqueio, para o `aria-describedby` do botão principal. */
  descrito?: string
  onPrincipal: () => void
  onLento: () => void
  /** Ferramentas da cena que moram nesta linha (o "Ligar som", nas cenas que fazem som). */
  ferramentas?: ReactNode
  /** "Agora é sua vez": só existe quando a demonstração terminou. */
  onSuaVez?: () => void
  /** Para o player devolver o foco ao principal (ao sair do "Agora é sua vez"). */
  principalRef?: Ref<HTMLButtonElement>
}) {
  const { texto, fim } = rotuloDaDemonstracao(demo, total, tocando)
  // A parte N está vista quando ficou para trás, ou quando é a atual e já terminou.
  const vistas = demo.step + (demo.ready ? 1 : 0)
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* ⚠️ O progresso é das PARTES, pelo lugar delas: "Etapa 1 de 3" era palavra de relatório. */}
        <p
          role="img"
          aria-label={`Parte ${Math.min(demo.step + 1, total)} de ${total}`}
          className="flex items-center gap-1.5 text-sm font-semibold"
        >
          <span aria-hidden>Parte</span>
          {Array.from({ length: total }, (_, i) => (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: as partes são posições fixas do roteiro
              key={i}
              aria-hidden
              className={`inline-block size-3 rounded-full border-2 border-primary ${i < vistas ? 'bg-primary' : 'bg-transparent'}`}
            />
          ))}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {ferramentas}
          <SceneButton tom="discreta" aria-pressed={lento} onClick={onLento}>
            <span aria-hidden>🐢</span> Mais devagar
          </SceneButton>
          <SceneButton
            ref={principalRef}
            // ⚠️ Um azul cheio por vez: no fim, o caminho para a frente é o "Agora é sua vez".
            tom={fim && onSuaVez ? 'ferramenta' : 'gesto'}
            className="min-w-11"
            fechado={bloqueado}
            aria-describedby={bloqueado ? descrito : undefined}
            onClick={onPrincipal}
          >
            {tocando ? (
              <Pause size={16} aria-hidden />
            ) : fim ? (
              <RotateCcw size={16} aria-hidden />
            ) : (
              <Play size={16} aria-hidden />
            )}
            {texto}
          </SceneButton>
        </div>
      </div>
      {fim && demo.viewed && (
        /* ⚠️ O fim é UMA linha, e ele termina num gesto dela: "Demonstração concluída. Você
           acompanhou o conceito em funcionamento. Exemplo registrado." era um relatório. */
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-success/10 px-4 py-2">
          <p className="flex items-center gap-2 font-semibold text-success-foreground">
            <Check size={18} aria-hidden />
            Você viu tudo!
          </p>
          {onSuaVez && (
            <SceneButton tom="gesto" onClick={onSuaVez}>
              <Hand size={16} aria-hidden />
              Agora é sua vez
            </SceneButton>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * "Observe a montagem": os controles REAIS da cena, travados, mostrando o que o roteiro mexeu.
 *
 * ⚠️⚠️ Era uma caixa VAZIA em todos os usos de `highlight: 'tools'` (lote 2): ela desenhava só
 * `ExplorationPieces`, que só tem peças em 12 cenas, e nenhum dos passos com `tools` do catálogo
 * estava nelas. Hoje são a bancada inteira dentro de uma área `inert` (sem o cinza de desabilitado,
 * para ser legível), sem título. Onde a cena não tem controle nenhum, o quadro não é desenhado.
 */
export function MontagemTravada({
  activity,
  state,
  goals,
  acesa,
}: {
  activity: SceneActivity
  state: SceneState
  goals: readonly { id: string; complete: boolean }[]
  /** O anel de destaque, só enquanto a parte toca. */
  acesa: boolean
}) {
  const caixa = useRef<HTMLDivElement>(null)
  const [vazia, setVazia] = useState(false)
  // ⚠️ Antes de pintar: medir depois deixaria uma caixa vazia piscar na tela.
  useLayoutEffect(() => {
    setVazia(!caixa.current?.querySelector('button, input, [role="slider"]'))
  })
  const nada = () => {}
  return (
    <div
      ref={caixa}
      inert
      hidden={vazia}
      // ⚠️ Os controles travados ficam PLANOS (review do lote 2): com o relevo 3D do app, a
      // criança tocava num "+" que parecia vivo e nada acontecia. O relevo do kids é CSS fora de
      // camada, e só uma declaração `!important` numa camada ganha dele.
      className={`space-y-3 rounded-2xl bg-background p-3 [&_*]:cursor-default! [&_button]:translate-none! [&_button]:shadow-none! ${acesa ? 'ring-2 ring-primary' : ''}`}
    >
      <LessonSceneControls
        scene={activity.scene}
        state={state}
        dispatch={nada}
        cast={activity.cast}
        goals={goals}
        onRunning={nada}
      />
      {/* ⚠️ `travada` (consertos do review da onda A do lote 5): a ajuda da peça dizia "Arraste…" sobre
          controles `inert`, e passa a dizer como mexer. */}
      <ExplorationPieces activity={activity} state={state} dispatch={nada} more travada />
    </div>
  )
}
