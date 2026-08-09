import { expect, type Page, test } from '@playwright/test'

/**
 * Repro AO VIVO do relato 25/07 (staging): na Ponte, colar o corpo da figura por
 * cima do `defineShape("inimigo", (ctx) => { })` vazio "duplicou todos os blocos".
 * As camadas determinísticas (parse → estado → normalização) estão provadas
 * limpas em bun:test — este spec exercita a maquinaria VIVA (Monaco → worker de
 * reverse-parse → reload do workspace renderizado) com o gesto real de colar,
 * começando do estado dela: projeto com a extensão Jogo 2D JÁ instalada.
 */

const BEFORE = `// Gerado pelo Sistema Zero Studio

SZGame2D.onStart(function __szProjectRun() {
  const __szProjectRunContext = window.__SZProjectLifecycle.begin(() => SZGame2D.restart());
  // Ao iniciar
  SZGame2D.setupStageFull("#22d3ee");
  SZGame2D.defineShape("dino", (ctx) => {
    SZGame2D.paintRect(ctx, 20, 50, 8, 14, "#3f8f49");
    SZGame2D.paintRect(ctx, 34, 50, 8, 14, "#3f8f49");
    SZGame2D.paintCircle(ctx, 52, 18, 4, "#ffffff");
  });
  const heroi = SZGame2D.createShapeSprite("dino", { x: 100, y: 600, w: 60, h: 64 });
  SZGame2D.defineShape("inimigo", (ctx) => {

  });
  const zumbi = SZGame2D.createEnemyType({ behavior: "patrulha", color: "#aab1cf", image: "", shape: "inimigo", hp: 3, speed: 2, dmg: 1, w: 32, h: 32 });
  SZGame2D.spawnEnemy(zumbi, 100, 100);
  SZGame2D.setGravity(0.5);
  // Quando acontecer
  SZGame2D.onKey("ArrowRight", () => {
    SZGame2D.flipSprite(heroi, "right");
  }, "bridge_events_0");
  // Enquanto estiver rodando
  SZGame2D.gameLoop(function update() {
    SZGame2D.clear();
    SZGame2D.platformer(heroi, ctx, 4, 11);
    SZGame2D.drawSprite(ctx, heroi);
    SZGame2D.updateEnemyType(zumbi, ctx, heroi);
    SZGame2D.drawEnemyType(ctx, zumbi);
  }, "bridge_loops_0");
}, "__sz-project");
`

// O mesmo arquivo com o corpo colado por cima do defineShape vazio (o estado
// final do gesto dela — um replace atômico no Monaco, como um paste sobre seleção).
const AFTER = BEFORE.replace(
  `  SZGame2D.defineShape("inimigo", (ctx) => {

  });`,
  `SZGame2D.defineShape("inimigo", (ctx) => {
  SZGame2D.paintRect(ctx, 10, 34, 8, 6, "#a83a52");
  SZGame2D.paintEllipse(ctx, 4, 10, 36, 28, "#e0556b");
  SZGame2D.paintCircle(ctx, 15, 23, 5, "#ffffff");
  SZGame2D.paintCircle(ctx, 29, 23, 5, "#ffffff");
});`,
)

async function pasteAll(page: Page, text: string): Promise<void> {
  await page.evaluate((value) => navigator.clipboard.writeText(value), text)
  await page.locator('.monaco-editor .view-line').first().click()
  await page.keyboard.press('ControlOrMeta+A')
  await page.keyboard.press('ControlOrMeta+V')
}

/** Conta os rótulos no CANVAS de blocos (fora do flyout da paleta). */
function labelCount(page: Page, label: string) {
  return page.locator('.blocklySvg .blocklyBlockCanvas text', { hasText: label }).count()
}

test.describe('Ponte — colar por cima do defineShape vazio (workspace vivo)', () => {
  test.beforeEach(async ({ browserName, context }) => {
    // O Playwright/Firefox recusa esses nomes de permissão ao criar o contexto;
    // nele, o clipboard do localhost funciona sem a concessão explícita.
    if (browserName === 'chromium') {
      await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    }
  })

  test('nada duplica após dois pastes e a poeira baixar', async ({ page }) => {
    test.setTimeout(180_000)
    const consoleErrors: string[] = []
    page.on('console', (message) => {
      if (message.type() === 'error' || message.type() === 'warning') {
        consoleErrors.push(`[${message.type()}] ${message.text()}`)
      }
    })
    page.on('pageerror', (error) => consoleErrors.push(`[pageerror] ${error.message}`))

    await page.goto('/')
    await page.getByRole('button', { name: '+ Novo projeto' }).first().click()
    await page.getByRole('button', { name: 'Criar e abrir' }).click()
    await expect(page).toHaveURL(/\/editor\//)

    // Estado da usuária: Jogo 2D instalado ANTES (menu ⋯ → Extensões → Instalar).
    await page.getByRole('button', { name: 'Mais opções' }).click()
    await page.getByRole('menuitem', { name: 'Extensões' }).click()
    await page
      .locator('div', { hasText: 'Jogo 2D' })
      .getByRole('button', { name: 'Instalar', exact: true })
      .first()
      .click()
    await expect(page.getByText('Instalada').first()).toBeVisible({ timeout: 10_000 })
    await page.keyboard.press('Escape')

    await page.getByRole('button', { name: 'Ponte' }).click()
    await page.getByRole('button', { name: 'script.js' }).first().click()
    const editor = page.locator('.monaco-editor').first()
    await editor.waitFor({ state: 'visible', timeout: 15_000 })

    // 1º paste: o projeto inteiro dela (envelope completo).
    await pasteAll(page, BEFORE)
    await expect.poll(() => labelCount(page, 'Criar tipo de inimigo'), { timeout: 30_000 }).toBe(1)
    await expect.poll(() => labelCount(page, 'Desenhar a figura'), { timeout: 15_000 }).toBe(2)

    // 2º paste: o MESMO arquivo com a figura preenchida (o gesto do relato).
    await pasteAll(page, AFTER)
    await expect.poll(() => labelCount(page, 'Desenhar oval'), { timeout: 30_000 }).toBe(1)

    // Deixa QUALQUER ciclo tardio (regenerate → reparse) rodar antes de medir —
    // a duplicação original aparecia SÓ aqui: o clear do reload deixava o
    // conteúdo dos frames antigos como pilhas órfãs (safe-delete × cerca de carga).
    await page.waitForTimeout(4_000)

    if (consoleErrors.length > 0) {
      console.log(`CONSOLE DO NAVEGADOR:\n${consoleErrors.join('\n')}`)
    }
    expect(await labelCount(page, 'Criar tipo de inimigo')).toBe(1)
    expect(await labelCount(page, 'Desenhar a figura')).toBe(2)
    expect(await labelCount(page, 'Desenhar oval')).toBe(1)
    expect(await labelCount(page, 'Preparar o jogo para ocupar a tela toda')).toBe(1)
    expect(await labelCount(page, 'Soltar um inimigo do tipo')).toBe(1)
  })
})
