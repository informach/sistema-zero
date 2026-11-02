'use client'

import { discoveryGuidance } from '@sistemazero/core/learning/scene'
import type { ReactNode } from 'react'
import { SceneButton, useDiscovery } from '../scene-discovery-frame'

/**
 * As peças comuns das telas livres de `copy-vs-original`, `published-copy`, `same-rules-new-skin`,
 * `sheet-vs-sprite`, `two-clocks` e `unique-names` (O Jogo do Meu Jeito, 02/11/2026), no molde de `Door`,
 * `Memory` e dos Poderes: a fala do Zappy vem do registro (`guia-livre/`), e o botão em destaque é o
 * gesto que ela pede (`proximoGesto…` de cada tela).
 */
export function useTelaLivre() {
  const context = useDiscovery()
  const has = (id: string) => context.state.evidence.discoveries.includes(id)
  const fala = discoveryGuidance(context.activity, context.state)?.id
  return { ...context, has, fala }
}

/** Um caso da ideia: o que a criança faz e, SÓ depois do teste, o que acontece. */
export interface CasoDaIdeia {
  /** O que a criança faz (o nome do gesto). */
  gesto: string
  /** O que acontece: aparece só com `visto`. */
  resposta: string
  visto: boolean
  icone?: ReactNode
}

/** A ideia da cena, com as respostas reveladas caso a caso (a `MemoryRule`/`DoorRule` destas telas). */
export function IdeiaRevelada({ titulo, casos }: { titulo: string; casos: CasoDaIdeia[] }) {
  return (
    <figure className="sz-scene-regra door-rule coin-idea">
      <figcaption className="sz-scene-regra-titulo">{titulo}</figcaption>
      <div className="memory-actions">
        {casos.map((caso) => (
          <div key={caso.gesto} data-lit={caso.visto}>
            {caso.icone}
            <span>
              {caso.gesto}
              <small>{caso.visto ? caso.resposta : 'Teste para descobrir'}</small>
            </span>
          </div>
        ))}
      </div>
    </figure>
  )
}

/** A faixa de cima: os números do mundo, com o nome de cada um. */
export function FaixaLivre({ itens }: { itens: [string, ReactNode][] }) {
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

/** Uma escolha entre opções (cada opção é um botão), com o destaque do gesto. */
export function EscolhaLivre<T extends string | number>({
  legenda,
  valor,
  opcoes,
  gesto,
  fechado = false,
  nota,
  onEscolher,
}: {
  legenda: string
  valor: T | null
  opcoes: { id: T; rotulo: string; aria?: string }[]
  /** A opção que o Zappy pede agora (o destaque), ou nenhuma. */
  gesto?: T | null
  fechado?: boolean
  nota?: string
  onEscolher: (id: T) => void
}) {
  return (
    <fieldset className="sz-discovery-choices">
      <legend className="frame-controls-label">{legenda}</legend>
      <div className="sz-discovery-controls free-controls">
        {opcoes.map((opcao) => (
          <SceneButton
            key={String(opcao.id)}
            aria-label={opcao.aria}
            aria-pressed={valor === opcao.id}
            fechado={fechado}
            tom={gesto === opcao.id ? 'gesto' : valor === opcao.id ? 'ligado' : 'ferramenta'}
            onClick={() => onEscolher(opcao.id)}
          >
            {opcao.rotulo}
          </SceneButton>
        ))}
      </div>
      {nota && <p className="sz-discovery-small">{nota}</p>}
    </fieldset>
  )
}

export function DicaLivre() {
  return (
    <p className="sz-discovery-free-hint">
      Experimente à vontade. Os destaques sugerem um próximo teste; você escolhe a ordem.
    </p>
  )
}
