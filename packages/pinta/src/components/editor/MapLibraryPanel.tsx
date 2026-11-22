import type { JSX } from 'react'
import { useState } from 'react'
import { COPY } from '../../core/copy'
import { embeddedTilesetOf } from '../../core/mapResourceVersions'
import { isObjectLayer, isTilesetKind, type PintaAsset } from '../../core/project'
import { isLocalRegionAsset } from '../../state/localRegionAssetAuthority'
import { createObjectTemplate } from '../../tiles/objectTemplate'
import { detachMapSet } from '../../tiles/sets'
import { usePintaApp, usePintaGallery } from '../appContext'
import { AssetThumb } from '../gallery/AssetCard'
import { Button } from '../ui/Button'
import { Panel } from '../ui/Panel'
import { useToast } from '../ui/Toast'
import { useEditorStores } from './editorContext'
import { MapResourceControls } from './MapResourceControls'
import type { LibraryPlacementController } from './mapTools/useLibraryPlacement'
export function MapLibraryPanel({
  layerId,
  selectedId,
  allowSets = true,
  placement,
}: {
  layerId: string
  selectedId: string | null
  allowSets?: boolean
  placement: LibraryPlacementController
}): JSX.Element {
  const assets = usePintaGallery((s) => s.assets),
    { editor } = useEditorStores()
  const { gallery } = usePintaApp(),
    { showToast } = useToast()
  const [search, setSearch] = useState('')
  const find = (id: string): PintaAsset | null =>
    assets.find((a): a is PintaAsset => a.id === id && !isLocalRegionAsset(a)) ?? null
  const chosen = editor.getState().asset
  const selected =
    chosen.kind === 'tilemap'
      ? chosen.layers
          .flatMap((l) => (isObjectLayer(l) ? l.objects : []))
          .find((o) => o.id === selectedId)
      : null
  const set = selected?.setId ? find(selected.setId) : null
  return (
    <Panel title={COPY.scene.desenhosDaBiblioteca}>
      {selected?.art && chosen.kind === 'tilemap' ? (
        <MapResourceControls map={chosen} object={selected} layerId={layerId} find={find} />
      ) : null}
      {selected && !selected.setId && chosen.kind === 'tilemap' ? (
        <Button
          variant="barOutline"
          className="mb-2 w-full"
          onClick={() => {
            const ts = embeddedTilesetOf(chosen) ?? find(chosen.tilesetId),
              size = ts && isTilesetKind(ts) ? ts.tileSize : 16
            const owner = chosen.layers.find(
              (l) => isObjectLayer(l) && l.objects.some((o) => o.id === selected.id),
            )!
            const set = createObjectTemplate(
              chosen,
              owner.id,
              selected.id,
              size,
              COPY.scene.nomeDoModelo(selected.name),
            )
            if (!set) {
              showToast(COPY.scene.conjuntoNaoGuardado)
              return
            }
            void gallery
              .getState()
              .createPrepared(set)
              .then((saved) =>
                showToast(
                  saved ? COPY.scene.conjuntoGuardado(saved.name) : COPY.scene.conjuntoNaoGuardado,
                ),
              )
          }}
        >
          {COPY.scene.guardarModeloDoObjeto}
        </Button>
      ) : null}
      {set?.kind === 'map-set' ? (
        <Button
          variant="barOutline"
          className="mb-2 w-full"
          onClick={() => {
            const s = editor.getState(),
              ts =
                chosen.kind === 'tilemap'
                  ? (embeddedTilesetOf(chosen) ?? find(chosen.tilesetId))
                  : null
            if (s.asset.kind === 'tilemap' && selectedId) {
              const next = detachMapSet(
                s.asset,
                layerId,
                selectedId,
                set,
                ts && isTilesetKind(ts) ? ts.tileSize : 16,
              )
              if (next === s.asset) showToast(COPY.scene.paraSoltarUseOTamanhoOriginalAlinhe)
              else s.commit(next)
            }
          }}
        >
          {COPY.scene.soltarOConjunto}
        </Button>
      ) : null}
      <input
        aria-label={COPY.scene.buscarNaBiblioteca}
        placeholder={COPY.scene.buscarDesenho}
        className="min-h-11 w-full rounded-xl border-2 border-pin-border bg-pin-surface px-2 text-sm"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <p className="mt-2 text-xs text-pin-muted">{COPY.scene.libraryHelp}</p>
      <p className="sr-only" role="status">
        {placement.message}
      </p>
      <div className="mt-2 grid max-h-52 grid-cols-3 gap-1 overflow-auto">
        {assets
          .filter(
            (a): a is PintaAsset =>
              !isLocalRegionAsset(a) &&
              a.kind !== 'tilemap' &&
              (allowSets || a.kind !== 'map-set') &&
              a.name.toLowerCase().includes(search.toLowerCase()),
          )
          .map((a) => (
            <button
              key={a.id}
              type="button"
              title={a.name}
              aria-label={COPY.scene.dynamicPorNoMapa(a.name)}
              onPointerDown={(event) => placement.down(a, event)}
              onLostPointerCapture={placement.lost}
              onClick={(event) => placement.click(a, event)}
              onDragStart={(event) => event.preventDefault()}
              draggable={false}
              style={{ touchAction: 'none' }}
              className="select-none overflow-hidden rounded-xl border-2 border-pin-border bg-pin-surface p-1 text-xs hover:border-pin-accent"
            >
              <AssetThumb asset={a} findAsset={find} />
              <span className="block truncate">{a.name}</span>
            </button>
          ))}
      </div>
    </Panel>
  )
}
