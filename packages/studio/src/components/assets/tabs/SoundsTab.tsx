import type { JSX } from 'react'
import type { ProjectAsset } from '#core'
import { Button } from '#ui'
import {
  AssetNameInput,
  AssetRow,
  type AssetsTabCommon,
  DeleteAssetButton,
  EmptyHint,
} from './common'

export interface SoundsTabProps extends AssetsTabCommon {
  sounds: ProjectAsset[]
  allowUpload: boolean
  busy: boolean
  onUpload: () => void
}

/**
 * Aba "Sons". Antes deste lote o som não tinha porta própria — morava atrás da
 * palavra "Imagens", numa seção que só existia QUANDO JÁ HAVIA sons: quem ainda
 * não tinha nenhum não via nada sobre som em lugar nenhum.
 */
export function SoundsTab({
  sounds,
  allowUpload,
  busy,
  onUpload,
  onRename,
  onDelete,
}: SoundsTabProps): JSX.Element {
  return (
    <div className="flex flex-col gap-4">
      {allowUpload ? (
        <div className="flex flex-col gap-2">
          <Button variant="primary" size="sm" disabled={busy} onClick={onUpload}>
            {busy ? 'Processando…' : '🔊 Enviar som'}
          </Button>
          {/* O que cabe, ANTES do envio. A dúvida veio da dona do produto ("qual
              tipo de som aceita, quanto tempo?") e o WAV é a armadilha: pelo
              mesmo som ele ocupa ~10× o de um mp3, então 1 minuto já estoura
              enquanto o mp3 aguenta uns 5. O erro de teto já existia, mas só
              aparecia DEPOIS de escolher o arquivo. */}
          <p className="text-xs text-sz-fg-mute">
            Som: mp3, wav, ogg ou m4a, até 5 MB por arquivo. Um mp3 cabe com uns 5 minutos; um wav,
            só uns 30 segundos (ele ocupa bem mais pelo mesmo som).
          </p>
        </div>
      ) : null}

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-sz-fg-mute">
          No projeto
        </h3>
        {sounds.length === 0 ? (
          <EmptyHint>
            {allowUpload
              ? 'Nenhum som ainda. Envie um do computador aqui em cima; depois use o nome dele no bloco "Carregar o som".'
              : 'Nenhum som ainda. Os sons deste projeto são escolhidos por quem montou a atividade.'}
          </EmptyHint>
        ) : (
          <ul className="flex flex-col gap-2">
            {sounds.map((asset) => (
              <AssetRow key={asset.id}>
                <span className="text-lg" aria-hidden>
                  🔊
                </span>
                <AssetNameInput
                  asset={asset}
                  what="o som"
                  onRename={onRename}
                  className="min-w-0 flex-1"
                />
                {/* biome-ignore lint/a11y/useMediaCaption: efeito sonoro de jogo, sem fala/legenda */}
                <audio src={asset.dataUrl} controls preload="none" className="h-8 max-w-[46%]" />
                <DeleteAssetButton asset={asset} onDelete={onDelete} />
              </AssetRow>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
