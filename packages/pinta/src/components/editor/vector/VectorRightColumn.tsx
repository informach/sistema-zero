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
 * fecha nada, nem reabre o que a régua fechou (decisão dela). Em happy-dom
 * (scrollHeight/clientHeight = 0) a régua é inerte e tudo nasce aberto; os
 * testes a exercitam com um stub na coluna (`data-pin-right-column`).
 *
 * Full review 04/09/2026: (1) durante uma CAPTURA de cor a Aparência (dona do
 * botão Degradê) e as Cores (fonte da captura) não são vítimas; (2) coluna sem
 * layout (`clientHeight` 0) não é "estourou"; (3) o leitor de tela ouve quem
 * a régua recolheu depois de um abrir DA CRIANÇA (`COPY.panel.autoCollapsed`;
 * o mount é mudo); (4) foco dentro de um painel que vai recolher vai para o
 * chevron dele (Safari não foca botão no toque: o foco cairia no body);
 * (5) um degradê no pé avisa que a coluna tem mais embaixo (`useScrollMore`),
 * já que a barra fica escondida (`.pin-scroll-y`). ⚠️ Cruzar o breakpoint de
 * 768px desmonta a coluna: tudo nasce de novo do outro lado.
 *
 * ⚠️ Num notebook de 768px a coluna de um personagem fica com ~370-430px: cabe
 * UM painel aberto (o de Cores, 258, + 3 cabeçalhos de 50 + vãos de 8 = 432),
 * então ali o accordion vira "um por vez" (a Prévia recolhida continua VIVA na
 * miniatura do cabeçalho). Só tirar a Prévia da coluna mudaria essa conta
 * (adiado por decisão dela).
 */
import type { JSX } from 'react'
import { useLayoutEffect, useRef, useState } from 'react'
import { COPY } from '../../../core/copy'
import { ChevronDown } from '../../ui/icons'
import type { PanelDisclosure } from '../../ui/Panel'
import { PreviewPlayer } from '../PreviewPlayer'
import { useScrollMore } from '../useScrollMore'
import { VectorPropertiesPanel } from '../VectorPropertiesPanel'
import { pickPanelToCollapse, touchRecent } from './rightColumnFit'
import { VectorColorsPanel } from './VectorColorsPanel'
import { useVectorEditor } from './VectorEditorScope'
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

/** "Camadas e Cores" / "Camadas, Cores e Prévia". */
function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? ''
  return `${names.slice(0, -1).join(', ')} e ${names.at(-1)}`
}

