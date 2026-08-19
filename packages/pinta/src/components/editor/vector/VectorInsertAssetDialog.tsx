/**
 * "Trazer um desenho": escolhe um desenho da galeria para entrar no desenho de
 * vetor aberto.
 *
 * Lê a galeria DIRETO (`usePintaGallery`) — ela já está no processo, não há
 * ponte nem adaptador no caminho. A miniatura é a MESMA do card da galeria
 * (`AssetThumb`), então o que a criança vê é o que entra; e cada card diz, em
 * palavras, se aquilo vai virar FORMAS ou uma FIGURA.
 */
import type { JSX } from 'react'
import { useCallback, useMemo, useState } from 'react'
import { COPY } from '../../../core/copy'
import type { PintaAsset } from '../../../core/project'
import { normalizeSearchText } from '../../../core/searchText'
import { insertableAssets, insertKindFor } from '../../../vector/insertAsset'
import { usePintaGallery } from '../../appContext'
import { AssetThumb } from '../../gallery/AssetCard'
import { Dialog } from '../../ui/Dialog'
import { useVectorEditor } from './VectorEditorScope'

export function VectorInsertAssetDialog({
  open,
  onClose,
  currentId,
}: {
  open: boolean
  onClose: () => void
  currentId: string
}): JSX.Element {
  const assets = usePintaGallery((state) => state.assets)
  const { insertFromAsset } = useVectorEditor()
  const [query, setQuery] = useState('')

  // Índice por id estável (o `AssetThumb` do mapa procura as peças por card; sem memo, cada
  // card fazia uma busca linear e a função nova por render anulava qualquer memo).
  const assetsById = useMemo(() => new Map(assets.map((a) => [a.id, a])), [assets])
  const findAsset = useCallback(
    (id: string): PintaAsset | null => assetsById.get(id) ?? null,
    [assetsById],
  )
  const disponiveis = useMemo(
    () => insertableAssets(assets, currentId, '', normalizeSearchText),
    [assets, currentId],
  )
  const candidatos = useMemo(() => {
    const needle = normalizeSearchText(query)
    if (!needle) return disponiveis
    return disponiveis.filter((asset) =>
      normalizeSearchText(`${asset.name} ${asset.projectRef?.name ?? ''}`).includes(needle),
    )
  }, [disponiveis, query])
  const temAlgum = disponiveis.length > 0

  return (
    <Dialog open={open} onClose={onClose} title={COPY.vector.insertTitle} wide>
      {temAlgum ? (
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={COPY.vector.insertSearch}
          aria-label={COPY.vector.insertSearch}
          className="mb-3 min-h-11 w-full rounded-xl border-2 border-pin-border bg-pin-bg px-4 text-base outline-none focus:border-pin-accent"
        />
      ) : null}

      {!temAlgum ? (
        <p className="py-6 text-center text-pin-muted">{COPY.vector.insertNothing}</p>
      ) : candidatos.length === 0 ? (
        <p className="py-6 text-center text-pin-muted">{COPY.vector.insertNoMatch}</p>
      ) : (
        <div className="grid max-h-96 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
          {candidatos.map((asset) => {
            const insertKind = insertKindFor(asset)
            const comoEntra =
              insertKind === 'shapes' ? COPY.vector.insertAsShapes : COPY.vector.insertAsImage
            return (
              <button
                key={asset.id}
                type="button"
                onClick={() => {
                  if (insertFromAsset(asset)) onClose()
                }}
                className="pin-panel flex flex-col gap-1 p-2 text-left transition hover:border-pin-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pin-accent"
              >
                <AssetThumb asset={asset} findAsset={findAsset} />
                <span className="truncate text-sm font-bold text-pin-text">{asset.name}</span>
                <span className="text-xs text-pin-muted">{comoEntra}</span>
              </button>
            )
          })}
        </div>
      )}
    </Dialog>
  )
}
