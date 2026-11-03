'use client'

import { type SceneAction, sceneTargets } from '@sistemazero/core/learning/scene'
import { Pause, Play } from 'lucide-react'
import { type ReactNode, useEffect } from 'react'
import { SceneButton, useDiscovery } from '../scene-discovery-frame'

/**
 * O que as seis telas livres da Nave contra Asteroides (velocity, spawn, cleanup, random,
 * collision-pair e invincibility; 02/11/2026) dividem: a régua de descobrir, a linha da figura da
 * ideia, a faixa de números e o tempo. Só a IDEIA: nenhum rótulo daqui cita bloco, área ou regra.
 */

/** O que a figura da ideia diz antes de a criança testar aquele caso. */
export const DESCOBRIR = 'Teste para descobrir'

/** As descobertas da lista: as metas que o bloco cobra, na ordem dele, com o texto do que comparar. */
export function useDescobertas(textos: Readonly<Record<string, string>>) {
  const { activity, state } = useDiscovery()
  const metas = sceneTargets(activity)
  const tem = (meta: string) => state.evidence.discoveries.includes(meta)
  const completed = metas.map(tem)
  return {
    tem,
    goals: metas.map((meta) => textos[meta] ?? 'Teste e compare o que acontece.'),
    completed,
    done: completed.filter(Boolean).length,
  }
}

/** Uma linha da figura da ideia: o caso, e o que ele faz só depois de testado. */
export function LinhaDaIdeia({
  icone,
  caso,
  revelado,
  resultado,
}: {
  icone: ReactNode
  caso: ReactNode
  revelado: boolean
  resultado: ReactNode
}) {
  return (
    <div data-lit={revelado}>
      {icone}
      <span>
        {caso}
        <small>{revelado ? resultado : DESCOBRIR}</small>
      </span>
    </div>
  )
}

/** A faixa de cima: os números que a criança observa. */
export function Numeros({ itens }: { itens: [string, ReactNode][] }) {
  return (
    <div className="position-hud">
      {itens.map(([rotulo, valor]) => (
        <span key={rotulo}>
          {rotulo} <b>{valor}</b>
        </span>
      ))}
    </div>
  )
}

/** O convite que fecha a coluna dos controles, igual ao dos outros modos livres. */
export function DicaLivre() {
  return (
    <p className="sz-discovery-free-hint">
      Experimente à vontade. Os destaques sugerem um próximo teste; você escolhe a ordem.
    </p>
  )
}

/**
 * O tempo das telas livres: o ▶ é o relógio do player (`running`), e o passo é um gesto da criança
 * (`advance` pelo `dispatch`, no máximo 1 s, a régua do `SESSION_LIMITS`). `parar` é quando o ▶ já
 * não tem o que mostrar (o tiro na borda, a pedra que saiu, a terceira batida).
 */
export function useTempo(parar: boolean) {
  const { running, setRunning, dispatch } = useDiscovery()
  useEffect(() => {
    if (running && parar) setRunning(false)
  }, [running, parar, setRunning])
  return {
    running,
    passar: (seconds: number) => {
      setRunning(false)
      dispatch({ type: 'advance', seconds } satisfies SceneAction)
    },
    alternar: () => setRunning(!running),
    parar: () => setRunning(false),
  }
}

/** O botão do ▶: soltar e pausar o tempo. */
export function BotaoDoTempo({
  running,
  fechado,
  onClick,
}: {
  running: boolean
  fechado?: boolean
  onClick: () => void
}) {
  return (
    <SceneButton
      aria-pressed={running}
      tom={running ? 'ligado' : 'ferramenta'}
      fechado={fechado && !running}
      onClick={onClick}
    >
      {running ? <Pause size={16} /> : <Play size={16} />}{' '}
      {running ? 'Pausar o tempo' : 'Deixar o tempo passar'}
    </SceneButton>
  )
}
