const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const cwd = path.resolve(__dirname, '../..');
const git = (args, options = {}) => execFileSync('git', args, { cwd, encoding: 'utf8', ...options }).trim();
if (git(['branch', '--show-current']) !== 'staging') throw new Error('Unexpected branch');
if (git(['diff', '--cached', '--name-only'])) throw new Error('Shared index contains staged work');
const base = git(['rev-parse', 'HEAD']);
const index = path.join(__dirname, 'molda-commit.index');
if (fs.existsSync(index)) throw new Error('Task index already exists');
const env = { ...process.env, GIT_INDEX_FILE: index };
const scoped = (args, options = {}) => git(args, { env, ...options });
scoped(['read-tree', base]);
const documents = [
  'docs/plans/2026-09-06-molda-evolution.md',
  'docs/plans/2026-09-10-molda-rollout.md',
  'docs/plans/2026-10-14-molda-usabilidade-proposta.md',
  'docs/plans/2026-10-14-molda-usabilidade-fluxos.md',
  'docs/plans/2026-10-14-molda-usabilidade-revisao.md',
  'docs/plans/2026-10-14-molda-usabilidade-entrega.md',
  'docs/plans/2026-10-14-molda-usabilidade-full-review.md',
  'docs/superpowers/plans/2026-10-14-molda-usabilidade-implementacao.md',
];
scoped(['add', '--', 'packages/molda', ...documents]);
const host = 'packages/community-kids/src/components/kids/molda-client.tsx';
const original = execFileSync('git', ['show', `${base}:${host}`], { cwd, encoding: 'utf8' });
const lines = original.split('\n');
const at = lines.findIndex(line => line === '      sceneWorkshop: true,');
if (at < 9 || lines[at - 9] !== '      /**' || lines[at - 1] !== '       */') throw new Error('Host block changed');
if (!lines[at - 8].includes('A oficina 3D nova')) throw new Error('Unexpected host comment');
lines.splice(at - 9, 10);
const blob = git(['hash-object', '-w', '--stdin'], { input: lines.join('\n') });
scoped(['update-index', '--cacheinfo', `100644,${blob},${host}`]);
scoped(['diff', '--cached', '--check']);
const files = scoped(['diff', '--cached', '--name-only']).split('\n');
if (files.some(file => !file.startsWith('packages/molda/') && !documents.includes(file) && file !== host)) throw new Error('Unexpected staged file');
const tree = scoped(['write-tree']);
fs.writeFileSync(path.join(__dirname, 'commit-plan.json'), JSON.stringify({ base, tree, index, files, host, documents }, null, 2));
console.log(scoped(['diff', '--cached', '--shortstat']));
console.log(scoped(['diff', '--cached', '--', host]));
console.log(JSON.stringify({ base, tree, files: files.length }));
