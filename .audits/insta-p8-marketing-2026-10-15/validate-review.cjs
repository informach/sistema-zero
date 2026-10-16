// Local documentation verification only. Does not run application/provider code.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '../..');
const output = path.join(__dirname, 'review-validation.json');
const externalRoot = 'C:/Users/tocha/Downloads/insta-p8-main/insta-p8-main';
const documents = [
  'docs/plans/2026-10-15-insta-p8-aproveitamento-marketing.md',
  '.audits/insta-p8-marketing-2026-10-15/review.md',
];
const digest = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const decode = (file) => new TextDecoder('utf-8', { fatal: true }).decode(fs.readFileSync(file));
const relative = (file) => path.relative(root, file).replaceAll('\\', '/');
const errors = [];
const references = new Set();
const documentResults = [];

for (const name of documents) {
  const absolute = path.join(root, name);
  const content = decode(absolute);
  if (content.includes('\uFFFD')) errors.push(`Replacement character: ${name}`);
  const links = [];
  for (const match of content.matchAll(/\[[^\]\r\n]+\]\(([^)\r\n]+)\)/g)) {
    const target = match[1].replace(/^<|>$/g, '');
    if (/^(https?:|mailto:|#)/.test(target)) continue;
    const file = path.resolve(path.dirname(absolute), decodeURIComponent(target.split('#')[0]));
    const exists = fs.existsSync(file) || file === output;
    links.push({ target, exists });
    if (!exists) errors.push(`Missing link in ${name}: ${target}`);
    if (file.startsWith(root + path.sep) &&
        /^(packages|docs)[/\\]/.test(path.relative(root, file)) && !documents.includes(relative(file))) {
      references.add(relative(file));
    }
  }
  const fences = content.split(/\r?\n/).filter((line) => line.startsWith('```')).length;
  if (fences % 2) errors.push(`Unbalanced fences: ${name}`);
  documentResults.push({ path: name, sha256: digest(absolute), lines: content.split(/\r?\n/).length,
    words: content.trim().split(/\s+/u).length, localLinks: links.length, brokenLinks: links.filter((l) => !l.exists), utf8: true });
}

const initialSources = JSON.parse(fs.readFileSync(path.join(__dirname, 'context-sources.json'), 'utf8'));
const initialComparisons = initialSources.map((entry) => {
  const absolute = path.join(root, entry.path);
  references.add(entry.path);
  const current = fs.existsSync(absolute) ? digest(absolute) : null;
  return { path: entry.path, initialSha256: entry.sha256, currentSha256: current, unchanged: current === entry.sha256 };
});
const sources = [...references].sort().map((name) => ({ path: name, sha256: digest(path.join(root, name)) }));

const inventory = JSON.parse(fs.readFileSync(path.join(__dirname, 'inventory.json'), 'utf8'));
const externalChanges = inventory.filter((entry) => {
  const file = path.join(externalRoot, entry.path);
  return !fs.existsSync(file) || digest(file) !== entry.sha256;
}).map((entry) => entry.path);
if (externalChanges.length) errors.push('External snapshot changed; initial audit needs reconciliation.');

const result = {
  capturedAt: new Date().toISOString(),
  scope: 'Documentation/source verification; no build, application tests or provider calls.',
  passed: errors.length === 0,
  errors,
  documents: documentResults,
  reviewedSourceHashes: sources,
  initialContextComparison: { checked: initialComparisons.length,
    changed: initialComparisons.filter((entry) => !entry.unchanged), entries: initialComparisons },
  externalSnapshot: { root: externalRoot, checked: inventory.length, changed: externalChanges },
  historicalProposal: { path: relative(path.join(__dirname, 'proposta-v1.txt')), sha256: digest(path.join(__dirname, 'proposta-v1.txt')) },
  verificationScriptSha256: digest(__filename),
};
fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ passed: result.passed, errors, documents: documentResults,
  sourcesRecorded: sources.length, initialSourcesChanged: result.initialContextComparison.changed.map((x) => x.path),
  externalFilesChecked: inventory.length, externalFilesChanged: externalChanges.length }, null, 2));
if (!result.passed) process.exitCode = 1;
