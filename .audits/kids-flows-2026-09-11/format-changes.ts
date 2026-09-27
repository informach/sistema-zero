const tracked = Bun.spawnSync(['git', 'diff', '--name-only', '-z']).stdout.toString().split('\0')
const added = Bun.spawnSync(['git', 'ls-files', '--others', '--exclude-standard', '-z'])
  .stdout.toString()
  .split('\0')
const excluded = new Set([
  'packages/community-kids/src/app/(app)/cursos/[slug]/aulas/[lessonId]/lesson-player-client.tsx',
  'packages/community-kids/tests/lesson-sections.test.tsx',
  'packages/community-kids/src/components/kids/kids-lesson-progress.tsx',
  'packages/community-kids/src/lib/lesson-progress.ts',
  'packages/community-kids/tests/kids-lesson-progress.test.tsx',
  'packages/community-kids/tests/lesson-progress.test.ts',
  'packages/member-shell/src/components/pinta/pinta-block.tsx',
  'packages/member-shell/src/components/studio/studio-block.tsx',
])
const files = [...new Set([...tracked, ...added])].filter(
  (file) =>
    /\.(tsx?|json)$/.test(file) &&
    (file.startsWith('packages/') || file.startsWith('docs/aulas-interativas/')) &&
    !file.includes('/migrations/') &&
    !excluded.has(file),
)
const result = Bun.spawnSync(['bun', 'x', 'biome', 'check', '--write', ...files], {
  stdout: 'pipe',
  stderr: 'pipe',
})
await Bun.write(
  '.audits/kids-flows-2026-09-11/lint.log',
  result.stdout.toString() + result.stderr.toString(),
)
process.exitCode = result.exitCode
