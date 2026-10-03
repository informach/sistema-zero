'use client'

import type { SceneGoalProgress } from '@sistemazero/core/learning/scene'
import { Check, Lock } from 'lucide-react'
import { Children, type ReactNode, useId } from 'react'

/**
 * "O que você já descobriu": a lista das metas da atividade, no console v2 (30/09/2026).
 *
 * ⭐⭐ Antes, o que a criança tinha da descoberta era um medidor de bolinhas e um selo de dois
 * segundos sobre o palco. A lista dá PESO ao que importa e diz quando terminou (regra do briefing
 * de 27/09: a criança precisa saber quando acabou).
 *
 * ⚠️⚠️ O `label` de uma meta PENDENTE nunca entra no DOM: ele é a conclusão (a resposta), e foi por
 * isso que o `title` das bolinhas do medidor saiu em 09/2026. A pendente fica trancada e NEUTRA
 * ("Ainda tem uma descoberta aqui."): decisão dela de 30/09, para preservar a experimentação — o
 * gesto que falta continua saindo só no "Conferir" e na pista.
 *
 * Os `children` são a linha de ações da descoberta (Uma pista, o som, Conferir/Continuar), e a
 * `resposta` do Conferir mora aqui, ao lado do botão que a pediu. ⚠️ A região viva existe SEMPRE
 * (sr-only quando vazia): montada junto do texto, ela não é anunciada.
 *
 * Na REVISITA, a `explicacao` ("Ver a explicação", fechada) fecha o bloco: é o único lugar em que a
 * regra e o porquê do professor sobrevivem a um F5 (01/10/2026; antes era um cartão verde embaixo
 * do título, que repetia o que a pílula e a lista já diziam).
 */
export function SceneDescobertas({
  goals,
  resposta,
  explicacao,
  children,
}: {
  goals: readonly SceneGoalProgress[]
  /** A resposta do "Conferir", já congelada pelo player; vazia quando não há. */
  resposta: string
  /** O "Ver a explicação" da revisita; ausente na primeira vez. */
  explicacao?: ReactNode
  children?: ReactNode
}) {
  const id = useId()
  return (
    <section
      className="sz-scene-descobertas"
      aria-labelledby={goals.length > 0 ? `${id}-titulo` : undefined}
    >
      {goals.length > 0 && (
        <>
          <h4 id={`${id}-titulo`} className="sz-scene-descobertas-titulo">
            O que você já descobriu
          </h4>
          <ol>
            {goals.map((g, i) => (
              <li key={g.id} className="sz-scene-descoberta" data-feita={g.complete || undefined}>
                <span className="sz-scene-descoberta-icone" aria-hidden>
                  {g.complete ? <Check size={14} /> : <Lock size={13} />}
                </span>
                <span>
                  {/* O número só para o leitor: sem ele, três pendentes eram três "Ainda tem uma
                      descoberta aqui." iguais na lista lida (review do console v2, B4). */}
                  <span className="sr-only">
                    {g.complete
                      ? `Descoberta ${i + 1}, feita: `
                      : `Descoberta ${i + 1}, trancada. `}
                  </span>
                  {g.complete ? g.label : 'Ainda tem uma descoberta aqui.'}
                </span>
              </li>
            ))}
          </ol>
        </>
      )}
      {/* ⚠️ `children` é um ARRAY (de `null`/`false` depois de concluir), e array é truthy:
          contar os filhos de verdade, senão sobra uma linha vazia com o respiro de cima. */}
      {Children.toArray(children).length > 0 ? (
        <div className="sz-scene-descobertas-acoes">{children}</div>
      ) : null}
      {explicacao}
      <p
        className={
          resposta
            ? 'sz-scene-conferir-resposta rounded-2xl bg-primary/5 px-4 py-3 text-sm'
            : 'sr-only'
        }
        aria-live="polite"
      >
        {resposta}
      </p>
    </section>
  )
}
