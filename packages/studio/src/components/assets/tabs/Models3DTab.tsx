import type { JSX } from 'react'
import type { ProjectAsset } from '#core'
import { Button } from '#ui'
import { readGlbSummary } from '../../../core/glbSummary'
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

/** Quantos nomes de animação cabem no selo antes do "…". */
const CLIPS_IN_BADGE = 3

/**
 * Selos do que o .glb traz por dentro (lidos do cabeçalho, sem three):
 * 🎬 animações, 🦴 ossos, 🎞️ pintura que se mexe. Nada a mostrar → nada.
 */
function ModelBadges({ asset }: { asset: ProjectAsset }): JSX.Element | null {
  const t = useT()
  if (asset.kind !== 'model3d') return null
  const summary = readGlbSummary(asset.dataUrl, asset.id)
  if (!summary) return null
  const { clips, skinned, animatedPaint } = summary
  if (clips.length === 0 && !skinned && !animatedPaint) return null
  const shown = clips.slice(0, CLIPS_IN_BADGE).join(', ')
  const names = clips.length > CLIPS_IN_BADGE ? `${shown}…` : shown
  const badge = 'rounded bg-sz-bg px-1.5 py-0.5 text-[10px] text-sz-fg-soft'
  return (
    <span className="flex flex-wrap gap-1">
      {clips.length > 0 ? (
        <span className={badge} title={t('models3d.badge.clipsTitle', { names: clips.join(', ') })}>
          {t('models3d.badge.clips', { names })}
        </span>
      ) : null}
      {skinned ? <span className={badge}>{t('models3d.badge.skinned')}</span> : null}
      {animatedPaint ? <span className={badge}>{t('models3d.badge.animatedPaint')}</span> : null}
    </span>
  )
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
              title={raylib ? t('models3d.raylibUploadTitle') : t('models3d.uploadTitle')}
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
            {raylib ? (
              <p className="mb-2 text-xs text-sz-fg-soft">{t('models3d.raylibHowTo')}</p>
            ) : (
              <div className="mb-2 text-xs text-sz-fg-soft">
                <p>{t('models3d.howTo')}</p>
                <ul className="ml-4 list-disc">
                  <li>{t('models3d.howTo.game3d')}</li>
                  <li>{t('models3d.howTo.advanced')}</li>
                  <li>{t('models3d.howTo.world3d')}</li>
                  <li>{t('models3d.howTo.sky')}</li>
                </ul>
              </div>
            )}
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
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <AssetNameInput
                        asset={asset}
                        what="o modelo 3D"
                        onRename={onRename}
                        codeName={codeNameOf?.(asset)}
                        className="min-w-0"
                      />
                      <ModelBadges asset={asset} />
                    </span>
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
