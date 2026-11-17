import { cellTile, isValidCell } from './cell'

/**
 * As células de uma camada em TEXTO compacto, para mapas grandes.
 *
 * Um mapa de 256 × 256 tem 65 mil células por camada; como lista de números em JSON são centenas
 * de KB por camada, quase tudo repetição (chão, vazio). Aqui viram corridas `(valor, quantas)`
 * de 16 bits cada, em base64. Mapas até 128 × 128 NÃO usam isto: continuam com a lista de números
 * de sempre, para o texto guardado não mudar (a nuvem compara o conteúdo byte a byte).
 */
const MAX_RUN = 0xffff

export function packCells(cells: Int16Array): string {
  const runs: number[] = []
  for (let i = 0; i < cells.length; ) {
    const value = cells[i] ?? -1
    let run = 1
    while (i + run < cells.length && cells[i + run] === value && run < MAX_RUN) run += 1
    runs.push(value, run)
    i += run
  }
  const bytes = new Uint8Array(runs.length * 2)
  const view = new DataView(bytes.buffer)
  for (let i = 0; i < runs.length; i += 2) {
    view.setInt16(i * 2, runs[i] ?? -1, true)
    view.setUint16(i * 2 + 2, runs[i + 1] ?? 0, true)
  }
  let binary = ''
  // Em fatias: `String.fromCharCode(...bytes)` estoura a pilha num mapa cheio de detalhe.
  for (let i = 0; i < bytes.length; i += 0x8000)
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(binary)
}

/**
 * Lê o texto de volta. Devolve `null` (nunca lança) quando o texto não é base64, as corridas não
 * somam exatamente `cellCount`, ou alguma célula não é válida para um conjunto de `maxTiles` peças.
 */
export function unpackCells(
  packed: string,
  cellCount: number,
  maxTiles: number,
): Int16Array | null {
  // Pior caso legítimo: uma corrida por célula (4 bytes cada, 4/3 em base64).
  if (packed.length > Math.ceil((cellCount * 4 * 4) / 3) + 8) return null
  let binary: string
  try {
    binary = atob(packed)
  } catch {
    return null
  }
  if (binary.length === 0 || binary.length % 4 !== 0) return null
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  const view = new DataView(bytes.buffer)
  const cells = new Int16Array(cellCount)
  let at = 0
  for (let i = 0; i < bytes.length; i += 4) {
    const value = view.getInt16(i, true)
    const run = view.getUint16(i + 2, true)
    if (run === 0 || at + run > cellCount) return null
    if (!isValidCell(value) || cellTile(value) >= maxTiles) return null
    cells.fill(value, at, at + run)
    at += run
  }
  return at === cellCount ? cells : null
}
