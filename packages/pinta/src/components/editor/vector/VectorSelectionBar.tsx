/**
 * Faixa de AÇÕES DA SELEÇÃO do vetor (desktop): alinhar, espelhar, ordem,
 * agrupar, duplicar e apagar. Fica colada embaixo da barra de cima — é uma
 * continuação dela — e só existe quando há algo selecionado.
 *
 * Por que uma faixa e não dentro do `<header>`: são até 16 alvos de 44px
 * (~800px) e o vão livre da barra é ~500px em 1366; ali dentro o `flex-wrap`
 * quebraria a barra em duas linhas de forma imprevisível. A faixa rola de LADO
 * (`overflow-x-auto`), como a caixa horizontal da tela estreita: nunca cresce em
 * altura, nunca rouba altura do palco.
 *
 * É a via do MOUSE. No toque (<768px) quem manda é a barra FLUTUANTE sobre o
 * palco (VectorStage) — as duas nunca coexistem, por isso compartilham o mesmo
 * `aria-label` e os mesmos rótulos `sel*`.
 */
import type { JSX, ReactNode } from 'react'
import { COPY } from '../../../core/copy'
import { ToolButton } from '../../ui/Button'
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignStartVertical,
  BringToFront,
  ChevronsDown,
  ChevronsUp,
  Copy,
  FlipHorizontal2,
  FlipVertical2,
  Group,
  SendToBack,
  SquaresExclude,
  SquaresIntersect,
  SquaresSubtract,
  SquaresUnite,
  Trash2,
  Ungroup,
} from '../../ui/icons'
import { useVectorEditor } from './VectorEditorScope'
import { VectorNodeActions } from './VectorNodeActions'

const Divider = (): JSX.Element => (
  <span aria-hidden="true" className="mx-1 h-8 w-0.5 shrink-0 rounded bg-pin-border" />
)

/**
 * A faixa SEMPRE ocupa o lugar dela (06/09/2026). Ela nascia só com seleção e, no
 * MEIO do clique numa forma, empurrava o palco ~52px para baixo: o gesto media o
 * palco de novo a cada movimento, a forma "teleportava" sob o mouse e o arrasto
 * seguinte virava laço (e pegava o texto vizinho). Regra da casa: nada que aparece
 * e some com a seleção pode estar no fluxo do palco. Sem seleção, a faixa vira a
 * dica de como usá-la, na MESMA altura.
 *
 * ⚠️ UMA moldura para TODOS os ramos, e a altura mora no MIOLO (`min-h-11`), nunca
 * no contêiner: a moldura soma `py-1` + `border-b` (53px em qualquer ramo; o fio de 1px é
 * o da barra de cima e das colunas desde a tela-modelo, 11/09/2026). O
 * ramo dos pontos tinha o `min-h-11` no contêiner (44px com border-box) e o palco
 * pulava 10px ao escolher uma forma sem pontos editáveis. `data-pin-selection-bar`
 * é o gancho do teste que mede a estrutura dos ramos.
 */
function SelectionBarFrame({
  children,
  toolbar,
}: {
  children: ReactNode
  /** Com rótulo a moldura vira a `toolbar` (as ações); sem, é só a dica. */
  toolbar?: string
}): JSX.Element {
  return (
    <div
      data-pin-selection-bar=""
      {...(toolbar ? { role: 'toolbar', 'aria-label': toolbar } : {})}
      className="shrink-0 border-b border-pin-border bg-pin-surface px-3 py-1"
    >
      <div className="flex min-h-11 items-center gap-1 pin-scroll-x overflow-x-auto">
        {children}
      </div>
    </div>
  )
}

function SelectionBarPlaceholder({ hint }: { hint: string }): JSX.Element {
  return (
    <SelectionBarFrame>
      <span className="shrink-0 text-pin-muted text-sm">{hint}</span>
    </SelectionBarFrame>
  )
}

