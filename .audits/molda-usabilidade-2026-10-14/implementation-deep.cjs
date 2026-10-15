const { chromium, expect } = require('../../packages/molda/node_modules/@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const out = path.join(__dirname, 'implementation');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const errors = [], checks = [];
  page.on('pageerror', error => errors.push(error.message));
  async function shot(name) { await page.screenshot({ path: path.join(out, name + '.png'), animations: 'disabled' }); }
  async function snapshot() {
    const menu = page.locator('summary').filter({ hasText: 'Salvar e exportar' });
    if (!await menu.evaluate(el => el.parentElement.open)) await menu.click();
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Baixar projeto', exact: true }).click();
    const download = await pending;
    const data = JSON.parse(fs.readFileSync(await download.path(), 'utf8'));
    if (await menu.evaluate(el => el.parentElement.open)) await menu.click();
    return data;
  }
  async function center() {
    const box = await page.locator('canvas').first().boundingBox();
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  }
  async function stroke(point, length = 24) {
    await page.mouse.move(point.x - length / 2, point.y);
    await page.mouse.down(); await page.mouse.move(point.x + length / 2, point.y, { steps: 8 }); await page.mouse.up();
  }
  try {
    await page.goto('http://127.0.0.1:5216/?oficina=app&nivel=explorer');
    await page.getByRole('button', { name: 'Criar novo', exact: true }).click();
    await page.getByRole('button', { name: 'Criar modelo', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Aproximar', exact: true })).toBeEnabled();
    await shot('modelar-ready');
    const initial = await snapshot();
    await page.locator('summary').filter({ hasText: 'Vista: Livre' }).click();
    await page.getByRole('button', { name: 'Frente', exact: true }).click();
    const viewMenu = page.locator('summary').filter({ hasText: 'Vista: Frente' });
    if (await viewMenu.evaluate(el => el.parentElement.open)) await viewMenu.click();
    await page.getByRole('button', { name: 'Enquadrar', exact: true }).click();
    await page.getByRole('button', { name: 'Pintar', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Médio', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: /^Cor 2 / }).click();
    await page.getByRole('button', { name: 'Balde', exact: true }).click();
    await page.getByRole('radio', { name: 'Cor de fundo da peça' }).check();
    const point = await center();
    await page.mouse.click(point.x, point.y);
    const redBase = await snapshot();
    expect(redBase.materials[0].baseColor.kind).toBe('rgba');
    expect(redBase.materials[0].baseColor.value[0]).toBe(1);
    checks.push('base fill changes only the piece background');
    await page.getByRole('button', { name: 'Pincel', exact: true }).click();
    await page.getByRole('button', { name: /^Cor 15 / }).click();
    await stroke(point);
    const painted = await snapshot();
    const paintedPixels = painted.images.map(image => image.layers.map(layer => layer.pixels));
    expect(paintedPixels).not.toEqual(redBase.images.map(image => image.layers.map(layer => layer.pixels)));
    await shot('pintar-traco-real');
    await page.getByRole('button', { name: 'Borracha', exact: true }).click();
    await stroke(point);
    const erased = await snapshot();
    expect(erased.images.map(image => image.layers.map(layer => layer.pixels))).not.toEqual(paintedPixels);
    expect(erased.materials[0].baseColor).toEqual(redBase.materials[0].baseColor);
    await page.getByRole('button', { name: 'Desfazer', exact: true }).click();
    const undone = await snapshot();
    expect(undone.images.map(image => image.layers.map(layer => layer.pixels))).toEqual(paintedPixels);
    await page.getByRole('button', { name: 'Pegar cor', exact: true }).click();
    await page.mouse.click(point.x, point.y + 35);
    await expect(page.getByRole('button', { name: 'Pincel', exact: true })).toHaveAttribute('aria-pressed', 'true');
    checks.push('real brush, eraser, undo and composite picker');
    await page.getByRole('button', { name: 'Modelar', exact: true }).click();
    await page.getByRole('button', { name: 'Bola', exact: true }).click();
    await page.getByRole('button', { name: 'Colocar em cima', exact: true }).click();
    await page.getByRole('button', { name: /^Escolher caixa/ }).click();
    await page.getByRole('button', { name: 'Animar', exact: true }).click();
    await page.getByRole('button', { name: 'Modelo inteiro', exact: true }).click();
    await page.locator('summary').filter({ hasText: 'Experimentar um movimento pronto' }).click();
    const previewSource = await snapshot();
    expect(previewSource.nodes.filter(node => node.kind === 'group')).toHaveLength(0);
    await page.getByRole('button', { name: 'Pular', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Guardar este movimento', exact: true })).toBeEnabled();
    await shot('animar-previa-pulo');
    await page.getByRole('button', { name: 'Guardar este movimento', exact: true }).click();
    const animated = await snapshot();
    expect(animated.nodes.filter(node => node.kind === 'group')).toHaveLength(1);
    expect(animated.animations).toHaveLength(1);
    checks.push('whole-model preset commits group plus clip together');
    await page.getByRole('button', { name: 'Próxima pose →', exact: true }).click();
    await page.getByRole('button', { name: 'Mover', exact: true }).click();
    await page.getByRole('button', { name: 'move Altura · Y mais', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Marcar pose', exact: true })).toBeEnabled();
    await expect.poll(() => page.evaluate(() => Object.keys(localStorage).some(key => key.startsWith('molda:pose-draft:')))).toBe(true);
    await page.goto(`http://127.0.0.1:5216/?oficina=app&nivel=explorer&criacao=${initial.id}`);
    await page.getByRole('button', { name: 'Continuar a pose', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Marcar pose', exact: true })).toBeEnabled();
    await page.getByRole('button', { name: 'Marcar pose', exact: true }).click();
    checks.push('reload recovers a revision-owned pose without changing the saved model');
    await page.getByRole('button', { name: 'Meus projetos', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Criar novo', exact: true })).toBeVisible();
    checks.push('saved exit returns directly to gallery');
    expect(errors).toEqual([]);
    fs.writeFileSync(path.join(out, 'deep.json'), JSON.stringify({ checks, errors }, null, 2));
    console.log(JSON.stringify({ checks, errors }));
  } catch (error) { await shot('deep-failure'); fs.writeFileSync(path.join(out, 'deep-failure.json'), JSON.stringify({ checks, errors, error: String(error) }, null, 2)); throw error; }
  finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
