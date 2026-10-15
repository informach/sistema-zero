// Run the package's three configured test partitions in short-lived processes.
// This caps accumulated DOM/worker memory on the shared 16 GB workstation.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');
const cwd = path.resolve(__dirname, '../../packages/molda');
const out = path.join(__dirname, 'verification-batches');
fs.mkdirSync(out, { recursive: true });
const files = execFileSync('rg', ['--files', 'src'], { cwd, encoding: 'utf8' })
  .trim().split(/\r?\n/).map(file => file.replaceAll('\\', '/'))
  .filter(file => /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(file)).sort();
const matchers = [
  /^src\/(?:import|workers|export)\//,
  /^src\/(?:scene|components)\//,
  /^src\/(?:(?:accessibility-contract|host-conformance)\.test\.ts$|(?:assets|core|model|paint|sky|state|styles|templates|testing|texture|viewport)\/)/,
];
const unknown = files.filter(file => !matchers.some(pattern => pattern.test(file)));
if (unknown.length) throw new Error(`Tests outside configured partitions: ${unknown.join(', ')}`);
const chosen = Number(process.argv[2] || 0);
const report = { started: new Date().toISOString(), status: 'running', files: 0, passed: 0, failed: 0, batches: [] };
const reportPath = path.join(__dirname, `verification-batched${chosen ? '-part-' + chosen : ''}.json`);
function save() { fs.writeFileSync(reportPath, JSON.stringify(report, null, 2)); }
save();
for (let partition = 1; partition <= matchers.length; partition++) {
  if (chosen && chosen !== partition) continue;
  const selected = files.filter(file => matchers[partition - 1].test(file));
  const batches = [];
  for (const file of selected) {
    // The complete workshop integration file has 97 scenarios; give it its own process.
    if (file.endsWith('/SceneWorkshop.test.tsx')) batches.push([file], []);
    else {
      if (!batches.length || batches.at(-1).length >= 12) batches.push([]);
      batches.at(-1).push(file);
    }
  }
  for (const [index, batch] of batches.filter(batch => batch.length).entries()) {
    const label = `part-${partition}-${String(index + 1).padStart(2, '0')}`;
    const logfile = path.join(out, `${label}.log`);
    const fd = fs.openSync(logfile, 'w');
    console.log(`Running ${label}: ${batch.length} files`);
    const result = spawnSync('bun', ['test', '--bail', '--timeout', '20000', ...batch.map(file => path.resolve(cwd, file))], {
      cwd, stdio: ['ignore', fd, fd], env: { ...process.env, DEBUG_PRINT_LIMIT: '2500' },
    });
    fs.closeSync(fd);
    const output = fs.readFileSync(logfile, 'utf8').replace(/\x1b\[[0-9;]*m/g, '');
    const passed = Number(output.match(/^\s*(\d+) pass\s*$/m)?.[1] || 0);
    const failed = Number(output.match(/^\s*(\d+) fail\s*$/m)?.[1] || 0);
    report.batches.push({ partition, label, files: batch, passed, failed, exitCode: result.status, error: result.error?.message });
    report.files += batch.length;
    report.passed += passed;
    report.failed += failed;
    save();
    if (result.status !== 0 || !passed || failed) {
      report.status = 'failed';
      report.finished = new Date().toISOString();
      save();
      console.error(`FAILED ${label}; inspect ${logfile}`);
      process.exit(1);
    }
    console.log(`Passed ${label}: ${passed} tests`);
  }
}
report.status = 'passed';
report.finished = new Date().toISOString();
save();
console.log(JSON.stringify({ status: report.status, files: report.files, passed: report.passed, failed: report.failed }));
