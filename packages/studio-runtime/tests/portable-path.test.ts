import { expect, test } from 'bun:test'
import { isStudioPortablePath } from '@sistemazero/core/studio/project-environment'

test('the generated Node container module uses the canonical portable paths, including dotfiles', () => {
  const paths = [
    'main.py',
    '.main.py',
    '.source/.main.py',
    'dist/main.py',
    `${'dir/'.repeat(15)}main.py`,
    `${'dir/'.repeat(16)}main.py`,
    `${'a'.repeat(237)}.py`,
    `${'a'.repeat(238)}.py`,
    '.',
    '..',
    '../main.py',
    '/main.py',
    'dir//main.py',
    'dir/../main.py',
    'dir\\main.py',
    '.git/main.py',
    '.venv/main.py',
    'node_modules/main.py',
    'CON.py',
    'dir/aux.txt',
    'dir/__proto__/main.py',
    'dir/constructor/main.py',
    'file.py.',
    'ação.py',
    'http://example/main.py',
  ]
  const module = new URL('../runtime/portable-path.generated.mjs', import.meta.url).href
  const script = `import fs from 'node:fs'; const { isStudioPortablePath } = await import(process.argv[1]); const paths = JSON.parse(fs.readFileSync(0, 'utf8')); process.stdout.write(JSON.stringify(paths.map(path => isStudioPortablePath(path))));`
  const result = Bun.spawnSync(['node', '--input-type=module', '-e', script, module], {
    stdin: new TextEncoder().encode(JSON.stringify(paths)),
    windowsHide: true,
  })
  expect(result.exitCode).toBe(0)
  const answers: unknown = JSON.parse(result.stdout.toString())
  expect(answers).toEqual(paths.map(isStudioPortablePath))
  expect(isStudioPortablePath('.source/.main.py')).toBe(true)
  expect(isStudioPortablePath('../main.py')).toBe(false)
})
