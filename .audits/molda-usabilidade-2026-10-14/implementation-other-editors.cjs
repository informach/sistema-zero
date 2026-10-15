const { chromium, expect } = require('../../packages/molda/node_modules/@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const out = path.join(__dirname, 'implementation');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const errors = [], checks = [];
  page.on('pageerror', error => errors.push(error.message));
  async function create(kind, name) {
    await page.getByRole('button', { name: 'Criar novo', exact: true }).click();
    await page.getByRole('dialog').getByRole('button').filter({ hasText: kind }).click();
    await page.getByRole('button', { name: 'Continuar', exact: true }).click();
    await page.getByRole('textbox', { name: 'Nome', exact: true }).fill(name);
    await page.getByRole('button', { name: 'Criar', exact: true }).click();
    await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
  }
  try {
    await page.goto('http://127.0.0.1:5216/?oficina=app&nivel=explorer');
    await create('Textura', 'textura-teste');
    await expect(page.getByRole('button', { name: /: Médio$/ })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: /^Cor 2 / }).click();
    const rect = await page.getByRole('img', { name: 'Folha de pixels', exact: true }).boundingBox();
    await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
    await page.mouse.down(); await page.mouse.move(rect.x + rect.width / 2 + 40, rect.y + rect.height / 2, { steps: 8 }); await page.mouse.up();
    await expect(page.getByRole('button', { name: 'Desfazer', exact: true })).toBeEnabled();
    await page.screenshot({ path: path.join(out, 'textura.png') });
    await page.getByRole('button', { name: 'Desfazer', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Refazer', exact: true })).toBeEnabled();
    await page.getByRole('button', { name: 'Voltar para a galeria', exact: true }).click();
    checks.push('texture uses named tools and medium brush; real stroke supports undo and return');
    await create('Céu', 'ceu-teste');
    await page.getByRole('slider', { name: 'Altura do sol', exact: true }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('button', { name: 'Desfazer', exact: true })).toBeEnabled();
    await expect(page.getByText('Do seu jeito', { exact: true })).toBeVisible();
    await page.screenshot({ path: path.join(out, 'ceu.png') });
    await page.getByRole('button', { name: 'Desfazer', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Refazer', exact: true })).toBeEnabled();
    await page.getByRole('button', { name: 'Voltar para a galeria', exact: true }).click();
    checks.push('sky slider works by keyboard and supports undo without changing editor conventions');
    expect(errors).toEqual([]);
    fs.writeFileSync(path.join(out, 'other-editors.json'), JSON.stringify({ checks, errors }, null, 2));
    console.log(JSON.stringify({ checks, errors }));
  } catch (error) { await page.screenshot({ path: path.join(out, 'other-editors-failure.png') }); throw error; }
  finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
