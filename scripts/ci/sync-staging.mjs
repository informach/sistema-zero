import { spawnSync } from 'node:child_process'
import { appendFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

export function syncStaging(cwd = process.cwd()) {
  const git = (...args) => {
    const result = spawnSync('git', args, { cwd, encoding: 'utf8' })
    if (result.error) throw result.error
    if (result.status !== 0) throw new Error(`git ${args[0]}: ${result.stderr.trim()}`)
    return result.stdout.trim()
  }
  const ancestor = (base, head) => {
    const result = spawnSync('git', ['merge-base', '--is-ancestor', base, head], { cwd })
    if (result.error) throw result.error
    if (result.status !== 0 && result.status !== 1)
      throw new Error('Não foi possível comparar as branches.')
    return result.status === 0
  }

  git('fetch', '--no-tags', 'origin', 'main', 'staging')
  const main = git('rev-parse', 'origin/main')
  const before = git('rev-parse', 'origin/staging')
  if (ancestor(main, before))
    return { status: 'current', before, sha: before, contentChanged: false }
  if (!ancestor(before, main)) {
    throw new Error(
      'Staging recebeu trabalho novo. Integre main em staging sem squash e aguarde o CI. Nenhum commit foi sobrescrito.',
    )
  }

  const contentChanged = git('rev-parse', `${before}^{tree}`) !== git('rev-parse', `${main}^{tree}`)
  // O push comum também rejeita uma alteração concorrente no remoto.
  git('push', 'origin', `${main}:refs/heads/staging`)
  return { status: 'updated', before, sha: main, contentChanged }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = syncStaging()
  console.log(JSON.stringify(result))
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(
      process.env.GITHUB_OUTPUT,
      `before=${result.before}\nsha=${result.sha}\ncontent_changed=${result.contentChanged}\n`,
    )
  }
}
