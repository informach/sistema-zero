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

export interface FontsTabProps extends AssetsTabCommon {
  fonts: ProjectAsset[]
  allowUpload: boolean
  busy: boolean
  onUpload: () => void
}

/**
 * Aba "Fontes", só nos projetos Raylib: a letra que o jogo abre com `load_font_ex`. O raylib
 * do computador abre TTF e OTF, e é isso que a porta aceita.
 */
export function FontsTab({
  fonts,
  allowUpload,
  busy,
  onUpload,
  onRename,
  onDelete,
  codeNameOf,
}: FontsTabProps): JSX.Element {
  return (
    <div className="flex flex-col gap-4">
      {allowUpload ? (
        <div className="flex flex-col gap-2">
          <Button variant="primary" size="sm" disabled={busy} onClick={onUpload}>
            {busy ? 'Processando…' : '🔤 Enviar fonte'}
          </Button>
          <p className="text-xs text-sz-fg-mute">
            Fonte TTF ou OTF, até 1,4 MB. Ela vai para a pasta fonts e abre com
            load_font_ex('fonts/nome.ttf', 32, None, 0). Confira se a licença da fonte deixa usar em
            jogos.
          </p>
        </div>
      ) : null}

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-sz-fg-mute">
          No projeto
        </h3>
        {fonts.length === 0 ? (
          <EmptyHint>
            {allowUpload
              ? 'Nenhuma fonte ainda. Sem fonte própria, o jogo escreve com a letra do raylib.'
              : 'Nenhuma fonte ainda. As fontes deste projeto já vêm escolhidas.'}
          </EmptyHint>
        ) : (
          <ul className="flex flex-col gap-2">
            {fonts.map((asset) => (
              <AssetRow key={asset.id}>
                <span className="text-lg" aria-hidden>
                  🔤
                </span>
                <AssetNameInput
                  asset={asset}
                  what="a fonte"
                  onRename={onRename}
                  codeName={codeNameOf?.(asset)}
                  className="min-w-0 flex-1"
                />
                <DeleteAssetButton asset={asset} onDelete={onDelete} />
              </AssetRow>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
