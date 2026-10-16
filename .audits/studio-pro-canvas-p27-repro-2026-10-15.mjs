// Auditoria local: lê o P27 sem alterá-lo; não importa a entrada main.js no Node.
import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';

const source = String.raw`C:\Users\tocha\Downloads\162_source_code\JS Game Starter Kit P27\JS Game Starter Kit P27`;
const workspace = path.resolve(import.meta.dirname, '..');
const output = path.join(workspace, '.audits/studio-pro-canvas-p27-evidencias-2026-10-15');
await mkdir(output, { recursive: true });
const inventory = [];
async function walk(relative = '') {
  for (const item of await readdir(path.join(source, relative), { withFileTypes: true })) {
    const name = path.posix.join(relative, item.name);
    if (item.isDirectory()) { await walk(name); continue; }
    const bytes = await readFile(path.join(source, name));
    const entry = { path: name, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
    if (/\.(js|css|html)$/.test(name)) entry.lines = bytes.toString('utf8').split(/\r?\n/).length;
    if (name.endsWith('.png')) {
      entry.width = bytes.readUInt32BE(16); entry.height = bytes.readUInt32BE(20);
      entry.rgbaBytes = entry.width * entry.height * 4;
    }
    inventory.push(entry);
  }
}
await walk();
inventory.sort((a,b) => a.path.localeCompare(b.path));
const moduleAt = relative => import(pathToFileURL(path.join(source, relative)).href);
const { Player } = await moduleAt('js/entities/Player.js');
const { Game } = await moduleAt('js/core/Game.js');
const { AnimatorController } = await moduleAt('js/utils/AnimatorController.js');
const { ObjectPooler } = await moduleAt('js/utils/ObjectPooler.js');
const { playerData } = await moduleAt('js/data/playerData.js');
const { enemyData } = await moduleAt('js/data/enemyData.js');
const { audioData } = await moduleAt('js/data/audioData.js');
const atlasChecks = [];
for (const actor of [playerData, ...Object.values(enemyData)]) {
  for (const sheet of actor.animData.sheets) {
    const image = inventory.find(f=>f.path === `images/${sheet}.png`);
    for (const [state, animation] of Object.entries(actor.animData.states)) {
      atlasChecks.push({ sheet, state, valid: !!image && (animation.startFrame + animation.frameCount) * actor.animData.frameWidth <= image.width && (animation.row + 1) * actor.animData.frameHeight <= image.height });
    }
  }
}
const player = new Player(); player.takeDamage(player.maxHealth);
const events = [];
const missionContext = { state: 'playing', missionCompleted: false, enemiesKilled: 0, time: 60, player, events: { emit: name => events.push(name) } };
Game.prototype.checkMissionConditions.call(missionContext);
const knockback = [];
for (const hz of [10,30,60,120]) {
  const p = new Player(); p.x = 0; p.y = 0; p.applyPushback(1,0,520);
  for (let i = 0; i < hz * 2; i++) p._updatePushback(1/hz);
  knockback.push({ hz, distance: p.x });
}
const animator = new AnimatorController({ sheets: ['test'], frameWidth: 1, frameHeight: 1, initialState: 'idle', states: { idle: { row: 0, startFrame: 0, frameCount: 100, frameInterval: .02, loop: true } } });
animator.update(.1);
const pool = new ObjectPooler(() => ({ reset() {} }), 1);
for (let i = 0; i < 3; i++) pool.get();
const evidence = {
  capturedAt: new Date().toISOString(), source,
  scope: 'Inventário, microverificações dos módulos originais e navegador isolado. Não é validação de produção nem playtest integral.',
  inventory,
  summary: { files: inventory.length, bytes: inventory.reduce((n,f)=>n+f.bytes,0), jsFiles: inventory.filter(f=>f.path.endsWith('.js')).length, loadedSheetRgbaBytes: inventory.filter(f=>/sheet2?\.png$/.test(f.path)).reduce((n,f)=>n+f.rgbaBytes,0) },
  microchecks: {
    atlasChecks,
    audioChecks: audioData.map(item=>({name:item.name,path:item.path,present:inventory.some(file=>file.path===item.path.replace(/^\.\//,''))})),
    missionAfterDeath: { health: player.health, dead: player.isDead(), missionCompleted: missionContext.missionCompleted, events },
    knockback,
    customAnimation50fps: { dt: .1, advancedFrames: animator.currentFrame, expectedFrames: 5, caveat: 'Configuração de extensão; presets originais usam intervalos >=0.1s.' },
    pool: { initialSize: 1, activeAfterThreeGets: pool.active.length, freeAfterThreeGets: pool.pool.length },
  },
};
const mime = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.png':'image/png', '.mp3':'audio/mpeg' };
const server = createServer(async (req,res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (pathname === '/js/main.js') {
      res.writeHead(200, { 'Content-Type':'text/javascript' });
      // Only expose the original instance for observations in this disposable browser.
      res.end("import { Game } from './core/Game.js'; window.__p27Audit = new Game();"); return;
    }
    const relative = pathname === '/' ? 'index.html' : pathname.slice(1);
    const absolute = path.resolve(source, relative);
    if (!absolute.startsWith(source + path.sep)) { res.writeHead(403); res.end(); return; }
    const bytes = await readFile(absolute);
    res.writeHead(200, { 'Content-Type':mime[path.extname(absolute)] || 'application/octet-stream' }); res.end(bytes);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
let browser;
try {
  const require = createRequire(path.join(workspace,'packages/studio/package.json'));
  const { chromium } = require('@playwright/test');
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.addInitScript(() => {
    window.__auditRafCallbacks = 0;
    const native = requestAnimationFrame.bind(window);
    window.requestAnimationFrame = fn => native(t => { window.__auditRafCallbacks++; fn(t); });
  });
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.waitForFunction(() => document.querySelector('#mainMenu')?.classList.contains('active'));
  const loaded = await page.evaluate(() => ({ smoothing: window.__p27Audit.renderSystem.ctx.imageSmoothingEnabled, images: Object.values(window.__p27Audit.imageManager.images).filter(i=>i.loaded).length, sounds: Object.values(window.__p27Audit.audioManager.sounds).filter(i=>i.loaded).length }));
  await page.locator('#mainMenu [data-action="start"]').click();
  await page.waitForTimeout(2200);
  await page.screenshot({ path: path.join(output,'p27-desktop.png') });
  await page.keyboard.press('Escape');
  const before = await page.evaluate(() => ({ state: window.__p27Audit.state, time: window.__p27Audit.time, raf: window.__auditRafCallbacks }));
  await page.waitForTimeout(350);
  const after = await page.evaluate(() => ({ state: window.__p27Audit.state, time: window.__p27Audit.time, raf: window.__auditRafCallbacks }));
  await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',repeat:true})));
  const repeatedEscape = await page.evaluate(() => window.__p27Audit.state);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  const afterBlur = await page.evaluate(() => window.__p27Audit.state);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path:path.join(output,'p27-mobile-viewport.png') });
  const mobile = await page.evaluate(() => {
    const c = document.querySelector('canvas').getBoundingClientRect();
    return { canvas:{x:c.x,y:c.y,width:c.width,height:c.height}, buttons:[...document.querySelectorAll('button')].map(b=>({text:b.textContent,visible:!!b.getClientRects().length})) };
  });
  evidence.browser = { engine:'Playwright Chromium headless', instrumentation:'Entrada main expõe instância original; contador envolve RAF sem mudar seu agendamento. Escape repeat e blur são eventos sintéticos dirigidos.', loaded, pause:{ before, after, callbacksWhilePaused:after.raf-before.raf }, repeatedEscape, afterBlur, mobile, pageErrors };
} catch (error) { evidence.browser = { error:String(error) }; process.exitCode = 1; }
finally { if (browser) await browser.close(); await new Promise(resolve=>server.close(resolve)); }
evidence.studioSnapshot = [];
for (const relative of [
  '.audits/studio-pro-proposta-v2-2026-10-15.md',
  '.audits/studio-gamedev-aproveitamento-v2-2026-10-15.md',
  'docs/superpowers/plans/2026-10-15-studio-pro-implementacao.md',
  'packages/core/src/studio/pro-templates.ts',
  'packages/core/src/studio/pro-build.ts',
  'packages/core/src/studio/pro-artifact.ts',
  'packages/studio/src/components/code/pro-templates/games.ts',
  'packages/studio/src/components/code/pro-templates/games/shared.ts',
  'packages/studio/src/core/project.ts',
  'packages/studio/src/core/proAssets.ts',
  'packages/studio/src/core/proAssetPaths.ts',
  'packages/studio/src/official-extensions/game-2d-advanced/runtime.ts',
]) {
  const bytes = await readFile(path.join(workspace,relative));
  evidence.studioSnapshot.push({path:relative,sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length});
}
evidence.sourceUnchanged = true;
for (const file of inventory) {
  const current = await readFile(path.join(source,file.path));
  if (createHash('sha256').update(current).digest('hex') !== file.sha256) evidence.sourceUnchanged = false;
}
await writeFile(path.join(output,'evidence.json'), JSON.stringify(evidence,null,2)+'\n');
console.log(JSON.stringify({summary:evidence.summary,microchecks:evidence.microchecks,browser:evidence.browser,sourceUnchanged:evidence.sourceUnchanged},null,2));
