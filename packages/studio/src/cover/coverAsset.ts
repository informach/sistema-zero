/**
 * A capa ESCOLHIDA do jogo (26/09/2026): a criança aponta uma imagem do projeto (a da tela de
 * abertura, por exemplo) e ela vira a capa fixa do card, vencendo a foto automática do preview.
 *
 * O `Project` guarda só o NOME do asset (`coverAssetName`), no mesmo idioma dos blocos (o
 * `field_asset_picker` também guarda o nome): custa uma string, viaja no manifesto da nuvem e o
 * `updateAssetImage` (o desenho reeditado no Pinta) nunca toca o nome. A RESOLUÇÃO nome → asset
 * acontece na hora de usar, aqui: nome pendurado (asset apagado, snapshot sem os assets, cliente
 * velho) = "foto automática", nunca erro.
 */
import type { Project, ProjectAsset } from '#core'

/** O asset de IMAGEM que a criança escolheu como capa, ou `null` (foto automática). */
export function resolveCoverAsset(
  project: Pick<Project, 'assets' | 'coverAssetName'>,
): ProjectAsset | null {
  const name = project.coverAssetName
  if (!name || !project.assets) return null
  const asset = project.assets.find((candidate) => candidate.name === name)
  return asset && asset.kind === 'image' ? asset : null
}
