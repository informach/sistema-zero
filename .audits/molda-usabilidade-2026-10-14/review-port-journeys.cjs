const fs = require('node:fs');
const path = require('node:path');
const names = {
  smoke: 'criação rápida, montagem, pose de várias peças e telas menores',
  deep: 'pintura real, cor composta, movimento e recuperação da pose após recarregar',
  advanced: 'câmera, pivô, divisão e decisões antes de abandonar prévias',
  'other-editors': 'textura e céu preservam pintura, ajustes e desfazer',
};
let result = `import { test, expect } from '@playwright/test'\nimport fs from 'node:fs'\nimport path from 'node:path'\n\n`;
for (const [key, title] of Object.entries(names)) {
  let source = fs.readFileSync(path.join(__dirname, `implementation-${key}.cjs`), 'utf8');
  source = source.replace(/^const .*require\([^\n]+\n/gm, '');
  source = source.replace(/^const out = [^\n]+\n/gm, '');
  source = source.replace('(async () => {', `test('${title}', async ({ browser }, info) => {\n  test.setTimeout(120_000)\n  const context = await browser.newContext()\n  const out = info.outputPath('evidence')\n  fs.mkdirSync(out, { recursive: true })`);
  source = source.replace(/  const browser = await chromium.launch[^\n]+\n/, '');
  source = source.replace(/  const out = path.join\(__dirname, 'implementation'\);\r?\n/, '');
  source = source.replaceAll('browser.newPage(', 'context.newPage(').replaceAll('await browser.close()', 'await context.close()');
  source = source.replace(/\}\)\(\)\.catch\(error => \{ console.error\(error\); process.exitCode = 1; \}\);?\s*$/, '})\n');
  source = source.replaceAll('http://127.0.0.1:5216/?oficina=app&', '/?').replaceAll('http://127.0.0.1:5216/?oficina=app', '/');
  source = source.replaceAll('move Altura', 'Mover Altura').replaceAll('move Lado', 'Mover Lado');
  source = source.replaceAll('`molda:pose-draft:${', '`molda:pose-draft:${');
  source = source.replaceAll('    fs.writeFileSync(', '    expect(errors).toEqual([]);\n    fs.writeFileSync(');
  result += source + '\n';
}
fs.writeFileSync(path.resolve(__dirname, '../../packages/molda/e2e/workshop-journeys.spec.ts'), result);
