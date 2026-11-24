import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'

const previousHead = 'f8910ee0547cba79a8dc38cc45ffa2a6efb66e5e'
const head = process.argv[2]
if (!/^[a-f0-9]{40}$/.test(head ?? '')) throw new Error('SHA completo obrigatório')
const git = (...args) => execFileSync('git', args, {
  encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, windowsHide: true,
})
git('merge-base', '--is-ancestor', previousHead, head)
const history = git('log', '--reverse', '--format=%H%x09%cI%x09%P%x09%s', `${previousHead}..${head}`)
  .trim().split('\n').filter(Boolean).map(line => {
    const [sha, at, parentList, subject] = line.split('\t')
    return { sha, at, parents: parentList.split(' '), subject }
  })
const files = git('diff', '--numstat', previousHead, head).trim().split('\n')
  .filter(Boolean).map(line => {
    const [added, removed, path] = line.split('\t')
    return { path, added: added === '-' ? null : Number(added), removed: removed === '-' ? null : Number(removed) }
  })
const receipt = {
  generatedAt: new Date().toISOString(), previousHead, head,
  note: 'Complemento da janela original: commits incorporados durante a execução da LG01, preservando os inventários anteriores. Merge não equivale a funcionalidade nova. Não inclui branches ou alterações locais de outras frentes.',
  commitCount: history.length,
  nonMergeCommitCount: history.filter(commit => commit.parents.length === 1).length,
  changedFileCount: files.length,
  history, files,
}
writeFileSync(new URL('inventory-lg01-followup.json', import.meta.url), JSON.stringify(receipt, null, 2) + '\n')
console.log(JSON.stringify({ head, commits: receipt.commitCount, nonMergeCommits: receipt.nonMergeCommitCount, changedFiles: receipt.changedFileCount }))
