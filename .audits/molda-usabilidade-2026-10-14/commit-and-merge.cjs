const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const cwd = path.resolve(__dirname, '../..');
const git = (args, options = {}) => execFileSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024, ...options }).trim();
const plan = JSON.parse(fs.readFileSync(path.join(__dirname, 'commit-plan.json'), 'utf8'));
const branch = 'codex/molda-usabilidade-2026-10-14';
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const excludes = [':(exclude)packages/molda', ...plan.documents.map(p => `:(exclude)${p}`), `:(exclude)${plan.host}`];
const unrelated = () => hash(git(['diff', '--binary', '--', '.', ...excludes]));
const hostBytes = () => hash(fs.readFileSync(path.join(cwd, plan.host)));
if (git(['branch', '--show-current']) !== 'staging' || git(['rev-parse', 'HEAD']) !== plan.base) throw new Error('Branch moved');
if (git(['diff', '--cached', '--name-only'])) throw new Error('Shared index contains staged work');
let branchExists = false;
try { git(['show-ref', '--verify', '--quiet', `refs/heads/${branch}`], { stdio: ['pipe', 'pipe', 'pipe'] }); branchExists = true; } catch (e) { if (e.status !== 1) throw e; }
if (branchExists) throw new Error('Task branch already exists');
const env = { ...process.env, GIT_INDEX_FILE: plan.index };
if (git(['write-tree'], { env }) !== plan.tree) throw new Error('Task index changed');
if (git(['diff', '--name-only', '--', 'packages/molda', ...plan.documents], { env })) throw new Error('Work changed after review');
const before = { unrelated: unrelated(), host: hostBytes() };
const message = 'feat(molda): simplifica a oficina para criar, pintar e animar\n\n' +
  'Implementa a proposta de usabilidade para crianças de 9–12 anos, com ferramentas laterais, contexto progressivo e poses compostas.\n\n' +
  'Torna a oficina padrão sem ativação de V2 e corrige persistência de pintura, transições de prévias, recuperação por perfil e layouts compactos.\n\n' +
  'Verificação: 3.097 testes Molda, 72 testes Kids, 39 cenários de navegador, tipos, lint e build. Relatório em docs/plans/2026-10-14-molda-usabilidade-full-review.md.\n';
fs.writeFileSync(path.join(__dirname, 'commit-message.txt'), message);
const commit = git(['commit-tree', plan.tree, '-p', plan.base], { input: message });
git(['update-ref', `refs/heads/${branch}`, commit, '0'.repeat(40)]);
if (git(['rev-parse', 'HEAD']) !== plan.base || git(['diff', '--cached', '--name-only'])) throw new Error('Shared state moved before merge');
// The working files already contain this tree plus unrelated edits. Updating only
// the index allows Git's normal fast-forward merge to preserve those working files.
git(['read-tree', commit]);
const merge = git(['merge', '--ff-only', branch]);
if (git(['rev-parse', 'HEAD']) !== commit || git(['branch', '--show-current']) !== 'staging') throw new Error('Merge verification failed');
if (git(['diff', '--cached', '--name-only'])) throw new Error('Unexpected staged changes after merge');
const after = { unrelated: unrelated(), host: hostBytes() };
const record = { commit, branch, mergedInto: 'staging', base: plan.base, tree: plan.tree, before, after,
  unrelatedPreserved: before.unrelated === after.unrelated && before.host === after.host,
  completed: new Date().toISOString(), merge };
fs.writeFileSync(path.join(__dirname, 'commit-result.json'), JSON.stringify(record, null, 2));
console.log(JSON.stringify({ commit, branch, mergedInto: 'staging', unrelatedPreserved: record.unrelatedPreserved, files: plan.files.length }));
console.log(merge.split('\n').slice(0, 2).join('\n'));
