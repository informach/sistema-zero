import type { JSX } from 'react'
import type { ProjectAsset } from '#core'
import { Button } from '#ui'
import { useT } from '../../../studio/i18n'
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
  /** "Trazer da equipe" (Pensa em equipe) — ausente sem o adapter do host. */
  onOpenTeam?: (() => void) | null
  editTargetOf: (asset: ProjectAsset) => EditTarget | null
  onOpenInOrigin: (asset: ProjectAsset, target: EditTarget) => void
  /** Projeto Python com Raylib: os textos falam do Raylib 3D e do `load_model`. */
  raylib?: boolean
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
  onOpenTeam = null,
  onRename,
  onDelete,
  editTargetOf,
  onOpenInOrigin,
  raylib = false,
  codeNameOf,
}: Models3DTabProps): JSX.Element {
  const t = useT()
  return (
    <div className="flex flex-col gap-4">
      {onOpenMolda || onOpenTeam || (allowUpload && has3DExtension) ? (
        <div className="flex flex-wrap items-center gap-3">
          {onOpenMolda ? (
            <Button variant="primary" size="sm" onClick={onOpenMolda}>
              {t('moldaImport.button')}
            </Button>
          ) : null}
          {onOpenTeam ? (
            <Button
              variant={onOpenMolda ? 'subtle' : 'primary'}
              size="sm"
              className="min-h-11"
              onClick={onOpenTeam}
            >
              {t('teamImport.button')}
            </Button>
          ) : null}
          {allowUpload && has3DExtension ? (
            <Button
              variant={onOpenMolda || onOpenTeam ? 'subtle' : 'primary'}
              size="sm"
              disabled={busy}
              title={
                raylib
                  ? 'Modelo 3D (.glb) para o Raylib 3D'
                  : 'Modelo 3D (.glb) ou céu 360° (.hdr) para Jogo 3D, Jogo 3D Avançado, Mundo 3D e Canvas 3D'
              }
              onClick={onUpload}
            >
              {busy ? 'Processando…' : '📦 Enviar modelo 3D'}
            </Button>
          ) : null}
        </div>
      ) : null}
      {raylib ? (
        <p className="text-xs text-sz-fg-mute">
          {has3DExtension
            ? 'Modelo .glb vai para a pasta models. A textura e o céu 360° do Molda entram como imagem, na pasta images (o céu vira uma imagem panorâmica).'
            : 'Aqui a textura do Molda entra como imagem. Para usar um modelo 3D, troque para a extensão Raylib 3D, em "Extensões".'}
        </p>
      ) : !has3DExtension ? (
        <p className="text-xs text-sz-fg-mute">
          Para USAR um modelo 3D, instale antes uma extensão que entenda 3D: Jogo 3D, Jogo 3D
          Avançado ou Mundo 3D, em "Extensões". (O Canvas 3D já vem no Estúdio, não precisa
          instalar.)
        </p>
      ) : null}

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-sz-fg-mute">
          No projeto
        </h3>
        {models3d.length === 0 ? (
          <EmptyHint>
            {raylib && !has3DExtension
              ? 'O Raylib 2D não usa modelos 3D. A textura do Molda entra como imagem, pelo "Trazer do Molda".'
              : raylib
                ? 'Nenhum modelo 3D ainda. Monte um no Molda e traga ele aqui, ou envie um .glb do computador. O céu 360° do Molda entra como imagem panorâmica.'
                : 'Nenhum modelo 3D ainda. Monte um no Molda e traga ele aqui, ou envie um .glb do computador. O céu 360° é um arquivo .hdr.'}
          </EmptyHint>
        ) : (
          <>
            <p className="mb-2 text-xs text-sz-fg-soft">
              {raylib
                ? "Abra o modelo pelo caminho dele no código, como load_model('models/nave.glb')."
                : 'Use o NOME no bloco "Criar o objeto … com o modelo" (Jogo 3D) ou na peça "modelo importado" do molde; se for .hdr, em "Usar o céu 360°" ou no "céu de foto".'}
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
                      codeName={codeNameOf?.(asset)}
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
