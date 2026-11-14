'use client'
import {
  isMoradaTrophyTier,
  MORADA_CATALOG,
  MORADA_TROPHY_SHELF,
  type MoradaInstance,
  type MoradaPiece,
  type MoradaRoom,
  moradaFileUrl,
  moradaPieceAllowed,
  moradaPrice,
} from '@sistemazero/core/morada'
import {
  ArrowDownToLine,
  ArrowUpToLine,
  Loader2,
  Lock,
  RefreshCw,
  RotateCw,
  Trash2,
} from 'lucide-react'
import dynamic from 'next/dynamic'
import { type ComponentType, type KeyboardEvent, type ReactNode, useMemo, useState } from 'react'
import {
  LIGHTING_PRESETS,
  ROOM_THEME_INFO,
  ROOM_WALL_PALETTE,
  THEME_PRESETS,
} from '../../../lib/room-catalog'
import { KidsMascot } from '../presentation'
import { adultPrice, adultUnlock } from '../skin'
import { moradaFitsRoom, moradaSurfaceOptions, removeMoradaInstance } from './morada-editor-model'
import type { MoradaRoomViewProps } from './morada-room-view'
import { moradaTrophyHint } from './morada-trophy-hint'
import type { RoomBuilderTab } from './room-builder-model'
import { RoomBuilderView } from './room-builder-view'
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
  const editor = useMoradaEditor(adult ? 'adult' : 'kids')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [tab, setTab] = useState<RoomBuilderTab>('moveis')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const [stackPicker, setStackPicker] = useState(false)
  const [cutaway, setCutaway] = useState(true)
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
    piece.kind === 'pet' ? editor.update((h) => ({ ...h, pet: piece.id })) : add(piece.id, comprada)
  const confirmBuy = async () => {
    const piece = toBuy
    if (!piece) return
    const ok = await editor.buy(piece.id)
    setToBuy(null)
    if (ok) place(piece, true)
  }
  const draft = editor.draft
  const room = draft?.rooms.find((r) => r.id === draft.roomId)
  const selected = draft?.instances.find((i) => i.id === selectedId)
  const selectedPiece = selected ? MORADA_CATALOG.pieces[selected.pieceId] : undefined
  const locked = editor.status === 'saving' || Boolean(editor.conflict)
  const chip = adult
    ? 'sz-cos-chip'
    : 'inline-flex min-h-11 items-center justify-center gap-1 rounded-full border-2 border-border bg-card px-3 py-1.5 font-semibold text-xs hover:border-primary disabled:opacity-50'
  const input = adult
    ? 'sz-cos-chip w-full'
    : 'min-h-11 w-full rounded-full border-2 border-border bg-background px-4 text-sm'
  const select = (instance: MoradaInstance) => {
    setSelectedId(instance.id)
    setStackPicker(false)
  }
  const updateSelected = (change: Partial<MoradaInstance>) => {
    if (!selected || !draft || locked) return
    const next = { ...selected, ...change }
    if (!moradaFitsRoom(draft, next)) {
      editor.setMessage('A peça precisa caber dentro do quarto.')
      return
    }
    editor.update((house) => ({
      ...house,
      instances: house.instances.map((i) => (i.id === selected.id ? next : i)),
    }))
  }
  const add = (pieceId: string, comprada = false) => {
    const piece = MORADA_CATALOG.pieces[pieceId]
    if (!draft || !piece || locked || !(comprada || owned.has(pieceId))) return
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
    editor.update((h) => ({ ...h, instances: [...h.instances, instance] }))
    setSelectedId(instance.id)
  }
  const move = (axis: number, delta: number) => {
    if (!selected || selected.parentId) return
    const position: [number, number, number] = [...selected.position]
    position[axis] = Math.round(((position[axis] ?? 0) + delta) * 2) / 2
    updateSelected({ position })
  }
  const rotate = () =>
    selected &&
    updateSelected({ rotation: (selected.rotation + Math.PI / 2 + Math.PI * 2) % (Math.PI * 2) })
  const remove = () => {
    if (selected) editor.update((h) => removeMoradaInstance(h, selected.id))
    setSelectedId(null)
  }
  const keyDown = (event: KeyboardEvent<HTMLElement>) => {
    const target = event.target as HTMLElement
    if (!selected || locked || target.matches('input,select,textarea') || target.isContentEditable)
      return
    const actions: Record<string, () => void> = {
      ArrowLeft: () => move(0, -0.5),
      ArrowRight: () => move(0, 0.5),
      ArrowUp: () => move(2, -0.5),
      ArrowDown: () => move(2, 0.5),
      r: rotate,
      R: rotate,
      Delete: remove,
      Backspace: remove,
      Escape: () => setSelectedId(null),
    }
    const action = actions[event.key]
    if (action) {
      event.preventDefault()
      action()
    }
  }
  const applyLighting = (lighting: NonNullable<MoradaRoom['lighting']>) =>
    editor.update((house) => ({
      ...house,
      rooms: house.rooms.map((r) => (r.id === house.roomId ? { ...r, lighting } : r)),
    }))
  const applySurface = (kind: 'piso' | 'parede', value: { texture?: string; color?: string }) =>
    editor.update((house) => ({
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
    editor.update((house) => ({
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
          selectedId={selectedId}
          onSelect={select}
          onMove={(instance, position) => {
            if (!draft || locked) return
            const next = { ...instance, position }
            if (moradaFitsRoom(draft, next))
              editor.update((house) => ({
                ...house,
                instances: house.instances.map((i) => (i.id === instance.id ? next : i)),
              }))
          }}
          cutaway={cutaway}
          className="absolute inset-0 size-full"
        />
        {avatarPhotoUrl ? (
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
  const extras = (
    <div className="space-y-2">
      {stackPicker && selected ? (
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
      ) : null}
      {selected && selectedPiece ? (
        <details
          className={adult ? 'sz-cos-room-stack' : 'rounded-2xl border-2 border-border bg-card p-3'}
        >
          <summary className="cursor-pointer font-semibold text-sm">
            Ajustar {selectedPiece.label}
          </summary>
          <fieldset disabled={locked} className="mt-3 space-y-3">
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
                    value={
                      selected.colors?.[name] ?? MORADA_CATALOG.palette[name]?.hex ?? '#ffffff'
                    }
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
        </details>
      ) : null}
      <label className="flex min-h-11 items-center gap-2 text-muted-foreground text-xs">
        <input type="checkbox" checked={!cutaway} onChange={(e) => setCutaway(!e.target.checked)} />
        Mostrar todas as paredes
      </label>
    </div>
  )
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
              onClick={() => editor.update((h) => ({ ...h, pet: null }))}
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
      />
    </section>
  )
}
