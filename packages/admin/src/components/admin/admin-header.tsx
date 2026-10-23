import type * as React from 'react'
import { CommunityChip } from './community-chip'

/**
 * Cabeçalho de página: título + descrição + ação opcional.
 *
 * Por padrão o título e as ações dividem a MESMA linha a partir de `sm:`, com o bloco de ação
 * em `shrink-0` — ou seja, quem encolhe é sempre o título. Isso serve às telas de listagem,
 * que têm um ou dois botões.
 *
 * ⚠️ `acoesAbaixo` existe para o cabeçalho que carrega MUITA ação (o editor de aula chega a
 * seis botões): ali a linha única espremia o `<h1>` a ponto de um título comum quebrar em
 * várias linhas. Com a prop, o título e o slug ficam na primeira linha e as ações descem para
 * a de baixo, ocupando a largura toda — os chamadores já entregam os botões num
 * `flex flex-wrap gap-2`, então nada muda no lado deles.
 */
export function AdminHeader({
  title,
  description,
  action,
  acoesAbaixo = false,
  community = true,
}: {
  title: string
  description?: string
  action?: React.ReactNode
  acoesAbaixo?: boolean
  /**
   * O selo da comunidade ao lado do título (a sala da equipe, 23/10/2026). Desligue só onde a
   * tela já diz a comunidade de outro jeito (o editor de um curso mostra a do próprio curso).
   */
  community?: boolean
}) {
  const identidade = (
    <div className="min-w-0 space-y-1.5">
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="min-w-0 break-words font-display text-[28px] font-bold leading-tight md:text-[32px]">
          {title}
        </h1>
        {community ? <CommunityChip /> : null}
      </div>
      {/* ⚠ `break-words` junto do `min-w-0` (full review de 18/09/2026): sozinho, o `min-w-0`
          só muda ONDE o estouro aparece — uma descrição de token ÚNICO (o slug da aula, o e-mail
          na ficha do aluno) deixava de empurrar a linha e passava a vazar por cima do bloco de
          ações. Com a quebra, ela desce de linha como qualquer frase. */}
      {description ? (
        <p className="max-w-3xl break-words text-[15px] text-muted-foreground">{description}</p>
      ) : null}
    </div>
  )
  if (acoesAbaixo) {
    return (
      <div className="flex flex-col gap-4">
        {identidade}
        {action ?? null}
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      {identidade}
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}
