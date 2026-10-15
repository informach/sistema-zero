// Read-only AST inventory. No dependency installation or application execution.
// node .audits/tui-review-v2-2026-10-15/inventory.cjs <research-clones-directory>
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const ts = require('../../packages/tui/node_modules/typescript');
const root = process.argv[2];
if (!root) throw new Error('Supply the research clones directory');
const repositories = ['nightcode', 'browser-automation-app', 'ai-teammates', 'sendkit', 'sandbox'];
const summaries = [];
const inventory = [];
for (const repository of repositories) {
  const cwd = path.join(root, repository);
  const git = (...args) => cp.execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
  const tracked = git('ls-files').split('\n');
  const files = tracked.filter(f => /\.(?:[cm]?[jt]s|[jt]sx)$/.test(f));
  const names = new Set(files);
  const packages = new Map();
  for (const file of tracked.filter(f => /(?:^|\/)package.json$/.test(f))) {
    const p = JSON.parse(fs.readFileSync(path.join(cwd, file), 'utf8'));
    if (p.name) packages.set(p.name, path.posix.dirname(file));
  }
  const resolve = (from, spec) => {
    let base;
    if (spec.startsWith('.')) base = path.posix.normalize(path.posix.join(path.posix.dirname(from), spec));
    else if (spec.startsWith('@/')) base = spec.slice(2);
    else if (packages.has(spec)) base = path.posix.join(packages.get(spec), 'src/index');
    if (!base) return;
    return [base, ...['.ts','.tsx','.js','.jsx','.mjs','.cjs','/index.ts','/index.tsx','/index.js'].map(e=>base+e)].find(f=>names.has(f));
  };
  const graph = new Map(files.map(f => [f, new Set()]));
  const rows = [];
  for (const file of files) {
    const source = fs.readFileSync(path.join(cwd, file), 'utf8');
    const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
    const imports = [], exports = [], anyLines = [];
    function walk(n) {
      let spec;
      if ((ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) && n.moduleSpecifier && ts.isStringLiteral(n.moduleSpecifier)) spec = n.moduleSpecifier.text;
      if (ts.isCallExpression(n) && n.arguments.length && ts.isStringLiteral(n.arguments[0]) && (n.expression.kind === ts.SyntaxKind.ImportKeyword || n.expression.getText(sf) === 'require')) spec = n.arguments[0].text;
      if (spec) { imports.push(spec); const target = resolve(file, spec); if (target) graph.get(file).add(target); }
      if (n.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
        if (n.name) exports.push(n.name.getText(sf));
        if (ts.isVariableStatement(n)) for (const d of n.declarationList.declarations) exports.push(d.name.getText(sf));
      }
      if (ts.isExportDeclaration(n) && n.exportClause && ts.isNamedExports(n.exportClause)) for (const e of n.exportClause.elements) exports.push(e.name.text);
      if (n.kind === ts.SyntaxKind.AnyKeyword) anyLines.push(sf.getLineAndCharacterOfPosition(n.getStart(sf)).line+1);
      ts.forEachChild(n, walk);
    }
    walk(sf);
    const category = /^\.(agents|claude)\//.test(file) ? 'skill_reference' : /\/runtime\//.test(file) ? 'embedded_runtime' : /(?:^|\/)(?:app|trigger)\//.test(file) || /(?:config\.[cm]?[jt]s|instrumentation|proxy)/.test(file) ? 'framework_or_config' : 'application_or_library';
    rows.push({repository, file, category, lines:source.split('\n').length-(source.endsWith('\n')?1:0), bytes:Buffer.byteLength(source), sha256:crypto.createHash('sha256').update(source).digest('hex'), imports, exports, anyLines, parseErrors:sf.parseDiagnostics.length, review:'structural_ast'});
  }
  for (const row of rows) row.localImporters = files.filter(f => graph.get(f).has(row.file));
  const cycles = [], active = new Set(), done = new Set(), stack = [];
  function visit(f) {
    if (active.has(f)) { cycles.push([...stack.slice(stack.indexOf(f)),f]); return; }
    if (done.has(f)) return;
    active.add(f); stack.push(f);
    for (const n of graph.get(f)) visit(n);
    stack.pop(); active.delete(f); done.add(f);
  }
  files.forEach(visit);
  summaries.push({repository, commit:git('rev-parse','HEAD'), remoteHead:git('ls-remote','origin','HEAD').split(/\s+/)[0], trackedFiles:tracked.length, sourceFiles:rows.length, sourceLines:rows.reduce((n,r)=>n+r.lines,0), parseErrors:rows.reduce((n,r)=>n+r.parseErrors,0), cycles, conventionalTests:tracked.filter(f=>/(?:^|\/)(?:tests?|__tests__)\/|\.(?:test|spec)\.[cm]?[jt]sx?$/.test(f)), licenseFiles:tracked.filter(f=>/(?:^|\/)(?:licen[sc]e|copying|notice)(?:\.|$)/i.test(f))});
  inventory.push(...rows);
}
fs.writeFileSync(path.join(__dirname,'structure.json'), JSON.stringify({date:'2026-10-15', limitations:['Static string imports only; aliases approximated, framework and generated consumers require manual review.', 'No zero-import file is declared dead by this inventory.', 'Structural AST coverage is not line-by-line semantic validation.'], summaries, inventory},null,2)+'\n');
const csv = v => '"'+String(v).replaceAll('"','""')+'"';
fs.writeFileSync(path.join(__dirname,'files.csv'), ['repository,file,category,lines,bytes,sha256,exports,localImporters,review',...inventory.map(r=>[r.repository,r.file,r.category,r.lines,r.bytes,r.sha256,r.exports.join(';'),r.localImporters.join(';'),r.review].map(csv).join(','))].join('\n')+'\n');
console.log(JSON.stringify(summaries,null,2));
