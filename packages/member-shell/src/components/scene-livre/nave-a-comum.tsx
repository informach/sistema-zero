'use client'

import { sceneTargets } from '@sistemazero/core/learning/scene'
import type { ReactNode } from 'react'
import { useDiscovery } from '../scene-discovery-frame'

/**
 * O que as telas livres de `once-vs-always`, `draw-loop`, `world`, `layers` e `coordinates`
 * (Construtor, 02/11/2026) dividem: a lista do que comparar, a linha da figura da ideia, a faixa de
 * números e o convite do fim. Só a IDEIA: nenhum rótulo daqui cita bloco, área do Estúdio ou regra.
 */

/** O que a figura da ideia diz antes de a criança testar aquele caso. */
export const DESCOBRIR = 'Teste para descobrir'

/** As descobertas da lista: as metas que o bloco cobra, na ordem dele, com o texto do que comparar. */
export function useMetasLivres(textos: Readonly<Record<string, string>>) {
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
  agora = false,
}: {
  icone: ReactNode
  caso: ReactNode
  revelado: boolean
  resultado: ReactNode
  /** O caso que está escolhido na tela agora. */
  agora?: boolean
}) {
  return (
    <div data-lit={revelado} aria-current={agora || undefined}>
      {icone}
      <span>
        {caso}
        {agora ? ' · agora' : ''}
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
