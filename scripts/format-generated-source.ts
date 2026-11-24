/**
 * Caracteres de largura zero (seletor de variação, junção de emoji, acento combinante, marcas de
 * formato). O biome lendo do stdin os apaga das strings no Windows (medido com o 2.4.16: o `⚙️`
 * dos comentários de área virava `⚙`, e `é` virava `e`). Eles atravessam o formatador
 * como um marcador ASCII e voltam depois, então a saída não depende da plataforma.
 */
const ZERO_WIDTH = /[\p{Mn}\p{Me}\p{Cf}]/gu
const MARKER = /__sz_u_([0-9A-F]{4,6})__/g

/** Format generated source with the same pinned formatter used by CI. */
export async function formatGeneratedSource(source: string, path: string, cwd: string) {
  if (MARKER.test(source)) throw new Error(`O texto de ${path} já contém o marcador __sz_u_.`)
  MARKER.lastIndex = 0
  const protectedSource = source.replace(
    ZERO_WIDTH,
    (char) => `__sz_u_${char.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')}__`,
  )
  const child = Bun.spawn(
    [
      process.execPath,
      '--no-env-file',
      'x',
      '--no-install',
      'biome',
      'format',
      `--files-max-size=${Buffer.byteLength(protectedSource) + 1}`,
      `--stdin-file-path=${path}`,
    ],
    { cwd, stdin: new Blob([protectedSource]), stdout: 'pipe', stderr: 'pipe' },
  )
  const [code, formatted, errors] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ])
  if (code !== 0 || (protectedSource.trim().length > 0 && !formatted.trim()))
    throw new Error(`Failed to format generated source ${path}: ${errors}`)
  return formatted.replace(MARKER, (_, hex: string) =>
    String.fromCodePoint(Number.parseInt(hex, 16)),
  )
}