export function VectorSelectionBar(): JSX.Element | null {
  const {
    tool,
    nodeTarget,
    nodePath,
    selected,
    alignSelected,
    flipSelected,
    moveOrder,
    groupSelected,
    ungroupSelected,
    pathfinderSelected,
    duplicateSelected,
    removeSelected,
  } = useVectorEditor()

  // Com a ferramenta de PONTOS ligada a faixa troca de conteudo, no mesmo lugar
  // e na mesma altura: as acoes de forma inteira (alinhar/ordem/agrupar) nao
  // valem para um no, e mostrar as duas coisas juntas so confunde.
  if (tool === 'reshape') {
    if (!nodeTarget) return <SelectionBarPlaceholder hint={COPY.vector.nodeBarEmpty} />
    return (
      <SelectionBarFrame toolbar={COPY.vector.nodeBar}>
        {/* ⚠️ Sem pontos editáveis (retângulo, círculo, texto, figura, ou uma
            mistura que virou mais de um pedaço) a faixa DIZ isso. Sumir sem
            explicação lia como "quebrou", e depois do Misturar isso deixou de
            ser raro: um resultado com furo tem dois sub-caminhos, e o
            `toEditablePath` recusa vários `M` de propósito. A altura da frase é
            a da moldura (o `min-h-11` do miolo), então o palco não pula. */}
        {nodePath ? (
          <VectorNodeActions showHint />
        ) : (
          <span className="shrink-0 text-pin-muted text-sm">{COPY.vector.nodeUneditable}</span>
        )}
      </SelectionBarFrame>
    )
  }

  if (selected.length === 0) return <SelectionBarPlaceholder hint={COPY.vector.selectionBarEmpty} />

  return (
    <SelectionBarFrame toolbar={COPY.vector.selectionBar}>
      {/* Alinhar: 2+ formas alinham entre si; 1 forma alinha na TELA. */}
      <span className="mr-1 shrink-0 text-sm font-bold text-pin-muted">
        {COPY.vector.alignTitle}
      </span>
      <ToolButton
        icon={AlignStartVertical}
        label={COPY.vector.alignLeft}
        onClick={() => alignSelected('left')}
      />
      <ToolButton
        icon={AlignCenterVertical}
        label={COPY.vector.alignCenterH}
        onClick={() => alignSelected('centerH')}
      />
      <ToolButton
        icon={AlignEndVertical}
        label={COPY.vector.alignRight}
        onClick={() => alignSelected('right')}
      />
      <ToolButton
        icon={AlignStartHorizontal}
        label={COPY.vector.alignTop}
        onClick={() => alignSelected('top')}
      />
      <ToolButton
        icon={AlignCenterHorizontal}
        label={COPY.vector.alignMiddleV}
        onClick={() => alignSelected('middleV')}
      />
      <ToolButton
        icon={AlignEndHorizontal}
        label={COPY.vector.alignBottom}
        onClick={() => alignSelected('bottom')}
      />

      <Divider />

      <ToolButton
        icon={FlipHorizontal2}
        label={COPY.vector.selFlipH}
        onClick={() => flipSelected('h')}
      />
      <ToolButton
        icon={FlipVertical2}
        label={COPY.vector.selFlipV}
        onClick={() => flipSelected('v')}
      />

      <Divider />

      {/* Ordem: a seleção INTEIRA anda como uma peça só, então vale com várias
          formas e com grupo (que é justamente onde ficava impossível: clicar
          numa forma agrupada expande a seleção, e os quatro viviam apagados). */}
      <ToolButton
        icon={BringToFront}
        label={COPY.vector.toFront}
        onClick={() => moveOrder('front')}
      />
      <ToolButton icon={ChevronsUp} label={COPY.vector.forward} onClick={() => moveOrder(1)} />
      <ToolButton icon={ChevronsDown} label={COPY.vector.backward} onClick={() => moveOrder(-1)} />
      <ToolButton icon={SendToBack} label={COPY.vector.toBack} onClick={() => moveOrder('back')} />

      {/* MISTURAR (o pathfinder). O bloco INTEIRO é gated pelo mesmo gatilho do
          Agrupar logo abaixo, e não cada botão: um gatilho só significa UMA
          mudança de layout, então a lixeira desliza uma vez em vez de duas, e
          com uma forma selecionada a faixa fica exatamente a de hoje.
          Os quatro ficam sempre HABILITADOS: quem avisa é o toast, porque botão
          morto não ensina o que fazer a seguir.
          Nunca `flex-wrap`: a faixa não pode crescer em altura; quem não couber
          vai para o `overflow-x-auto` que ela já tem. */}
      {selected.length >= 2 ? (
        <>
          <Divider />
          <span className="mr-1 shrink-0 font-bold text-pin-muted text-sm">
            {COPY.vector.pathfinderTitle}
          </span>
          <ToolButton
            icon={SquaresUnite}
            label={COPY.vector.selUnite}
            onClick={() => pathfinderSelected('unir')}
          />
          <ToolButton
            icon={SquaresSubtract}
            label={COPY.vector.selMinusFront}
            onClick={() => pathfinderSelected('menos-frente')}
          />
          <ToolButton
            icon={SquaresIntersect}
            label={COPY.vector.selIntersect}
            onClick={() => pathfinderSelected('intersecao')}
          />
          <ToolButton
            icon={SquaresExclude}
            label={COPY.vector.selExclude}
            onClick={() => pathfinderSelected('excluir')}
          />
        </>
      ) : null}

      <Divider />

      {selected.length >= 2 ? (
        <ToolButton icon={Group} label={COPY.vector.selGroup} onClick={groupSelected} />
      ) : null}
      {selected.some((shape) => shape.groupId) ? (
        <ToolButton icon={Ungroup} label={COPY.vector.selUngroup} onClick={ungroupSelected} />
      ) : null}
      <ToolButton icon={Copy} label={COPY.vector.selDuplicate} onClick={duplicateSelected} />
      <ToolButton icon={Trash2} label={COPY.vector.selRemove} onClick={removeSelected} />
    </SelectionBarFrame>
  )
}
