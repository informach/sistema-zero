/**
 * Card de um desenho na galeria: miniatura REAL do desenho (canvas 1:1
 * esticado por CSS pixelated para pixel; SVG inline para vetor; minimapa de
 * cores para o tilemap), nome e selinho de estilo.
 *
 * ⚠️ Card COMPACTO (~164px): pequeno o bastante para caber muita coisa na tela
 * (referência MakeCode Arcade, "só para reconhecer o desenho") e largo o
 * bastante para as três ações ficarem NO card, cada uma com o alvo de 44px da
 * regra de toque infantil — 3×44 = 132px + respiros. Um menu "⋮" chegou a ser
 * tentado para caber em 10 colunas e foi REJEITADO pela dona: as ações voltaram
 * para o card. Os diálogos de renomear/apagar seguem no GalleryScreen.
 */
import type { JSX } from 'react'
import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { thumbnailBitmap, thumbnailShapes } from '../../core/assetThumb'
import { COPY } from '../../core/copy'
import { perfSpan } from '../../core/perf'
import {
  assetStyle,
  isTilesetKind,
  type PintaAsset,
  type PintaBitmap,
  resolveAssetPalette,
} from '../../core/project'
import { paintBitmapCapped } from '../../pixel/render'
import { paintMinimap, tilemapMinimapColors } from '../../tiles/minimap'
import { VectorFrameSvg } from '../../vector/VectorFrameSvg'
import { Check, Copy, Pencil, Trash2 } from '../ui/icons'

// Os dois extratores da "cara" do asset mudaram de casa para `core/assetThumb`
// (são puros e o seletor "Trazer um desenho" do vetor também precisa deles).
export { thumbnailBitmap, thumbnailShapes }

/** Cor do chip por PAPEL (a mesma nos dois estilos — é como a criança pensa). */
const KIND_CHIP_CLASSES: Record<PintaAsset['kind'], string> = {
  'pixel-sprite': 'bg-pin-kind-sprite',
  'pixel-background': 'bg-pin-kind-background',
  tileset: 'bg-pin-kind-tileset',
  tilemap: 'bg-pin-kind-tilemap',
  'vector-sprite': 'bg-pin-kind-sprite',
  'vector-background': 'bg-pin-kind-background',
  'vector-tileset': 'bg-pin-kind-tileset',
}

/** Borda/sombra do card na cor do PAPEL (espelho do --unit do .kids-card). */
const KIND_PANEL_CLASSES: Record<PintaAsset['kind'], string> = {
  'pixel-sprite': '[--pin-panel-border:var(--color-pin-kind-sprite)]',
  'pixel-background': '[--pin-panel-border:var(--color-pin-kind-background)]',
  tileset: '[--pin-panel-border:var(--color-pin-kind-tileset)]',
  tilemap: '[--pin-panel-border:var(--color-pin-kind-tilemap)]',
  'vector-sprite': '[--pin-panel-border:var(--color-pin-kind-sprite)]',
  'vector-background': '[--pin-panel-border:var(--color-pin-kind-background)]',
  'vector-tileset': '[--pin-panel-border:var(--color-pin-kind-tileset)]',
}

/**
 * Teto da miniatura (maior lado, em pixels do canvas): a caixa do card tem ~140–160 px
 * CSS, então 192 px mantém nitidez de sobra e corta o backing store de um cenário
 * 512×512 de 1 MiB para ~147 KB — com centenas de cards montados é a diferença entre
 * caber e não caber na memória de um tablet escolar.
 */
export const GALLERY_THUMB_MAX_PX = 192

/**
 * UM `IntersectionObserver` por RAIZ rolável (a galeria rola dentro de `overflow-y-auto`, não
 * na janela; com `root` = janela, o retângulo do card era recortado pelo rolável ANTES da
 * margem e nada era pintado "meia tela antes"): o canvas só é pintado quando o card chega
 * perto da área visível (`rootMargin` de meia tela), e não volta a "longe". Sem a API
 * (happy-dom, navegador antigo) pinta já. A raiz é o ancestral marcado com
 * `data-pin-scroll-root`; sem ele, a janela.
 */
interface NearObserverSlot {
  root: Element | null
  observer: IntersectionObserver
  targets: Set<Element>
}

const nearTargets = new WeakMap<Element, { slot: NearObserverSlot; onNear: () => void }>()
const nearObservers = new Map<Element | null, NearObserverSlot>()

function releaseNearTarget(element: Element, notify: boolean): void {
  const registered = nearTargets.get(element)
  if (!registered) return
  const { slot, onNear } = registered
  nearTargets.delete(element)
  slot.targets.delete(element)
  slot.observer.unobserve(element)
  if (slot.targets.size === 0) {
    slot.observer.disconnect()
    nearObservers.delete(slot.root)
  }
  if (notify) onNear()
}

