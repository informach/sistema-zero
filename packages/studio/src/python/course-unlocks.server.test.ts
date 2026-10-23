import { expect, test } from 'bun:test'
import { mkdtemp, rmdir, unlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

test('course metadata loads in native Node without a browser, interpreter or network', async () => {
  const output = await Bun.build({
    entrypoints: [join(import.meta.dirname, 'course-unlocks.ts')],
    target: 'node',
    format: 'esm',
    minify: true,
  })
  if (!output.success || output.outputs.length !== 1)
    throw new AggregateError(output.logs, 'Cannot bundle the server course catalogue')
  const [artifact] = output.outputs
  if (!artifact) throw new Error('Server catalogue bundle is missing')
  const directory = await mkdtemp(join(tmpdir(), 'studio-python-course-catalog-'))
  const path = join(directory, 'catalog.mjs')
  let child: ReturnType<typeof Bun.spawn> | undefined
  let deadline: ReturnType<typeof setTimeout> | undefined
  try {
    await writeFile(path, await artifact.text(), { flag: 'wx' })
    const node = process.env.STUDIO_PYTHON_TEST_NODE ?? Bun.which('node')
    if (!node) throw new Error('Native Node is required for the server catalogue check')
    const env: Record<string, string> = {}
    for (const key of ['SYSTEMROOT', 'WINDIR', 'TEMP', 'TMP']) {
      const value = process.env[key]
      if (value !== undefined) env[key] = value
    }
    const launched = Bun.spawn(
      [
        node,
        '--max-old-space-size=64',
        '--input-type=module',
        '-e',
        `
        for (const name of ['document', 'window', 'Worker', 'fetch'])
          Object.defineProperty(globalThis, name, { get() { throw new Error('Browser or network dependency: ' + name) } });
        const catalog = await import(process.argv[1]);
        console.log(JSON.stringify({
          native: !process.versions.bun,
          blocks: catalog.PYTHON_COURSE_BLOCKS.length,
          valid: catalog.pythonCourseUnlockIssue(catalog.pythonCourseBlockClosure(['sz_py_print'])) === null,
        }));
      `,
        pathToFileURL(path).href,
      ],
      { env, stdin: 'ignore', stdout: 'pipe', stderr: 'pipe', windowsHide: true },
    )
    child = launched
    deadline = setTimeout(() => child?.kill(), 10_000)
    const [exit, stdout, stderr] = await Promise.all([
      launched.exited,
      new Response(launched.stdout).text(),
      new Response(launched.stderr).text(),
    ])
    if (exit !== 0) throw new Error(`Server catalogue import failed: ${stderr}`)
    expect(JSON.parse(stdout)).toMatchObject({ native: true, valid: true })
    expect(JSON.parse(stdout).blocks).toBeGreaterThan(0)
  } finally {
    if (deadline) clearTimeout(deadline)
    if (child?.exitCode === null) child.kill()
    if (child) await child.exited
    await unlink(path)
    await rmdir(directory)
  }
})
