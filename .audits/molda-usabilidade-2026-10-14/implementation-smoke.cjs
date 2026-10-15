const { chromium, expect } = require('../../packages/molda/node_modules/@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const out = path.join(__dirname, 'implementation');
  fs.mkdirSync(out, { recursive: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:5216/?oficina=app&nivel=explorer');
    await page.getByRole('button', { name: 'Criar novo' }).click();
    await page.getByRole('button', { name: 'Criar modelo' }).click();
    await page.getByRole('button', { name: 'Caixa', exact: true }).waitFor();
    await expect(page.getByRole('button', { name: 'Aproximar', exact: true })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Mover', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await page.screenshot({ path: path.join(out, 'modelar-1366.png'), animations: 'disabled' });
    const metrics = { modelar: await page.locator('canvas').first().boundingBox() };
    await page.getByRole('button', { name: 'Bola', exact: true }).click();
    await page.getByRole('button', { name: 'Colocar em cima', exact: true }).click();
    await page.getByRole('button', { name: /^Escolher caixa/ }).click();
    await page.getByRole('button', { name: 'Pintar', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Pincel', exact: true })).toBeVisible();
    await page.screenshot({ path: path.join(out, 'pintar-1366.png'), animations: 'disabled' });
    await page.getByRole('button', { name: 'Animar', exact: true }).click();
    await page.getByRole('button', { name: 'Modelo inteiro', exact: true }).click();
    await page.getByRole('button', { name: 'Criar movimento', exact: true }).click();
    await page.getByRole('button', { name: 'Próxima pose →', exact: true }).click();
    await page.getByRole('button', { name: 'move Altura · Y mais', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Marcar pose', exact: true })).toBeEnabled();
    await page.getByRole('button', { name: /^Escolher caixa/ }).click();
    await page.getByRole('button', { name: 'move Lado · X mais', exact: true }).click();
    await page.getByRole('button', { name: 'Modelar', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Esta pose ainda não foi marcada' })).toBeVisible();
    await page.getByRole('button', { name: 'Continuar ajustando', exact: true }).click();
    await page.getByRole('button', { name: 'Marcar pose', exact: true }).click();
    await page.getByRole('button', { name: 'Mais tempo · +2 s', exact: true }).click();
    await page.screenshot({ path: path.join(out, 'animar-1366.png'), animations: 'disabled' });
    metrics.animar = await page.locator('canvas').first().boundingBox();
    for (const [width, height] of [[1440, 900], [1024, 600]]) {
      await page.setViewportSize({ width, height });
      if (width === 1024) await page.getByRole('tab', { name: 'Pose', exact: true }).click();
      await page.screenshot({ path: path.join(out, `animar-${width}.png`), animations: 'disabled' });
      metrics[`animar-${width}`] = await page.locator('canvas').first().boundingBox();
    }
    fs.writeFileSync(path.join(out, 'smoke.json'), JSON.stringify({ errors, metrics }, null, 2));
    console.log(JSON.stringify({ errors, metrics }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