function nearObserverFor(root: Element | null): NearObserverSlot {
  let slot = nearObservers.get(root)
  if (!slot) {
    const targets = new Set<Element>()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) releaseNearTarget(entry.target, true)
        }
      },
      { root, rootMargin: '50% 0px' },
    )
    slot = { root, observer, targets }
    nearObservers.set(root, slot)
  }
  return slot
}
function observeNear(element: Element, onNear: () => void): () => void {
  if (typeof IntersectionObserver === 'undefined') {
    onNear()
    return () => {}
  }
  const root = element.closest('[data-pin-scroll-root]')
  const slot = nearObserverFor(root)
  nearTargets.set(element, { slot, onNear })
  slot.targets.add(element)
  slot.observer.observe(element)
  return () => releaseNearTarget(element, false)
}

/** `true` quando o elemento já esteve perto da janela (uma vez; não volta). */
function useNearViewport(ref: { current: Element | null }, enabled: boolean): boolean {
  const [near, setNear] = useState(!enabled)
  useEffect(() => {
    if (!enabled || near) return
    const element = ref.current
    if (!element) {
      setNear(true)
      return
    }
    return observeNear(element, () => setNear(true))
  }, [enabled, near, ref])
  return near
}

function PixelThumb({
  asset,
  bitmap,
  paint,
}: {
  asset: PintaAsset
  bitmap: PintaBitmap
  /** Pinta o canvas (false = ainda longe da janela; fica no emoji de fundo). */
  paint: boolean
}): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!paint || !canvas || !('paletteId' in asset)) return
    // happy-dom: getContext() null → paintBitmapCapped devolve false e a thumb fica
    // no emoji de fundo (nunca quebra).
    perfSpan('pinta:thumb:paint', () =>
      paintBitmapCapped(canvas, bitmap, resolveAssetPalette(asset), GALLERY_THUMB_MAX_PX),
    )
  }, [asset, bitmap, paint])

  return (
    <canvas
      ref={canvasRef}
      className="pin-pixelated relative h-full w-full object-contain"
      style={{ imageRendering: 'pixelated' }}
    />
  )
}

function TilemapThumb({
  asset,
  findAsset,
}: {
  asset: Extract<PintaAsset, { kind: 'tilemap' }>
  findAsset?: (id: string) => PintaAsset | null
}): JSX.Element | null {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const tileset = findAsset?.(asset.tilesetId) ?? null
  const colors = useMemo(
    () => (tileset && isTilesetKind(tileset) ? tilemapMinimapColors(asset, tileset) : null),
    [asset, tileset],
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !colors) return
    paintMinimap(canvas, asset.cols, asset.rows, colors)
  }, [asset, colors])

  if (!tileset || !isTilesetKind(tileset)) return null
  return (
    <canvas
      ref={canvasRef}
      className="pin-pixelated relative h-full w-full object-contain"
      style={{ imageRendering: 'pixelated' }}
    />
  )
}

/**
 * A miniatura do desenho. Exportada porque o seletor "Trazer um desenho" do
 * vetor usa a MESMA — é o que faz o seletor ser WYSIWYG com a galeria (entra
 * exatamente o que o card mostra) e impede as duas de divergirem.
 */
export function AssetThumb({
  asset,
  findAsset,
  paint = true,
}: {
  asset: PintaAsset
  findAsset?: (id: string) => PintaAsset | null
  /** `false` = o canvas do pixel ainda não é pintado (card longe da janela). */
  paint?: boolean
}): JSX.Element {
  const bitmap = useMemo(() => thumbnailBitmap(asset), [asset])
  const shapesDoc = useMemo(() => thumbnailShapes(asset), [asset])

  return (
    <div className="pin-checkerboard relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl border-2 border-pin-border">
      <span aria-hidden="true" className="absolute text-4xl opacity-30">
        {COPY.kinds[asset.kind].emoji}
      </span>
      {bitmap ? <PixelThumb asset={asset} bitmap={bitmap} paint={paint} /> : null}
      {shapesDoc && shapesDoc.shapes.length > 0 ? (
        <VectorFrameSvg
          width={shapesDoc.width}
          height={shapesDoc.height}
          shapes={shapesDoc.shapes}
          className="relative h-full w-full"
        />
      ) : null}
      {asset.kind === 'tilemap' ? <TilemapThumb asset={asset} findAsset={findAsset} /> : null}
    </div>
  )
}

/**
 * `memo` + callbacks POR ID (estáveis na galeria): com centenas de desenhos, digitar na
 * busca ou abrir um diálogo re-renderizava todos os cards (e os callbacks inline davam
 * identidade nova a cada render, o que anularia o memo).
 */
