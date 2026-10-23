const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const read = (name) => JSON.parse(fs.readFileSync(path.join(__dirname, name), 'utf8'));
const initial = read('review-batched.json');
const second = read('review-batched-part-2.json');
const third = read('review-batched-part-3.json');
if (second.status !== 'passed' || third.status !== 'passed') throw new Error('Incomplete verification');
const batches = [...initial.batches.filter(b => b.partition === 1), ...second.batches, ...third.batches];
if (batches.some(b => b.exitCode !== 0 || b.failed || !b.passed)) throw new Error('A batch failed');
const files = batches.flatMap(b => b.files).sort();
const cwd = path.resolve(__dirname, '../../packages/molda');
const expected = execFileSync('rg', ['--files', 'src'], { cwd, encoding: 'utf8' }).trim()
  .split(/\r?\n/).map(f => f.replaceAll('\\', '/'))
  .filter(f => /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(f)).sort();
if (JSON.stringify(files) !== JSON.stringify(expected)) throw new Error('Missing or duplicate files');
const report = {
  started: initial.started, finished: third.finished, status: 'passed',
  files: files.length, passed: batches.reduce((sum, b) => sum + b.passed, 0), failed: 0,
  partitions: [1, 2, 3].map(partition => ({ partition,
    files: batches.filter(b => b.partition === partition).reduce((sum, b) => sum + b.files.length, 0),
    passed: batches.filter(b => b.partition === partition).reduce((sum, b) => sum + b.passed, 0),
  })), batches,
  note: 'Partition 1 passed. After updating legacy component test mounts, partitions 2 and 3 ran completely again. No test file omitted.',
};
fs.writeFileSync(path.join(__dirname, 'review-final.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ status: report.status, files: report.files, passed: report.passed, failed: 0, partitions: report.partitions }));
