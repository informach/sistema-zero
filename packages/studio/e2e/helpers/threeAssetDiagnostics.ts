// The adaptive renderer deliberately reports a quality change with console.warn.
// Retain the raw report; only this exact nonfatal status is not an asset failure.
const ADAPTIVE_QUALITY_NOTICE =
  'warning: SZGameKit3D: modo leve ligado: este computador pediu um jogo mais leve (sombra menor, sem efeitos de cinema)'

export function unexpected3DAssetDiagnostics(messages: readonly string[]): string[] {
  return messages.filter((message) => message !== ADAPTIVE_QUALITY_NOTICE)
}
