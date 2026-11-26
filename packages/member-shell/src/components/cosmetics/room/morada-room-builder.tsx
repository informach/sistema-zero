'use client'
import {
  applyMoradaPlacement,
  emptyMoradaHistory,
  isMoradaAdultOnly,
  isMoradaTrophyTier,
  MORADA_BUILD_TYPES,
  MORADA_CATALOG,
  MORADA_TROPHY_SHELF,
  type MoradaBuildType,
  type MoradaHouse,
  type MoradaInstance,
  type MoradaPiece,
  type MoradaRoom,
  moradaBuildType,
  moradaFileUrl,
  moradaInstanceCenter,
  moradaPieceAllowed,
  moradaPlace,
  moradaPrice,
  moradaRemove,
  moradaRemoveProblem,
  moradaRotateAroundCenter,
  pushMoradaHistory,
  redoMoradaHistory,
  undoMoradaHistory,
} from '@sistemazero/core/morada'
import {
  ArrowDownToLine,
  ArrowUpToLine,
  BrickWall,
  Copy,
  Grid3x3,
  Loader2,
  Lock,
  Move,
  Pipette,
  Redo2,
  RefreshCw,
  RotateCw,
  Scan,
  Scissors,
  Trash2,
  Undo2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import dynamic from 'next/dynamic'
import {
  type ComponentType,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  LIGHTING_PRESETS,
  ROOM_THEME_INFO,
  ROOM_WALL_PALETTE,
  THEME_PRESETS,
} from '../../../lib/room-catalog'
import { KidsMascot } from '../presentation'
import { adultPrice, adultUnlock } from '../skin'
import { moradaFitsRoom, moradaSurfaceOptions } from './morada-editor-model'
import type { RoomWallsMode } from './morada-room-scene'
import type { MoradaRoomViewProps, RoomPanel } from './morada-room-view'
import { moradaTrophyHint } from './morada-trophy-hint'
import type { RoomBuilderTab } from './room-builder-model'
import { RoomBuilderView } from './room-builder-view'
import { ROOM_ZOOM_MAX, type RoomZoomRequest } from './room-zoom'
import { useMoradaEditor } from './use-morada-editor'

const Scene = dynamic(
  () => import('./morada-room-scene').then((module) => module.MoradaRoomScene),
  { ssr: false },
)
const PAGE_SIZE = 48
const DECOR = new Set([
  'quadros',
  'tapetes',
  'livros',
  'objetos',
  'jogos',
  'brinquedos',
  'natal',
  'halloween',
  'comida',
])
const MATERIAL_LABELS: Record<string, string> = {
  face_a: 'Parede por dentro',
  face_b: 'Parede por fora',
  borda: 'Acabamento',
  piso: 'Piso',
  cor: 'Cor',
  vidro: 'Vidro',
  metal: 'Metal',
  telha: 'Telhado',
}
function matchesTab(piece: MoradaPiece, tab: RoomBuilderTab): boolean {
  if (tab === 'bichinho') return piece.kind === 'pet'
  // Os troféus e a estante de troféus (como no quarto antigo, a estante vem com o 1º troféu).
  if (tab === 'trofeus') return isMoradaTrophyTier(piece.id)
  if (tab === 'piso') return piece.category === 'chaos'
  if (tab === 'parede') return piece.kind === 'construction' && piece.category !== 'chaos'
  if (piece.kind !== 'furniture' || isMoradaTrophyTier(piece.id)) return false
  if (tab === 'plantas') return piece.category === 'plantas' || piece.category === 'fazenda'
  if (tab === 'luzes') return piece.category === 'luminarias'
  if (tab === 'enfeites') return DECOR.has(piece.category)
  return (
    tab === 'moveis' &&
    !DECOR.has(piece.category) &&
    !['plantas', 'luminarias', 'fazenda'].includes(piece.category)
  )
}

/** A casa e a persistência são novas; as duas superfícies visuais continuam as aprovadas. */
export function MoradaRoomBuilder({
  header,
  adult = false,
  view: View = RoomBuilderView,
  avatarPhotoUrl,
  trophyHints,
}: {
  header?: ReactNode
  adult?: boolean
  view?: ComponentType<MoradaRoomViewProps>
  avatarPhotoUrl?: string | null
  trophyHints?: Readonly<Record<string, string>>
}) {
  const editor = useMoradaEditor(adult ? 'adult' : 'kids', { autosave: !adult })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  /**
   * O modo construção (26/11/2026): a peça em andamento (nova, movida ou duplicada) segue o
   * ponteiro como fantasma e só entra na casa com o clique num lugar que serve; o desfazer guarda
   * a casa antes de cada gesto.
   */
  const [placing, setPlacing] = useState<{
    pieceId: string
    rotation: number
    base: MoradaInstance
    moving: boolean
    /** Cada peça em andamento é uma sessão: só o primeiro clique que serve dela vale. */
    session: number
  } | null>(null)
  const sessions = useRef(0)
  const [hover, setHover] = useState<[number, number] | null>(null)
  const [history, setHistory] = useState(emptyMoradaHistory)
  const [wallsMode, setWallsMode] = useState<RoomWallsMode>('cut')
  const [showGrid, setShowGrid] = useState(true)
  const [buildType, setBuildType] = useState<MoradaBuildType>('paredes')
  const [buildQuery, setBuildQuery] = useState('')
  const [copiedLook, setCopiedLook] = useState<Pick<MoradaInstance, 'colors' | 'materials'> | null>(
    null,
  )
  const [tab, setTab] = useState<RoomBuilderTab>('moveis')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const [stackPicker, setStackPicker] = useState(false)
  const [cutaway, setCutaway] = useState(true)
  /** Só o Kids (26/11/2026): a aba do painel, o pedido dos botões de zoom e o zoom atual. */
  const [panel, setPanel] = useState<RoomPanel>('decorar')
  const [zoomRequest, setZoomRequest] = useState<RoomZoomRequest | null>(null)
  const [zoomFactor, setZoomFactor] = useState(1)
  const askZoom = (kind: RoomZoomRequest['kind']) =>
    setZoomRequest((last) => ({ id: (last?.id ?? 0) + 1, kind }))
  const pieces = useMemo(() => Object.values(MORADA_CATALOG.pieces), [])
  // A posse do servidor (troféus, estante, compradas e o que já está na casa); as grátis entram
  // pela régua do core (`moradaPieceAllowed`).
  const ownedFromServer = useMemo(() => new Set(editor.saved?.owned ?? []), [editor.saved])
  const owned = useMemo(
    () => ({ has: (id: string) => moradaPieceAllowed(id, ownedFromServer) }),
    [ownedFromServer],
  )
  /** A peça paga que a criança tocou e ainda não confirmou comprar. */
  const [toBuy, setToBuy] = useState<MoradaPiece | null>(null)
  /** `comprada`: acabou de comprar (o `owned` ainda não renderizou de novo). */
  const place = (piece: MoradaPiece, comprada = false) =>
    piece.kind === 'pet' ? commit((h) => ({ ...h, pet: piece.id })) : add(piece.id, comprada)
  const confirmBuy = async () => {
    const piece = toBuy
    if (!piece) return
    const ok = await editor.buy(piece.id)
    setToBuy(null)
    if (ok) place(piece, true)
  }
  const draft = editor.draft
  // A casa foi trocada (abrir de novo, conflito resolvido): o desfazer recomeça. Voltar para uma
  // casa de antes da troca gravaria por cima da versão mais nova.
  // biome-ignore lint/correctness/useExhaustiveDependencies: recomeça a cada troca da casa.
  useEffect(() => {
    setHistory(emptyMoradaHistory())
    setPlacing(null)
  }, [editor.generation])
  const room = draft?.rooms.find((r) => r.id === draft.roomId)
  const selected = draft?.instances.find((i) => i.id === selectedId)
  const selectedPiece = selected ? MORADA_CATALOG.pieces[selected.pieceId] : undefined
  const locked = (adult && editor.status === 'saving') || Boolean(editor.conflict)
  /** Toda mudança da casa passa por aqui: guarda o passo do desfazer e salva sozinho depois. */
  const commit = (change: (house: MoradaHouse) => MoradaHouse, key: string | null = null) => {
    if (!draft || locked) return
    const before = draft
    setHistory((h) => pushMoradaHistory(h, before, key))
    editor.update(change)
  }
  const undo = () => {
    if (!draft || locked) return
    const step = undoMoradaHistory(history, draft)
    if (!step) return
    setHistory(step.history)
    setPlacing(null)
    editor.update(() => step.house)
  }
  const redo = () => {
    if (!draft || locked) return
    const step = redoMoradaHistory(history, draft)
    if (!step) return
    setHistory(step.history)
    setPlacing(null)
    editor.update(() => step.house)
  }
  const startPlacing = (pieceId: string, base?: MoradaInstance, moving = false) => {
    if (!draft || locked) return
    const instance: MoradaInstance = base ?? {
      id: crypto.randomUUID(),
      pieceId,
      roomId: draft.roomId,
      position: [0, 0, 0],
      rotation: 0,
    }
    sessions.current += 1
    setPlacing({
      pieceId,
      rotation: instance.rotation,
      base: instance,
      moving,
      session: sessions.current,
    })
    const piece = MORADA_CATALOG.pieces[pieceId]
    setHover(base && piece ? moradaInstanceCenter(base, piece) : null)
    setStackPicker(false)
  }
  const placement = useMemo(
    () =>
      placing && draft && hover
        ? moradaPlace(draft, placing.pieceId, hover, {
            rotation: placing.rotation,
            base: placing.base,
          })
        : null,
    [placing, draft, hover],
  )
  /**
   * Cada peça em andamento entra na casa UMA vez: a SESSÃO dela é gasta no primeiro clique que
   * serve. Dois `pointerup` do mesmo clique (ou um Enter junto) chegam com o mesmo `placing` ainda
   * na mão, antes de a tela renderizar de novo; sem esta marca a segunda janela entrava por cima.
   * A marca é da sessão, não do id da peça: mover a MESMA peça de novo abre outra sessão (com o id
   * gasto para sempre, o segundo Mover não fazia nada; revisão de 26/11/2026).
   */
  const usedSession = useRef(0)
  const confirmPlacement = (point?: [number, number]) => {
    if (!placing || !draft || usedSession.current === placing.session) return
    const result = point
      ? moradaPlace(draft, placing.pieceId, point, {
          rotation: placing.rotation,
          base: placing.base,
        })
      : placement
    if (!result) return
    if (!result.valid) {
      editor.setMessage(result.reason ?? 'Aqui não dá.')
      return
    }
    usedSession.current = placing.session
    commit((house) => applyMoradaPlacement(house, result))
    setSelectedId(result.instance.id)
    const piece = MORADA_CATALOG.pieces[placing.pieceId]
    // Parede, janela e piso continuam na mão (como no The Sims); móvel e peça movida soltam.
    if (piece?.kind === 'construction' && !placing.moving) {
      sessions.current += 1
      setPlacing({
        ...placing,
        base: { ...placing.base, id: crypto.randomUUID() },
        session: sessions.current,
      })
    } else setPlacing(null)
  }
  const chip = adult
    ? 'sz-cos-chip'
    : 'inline-flex min-h-11 items-center justify-center gap-1 rounded-full border-2 border-border bg-card px-3 py-1.5 font-semibold text-xs hover:border-primary disabled:opacity-50'
  const input = adult
    ? 'sz-cos-chip w-full'
    : 'min-h-11 w-full rounded-full border-2 border-border bg-background px-4 text-sm'
  const select = (instance: MoradaInstance) => {
    setSelectedId(instance.id)
    setStackPicker(false)
    // Tocar numa peça do quarto (ou na lista dela) abre o ajuste dela no painel. Pôr uma peça
    // nova pela loja NÃO passa por aqui: a criança continua na loja.
    setPanel('quarto')
  }
  const updateSelected = (change: Partial<MoradaInstance>) => {
    if (!selected || !draft || locked) return
    const next = { ...selected, ...change }
    if (!moradaFitsRoom(draft, next)) {
      editor.setMessage('A peça precisa caber dentro do quarto.')
      return
    }
    commit(
      (house) => ({
        ...house,
        instances: house.instances.map((i) => (i.id === selected.id ? next : i)),
      }),
      `ajuste:${selected.id}:${Object.keys(change).join(',')}`,
    )
  }
  const add = (pieceId: string, comprada = false) => {
    const piece = MORADA_CATALOG.pieces[pieceId]
    if (!draft || !piece || locked || !(comprada || owned.has(pieceId))) return
    if (adult) {
      const instance: MoradaInstance = {
        id: crypto.randomUUID(),
        pieceId,
        position: [0, piece.mount === 'wall' ? 1 : piece.mount === 'ceiling' ? 3 : 0, 0],
        rotation: 0,
        roomId: draft.roomId,
      }
      if (!moradaFitsRoom(draft, instance)) {
        editor.setMessage(
          'Esta peça é maior que o quarto. Ela pode ser usada numa área maior da casa.',
        )
        return
      }
      commit((h) => ({ ...h, instances: [...h.instances, instance] }))
      setSelectedId(instance.id)
      return
    }
    // Kids: a peça vem no ponteiro e cai onde a criança clicar.
    startPlacing(pieceId)
  }
  const move = (axis: number, delta: number) => {
    if (!selected || selected.parentId) return
    const position: [number, number, number] = [...selected.position]
    position[axis] = Math.round(((position[axis] ?? 0) + delta) * 2) / 2
    updateSelected({ position })
  }
  const rotate = () => {
    if (placing) {
      setPlacing({ ...placing, rotation: (placing.rotation + Math.PI / 2) % (Math.PI * 2) })
      return
    }
    if (!selected || !selectedPiece) return
    // Gira em volta do centro da peça (a parede girava pela ponta e saía do lugar).
    const next = moradaRotateAroundCenter(selected, selectedPiece)
    updateSelected({ rotation: next.rotation, position: next.position })
  }
  const remove = () => {
    if (!selected || !draft) return
    // A última parede com passagem não sai: o quarto ficaria sem saída.
    const problem = moradaRemoveProblem(draft, selected.id)
    if (problem) {
      editor.setMessage(problem)
      return
    }
    // Tirar janela fecha o vão (o trecho volta a parede lisa, com as cores); porta deixa a passagem.
    commit((h) => moradaRemove(h, selected.id))
    setSelectedId(null)
  }
  const duplicate = () => {
    if (!selected || !selectedPiece || selected.parentId) return
    // A cópia é só a peça: a função do jogo (`behavior`, a geladeira que o jogo deu) não se copia.
    // Copiada, ela virava peça paga de graça e travava a edição da casa no Arquipélago.
    const { behavior: _function, ...look } = selected
    startPlacing(selected.pieceId, { ...look, id: crypto.randomUUID() })
  }
  const pasteLook = () => {
    if (!copiedLook || !selected) return
    updateSelected({ colors: copiedLook.colors, materials: copiedLook.materials })
  }
  const keyDown = (event: KeyboardEvent<HTMLElement>, fromPage = false) => {
    const target = event.target as HTMLElement
    if (locked || target.matches('input,select,textarea') || target.isContentEditable) return
    const mod = event.ctrlKey || event.metaKey
    if (mod && (event.key === 'z' || event.key === 'Z' || event.key === 'y')) {
      event.preventDefault()
      if (event.key === 'y' || event.shiftKey) redo()
      else undo()
      return
    }
    if (placing) {
      const placingActions: Record<string, () => void> = {
        r: rotate,
        R: rotate,
        Escape: () => setPlacing(null),
        Enter: () => confirmPlacement(),
      }
      const action = placingActions[event.key]
      if (action) {
        event.preventDefault()
        action()
      }
      return
    }
    if (!selected) return
    const actions: Record<string, () => void> = {
      ArrowLeft: () => move(0, -0.5),
      ArrowRight: () => move(0, 0.5),
      ArrowUp: () => move(2, -0.5),
      ArrowDown: () => move(2, 0.5),
      r: rotate,
      R: rotate,
      // Apagar só com o foco no construtor: com o foco solto na página, um Backspace perdido
      // tirava a peça escolhida (e o salvar sozinho gravava em 1 s).
      ...(fromPage ? {} : { Delete: remove, Backspace: remove }),
      Escape: () => setSelectedId(null),
    }
    const action = actions[event.key]
    if (action) {
      event.preventDefault()
      action()
    }
  }
  // O foco costuma ficar na página (o clique no quarto 3D não foca nada): as teclas do modo
  // construção também valem com o foco no corpo da página.
  const keyRef = useRef(keyDown)
  keyRef.current = keyDown
  useEffect(() => {
    if (adult) return
    const onKey = (event: globalThis.KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      // A seção já trata as teclas dela; fora dela (o corpo da página, um botão da barra) também vale.
      if (target?.closest('section[aria-label]') || target?.matches?.('input,select,textarea'))
        return
      keyRef.current(event as unknown as KeyboardEvent<HTMLElement>, true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [adult])
  const applyLighting = (lighting: NonNullable<MoradaRoom['lighting']>) =>
    commit((house) => ({
      ...house,
      rooms: house.rooms.map((r) => (r.id === house.roomId ? { ...r, lighting } : r)),
    }))
  const applySurface = (kind: 'piso' | 'parede', value: { texture?: string; color?: string }) =>
    commit((house) => ({
      ...house,
      instances: house.instances.map((instance) => {
        if (instance.roomId !== house.roomId || instance.parentId) return instance
        const model = MORADA_CATALOG.pieces[instance.pieceId]
        if (!model) return instance
        const names =
          kind === 'piso'
            ? model.materials.filter((m) => m.name === 'piso').map((m) => m.name)
            : model.materials
                .filter((m) => m.name === 'face_a' || m.name === 'face_b')
                .map((m) => m.name)
        if (!names.length) return instance
        return {
          ...instance,
          materials: {
            ...instance.materials,
            ...Object.fromEntries(names.map((name) => [name, value])),
          },
        }
      }),
    }))
  const applyTheme = (id: string) => {
    const theme = THEME_PRESETS[id]
    if (!theme) return
    commit((house) => ({
      ...house,
      rooms: house.rooms.map((r) =>
        r.id === house.roomId ? { ...r, lighting: theme.lighting as MoradaRoom['lighting'] } : r,
      ),
      instances: house.instances.map((instance) => {
        if (instance.roomId !== house.roomId) return instance
        const model = MORADA_CATALOG.pieces[instance.pieceId]
        if (!model) return instance
        const materials = { ...instance.materials }
        for (const m of model.materials) {
          if (m.name === 'face_a') materials[m.name] = { color: theme.wallColors.left }
          if (m.name === 'face_b') materials[m.name] = { color: theme.wallColors.right }
          if (m.name === 'piso')
            materials[m.name] = {
              texture:
                theme.floor === 'piso-madeira-escura'
                  ? 'madeira_nogueira'
                  : theme.floor === 'piso-ladrilho'
                    ? 'mosaico_cinza'
                    : 'madeira_clara',
            }
        }
        return { ...instance, materials }
      }),
    }))
  }
  // Para pôr um troféu, a estante de troféus vem primeiro (destacada); as outras superfícies
  // continuam valendo, como no quarto antigo.
  const surfaces = (draft && selected ? moradaSurfaceOptions(draft, selected) : []).sort(
    (a, b) =>
      Number(b.parent.pieceId === MORADA_TROPHY_SHELF) -
      Number(a.parent.pieceId === MORADA_TROPHY_SHELF),
  )
  const trophyOnShelf = Boolean(selected && isMoradaTrophyTier(selected.pieceId))
  const filtered = pieces.filter(
    (p) =>
      matchesTab(p, tab) &&
      // Peça só do adulto (as de cassino) não aparece no Kids, a não ser que já seja dela.
      (adult || !isMoradaAdultOnly(p.id) || ownedFromServer.has(p.id)) &&
      p.label.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR')),
  )
  const tile = (piece: MoradaPiece) => {
    const price = moradaPrice(piece.id)
    const mine = owned.has(piece.id)
    const forSale = !mine && price.tier === 'coins'
    return (
      <button
        key={piece.id}
        type="button"
        // Troféu não conquistado fica travado; peça paga abre a compra.
        disabled={locked || (!mine && !forSale) || Boolean(editor.buying)}
        aria-pressed={piece.kind === 'pet' ? draft?.pet === piece.id : undefined}
        className={
          adult
            ? 'sz-cos-tile'
            : 'flex min-w-0 flex-col items-center gap-1 rounded-2xl border-2 border-border p-2 text-xs transition-colors hover:border-primary disabled:opacity-60'
        }
        onClick={() => (forSale ? setToBuy(piece) : place(piece))}
      >
        <img
          src={moradaFileUrl(piece.thumb)}
          alt=""
          loading="lazy"
          decoding="async"
          className={adult ? 'sz-cos-tile-thumb' : 'size-14 object-contain'}
        />
        <span
          className={adult ? 'sz-cos-tile-name' : 'max-w-full truncate font-semibold'}
          title={piece.label}
        >
          {piece.label}
        </span>
        {forSale ? (
          <span className={adult ? 'sz-cos-tile-name' : 'font-bold text-(--sz-hot)'}>
            <Lock className="inline size-3" aria-hidden="true" />{' '}
            {adult ? adultPrice(price.price) : `🪙 ${price.price}`}
            {adult ? null : <span className="sr-only"> moedas</span>}
          </span>
        ) : !mine ? (
          <span className="text-muted-foreground">
            <Lock className="inline size-3" /> {moradaTrophyHint(piece.id, adult, trophyHints)}
          </span>
        ) : null}
      </button>
    )
  }
  const notice = (
    <>
      {toBuy && adult ? (
        <div role="status" className="sz-cos-buybar">
          <p>
            <strong>{toBuy.label}</strong>
          </p>
          <div className="sz-cos-buybar-actions">
            <button
              type="button"
              className="sz-cos-buybar-quiet"
              disabled={Boolean(editor.buying)}
              onClick={() => setToBuy(null)}
            >
              Agora não
            </button>
            <button
              type="button"
              className="sz-cos-buybar-main"
              disabled={Boolean(editor.buying)}
              onClick={() => void confirmBuy()}
            >
              {adultUnlock(moradaPrice(toBuy.id).price)}
            </button>
          </div>
        </div>
      ) : toBuy ? (
        <div role="status" className="space-y-2 rounded-2xl bg-(--kids-lime-tint) px-4 py-3">
          <p className="font-semibold text-sm">
            Comprar {toBuy.label} por 🪙 {moradaPrice(toBuy.id).price} moedas?
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={chip}
              disabled={Boolean(editor.buying)}
              onClick={() => void confirmBuy()}
            >
              {editor.buying ? <Loader2 className="size-4 animate-spin" /> : null} Comprar
            </button>
            <button
              type="button"
              className={chip}
              disabled={Boolean(editor.buying)}
              onClick={() => setToBuy(null)}
            >
              Agora não
            </button>
          </div>
        </div>
      ) : null}
      {editor.message ? (
        <p
          role="status"
          className={
            adult
              ? 'sz-cos-hint'
              : 'rounded-2xl bg-(--kids-lime-tint) px-4 py-2 font-semibold text-sm'
          }
        >
          {editor.message}
        </p>
      ) : null}
      {editor.conflict ? (
        <div
          role="alert"
          className={
            adult ? 'sz-cos-buybar' : 'space-y-2 rounded-2xl bg-(--kids-lime-tint) px-4 py-3'
          }
        >
          <p>Sua casa mudou em outro lugar. Seu arranjo continua guardado aqui.</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={chip} onClick={() => editor.resolveConflict(false)}>
              Abrir versão mais recente
            </button>
            <button type="button" className={chip} onClick={() => editor.resolveConflict(true)}>
              Manter meu arranjo do quarto
            </button>
          </div>
        </div>
      ) : null}
    </>
  )
  const stage =
    draft && room ? (
      <div
        className={
          adult
            ? 'relative aspect-[3/2] w-full overflow-hidden rounded-2xl border-2 border-border bg-muted sz-cos-room-canvas'
            : 'relative aspect-[3/2] w-full overflow-hidden rounded-2xl border-2 border-border bg-muted @min-[45rem]/quarto:aspect-auto @min-[45rem]/quarto:h-full'
        }
      >
        <Scene
          house={draft}
          selectedId={placing ? null : selectedId}
          onSelect={placing ? undefined : select}
          onMove={
            placing || !adult
              ? undefined
              : (instance, position) => {
                  if (!draft || locked) return
                  const next = { ...instance, position }
                  if (moradaFitsRoom(draft, next))
                    commit(
                      (house) => ({
                        ...house,
                        instances: house.instances.map((i) => (i.id === instance.id ? next : i)),
                      }),
                      `mover:${instance.id}`,
                    )
                }
          }
          placement={placement}
          onFloorHover={placing ? setHover : undefined}
          onFloorClick={placing ? (point) => confirmPlacement(point) : undefined}
          wallsMode={adult ? undefined : wallsMode}
          showGrid={adult ? true : showGrid}
          cutaway={cutaway}
          zoomable={!adult}
          zoom={zoomRequest}
          onZoomChange={setZoomFactor}
          className="absolute inset-0 size-full"
        />
        {adult && avatarPhotoUrl ? (
          <img
            src={avatarPhotoUrl}
            alt="Meu avatar"
            className="pointer-events-none absolute bottom-2 left-2 w-[16%] max-w-36"
          />
        ) : null}
      </div>
    ) : (
      <div
        className={
          adult
            ? 'sz-cos-room-placeholder'
            : 'grid aspect-[3/2] h-full place-items-center rounded-2xl border-2 border-border bg-muted'
        }
      >
        {editor.status === 'error' ? (
          <div className="flex flex-col items-center gap-3">
            <p>Não consegui carregar seu quarto.</p>
            <button type="button" onClick={() => void editor.load()} className={chip}>
              <RefreshCw className="size-4" /> Tentar de novo
            </button>
          </div>
        ) : adult ? (
          <>
            <Loader2 aria-hidden="true" className="sz-cos-spin" />
            <span>Carregando espaço…</span>
          </>
        ) : (
          <KidsMascot expression="thinking" className="size-20" />
        )}
      </div>
    )
  const actions = selected ? (
    <div className={adult ? 'sz-cos-room-tools' : 'absolute top-2 right-2 flex gap-2'}>
      <button
        type="button"
        disabled={locked}
        className={
          adult
            ? 'sz-cos-tool'
            : 'inline-flex min-h-11 items-center gap-1 rounded-full bg-primary px-3 py-2.5 font-bold text-primary-foreground text-xs shadow'
        }
        onClick={() =>
          selected.parentId
            ? updateSelected({ parentId: undefined, slotId: undefined, position: [0, 0, 0] })
            : setStackPicker(!stackPicker)
        }
      >
        {selected.parentId ? (
          <>
            <ArrowDownToLine className="size-3.5" /> Descer
          </>
        ) : (
          <>
            <ArrowUpToLine className="size-3.5" /> Em cima…
          </>
        )}
      </button>
      <button
        type="button"
        disabled={locked}
        className={
          adult
            ? 'sz-cos-tool'
            : 'inline-flex min-h-11 items-center gap-1 rounded-full bg-primary px-3 py-2.5 font-bold text-primary-foreground text-xs shadow'
        }
        onClick={rotate}
      >
        <RotateCw className="size-3.5" /> Girar
      </button>
      {adult ? null : (
        <>
          <button
            type="button"
            disabled={locked || Boolean(selected.parentId)}
            className="inline-flex min-h-11 items-center gap-1 rounded-full bg-primary px-3 py-2.5 font-bold text-primary-foreground text-xs shadow"
            onClick={() => startPlacing(selected.pieceId, selected, true)}
          >
            <Move className="size-3.5" /> Mover
          </button>
          <button
            type="button"
            disabled={locked || Boolean(selected.parentId)}
            className="inline-flex min-h-11 items-center gap-1 rounded-full bg-primary px-3 py-2.5 font-bold text-primary-foreground text-xs shadow"
            onClick={duplicate}
          >
            <Copy className="size-3.5" /> Duplicar
          </button>
          <button
            type="button"
            disabled={locked}
            aria-pressed={Boolean(copiedLook)}
            className="inline-flex min-h-11 items-center gap-1 rounded-full bg-card px-3 py-2.5 font-bold text-foreground text-xs shadow"
            onClick={() =>
              copiedLook
                ? pasteLook()
                : setCopiedLook({ colors: selected.colors, materials: selected.materials })
            }
          >
            <Pipette className="size-3.5" /> {copiedLook ? 'Colar cores' : 'Copiar cores'}
          </button>
        </>
      )}
      <button
        type="button"
        disabled={locked}
        className={
          adult
            ? 'sz-cos-tool'
            : 'inline-flex min-h-11 items-center gap-1 rounded-full bg-(--sz-hot) px-3 py-2.5 font-bold text-(--sz-hot-fg) text-xs shadow'
        }
        onClick={remove}
      >
        <Trash2 className="size-3.5" /> Tirar
      </button>
    </div>
  ) : null
  /** "Colocar em cima de:", aberto pelo botão "Em cima…" da peça escolhida. */
  const stackPanel =
    stackPicker && selected ? (
      <div
        className={
          adult
            ? 'sz-cos-room-stack'
            : 'flex flex-wrap gap-2 rounded-2xl bg-(--kids-lime-tint) px-4 py-2.5'
        }
      >
        <span className="text-sm">Colocar em cima de:</span>
        {surfaces.map(({ parent, slot }) => (
          <button
            type="button"
            key={`${parent.id}:${slot.id}`}
            className={
              trophyOnShelf && parent.pieceId === MORADA_TROPHY_SHELF
                ? `${chip} border-primary bg-primary/10`
                : chip
            }
            onClick={() => {
              updateSelected({
                parentId: parent.id,
                slotId: slot.id,
                position: [0, 0, 0],
              })
              setStackPicker(false)
            }}
          >
            {parent.pieceId === MORADA_TROPHY_SHELF ? '🏆 ' : ''}
            {MORADA_CATALOG.pieces[parent.pieceId]?.label}
          </button>
        ))}
        {!surfaces.length ? (
          <p className="text-sm">Não há um espaço livre que caiba esta peça.</p>
        ) : null}
      </div>
    ) : null
  /** O ajuste fino da peça escolhida: andar meio passo, cores e texturas. */
  const adjustFields =
    selected && selectedPiece ? (
      <fieldset disabled={locked} className={adult ? 'mt-3 space-y-3' : 'space-y-3'}>
        <div className="flex flex-wrap gap-2">
          {[
            ['Esquerda', 0, -0.5],
            ['Direita', 0, 0.5],
            ['Fundo', 2, -0.5],
            ['Frente', 2, 0.5],
            ['Subir', 1, 0.5],
            ['Descer', 1, -0.5],
          ].map(([label, axis, delta]) => (
            <button
              type="button"
              key={label}
              className={chip}
              disabled={Boolean(selected.parentId)}
              onClick={() => move(Number(axis), Number(delta))}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-3">
          {selectedPiece.colors.map((name) => (
            <label key={name} className="flex min-h-11 items-center gap-2 text-sm">
              {name.replaceAll('_', ' ')}
              <input
                type="color"
                aria-label={`Cor ${name}`}
                value={selected.colors?.[name] ?? MORADA_CATALOG.palette[name]?.hex ?? '#ffffff'}
                onChange={(event) =>
                  updateSelected({ colors: { ...selected.colors, [name]: event.target.value } })
                }
              />
            </label>
          ))}
        </div>
        {selectedPiece.materials
          .filter((m) => m.name !== 'atlas')
          .map((m) => (
            <div key={m.name} className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 text-sm">
                {MATERIAL_LABELS[m.name] ?? m.name.replaceAll('_', ' ')}
                <input
                  type="color"
                  value={selected.materials?.[m.name]?.color ?? '#ffffff'}
                  onChange={(e) =>
                    updateSelected({
                      materials: { ...selected.materials, [m.name]: { color: e.target.value } },
                    })
                  }
                />
              </label>
              <select
                aria-label={`Textura ${MATERIAL_LABELS[m.name] ?? m.name}`}
                className={input}
                value={selected.materials?.[m.name]?.texture ?? ''}
                onChange={(e) =>
                  updateSelected({
                    materials: {
                      ...selected.materials,
                      [m.name]: e.target.value ? { texture: e.target.value } : {},
                    },
                  })
                }
              >
                <option value="">Textura original</option>
                {Object.values(MORADA_CATALOG.textures).map((texture) => (
                  <option key={texture.id} value={texture.id}>
                    {texture.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        <button
          type="button"
          className={chip}
          onClick={() => updateSelected({ colors: undefined, materials: undefined })}
        >
          Restaurar cores e texturas
        </button>
      </fieldset>
    ) : null
  const extras = (
    <div className="space-y-2">
      {stackPanel}
      {adjustFields && selectedPiece ? (
        <details
          className={adult ? 'sz-cos-room-stack' : 'rounded-2xl border-2 border-border bg-card p-3'}
        >
          <summary className="cursor-pointer font-semibold text-sm">
            Ajustar {selectedPiece.label}
          </summary>
          {adjustFields}
        </details>
      ) : null}
      <label className="flex min-h-11 items-center gap-2 text-muted-foreground text-xs">
        <input type="checkbox" checked={!cutaway} onChange={(e) => setCutaway(!e.target.checked)} />
        Mostrar todas as paredes
      </label>
    </div>
  )
  // Kids (26/11/2026): o zoom e as paredes moram POR CIMA do quarto, no canto de baixo. Os botões
  // não roubam o foco (as setas continuam movendo a peça escolhida).
  const keepFocus = (event: { preventDefault(): void }) => event.preventDefault()
  const toolButton =
    'inline-flex size-11 items-center justify-center rounded-full border-2 border-border bg-card text-foreground shadow-md transition-colors hover:border-primary disabled:opacity-50'
  const WALLS: { id: RoomWallsMode; label: string; icon: typeof BrickWall }[] = [
    { id: 'up', label: 'Paredes de pé', icon: BrickWall },
    { id: 'cut', label: 'Paredes da frente cortadas', icon: Scissors },
    { id: 'down', label: 'Paredes baixas', icon: ArrowDownToLine },
  ]
  const placingPiece = placing ? MORADA_CATALOG.pieces[placing.pieceId] : undefined
  const stageTools = adult ? null : (
    <>
      <div
        role="group"
        aria-label="Desfazer e refazer"
        className="absolute top-2 left-2 flex gap-2"
      >
        <button
          type="button"
          aria-label="Desfazer"
          title="Desfazer (Ctrl+Z)"
          disabled={!history.past.length || locked}
          onMouseDown={keepFocus}
          onClick={undo}
          className={toolButton}
        >
          <Undo2 className="size-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label="Refazer"
          title="Refazer (Ctrl+Shift+Z)"
          disabled={!history.future.length || locked}
          onMouseDown={keepFocus}
          onClick={redo}
          className={toolButton}
        >
          <Redo2 className="size-5" aria-hidden="true" />
        </button>
      </div>
      {placing && placingPiece ? (
        <div
          role="status"
          className={`absolute top-2 left-1/2 max-w-[calc(100%-14rem)] -translate-x-1/2 rounded-full px-4 py-2 text-center font-bold text-sm shadow-md ${placement && !placement.valid ? 'bg-(--sz-hot) text-(--sz-hot-fg)' : 'bg-card text-foreground'}`}
        >
          {placement && !placement.valid
            ? placement.reason
            : placement?.replace
              ? `Clique para pôr ${placingPiece.label.toLocaleLowerCase('pt-BR')}: a parede ganha o vão`
              : `Clique para pôr · R gira · Esc cancela`}
        </div>
      ) : null}
      <div className="absolute bottom-2 left-2 flex gap-2">
        <div
          role="group"
          aria-label="Paredes"
          className="flex gap-1 rounded-full border-2 border-border bg-card p-1 shadow-md"
        >
          {WALLS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              aria-pressed={wallsMode === id}
              aria-label={label}
              title={label}
              onMouseDown={keepFocus}
              onClick={() => {
                setWallsMode(id)
                setCutaway(id !== 'up')
              }}
              className={`inline-flex size-9 items-center justify-center rounded-full ${wallsMode === id ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-muted'}`}
            >
              <Icon className="size-4" aria-hidden="true" />
            </button>
          ))}
        </div>
        <button
          type="button"
          aria-pressed={showGrid}
          aria-label="Mostrar a grade"
          title="Mostrar a grade"
          onMouseDown={keepFocus}
          onClick={() => setShowGrid((value) => !value)}
          className={`${toolButton} ${showGrid ? 'border-primary bg-primary/10' : ''}`}
        >
          <Grid3x3 className="size-5" aria-hidden="true" />
        </button>
      </div>
      <div
        role="group"
        aria-label="Zoom do quarto"
        className="absolute right-2 bottom-2 flex gap-2 @min-[45rem]/quarto:flex-col"
      >
        <button
          type="button"
          aria-label="Aproximar"
          title="Aproximar"
          disabled={zoomFactor >= ROOM_ZOOM_MAX - 0.01}
          onMouseDown={keepFocus}
          onClick={() => askZoom('in')}
          className={toolButton}
        >
          <ZoomIn className="size-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label="Afastar"
          title="Afastar"
          disabled={zoomFactor <= 1.01}
          onMouseDown={keepFocus}
          onClick={() => askZoom('out')}
          className={toolButton}
        >
          <ZoomOut className="size-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label="Ver o quarto todo"
          title="Ver o quarto todo"
          onMouseDown={keepFocus}
          onClick={() => askZoom('reset')}
          className={toolButton}
        >
          <Scan className="size-5" aria-hidden="true" />
        </button>
      </div>
    </>
  )
  const avatar =
    !adult && avatarPhotoUrl ? (
      <img
        src={avatarPhotoUrl}
        alt="Meu avatar"
        className="size-11 shrink-0 rounded-full border-2 border-border bg-card object-cover object-top shadow-md"
      />
    ) : null
  // A tira original lista os objetos decorados. Pisos e paredes têm suas próprias
  // abas e não devem ocupar a tira nem empurrar a bandeja para baixo no celular.
  const placed =
    draft?.instances.filter(
      (i) => i.roomId === draft.roomId && MORADA_CATALOG.pieces[i.pieceId]?.kind !== 'construction',
    ) ?? []
  const chips = placed.map((instance) => (
    <button
      type="button"
      key={instance.id}
      aria-pressed={instance.id === selectedId}
      className={
        adult
          ? 'sz-cos-chip'
          : `inline-flex min-h-11 items-center gap-1 rounded-full border-2 px-3 py-1.5 font-semibold text-xs ${instance.id === selectedId ? 'border-primary bg-primary/10' : 'border-border'}`
      }
      onClick={() => select(instance)}
    >
      {MORADA_CATALOG.pieces[instance.pieceId]?.label ?? 'Peça'}
    </button>
  ))
  const buildPieces = pieces.filter(
    (p) =>
      moradaBuildType(p) === buildType &&
      p.label.toLocaleLowerCase('pt-BR').includes(buildQuery.toLocaleLowerCase('pt-BR')),
  )
  const build = adult ? null : (
    <fieldset disabled={locked} className="space-y-3">
      <legend className="sr-only">Construir</legend>
      <div role="group" aria-label="Tipos de construção" className="grid grid-cols-3 gap-1.5">
        {MORADA_BUILD_TYPES.map((type) => (
          <button
            key={type.id}
            type="button"
            aria-pressed={buildType === type.id}
            onClick={() => {
              setBuildType(type.id)
              setBuildQuery('')
            }}
            className={`min-h-11 rounded-2xl border-2 px-2 font-semibold text-xs ${buildType === type.id ? 'border-primary bg-primary/10' : 'border-border'}`}
          >
            {type.label}
          </button>
        ))}
      </div>
      {buildType === 'paredes' ? (
        <div className="flex flex-wrap gap-2">
          {ROOM_WALL_PALETTE.map((color) => (
            <button
              key={color.hex}
              type="button"
              className="min-h-11 min-w-11 rounded-full border-2 border-border"
              aria-label={`Pintar parede de ${color.labelPt}`}
              style={{ background: color.hex }}
              onClick={() => applySurface('parede', { color: color.hex })}
            />
          ))}
        </div>
      ) : null}
      <input
        type="search"
        aria-label="Buscar na construção"
        placeholder="Buscar"
        className={input}
        value={buildQuery}
        onChange={(e) => setBuildQuery(e.target.value)}
      />
      <div className="grid grid-cols-3 gap-2 @min-[20rem]/bandeja:grid-cols-4">
        {buildPieces.slice(0, 60).map((p) => (
          <button
            key={p.id}
            type="button"
            aria-pressed={placing?.pieceId === p.id && !placing.moving}
            onClick={() => startPlacing(p.id)}
            className={`flex min-w-0 flex-col items-center gap-1 rounded-2xl border-2 p-2 text-xs transition-colors hover:border-primary ${placing?.pieceId === p.id && !placing.moving ? 'border-primary bg-primary/10' : 'border-border'}`}
          >
            <img
              src={moradaFileUrl(p.thumb)}
              alt=""
              loading="lazy"
              decoding="async"
              className="size-14 object-contain"
            />
            <span className="max-w-full truncate font-semibold" title={p.label}>
              {p.label}
            </span>
          </button>
        ))}
      </div>
    </fieldset>
  )
  const textures = Object.values(MORADA_CATALOG.textures).filter(
    (texture) => texture.kind === (tab === 'piso' ? 'piso' : 'parede'),
  )
  const tray = (
    <fieldset disabled={locked} className="space-y-3">
      <legend className="sr-only">Itens do quarto</legend>
      {tab === 'clima' ? (
        <div className={adult ? 'sz-cos-tiles' : 'grid grid-cols-2 gap-2'}>
          {Object.entries(LIGHTING_PRESETS).map(([id, preset]) => (
            <button
              key={id}
              type="button"
              className={chip}
              aria-pressed={(room?.lighting ?? 'dia') === id}
              onClick={() => applyLighting(id as NonNullable<MoradaRoom['lighting']>)}
            >
              <span
                className="mr-2 size-5 rounded-full"
                style={{ background: preset.background }}
              />
              {preset.labelPt}
            </button>
          ))}
        </div>
      ) : tab === 'tema' ? (
        <div className={adult ? 'sz-cos-tiles' : 'grid grid-cols-2 gap-2'}>
          {Object.entries(ROOM_THEME_INFO).map(([id, info]) => (
            <button key={id} type="button" className={chip} onClick={() => applyTheme(id)}>
              {info.labelPt}
            </button>
          ))}
        </div>
      ) : (
        <>
          {tab === 'parede' ? (
            <div className="flex flex-wrap gap-2">
              {ROOM_WALL_PALETTE.map((color) => (
                <button
                  key={color.hex}
                  type="button"
                  className="min-h-11 min-w-11 rounded-full border-2 border-border"
                  aria-label={`Pintar parede de ${color.labelPt}`}
                  style={{ background: color.hex }}
                  onClick={() => applySurface('parede', { color: color.hex })}
                />
              ))}
            </div>
          ) : null}
          {tab === 'piso' || tab === 'parede' ? (
            <details>
              <summary className="cursor-pointer font-semibold text-sm">Texturas</summary>
              <div className={adult ? 'sz-cos-tiles' : 'mt-2 grid grid-cols-4 gap-2'}>
                {textures.map((texture) => (
                  <button
                    type="button"
                    className={
                      adult
                        ? 'sz-cos-tile'
                        : 'flex flex-col items-center gap-1 rounded-2xl border-2 border-border p-2 text-xs hover:border-primary'
                    }
                    key={texture.id}
                    onClick={() =>
                      applySurface(tab === 'piso' ? 'piso' : 'parede', { texture: texture.id })
                    }
                  >
                    <img
                      src={moradaFileUrl(texture.file)}
                      alt=""
                      loading="lazy"
                      className="size-14 rounded-lg object-cover"
                    />
                    <span>{texture.label}</span>
                  </button>
                ))}
              </div>
            </details>
          ) : null}
          <input
            type="search"
            aria-label="Buscar peça"
            placeholder="Buscar peça"
            className={input}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setPage(0)
            }}
          />
          {tab === 'bichinho' ? (
            <button
              type="button"
              className={chip}
              aria-pressed={!draft?.pet}
              onClick={() => commit((h) => ({ ...h, pet: null }))}
            >
              Sem bichinho
            </button>
          ) : null}
          <div
            className={
              adult ? 'sz-cos-tiles' : 'grid grid-cols-4 gap-2 @min-[36rem]/bandeja:grid-cols-6'
            }
          >
            {filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map(tile)}
          </div>
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              className={chip}
              disabled={!page}
              onClick={() => setPage((p) => p - 1)}
            >
              Anterior
            </button>
            <span className="text-muted-foreground text-xs">
              {filtered.length ? page + 1 : 0} / {Math.ceil(filtered.length / PAGE_SIZE)}
            </span>
            <button
              type="button"
              className={chip}
              disabled={(page + 1) * PAGE_SIZE >= filtered.length}
              onClick={() => setPage((p) => p + 1)}
            >
              Próxima
            </button>
          </div>
        </>
      )}
    </fieldset>
  )
  return (
    <section onKeyDown={keyDown} aria-label={adult ? 'Meu espaço 3D' : 'Meu quarto'}>
      <View
        header={header}
        wallet={editor.wallet}
        saving={editor.status === 'saving'}
        ready={Boolean(draft) && !locked}
        onSave={() => void editor.save()}
        saveState={adult ? undefined : editor.saveState}
        build={build}
        tab={tab}
        onTab={(next) => {
          setTab(next)
          setQuery('')
          setPage(0)
        }}
        stage={stage}
        actions={actions}
        pieces={chips}
        extras={extras}
        tray={tray}
        notice={editor.message || editor.conflict || toBuy ? notice : null}
        avatar={avatar}
        stageTools={stageTools}
        stack={stackPanel}
        adjust={adjustFields}
        placedCount={placed.length}
        selectedLabel={selected ? (selectedPiece?.label ?? 'Peça') : null}
        panel={panel}
        onPanel={setPanel}
      />
    </section>
  )
}
