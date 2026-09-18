import type { JSX } from 'react'
import type { ProjectAsset } from '#core'
import { Button } from '#ui'
import type { EditTarget } from '../creationOrigin'
import { EditInOriginButton } from '../EditInOriginButton'
import {
  AssetNameInput,
  AssetRow,
  type AssetsTabCommon,
  DeleteAssetButton,
  EmptyHint,
} from './common'

export interface Models3DTabProps extends AssetsTabCommon {
  models3d: ProjectAsset[]
  allowUpload: boolean
  busy: boolean
  /** Quem CONSOME .glb/.hdr está instalado (ver `has3DConsumer.ts`). */
  has3DExtension: boolean
  onUpload: () => void
  /** "Trazer do Molda" — ausente quando o host não passa o adapter. */
  onOpenMolda: (() => void) | null
  editTargetOf: (asset: ProjectAsset) => EditTarget | null
  onOpenInOrigin: (asset: ProjectAsset, target: EditTarget) => void
}

/**
 * Aba "Modelos 3D" (modelo .glb e céu 360° .hdr).
 *
 * ⚠️ A aba existe enquanto houver CONSUMIDOR 3D **ou** algum arquivo 3D no
 * projeto: gerenciar (renomear, excluir) um órfão não pode depender de a extensão
 * continuar instalada — é a mesma régua que a seção antiga já seguia. Só o ENVIO
 * depende do consumidor; sem ele o arquivo seria peso morto na cota.
 */
export function Models3DTab({
  models3d,
  allowUpload,
  busy,
  has3DExtension,
  onUpload,
  onOpenMolda,
  onRename,
  onDelete,
  editTargetOf,
  onOpenInOrigin,
}: Models3DTabProps): JSX.Element {
  return (
    <div className="flex flex-col gap-4">
      {onOpenMolda || (allowUpload && has3DExtension) ? (
        <div className="flex flex-wrap items-center gap-3">
          {onOpenMolda ? (
            <Button variant="primary" size="sm" onClick={onOpenMolda}>
              🧊 Trazer do Molda
            </Button>
          ) : null}
          {allowUpload && has3DExtension ? (
            <Button
              variant={onOpenMolda ? 'subtle' : 'primary'}
              size="sm"
              disabled={busy}
              title="Modelo 3D (.glb) ou céu 360° (.hdr) para Jogo 3D, Jogo 3D Avançado, Mundo 3D e Canvas 3D"
              onClick={onUpload}
            >
              {busy ? 'Processando…' : '📦 Enviar modelo 3D'}
            </Button>
          ) : null}
        </div>
      ) : null}
      {!has3DExtension ? (
        <p className="text-xs text-sz-fg-mute">
          Para USAR um modelo 3D, instale antes uma extensão que entenda 3D (Jogo 3D, Jogo 3D
          Avançado, Mundo 3D ou Canvas 3D), em "Extensões".
        </p>
      ) : null}

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-sz-fg-mute">
          No projeto
        </h3>
        {models3d.length === 0 ? (
          <EmptyHint>
            Nenhum modelo 3D ainda. Monte um no Molda e traga ele aqui (ou envie um .glb do
            computador); o céu 360° é um arquivo .hdr.
          </EmptyHint>
        ) : (
          <>
            <p className="mb-2 text-xs text-sz-fg-soft">
              Use o NOME no bloco "Criar o objeto … com o modelo" (Jogo 3D) ou na peça "modelo
              importado" do molde; se for .hdr, em "Usar o céu 360°" ou no "céu de foto".
            </p>
            <ul className="flex flex-col gap-2">
              {models3d.map((asset) => {
                const editTarget = editTargetOf(asset)
                return (
                  <AssetRow key={asset.id}>
                    <span
                      className="text-lg"
                      aria-hidden
                      title={asset.kind === 'model3d' ? 'Modelo .glb' : 'Céu 360° .hdr'}
                    >
                      {asset.kind === 'model3d' ? '📦' : '🌅'}
                    </span>
                    <AssetNameInput
                      asset={asset}
                      what="o modelo 3D"
                      onRename={onRename}
                      className="min-w-0 flex-1"
                    />
                    <span
                      className="max-w-[30%] truncate text-[10px] text-sz-fg-soft"
                      title={asset.originalFileName}
                    >
                      {asset.originalFileName}
                    </span>
                    {editTarget ? (
                      <EditInOriginButton
                        assetName={asset.name}
                        origin={editTarget.origin}
                        onClick={() => onOpenInOrigin(asset, editTarget)}
                      />
                    ) : null}
                    <DeleteAssetButton asset={asset} onDelete={onDelete} />
                  </AssetRow>
                )
              })}
            </ul>
          </>
        )}
      </section>
    </div>
  )
}
