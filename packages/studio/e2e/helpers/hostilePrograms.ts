import { expect, type Page } from '@playwright/test'

/**
 * Os programas hostis da seção 5 da missão (etapa 1, isolamento), num lugar só para as duas
 * suítes: `preview-hostile-programs.spec.ts` (prévia no `srcdoc` direto, Chromium) e
 * `preview-shell-hostile.spec.ts` (prévia na casca em outro site, Chromium e Firefox).
 *
 * A lista do texto da missão: laços infinitos, recursão sem fim, processamento síncrono
 * excessivo, uso excessivo de memória, renderização pesada, erros de física, erros de compilação,
 * quantidade excessiva de eventos e inundação de mensagens no console. Nenhum destes programas
 * precisa "funcionar": o que se cobra é do EDITOR.
 */
export const PROGRAMAS_HOSTIS = {
  /** O laço literal: a guarda de laços corta, mas até lá o jogo segura o próprio processo. */
  laco: ['let voltas = 0;', 'while (true) {', '  voltas++;', '}'].join('\n'),

  /** Trabalho síncrono que NÃO é laço (a guarda de laços não alcança). */
  trabalhoSincrono: [
    'const dados = Array.from({ length: 300000 }, (_, i) => (i * 7919) % 10007);',
    'const fim = Date.now() + 30000;',
    'function gastar() { if (Date.now() < fim) { dados.slice().sort((a, b) => a - b); gastar(); } }',
    'gastar();',
  ].join('\n'),

  recursao: 'function cair(n) { return cair(n + 1) + 1; }\ncair(0);',

  enxurradaDeMensagens:
    'setInterval(() => { for (let i = 0; i < 2000; i++) console.log("mensagem " + i); }, 0);',

  memoria:
    'const tudo = [];\nsetInterval(() => { tudo.push(new Array(500000).fill(Math.random())); }, 5);',

  /**
   * Renderização pesada: uma tela de 1920 por 1080 com 120 mil retângulos e um desfoque da tela
   * inteira a cada quadro.
   */
  renderizacao: [
    'const tela = document.createElement("canvas");',
    'tela.width = 1920;',
    'tela.height = 1080;',
    'document.body.append(tela);',
    'const pincel = tela.getContext("2d");',
    'function quadro(t) {',
    '  for (let i = 0; i < 120000; i++) {',
    '    pincel.fillStyle = "hsl(" + ((i + Math.floor(t)) % 360) + ", 80%, 50%)";',
    '    pincel.fillRect((i * 13) % 1920, (i * 7) % 1080, 24, 24);',
    '  }',
    '  pincel.filter = "blur(6px)";',
    '  pincel.drawImage(tela, 0, 0);',
    '  pincel.filter = "none";',
    '  requestAnimationFrame(quadro);',
    '}',
    'requestAnimationFrame(quadro);',
  ].join('\n'),

  /** Código que nem compila: o erro é do jogo da criança, não do editor. */
  compilacao: ['const pontos = ;', 'document.body.dataset.quebrado = "sim";'].join('\n'),

  /**
   * Quantidade excessiva de eventos: 500 ouvintes de tecla, duas mil teclas falsas por volta e,
   * na mesma volta, duas mil mensagens para a página de fora com a forma das que o editor lê
   * (registro, erro, batimento, laço cortado, gravação do armazenamento do jogo).
   */
  eventos: [
    'const tipos = ["log", "warn", "error", "runtimeError", "heartbeat", "loopStopped", "storageWrite"];',
    'let n = 0;',
    'for (let i = 0; i < 500; i++) window.addEventListener("keydown", () => { n++; });',
    'setInterval(() => {',
    '  for (let i = 0; i < 2000; i++) {',
    '    n++;',
    '    window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp" }));',
    '    window.parent.postMessage({',
    '      source: "sz-preview",',
    '      kind: tipos[n % tipos.length],',
    '      parts: ["evento " + n],',
    '      error: { message: "evento falso " + n, line: 1, userCode: true },',
    '      store: "local",',
    '      data: { ["chave" + (n % 50)]: "v".repeat(400) },',
    '      timestamp: Date.now(),',
    '    }, "*");',
    '  }',
    '}, 0);',
  ].join('\n'),

  /**
   * Erros de física no motor de verdade (Jogo 2D): gravidade que não é número, 1.500 caixas com
   * velocidade NaN e infinita colidindo com o chão a cada quadro, e um "Quando encostar" que
   * lança dentro do passo do motor. Pede a extensão instalada (`instalarJogo2D`).
   */
  fisica: [
    'SZGame2D.setupStage(640, 360, "#dff6ff");',
    'SZGame2D.setGravity(Number.NaN);',
    'const chao = SZGame2D.createSprite({ x: 320, y: 350, w: 640, h: 20 });',
    'const pedra = SZGame2D.createSprite({ x: 320, y: 350, w: 40, h: 20 });',
    'const caixas = SZGame2D.createGroup();',
    'for (let i = 0; i < 1500; i++) {',
    '  const caixa = SZGame2D.createSprite({ x: (i * 37) % 620, y: (i * 13) % 300, w: 12, h: 12 });',
    '  caixa.vx = i % 2 === 0 ? Number.NaN : Infinity;',
    '  caixa.vy = -Infinity;',
    '  SZGame2D.addToGroup(caixas, caixa);',
    '}',
    'SZGame2D.onOverlap(() => pedra, () => chao, () => { const motor = null; motor.quebrou = true; });',
    'SZGame2D.gameLoop(() => {',
    '  SZGame2D.clear();',
    '  SZGame2D.applyGravityToGroup(caixas);',
    '  SZGame2D.collideGroup(chao, caixas);',
    '  SZGame2D.drawSprite(ctx, chao);',
    '});',
  ].join('\n'),
} as const

