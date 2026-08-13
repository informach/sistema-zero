/**
 * Normalização para BUSCA: minúsculas e sem acento, para "cenario" achar
 * "cenário". Mesma receita `NFD` do `normalizeAssetName`, mas separada porque
 * aquela também troca espaço por hífen (kebab), o que atrapalharia digitar.
 */
export function normalizeSearchText(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}
