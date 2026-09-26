import type { JSX } from 'react'
import type { ProjectAsset } from '#core'
import { Button } from '#ui'
import { ASSET_LIBRARY, type LibraryAsset } from '../../../asset-library/catalog'
import type { PersonalAsset } from '../../../asset-library/personal'
import { useT } from '../../../studio/i18n'
import type { EditTarget } from '../creationOrigin'
import { EditInOriginButton } from '../EditInOriginButton'
import { AssetNameInput, type AssetsTabCommon, DeleteAssetButton, EmptyHint } from './common'

export interface ImagesTabProps extends AssetsTabCommon {
  images: ProjectAsset[]
  allowUpload: boolean
  busy: boolean
  onUpload: () => void
  /** "Trazer do Pinta" — ausente quando o host não passa o adapter. */
  onOpenPinta: (() => void) | null
  /** Abre o editor de peças/fatiamento daquela imagem. */
  onConfigureTiles: (asset: ProjectAsset, mode: 'tileset' | 'tilemap') => void
  editTargetOf: (asset: ProjectAsset) => EditTarget | null
  onOpenInOrigin: (asset: ProjectAsset, target: EditTarget) => void
  /** A imagem tem `libId` pessoal e NENHUM dos dois catálogos a conhece. */
  isOriginUnknown: (asset: ProjectAsset) => boolean
  /** "Meus desenhos" (lista legada): só sem o "Trazer do Pinta". */
  personalImages: PersonalAsset[] | null
  onAddFromPersonal: (drawing: PersonalAsset) => void
  onEditDrawing: ((id: string) => void) | null
  onDeletePersonal: (drawing: PersonalAsset) => void
  onAddFromLibrary: (lib: LibraryAsset) => void
  /** O nome da imagem escolhida como capa do card (ausente = foto automática). */
  coverAssetName: string | undefined
  /** Escolher uma imagem como capa; `null` = voltar à foto automática. */
  onSetCover: (asset: ProjectAsset | null) => void
}

