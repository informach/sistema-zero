/**
 * Coluna DIREITA dos kinds vetoriais (desktop), espelho da PixelRightColumn:
 * prévia (só personagem animado — ela se auto-remove nos demais) → CAMADAS →
 * CORES → APARÊNCIA, todos `w-68`. NENHUM painel encolhe (`shrink-0` no
 * `Panel`): quando não cabem, quem rola é a coluna. ⚠️ Antes a Prévia era o
 * único filho sem `shrink-0` e absorvia o déficit inteiro: media 8px em
 * 1366×768 ("a prévia está ficando cortada", relato dela, 04/09/2026).
 *
 * ⭐ Accordion POR MEDIDA (pedido dela: "se descolapsar um, colapsar outro para
 * não ficar cortado nenhum"): ao abrir o desenho e depois de cada ABRIR, se a
 * coluna passou da altura, fecha o painel aberto há mais tempo (LRU), um por
 * passada, até caber — nunca o recém-aberto, nunca o último que sobrou.
 * Recolher à mão NÃO dispara a régua (fechar um não fecha outro), nem o
 * conteúdo crescer (Camadas ganhando linhas, Aparência com um texto
 * selecionado): aí a coluna rola. Previsível para a criança: as coisas só
 * fecham sozinhas quando ela abre algo. Redimensionar a janela também não
 * fecha nada (decisão dela). Em happy-dom (scrollHeight/clientHeight = 0) a
 * régua é inerte e tudo nasce aberto; os testes a exercitam com um stub na
 * coluna (`data-pin-right-column`).
 *
 * ⚠️ Num notebook de 768px a coluna de um personagem fica com ~370-430px: cabe
 * UM painel aberto (258 + 3 cabeçalhos + vãos = 432), então ali o accordion
 * vira "um por vez". Só tirar a Prévia da coluna mudaria essa conta (adiado).
 */
import type { JSX } from 'react'
import { useLayoutEffect, useRef, useState } from 'react'
import { COPY } from '../../../core/copy'
import { ChevronDown } from '../../ui/icons'
import type { PanelDisclosure } from '../../ui/Panel'
import { PreviewPlayer } from '../PreviewPlayer'
import { VectorPropertiesPanel } from '../VectorPropertiesPanel'
import { pickPanelToCollapse } from './rightColumnFit'
import { VectorColorsPanel } from './VectorColorsPanel'
import { VectorLayerPanel } from './VectorLayerPanel'

type PanelKey = 'preview' | 'layers' | 'colors' | 'appearance'

/** `aria-label` da <section> de cada painel (a mesma régua dos testes). */
const PANEL_LABEL: Record<PanelKey, string> = {
  preview: COPY.animation.preview,
  layers: COPY.layers.title,
  colors: COPY.palette.title,
  appearance: COPY.vector.appearance,
}

/**
 * Ordem de SACRIFÍCIO ao abrir o desenho (frente = fecha primeiro): Aparência
 * (pedido dela), Camadas, Prévia; Cores por último — os dois slots da caixa só
 * trocam o CANAL, então sem o painel Cores a criança não escolhe cor nenhuma.
 */
const SACRIFICE_ORDER: readonly PanelKey[] = ['appearance', 'layers', 'preview', 'colors']

export function VectorRightColumn(): JSX.Element {
  const columnRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState<Record<PanelKey, boolean>>({
    preview: true,
    layers: true,
    colors: true,
    appearance: true,
  })
  /** LRU (menos recente na FRENTE): abrir manda a chave para o fim; recolher não mexe. */
  const recentRef = useRef<PanelKey[]>([...SACRIFICE_ORDER])
  /** A régua corre no mount e depois de cada ABRIR (não depois de recolher à mão). */
  const fitPendingRef = useRef(true)

  const disclosure = (key: PanelKey): PanelDisclosure => ({
    open: open[key],
    onOpenChange: (next) => {
      if (next) {
        recentRef.current = [...recentRef.current.filter((k) => k !== key), key]
        fitPendingRef.current = true
      }
      setOpen((current) => (current[key] === next ? current : { ...current, [key]: next }))
    },
    expandLabel: COPY.panel.expand(PANEL_LABEL[key]),
    collapseLabel: COPY.panel.collapse(PANEL_LABEL[key]),
  })

  useLayoutEffect(() => {
    if (!fitPendingRef.current) return
    const column = columnRef.current
    if (!column) return
    // Cabe (ou não dá para medir — happy-dom devolve 0/0): nada a fazer.
    if (column.scrollHeight <= column.clientHeight + 1) {
      fitPendingRef.current = false
      return
    }
    // Só quem está aberto E na tela conta: fechar um ausente não ganha altura e
    // o faria nascer recolhido quando aparecesse (Camadas na 1ª forma).
    const victim = pickPanelToCollapse(
      recentRef.current,
      (key) =>
        open[key] && column.querySelector(`section[aria-label="${PANEL_LABEL[key]}"]`) !== null,
    )
    if (!victim) {
      // O último aberto (o recém-aberto, por construção) nunca fecha sozinho:
      // daqui em diante quem resolve é a rolagem da coluna.
      fitPendingRef.current = false
      return
    }
    // Um fechamento por passada; o re-render volta aqui e mede de novo (≤3 voltas).
    setOpen((current) => ({ ...current, [victim]: false }))
  }, [open])

  return (
    <div
      ref={columnRef}
      data-pin-right-column=""
      className="pin-scroll-y flex min-h-0 w-68 shrink-0 flex-col gap-2 overflow-x-hidden overflow-y-auto"
    >
      <PreviewPlayer disclosure={disclosure('preview')} />
      <VectorLayerPanel disclosure={disclosure('layers')} />
      <VectorColorsPanel disclosure={disclosure('colors')} />
      <VectorPropertiesPanel disclosure={disclosure('appearance')} />
    </div>
  )
}

/**
 * Tela estreita: cores + aparência viram uma seção COLAPSÁVEL abaixo do palco
 * (mesma mecânica do SpritePanelDisclosure do pixel — abrir empurra in-flow,
 * nada de fixed/portal por cima da tab bar do host).
 */
export function VectorPanelsDisclosure(): JSX.Element {
  const [open, setOpen] = useState(false)
  return (
    <div className="pin-panel shrink-0 p-2">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-11 w-full items-center justify-between gap-2 rounded-xl px-2 text-sm font-bold text-pin-text transition hover:bg-pin-border/40"
      >
        {COPY.vector.panelsTitle}
        <ChevronDown
          aria-hidden="true"
          className={`size-5 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open ? (
        <div className="flex gap-2 overflow-x-auto pt-2">
          <VectorColorsPanel />
          <VectorLayerPanel />
          <VectorPropertiesPanel />
        </div>
      ) : null}
    </div>
  )
}
