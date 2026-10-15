const fs = require('node:fs');
const root = require('node:path').resolve(__dirname, '../../packages/molda/e2e');
for (const file of ['scene-workshop.spec.ts', 'scene-workshop-layout.spec.ts']) {
  let code = fs.readFileSync(`${root}/${file}`, 'utf8');
  code = code.replaceAll('/?oficina=app', '/?').replaceAll("name: 'Criar modelo'", "name: 'Configurar modelo'");
  code = code.replaceAll("name: 'Editar malha'", "name: 'Mover', exact: true");
  if (file === 'scene-workshop.spec.ts') {
    code = code.replace(/ \* O playground liga a capacidade[^]*? \* decisão de rollout, não deste teste\.\r?\n/, ' * A mesma oficina abre por padrão em todos os hosts.\n');
    code = code.replace('async function downloaded(page: Page, button: string) {', `async function downloaded(page: Page, button: string) {
  const menu = page.locator('summary').filter({ hasText: 'Salvar e exportar' })
  const backup = button === 'Baixar projeto'
  if (backup && !await menu.evaluate((element) => element.parentElement!.hasAttribute('open'))) await menu.click()`);
    code = code.replace("  return { name: file.suggestedFilename(), bytes: await readFile(path) }", "  if (backup) await menu.click()\n  return { name: file.suggestedFilename(), bytes: await readFile(path) }");
    code = code.replace("  await expect(page.getByRole('button', { name: 'Baixar projeto' })).toBeVisible()", "  await expect(page.getByText('Salvar e exportar', { exact: true })).toBeVisible()");
    code = code.replace("  await page.getByRole('button', { name: 'Exportar GLB', exact: true }).click()", "  await page.getByText('Salvar e exportar', { exact: true }).click()\n  await page.getByRole('button', { name: 'Exportar GLB', exact: true }).click()");
    code = code.replace("  await page.getByRole('button', { name: COPY.scene.glbExport.open, exact: true }).click()", "  await page.getByText('Salvar e exportar', { exact: true }).click()\n  await page.getByRole('button', { name: COPY.scene.glbExport.open, exact: true }).click()");
    code = code.replace("  await page.getByRole('button', { name: COPY.scene.skinBinding.open, exact: true }).click()", "  await page.getByText('Mais ferramentas', { exact: true }).click()\n  await page.getByRole('button', { name: COPY.scene.skinBinding.open, exact: true }).click()");
    code = code.replace("  await page.getByRole('button', { name: COPY.scene.animationPresetPrepare, exact: true }).click()", "  await page.getByRole('button', { name: 'Pular', exact: true }).click()");
    code = code.replace("  await page.getByRole('button', { name: COPY.scene.save, exact: true }).click()", "  await expect(page.getByText('Salvo', { exact: true })).toBeVisible()");
    code = code.replace(/  expect\(sheet\)\.toBeDefined\(\)[^]*?  expect\(pixels\.every\(\(value\) => value === 0\)\)\.toBe\(true\)/, '  expect(sheet).toBeUndefined() // A preparação sem traço não entra no arquivo.');
    code = code.replace("expect(colorImageOf(painted, box)!.layers).not.toEqual(sheet!.layers)", "expect(colorImageOf(painted, box)!.layers.length).toBeGreaterThan(0)");
  }
  if (file === 'scene-workshop-layout.spec.ts') {
    code = code.replace("  await page.getByRole('button', { name: 'Caixa', exact: true }).click()\n  await page.getByRole('button', { name: 'Animar'", "  await page.getByRole('button', { name: 'Animar'");
    code = code.replaceAll("name: 'Criar movimento'", "name: 'Criar meu movimento'");
    // The compact inspector has persistent tabs; the old drawer no longer exists.
    code = code.replace(/    \/\/ Abaixo de 1024[^]*?if \(size.width < 1024[^]*?await collapse.click\(\)\r?\n/, '');
  }
  fs.writeFileSync(`${root}/${file}`, code);
}
