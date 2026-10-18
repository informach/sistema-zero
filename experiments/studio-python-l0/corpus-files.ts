import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'

export function captureCorpusFiles(repository: string, commit: string, subtree: string) {
  const git = (...args: string[]) =>
    execFileSync('git', args, {
      cwd: repository,
      timeout: 30000,
      windowsHide: true,
      maxBuffer: 64 * 1024 * 1024,
    })
  assert.equal(git('rev-parse', 'HEAD').toString('utf8').trim(), commit)
  const paths = [
    'LICENSE',
    ...git('ls-tree', '-r', '--name-only', commit, subtree).toString('utf8').trim().split('\n'),
  ]
  return paths.map((path) => {
    assert.ok(path === 'LICENSE' || (path.startsWith(`${subtree}/`) && !path.includes('..')))
    // Hash canonical Git blobs, independent of Windows checkout CRLF conversion.
    const bytes = git('show', `${commit}:${path}`)
    return {
      path,
      bytes: bytes.byteLength,
      sha256: createHash('sha256').update(bytes).digest('hex'),
    }
  })
}
