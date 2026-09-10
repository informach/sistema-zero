import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'

const root = 'C:/Users/tocha/projects/sistema-zero'
const files = [
  'docs/plans/2026-09-07-creator-journey-evolution.md',
  'docs/plans/2026-09-07-creator-journey-review.md',
  'docs/plans/creator-journey-members-audit.sql',
  'docs/plans/creator-journey-rollout.md',
  'packages/api-gateway/CLAUDE.md',
  'packages/api-gateway/gateway.config.ts',
  'packages/api-gateway/tests/unit/config.test.ts',
  'packages/community-kids/CLAUDE.md',
  'packages/community-kids/src/app/(app)/criar/page.tsx',
  'packages/community-kids/src/app/(app)/layout.tsx',
  'packages/community-kids/src/app/(app)/praticar/page.tsx',
  'packages/community-kids/src/components/kids/app-sidebar.tsx',
  'packages/community-kids/src/components/kids/mobile-nav.tsx',
  'packages/community-kids/src/components/kids/nav.ts',
  'packages/community-kids/src/components/kids/practice-workshop.tsx',
  'packages/community-kids/src/server/creator-rollout.ts',
  'packages/community-kids/src/server/practice.ts',
  'packages/community-kids/tests/practice-workshop.test.tsx',
  'packages/core/src/career/index.ts',
  'packages/core/src/career/rollout.ts',
  'packages/core/tests/creator-rollout.test.ts',
  'packages/member-shell/CLAUDE.md',
  'packages/members/CLAUDE.md',
  'packages/members/src/application/practice/practice.service.ts',
  'packages/members/src/composition-root.ts',
  'packages/members/src/infrastructure/config/env.ts',
  'packages/members/src/interfaces/http/routes/practice.routes.ts',
  'packages/members/tests/helpers.ts',
  'packages/members/tests/integration/practice.test.ts',
]
const mixed = {
  'packages/community-kids/CLAUDE.md': '## Oficina e Carreira do Criador — 07/09/2026',
  'packages/members/CLAUDE.md': '## Evolução da Carreira do Criador — 07/09/2026',
  'packages/member-shell/CLAUDE.md': '## Jornada do criador — 07/09/2026',
}
const git = (args, input) =>
  execFileSync('git', args, { cwd: root, encoding: 'utf8', input, maxBuffer: 16 * 1024 * 1024 })
if (git(['diff', '--cached', '--name-only']).trim()) throw new Error('Index already has changes')
const proof = []
for (const [path, marker] of Object.entries(mixed)) {
  const head = git(['show', 'HEAD:' + path]).replace(/\r\n/g, '\n')
  const working = readFileSync(root + '/' + path, 'utf8').replace(/\r\n/g, '\n')
  const hi = head.indexOf(marker),
    wi = working.indexOf(marker)
  if (hi < 0 || wi < 0 || head.lastIndexOf(marker) !== hi || working.lastIndexOf(marker) !== wi)
    throw new Error('Ambiguous section: ' + path)
  const selected = head.slice(0, hi) + working.slice(wi)
  const oid = git(['hash-object', '-w', '--stdin'], selected).trim()
  git(['update-index', '--cacheinfo', '100644', oid, path])
  proof.push({
    path,
    oid,
    preservedPrefix: createHash('sha256').update(working.slice(0, wi)).digest('hex'),
  })
}
git(['-c', 'core.safecrlf=false', 'add', '--', ...files.filter((path) => !(path in mixed))])
const selected = git(['diff', '--cached', '--name-only']).trim().split('\n').sort()
if (JSON.stringify(selected) !== JSON.stringify([...files].sort()))
  throw new Error('Unexpected staged paths')
git(['diff', '--cached', '--check'])
writeFileSync(
  root + '/.audits/creator-review/no-flags/selection.json',
  JSON.stringify({ files, proof }, null, 2),
)
console.log(
  JSON.stringify(
    {
      staged: selected.length,
      tree: git(['write-tree']).trim(),
      sharedDocs: proof.map((item) => item.path),
    },
    null,
    2,
  ),
)
