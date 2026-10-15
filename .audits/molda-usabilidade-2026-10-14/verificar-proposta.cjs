const fs = require('node:fs');
const path = require('node:path');

// Auditoria documental; não executa o editor nem mede usabilidade.
const root = path.resolve(__dirname, '../..');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');
const names = [
  'docs/plans/2026-10-14-molda-usabilidade-proposta.md',
  'docs/plans/2026-10-14-molda-usabilidade-fluxos.md',
  'docs/plans/2026-10-14-molda-usabilidade-revisao.md',
];
const docs = names.map((name) => ({ name, content: read(name) }));
const [proposal, catalog, review] = docs.map((doc) => doc.content);
const errors = [];
const requireCheck = (ok, message) => { if (!ok) errors.push(message); };
const unique = (values) => [...new Set(values)];

const families = [...read('packages/molda/src/core/toolFamilies.ts').matchAll(
  /\{\s*id:\s*'([^']+)'[\s\S]*?band:\s*'([^']+)'[\s\S]*?\}/g,
)].map((match) => ({ id: match[1], band: match[2] }));
const mappedFamilies = [...catalog.matchAll(/\| `([^`]+)` \| (basic|intermediate|professional) \|/g)]
  .map((match) => ({ id: match[1], band: match[2] }));
requireCheck(families.length === 23, `Código contém ${families.length} famílias; revisar contagem declarada.`);
requireCheck(mappedFamilies.length === families.length, 'Quantidade de famílias mapeadas diverge.');
for (const family of families) {
  requireCheck(mappedFamilies.filter((mapped) => mapped.id === family.id && mapped.band === family.band).length === 1,
    `Família/faixa ausente ou duplicada: ${family.id} / ${family.band}`);
}
for (const mapped of mappedFamilies) {
  requireCheck(families.some((family) => family.id === mapped.id), `Família desconhecida: ${mapped.id}`);
}

const commands = [...read('packages/molda/src/components/editor/scene/sceneCommandRegistry.ts')
  .matchAll(/\bid: '([^']+)'/g)].map((match) => match[1]);
const commandSection = catalog.split('## 6. Destino dos 45 comandos registrados')[1]?.split('## 7.')[0] ?? '';
requireCheck(commands.length === 45, `Código contém ${commands.length} comandos; revisar contagem declarada.`);
for (const id of commands) requireCheck(commandSection.includes('`' + id + '`'), `Comando sem destino: ${id}`);
const commandMentions = [...commandSection.matchAll(/`([^`]+)`/g)].map((match) => match[1]);
requireCheck(commandMentions.length === 45 && unique(commandMentions).length === 45,
  'Mapa de comandos não contém exatamente 45 identificadores únicos.');
for (const id of commandMentions) requireCheck(commands.includes(id), `Comando desconhecido: ${id}`);

const screenSection = catalog.split('## 2. Telas e estados')[1]?.split('## 3.')[0] ?? '';
const screens = [...screenSection.matchAll(/^\| (T\d{2}) \|/gm)].map((match) => match[1]);
const flows = [...catalog.matchAll(/^\| (F\d{2}) \|/gm)].map((match) => match[1]);
const findings = [...review.matchAll(/^\| (R\d{2}) \|/gm)].map((match) => match[1]);
for (const [label, ids, count] of [['T', screens, 45], ['F', flows, 50], ['R', findings, 33]]) {
  requireCheck(ids.length === count && unique(ids).length === count, `${label}: quantidade ou unicidade inválida.`);
  for (let i = 1; i <= count; i++) requireCheck(ids.includes(label + String(i).padStart(2, '0')), `${label}: falta ${i}.`);
}
for (const doc of docs) for (const match of doc.content.matchAll(/\b([TF]\d{2})\b/g)) {
  requireCheck((match[1][0] === 'T' ? screens : flows).includes(match[1]), `${doc.name}: referência inválida ${match[1]}`);
}

let localLinks = 0;
for (const doc of docs) for (const match of doc.content.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
  if (/^https?:\/\//.test(match[1])) continue;
  const target = decodeURIComponent(match[1].split('#')[0]);
  if (!target) continue;
  localLinks++;
  const resolved = path.resolve(root, path.dirname(doc.name), target);
  // Este arquivo é produzido ao final desta própria execução.
  if (resolved === path.join(__dirname, 'verificacao-proposta.json')) continue;
  requireCheck(fs.existsSync(resolved), `${doc.name}: link ausente ${target}`);
}

const layouts = [...proposal.matchAll(/\| (\d+) × (\d+) \| (\d+) px[^|]*\| (\d+) \/ (\d+) px \| (\d+) × (\d+) px \| (\d+) px \| (\d+) × (\d+) px \|/g)]
  .map((match) => {
    const [width, height, header, rail, panel, modelWidth, modelHeight, timeline, animationWidth, animationHeight] = match.slice(1).map(Number);
    requireCheck(width - rail - panel === modelWidth && modelWidth === animationWidth, `Largura não fecha: ${width} × ${height}`);
    requireCheck(height - header === modelHeight && modelHeight - timeline === animationHeight, `Altura não fecha: ${width} × ${height}`);
    return { width, height, header, rail, panel, timeline, modelWidth, modelHeight, animationWidth, animationHeight,
      modelClearHeight: modelHeight - 96, animationClearHeight: animationHeight - 96 };
  });
requireCheck(layouts.length === 3, 'Faltam orçamentos dimensionais.');
requireCheck(proposal.includes(layouts.map((layout) => layout.modelClearHeight).join('/')), 'Alturas livres de Modelar divergem do texto.');
requireCheck(proposal.includes(layouts.map((layout) => layout.animationClearHeight).join('/')), 'Alturas livres de Animar divergem do texto.');

const result = {
  checkedAt: new Date().toISOString(),
  scope: 'Somente consistência documental; nenhum teste de produto ou com crianças.',
  status: errors.length ? 'failed' : 'passed',
  documents: docs.map(({ name, content }) => ({ name, words: content.trim().split(/\s+/).length })),
  families: families.length,
  commands: commands.length,
  screens: screens.length,
  flows: flows.length,
  findings: findings.length,
  localLinks,
  layouts,
  errors,
};
fs.writeFileSync(path.join(__dirname, 'verificacao-proposta.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
process.exitCode = errors.length ? 1 : 0;