export function VectorRightColumn(): JSX.Element {
  const { colorPick } = useVectorEditor()
  const columnRef = useRef<HTMLDivElement>(null)
  const more = useScrollMore(columnRef)
  const [open, setOpen] = useState<Record<PanelKey, boolean>>({
    preview: true,
    layers: true,
    colors: true,
    appearance: true,
  })
  /** Leitor de tela: quem a régua recolheu na última passada pedida pela criança. */
  const [notice, setNotice] = useState('')
  /** LRU (menos recente na FRENTE): abrir manda a chave para o fim; recolher não mexe. */
  const recentRef = useRef<readonly PanelKey[]>(SACRIFICE_ORDER)
  /** A régua corre no mount e depois de cada ABRIR (não depois de recolher à mão). */
  const fitPendingRef = useRef(true)
  /** A passada atual nasceu de um abrir DA CRIANÇA (anuncia) ou do mount (mudo)? */
  const announceRef = useRef(false)
  const victimsRef = useRef<PanelKey[]>([])

  const disclosure = (key: PanelKey): PanelDisclosure => ({
    open: open[key],
    onOpenChange: (next) => {
      // Arma SÓ quando de fato abre (o mesmo guard do updater): armar num
      // no-op deixaria a régua pendurada para o próximo recolher à mão.
      if (next && !open[key]) {
        recentRef.current = touchRecent(recentRef.current, key)
        fitPendingRef.current = true
        announceRef.current = true
        victimsRef.current = []
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
    const finish = (): void => {
      fitPendingRef.current = false
      if (announceRef.current && victimsRef.current.length > 0) {
        setNotice(
          COPY.panel.autoCollapsed(joinNames(victimsRef.current.map((key) => PANEL_LABEL[key]))),
        )
      }
      announceRef.current = false
      victimsRef.current = []
    }
    // Cabe, ou não dá para medir (happy-dom devolve 0/0; coluna ainda sem
    // layout): nada a fazer — sem layout, "estourou" seria mentira.
    if (column.clientHeight === 0 || column.scrollHeight <= column.clientHeight + 1) {
      finish()
      return
    }
    // Só quem está aberto E na tela conta: fechar um ausente não ganha altura e
    // o faria nascer recolhido quando aparecesse (Camadas na 1ª forma). Em
    // captura de cor, a Aparência (dona do botão Degradê, que a janela reabre
    // focando) e as Cores (fonte da captura) ficam de fora.
    const victim = pickPanelToCollapse(recentRef.current, (key) => {
      if (!open[key]) return false
      if (colorPick && (key === 'appearance' || key === 'colors')) return false
      return column.querySelector(`section[aria-label="${PANEL_LABEL[key]}"]`) !== null
    })
    if (!victim) {
      // O último aberto (o recém-aberto, por construção) nunca fecha sozinho:
      // daqui em diante quem resolve é a rolagem da coluna.
      finish()
      return
    }
    // Foco dentro do painel que vai recolher iria para o body (o corpo
    // desmonta): passa para o chevron dele, que fica.
    const section = column.querySelector<HTMLElement>(
      `section[aria-label="${PANEL_LABEL[victim]}"]`,
    )
    if (section && document.activeElement && section.contains(document.activeElement)) {
      section.querySelector<HTMLElement>('button[aria-expanded]')?.focus()
    }
    victimsRef.current = [...victimsRef.current, victim]
    // Um fechamento por passada; o re-render volta aqui e mede de novo (≤3 voltas).
    setOpen((current) => ({ ...current, [victim]: false }))
  }, [open, colorPick])

  return (
    <div className="relative flex min-h-0 w-68 shrink-0 flex-col">
      <div
        ref={columnRef}
        data-pin-right-column=""
        className="pin-scroll-y flex min-h-0 flex-1 flex-col gap-2 overflow-x-hidden overflow-y-auto"
      >
        <PreviewPlayer disclosure={disclosure('preview')} />
        <VectorLayerPanel disclosure={disclosure('layers')} />
        <VectorColorsPanel disclosure={disclosure('colors')} />
        <VectorPropertiesPanel disclosure={disclosure('appearance')} />
      </div>
      {more ? <ScrollMoreHint /> : null}
      {/* Monta VAZIA e recebe o texto depois: região já preenchida não é anunciada. */}
      <span role="status" className="sr-only">
        {notice}
      </span>
    </div>
  )
}

/**
 * Degradê no pé de uma coluna que rola com a barra ESCONDIDA: "tem mais
 * embaixo". Fora do container rolável (irmão absoluto), para não entrar na
 * conta do `scrollHeight` que a régua mede.
 */
export function ScrollMoreHint(): JSX.Element {
  return (
    <div
      aria-hidden="true"
      data-pin-scroll-more=""
      className="pointer-events-none absolute inset-x-0 bottom-0 h-8"
      style={{ background: 'linear-gradient(to top, var(--color-pin-bg), transparent)' }}
    />
  )
}

/**
 * Tela estreita: cores + aparência viram uma seção COLAPSÁVEL abaixo do palco
 * (mesma mecânica do SpritePanelDisclosure do pixel — abrir empurra in-flow,
 * nada de fixed/portal por cima da tab bar do host). A fileira rola de LADO com
 * a barra escondida (`.pin-scroll-x`): os painéis são `w-68 shrink-0` e a barra
 * clássica somaria 17px de altura acima do palco.
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
        <div className="pin-scroll-x flex gap-2 overflow-x-auto pt-2">
          <VectorColorsPanel />
          <VectorLayerPanel />
          <VectorPropertiesPanel />
        </div>
      ) : null}
    </div>
  )
}
