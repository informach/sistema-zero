/** Format generated source with the same pinned formatter used by CI. */
export async function formatGeneratedSource(source: string, path: string, cwd: string) {
  const child = Bun.spawn(
    [
      process.execPath,
      '--no-env-file',
      'x',
      '--no-install',
      'biome',
      'format',
      `--files-max-size=${Buffer.byteLength(source) + 1}`,
      `--stdin-file-path=${path}`,
    ],
    { cwd, stdin: new Blob([source]), stdout: 'pipe', stderr: 'pipe' },
  )
  const [code, formatted, errors] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ])
  if (code !== 0 || (source.trim().length > 0 && !formatted.trim()))
    throw new Error(`Failed to format generated source ${path}: ${errors}`)
  return formatted
}
