'use client'

import dynamic from 'next/dynamic'
import { cn } from '@/lib/cn'
import { lightingPreset, resolveRoomAppearance } from '@/lib/room-catalog'
import type { RoomStateView } from '@/lib/types'
import { KidsAvatar } from '../kids-avatar'
import { KidsMascot } from '../mascot'

/**
 * Quarto virtual — wrapper PÚBLICO (consumido pelo editor e pelo perfil público). Carrega o
 * renderer 3D (react-three-fiber) só no cliente via `dynamic(ssr:false)` — `three` nunca roda
 * no SSR. Props: state/mode/selectedIndex/onSelect/onMove + as do editor (onPaintWall/paintColor)
 * e `avatarPhotoUrl` (foto/snapshot do avatar 3D do perfil). A foto do avatar é um overlay 2D no
 * canto (reusa o `<KidsAvatar photoUrl>`); a cena 3D é a peça principal.
 */
const Room3D = dynamic(() => import('./room-canvas-3d').then((m) => m.RoomCanvas3D), {
  ssr: false,
  loading: () => <RoomLoading />,
})

function RoomLoading() {
  return (
    <div className="absolute inset-0 grid place-items-center bg-muted">
      <KidsMascot expression="thinking" className="size-16 animate-pulse" />
    </div>
  )
}

export function RoomCanvas({
  state,
  mode,
  avatarPhotoUrl,
  selectedIndex = null,
  onSelect,
  onMove,
  onPaintWall,
  paintColor = null,
}: {
  state: RoomStateView
  mode: 'edit' | 'view'
  /** Foto do avatar da criança ancorada no quarto (`undefined` = não mostra; `null` = padrão). */
  avatarPhotoUrl?: string | null
  selectedIndex?: number | null
  onSelect?: (index: number | null) => void
  /** Arrasta um item para a célula (x,y) — o pai valida/clampa contra a grade. */
  onMove?: (index: number, x: number, y: number) => void
  /** Pinta a parede (`left`/`right`) com a cor ativa do pincel (só editor). */
  onPaintWall?: (wall: 'left' | 'right', color: string) => void
  /** Cor ativa do pincel (`null` = não está pintando). */
  paintColor?: string | null
}) {
  const dark = Boolean(lightingPreset(resolveRoomAppearance(state).lightingId).dark)
  return (
    <div className="relative aspect-[3/2] w-full select-none overflow-hidden rounded-2xl border-2 border-border bg-muted">
      <Room3D
        state={state}
        mode={mode}
        selectedIndex={selectedIndex}
        onSelect={onSelect}
        onMove={onMove}
        onPaintWall={onPaintWall}
        paintColor={paintColor}
        className="absolute inset-0 size-full"
      />
      {avatarPhotoUrl !== undefined ? (
        <div className="pointer-events-none absolute bottom-2 left-2 w-[16%] min-w-12">
          <KidsAvatar photoUrl={avatarPhotoUrl} size="lg" className="size-full drop-shadow-md" />
        </div>
      ) : null}
      {mode === 'edit' && state.placedItems.length === 0 ? (
        <p
          className={cn(
            'pointer-events-none absolute inset-x-0 top-3 px-4 text-center font-semibold text-sm',
            dark ? 'text-white/85' : 'text-foreground/70',
          )}
        >
          Toque numa peça na lojinha para montar seu quarto! 🛋️
        </p>
      ) : null}
    </div>
  )
}