export const AssetCard = memo(function AssetCard({
  asset,
  justCreated = false,
  findAsset,
  onOpen,
  onRename,
  onDuplicate,
  onRemove,
  selectable = false,
  selected = false,
  onToggleSelect,
}: {
  asset: PintaAsset
  justCreated?: boolean
  /** Resolve outros assets do perfil (o tilemap precisa das peças p/ a thumb). */
  findAsset?: (id: string) => PintaAsset | null
  onOpen: (id: string) => void
  onRename: (id: string) => void
  onDuplicate: (id: string) => Promise<void> | void
  onRemove: (id: string) => void
  /**
   * Modo de seleção do pack: o botão-miniatura ALTERNA marcar/desmarcar em vez
   * de abrir, e as três ações ficam `disabled` (sumir mudaria a altura do card
   * e a grade pularia). Props PRIMITIVAS + callback estável por id — nunca o
   * Set inteiro, senão o `memo` re-renderiza a galeria toda a cada toque.
   */
  selectable?: boolean
  selected?: boolean
  onToggleSelect?: (id: string) => void
}): JSX.Element {
  const kind = COPY.kinds[asset.kind]
  const style = assetStyle(asset.kind)
  const [duplicating, setDuplicating] = useState(false)
  // A trava do duplo clique é um REF: dois cliques no MESMO turno de JS chegam
  // antes de qualquer re-render marcar o botão como desabilitado.
  const duplicatingRef = useRef(false)
  // O canvas da miniatura só é pintado perto da janela (uma vez).
  const rootRef = useRef<HTMLDivElement>(null)
  const near = useNearViewport(rootRef, true)

  async function handleDuplicate(): Promise<void> {
    if (duplicatingRef.current) return
    duplicatingRef.current = true
    setDuplicating(true)
    try {
      await onDuplicate(asset.id)
    } finally {
      duplicatingRef.current = false
      setDuplicating(false)
    }
  }

  /** Alvo de toque de 44px — a regra de mão de criança vale para as 3 ações. */
  const actionClass =
    'flex min-h-11 min-w-11 items-center justify-center rounded-xl transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pin-accent'

  return (
    <div
      ref={rootRef}
      className={`pin-panel pin-pop pin-gallery-card flex flex-col gap-1 p-2 ${KIND_PANEL_CLASSES[asset.kind]} ${justCreated ? 'pin-card-pop' : ''}`}
    >
      <button
        type="button"
        onClick={() => {
          if (selectable) onToggleSelect?.(asset.id)
          else onOpen(asset.id)
        }}
        aria-pressed={selectable ? selected : undefined}
        aria-label={
          selectable
            ? selected
              ? COPY.gallery.selectionUnmark(asset.name)
              : COPY.gallery.selectionMark(asset.name)
            : COPY.a11y.openAsset(
                `${asset.name} (${kind.title}${style ? `, ${COPY.styleBadge[style]}` : ''})`,
              )
        }
        className={`relative rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pin-accent ${
          selected ? 'rounded-xl ring-4 ring-pin-accent' : ''
        }`}
      >
        <AssetThumb asset={asset} findAsset={findAsset} paint={near} />
        {selectable && selected ? (
          <span
            aria-hidden="true"
            className="absolute top-1.5 right-1.5 inline-flex size-6 items-center justify-center rounded-full bg-pin-accent text-pin-accent-fg shadow"
          >
            <Check className="size-4" />
          </span>
        ) : null}
      </button>
      <div className="flex items-center gap-1">
        <span
          aria-hidden="true"
          className={`inline-flex size-4 shrink-0 items-center justify-center rounded-full text-[9px] text-white ${KIND_CHIP_CLASSES[asset.kind]}`}
          title={kind.title}
        >
          {kind.emoji}
        </span>
        <span className="truncate font-bold text-xs" title={asset.name}>
          {asset.name}
        </span>
        {style ? (
          <span
            className={`ml-auto shrink-0 rounded-full px-1.5 py-px font-bold text-[10px] text-white ${
              style === 'pixel' ? 'bg-pin-style-pixel' : 'bg-pin-style-vector'
            }`}
          >
            {COPY.styleBadge[style]}
          </span>
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-1">
        <button
          type="button"
          onClick={() => onRename(asset.id)}
          disabled={selectable}
          aria-label={`${COPY.gallery.rename} ${asset.name}`}
          title={COPY.gallery.rename}
          className={`${actionClass} hover:bg-pin-border/40 disabled:opacity-40`}
        >
          <Pencil aria-hidden="true" className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => void handleDuplicate()}
          disabled={selectable || duplicating}
          aria-busy={duplicating}
          aria-label={`${COPY.gallery.duplicate} ${asset.name}`}
          title={COPY.gallery.duplicate}
          className={`${actionClass} hover:bg-pin-border/40 disabled:opacity-40 ${duplicating ? 'disabled:cursor-wait disabled:opacity-50' : ''}`}
        >
          <Copy aria-hidden="true" className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => onRemove(asset.id)}
          disabled={selectable}
          aria-label={`${COPY.gallery.remove} ${asset.name}`}
          title={COPY.gallery.remove}
          className={`${actionClass} text-pin-danger hover:bg-pin-danger/20 disabled:opacity-40`}
        >
          <Trash2 aria-hidden="true" className="size-4" />
        </button>
      </div>
    </div>
  )
})