/** Aba "Imagens": o que o jogo desenha, mais as duas fontes de onde elas vêm. */
export function ImagesTab({
  images,
  allowUpload,
  busy,
  onUpload,
  onOpenPinta,
  onConfigureTiles,
  onRename,
  onDelete,
  editTargetOf,
  onOpenInOrigin,
  isOriginUnknown,
  personalImages,
  onAddFromPersonal,
  onEditDrawing,
  onDeletePersonal,
  onAddFromLibrary,
  coverAssetName,
  onSetCover,
}: ImagesTabProps): JSX.Element {
  const t = useT()
  return (
    <div className="flex flex-col gap-4">
      {allowUpload || onOpenPinta ? (
        <div className="flex flex-wrap items-center gap-3">
          {allowUpload ? (
            <Button variant="primary" size="sm" disabled={busy} onClick={onUpload}>
              {busy ? 'Processando…' : 'Enviar imagem'}
            </Button>
          ) : null}
          {onOpenPinta ? (
            <Button variant={allowUpload ? 'subtle' : 'primary'} size="sm" onClick={onOpenPinta}>
              {t('pintaImport.button')}
            </Button>
          ) : null}
        </div>
      ) : null}

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-sz-fg-mute">
          No projeto
        </h3>
        {images.length === 0 ? (
          <EmptyHint>
            Nenhuma imagem ainda. Envie do computador ou escolha uma da biblioteca abaixo.
          </EmptyHint>
        ) : (
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {images.map((asset) => {
              // Quem edita esta imagem: o Pinta (desenho) ou o Molda (textura).
              const editTarget = editTargetOf(asset)
              const isCover = coverAssetName !== undefined && asset.name === coverAssetName
              return (
                <li
                  key={asset.id}
                  className="flex items-center gap-2 rounded-md border border-sz-border bg-sz-panel-soft p-2"
                >
                  <img
                    src={asset.dataUrl}
                    alt={asset.name}
                    width={48}
                    height={48}
                    loading="lazy"
                    className="h-12 w-12 shrink-0 rounded bg-sz-bg object-contain"
                    style={{ imageRendering: 'pixelated' }}
                  />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <AssetNameInput
                      asset={asset}
                      what="a imagem"
                      onRename={onRename}
                      className="w-full"
                    />
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      {asset.tilemap ? (
                        <span
                          className="text-[9px] text-sz-fg-soft"
                          title={`mapa ${asset.tilemap.cols}×${asset.tilemap.rows}`}
                        >
                          🗺️ mapa
                        </span>
                      ) : null}
                      <button
                        type="button"
                        title="Definir o tamanho das peças e os tiles sólidos"
                        className="text-[10px] text-sz-fg-soft hover:text-sz-accent hover:underline"
                        onClick={() => onConfigureTiles(asset, 'tileset')}
                      >
                        🧩 peças
                      </button>
                      <button
                        type="button"
                        title="Fatiar esta imagem como um mapa de tiles"
                        className="text-[10px] text-sz-fg-soft hover:text-sz-accent hover:underline"
                        onClick={() => onConfigureTiles(asset, 'tilemap')}
                      >
                        🗺️ fatiar
                      </button>
                      {editTarget ? (
                        <EditInOriginButton
                          assetName={asset.name}
                          origin={editTarget.origin}
                          onClick={() => onOpenInOrigin(asset, editTarget)}
                        />
                      ) : null}
                      {isCover ? (
                        <>
                          <span className="rounded bg-sz-accent/15 px-1 text-[10px] font-semibold text-sz-accent">
                            {t('assets.cover.current')}
                          </span>
                          <button
                            type="button"
                            aria-label={t('assets.cover.resetAria')}
                            title={t('assets.cover.resetHint')}
                            className="text-[10px] text-sz-fg-soft hover:text-sz-accent hover:underline"
                            onClick={() => onSetCover(null)}
                          >
                            {t('assets.cover.reset')}
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          aria-label={t('assets.cover.useAria').replace('{name}', asset.name)}
                          title={t('assets.cover.useHint')}
                          className="text-[10px] text-sz-fg-soft hover:text-sz-accent hover:underline"
                          onClick={() => onSetCover(asset)}
                        >
                          {t('assets.cover.use')}
                        </button>
                      )}
                      {isOriginUnknown(asset) ? (
                        <span className="text-xs text-sz-warn">
                          Não sei de onde veio este desenho. Traga ele de novo pelo Pinta ou pelo
                          Molda.
                        </span>
                      ) : null}
                      <DeleteAssetButton asset={asset} onDelete={onDelete} />
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* Com o "Trazer do Pinta" presente, a seção morre (a modal cobre a
          galeria INTEIRA, com busca). Sem o adapter (ex.: perfil que perdeu
          a posse do Pinta), a lista antiga preserva o acesso ao que já foi
          enviado. O EFEITO de sincronia da casca roda nos dois casos — ele
          alimenta o auto-update dos jogos e o "✏️ editar desenho". */}
      {personalImages ? (
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-sz-fg-mute">
            Meus desenhos
          </h3>
          {personalImages.length === 0 ? (
            <EmptyHint>
              Desenhe no Pinta e toque em "Usar no Estúdio". Seus desenhos aparecem aqui.
            </EmptyHint>
          ) : (
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {personalImages.map((drawing) => (
                <li
                  key={drawing.id}
                  className="flex items-center gap-2 rounded-md border border-sz-border bg-sz-panel-soft p-2"
                >
                  <img
                    src={drawing.dataUrl}
                    alt={drawing.name}
                    width={48}
                    height={48}
                    loading="lazy"
                    className="h-12 w-12 shrink-0 rounded bg-sz-bg object-contain"
                    style={{ imageRendering: 'pixelated' }}
                  />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="truncate font-mono text-xs text-sz-fg" title={drawing.name}>
                      {drawing.name}
                      {drawing.tilemap ? (
                        <span
                          className="ml-1 text-[9px] text-sz-fg-soft"
                          title={`mapa ${drawing.tilemap.cols}×${drawing.tilemap.rows}`}
                        >
                          🗺️ mapa
                        </span>
                      ) : null}
                    </span>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <button
                        type="button"
                        className="text-xs text-sz-accent hover:underline"
                        onClick={() => onAddFromPersonal(drawing)}
                      >
                        Adicionar ao projeto
                      </button>
                      {onEditDrawing ? (
                        <button
                          type="button"
                          title="Abrir este desenho no Pinta (ele se atualiza nos seus jogos sozinho)"
                          className="text-xs text-sz-fg-soft hover:text-sz-accent hover:underline"
                          onClick={() => onEditDrawing(drawing.id)}
                        >
                          ✏️ Editar
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="text-xs text-red-400 hover:underline"
                        onClick={() => onDeletePersonal(drawing)}
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-sz-fg-mute">
          Biblioteca
        </h3>
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {ASSET_LIBRARY.map((lib) => (
            <li key={lib.id}>
              <button
                type="button"
                title={`Adicionar "${lib.name}"`}
                className="flex w-full flex-col items-center gap-1 rounded-md border border-sz-border bg-sz-bg p-2 hover:border-sz-accent"
                onClick={() => onAddFromLibrary(lib)}
              >
                <img
                  src={lib.dataUrl}
                  alt={lib.name}
                  width={40}
                  height={40}
                  loading="lazy"
                  className="h-10 w-10 object-contain"
                  style={{ imageRendering: 'pixelated' }}
                />
                <span className="max-w-full truncate text-[10px] text-sz-fg-soft">{lib.name}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