/**
 * Põe o Jogo 2D (ou outra extensão, pelo nome do cartão) no projeto aberto, pelo mesmo caminho da
 * criança (⋯ → Mais blocos).
 */
export async function instalarJogo2D(page: Page, nome = 'Jogo 2D'): Promise<void> {
  await page.getByRole('button', { name: 'Mais opções' }).click()
  await page.getByRole('menuitem', { name: 'Mais blocos', exact: true }).click()
  const cartao = page
    .getByRole('listitem')
    .filter({ has: page.getByText(nome, { exact: true }) })
    .first()
  await cartao.getByRole('button', { name: 'Pôr no meu jogo', exact: true }).click()
  await expect(cartao.getByText('No meu jogo', { exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
}

/**
 * Abre as "Mensagens do jogo" da gaveta só se o painel não estiver à vista: clicar na aba já
 * aberta fecha a gaveta (a criação de projeto da suíte da casca já a deixa aberta).
 */
export async function abrirMensagensDoJogo(page: Page): Promise<void> {
  const painel = page.getByRole('tabpanel', { name: 'Mensagens do jogo' })
  if (await painel.isVisible()) return
  await page.getByRole('tab', { name: /^Mensagens do jogo/ }).click()
  await expect(painel).toBeVisible()
}

/** O selo de gravação: texto no largo, `role="status"` na barra compacta. */
export function seloSalvo(page: Page) {
  return page
    .getByText('Salvo', { exact: true })
    .or(page.getByRole('status', { name: 'Salvo', exact: true }))
}

/**
 * Com o programa hostil rodando, o editor ainda atende o Salvar do menu ⋯ e a gravação termina
 * (o selo só volta a "Salvo" depois que o banco confirma). Pede o salvamento automático segurado
 * (`createProject(page, { segurarAutosave: true })`): sem isso o automático já tinha gravado e o
 * selo nunca saía de "Salvo" (revisão do lote 2, 21/11/2026).
 */
export async function salvarDuranteOPior(page: Page): Promise<void> {
  await expect(
    page
      .getByText('Alterações não salvas', { exact: true })
      .or(page.getByRole('status', { name: 'Alterações não salvas', exact: true })),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Mais opções' }).click()
  await page.getByRole('menuitem', { name: 'Salvar', exact: true }).click()
  await expect(seloSalvo(page)).toBeVisible({ timeout: 10_000 })
}
