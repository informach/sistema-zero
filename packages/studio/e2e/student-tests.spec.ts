import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, type Page, test } from '@playwright/test'
import { requireCleanRuntimeBrowser, requireRetainedHostFocus } from './helpers/cleanBrowser'
import { instalarJogo2D } from './helpers/hostilePrograms'
import { replaceBridgeScript } from './helpers/previewShell'

requireCleanRuntimeBrowser()

requireRetainedHostFocus('Teste do jogo')

/**
 * A aba Meus testes no navegador (proposta aprovada em 20/11/2026): o formulário cria os testes
 * com os nomes do jogo, "Rodar os testes" roda cada um num palco escondido (o documento da prévia
 * com o leitor das variáveis e o piloto, sob a mesma CSP), os resultados aparecem como nas
 * pranchas, o teste que não passou mostra como o jogo terminou, e os testes ficam no projeto.
 * Roda também no Firefox (a CSP do documento, com os scripts em `data:`) e no WebKit (o iPad).
 */

// Curto de propósito: no WebKit a caixa acessível do Monaco só guarda as linhas perto do cursor, e
// o ajudante da colagem confere o texto inteiro por ela.
const GAME = [
  'let pontos = 0;',
  "document.addEventListener('keydown', function (e) { if (e.key === 'Enter') pontos = pontos + 1; });",
  "const tela = document.createElement('canvas'); tela.width = 200; tela.height = 100; document.body.append(tela); tela.getContext('2d').fillRect(0, 0, 200, 100);",
].join('\n')

async function createProject(page: Page): Promise<void> {
  await page.goto('/')
  await page.getByRole('button', { name: '+ Novo projeto' }).first().click()
  await page.getByRole('button', { name: 'Criar e abrir' }).click()
  await expect(page).toHaveURL(/\/editor\//, { timeout: 15_000 })
  // A URL troca antes de o editor montar ("Carregando projeto…"): no WebKit os cartões da lista
  // ainda estavam na página, e o "Ponte" da colagem achava os cartões com "Ponte" no nome.
  await expect(page.getByRole('button', { name: 'Ponte', exact: true })).toBeVisible({
    timeout: 30_000,
  })
}

async function newTest(page: Page, name: string, value: string): Promise<void> {
  await page.getByRole('button', { name: '+ Novo teste' }).click()
  const form = page.getByRole('form', { name: 'Novo teste' })
  await form.getByLabel('Nome do teste').fill(name)
  await form.getByLabel('Qual variável').selectOption('pontos')
  await form.getByLabel('Como comparar').selectOption('equals')
  await form.getByLabel('Valor para comparar').fill(value)
  await form.getByRole('button', { name: 'Salvar teste' }).click()
  await expect(form).toBeHidden()
}

test('Meus testes: cria, roda no palco escondido, mostra o resultado e guarda no projeto', async ({
  page,
}) => {
  test.setTimeout(90_000)
  await createProject(page)
  await replaceBridgeScript(page, GAME)
  await page.getByRole('tab', { name: 'Meus testes' }).click()
  await newTest(page, 'Enter dá um ponto', '1')
  await newTest(page, 'Enter dá dois pontos', '2')
  await expect(page.getByText('Quando eu apertar Enter. No fim, pontos é igual a 1.')).toBeVisible()

  await page.getByRole('button', { name: 'Rodar os testes' }).click()
  const status = page.locator('[data-sz-devtools="tests"] [role="status"]')
  await expect(status).toContainText('1 de 2 testes passou.', { timeout: 60_000 })
  const cards = page.locator('[data-sz-devtools="tests"] article')
  await expect(cards.nth(0)).toHaveAttribute('data-sz-test-status', 'passed')
  await expect(cards.nth(0)).toContainText('Passou: pontos ficou 1.')
  await expect(cards.nth(1)).toHaveAttribute('data-sz-test-status', 'failed')
  await expect(cards.nth(1)).toContainText('Não passou: pontos terminou em 1.')
  // O palco escondido saiu da página no fim.
  await expect(page.locator('iframe[title="Teste do jogo"]')).toHaveCount(0)

  await cards.nth(1).getByRole('button', { name: 'Ver como o jogo terminou' }).click()
  const ending = page.getByRole('img', {
    name: 'Como o jogo terminou no teste "Enter dá dois pontos"',
  })
  await expect(ending).toBeVisible()
  expect(await ending.getAttribute('src')).toMatch(/^data:image\//)

  // Os testes ficam guardados no projeto.
  await expect(page.getByText('Salvo', { exact: true })).toBeVisible({ timeout: 15_000 })
  await page.reload()
  await page.getByRole('tab', { name: 'Meus testes' }).click()
  await expect(page.getByText('Enter dá um ponto', { exact: true })).toBeVisible({
    timeout: 15_000,
  })
  await expect(page.getByText('Enter dá dois pontos', { exact: true })).toBeVisible()
})

const CADE_FINAL = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../docs/aulas-interativas/faisca/cade-todo-mundo/projeto-final.szproject.json',
)

test('Meus testes: clicar no sprite de um grupo, no jogo final do Cadê Todo Mundo', async ({
  page,
}) => {
  test.setTimeout(90_000)
  await page.goto('/')
  await page.getByLabel('Importar projeto').setInputFiles(CADE_FINAL)
  await expect(page).toHaveURL(/\/editor\//, { timeout: 20_000 })
  await page.getByRole('tab', { name: 'Meus testes' }).click()

  await page.getByRole('button', { name: '+ Novo teste' }).click()
  const form = page.getByRole('form', { name: 'Novo teste' })
  await form.getByLabel('Nome do teste').fill('Achar a raposa conta um achado')
  await form.getByLabel('Passo 1', { exact: true }).selectOption('click')
  await form.getByLabel('Sprite do passo 1').selectOption('esconderijo2')
  await form.getByLabel('Grupo do passo 1').selectOption('esconderijos')
  await form.getByLabel('Qual variável').selectOption('achados')
  await form.getByLabel('Como comparar').selectOption('increased')
  await form.getByRole('button', { name: 'Salvar teste' }).click()
  await expect(form).toBeHidden()
  await expect(
    page.getByText('Quando eu clicar no esconderijo2. No fim, achados aumentou.'),
  ).toBeVisible()

  await page.getByRole('button', { name: 'Rodar os testes' }).click()
  const card = page.locator('[data-sz-devtools="tests"] article').first()
  await expect(card).toHaveAttribute('data-sz-test-status', 'passed', { timeout: 60_000 })
  await expect(card).toContainText('Passou: achados foi de 0 para 1.')
})

/**
 * Os casos dos testes do aluno (lote 3 da conclusão, 22/11/2026): chave, porta, vida, placar e
 * fim num jogo pequeno de cada motor 2D, escrito na Ponte (o código que não compila e o jogo que
 * trava moram em `student-tests-hostile.spec.ts`: eles deixam erro no navegador de propósito). Os
 * jogos são curtos de propósito (a caixa acessível do Monaco no WebKit, ver `GAME`): o herói anda
 * para a direita com a seta, pega a chave em x 100, abre a porta em x 220, Espaço marca ponto e,
 * parado no começo, ele perde uma vida por segundo até o fim. O Jogo 2D Avançado abre sempre no
 * menu dele: o piloto aperta o "Jogar" antes de ler o começo (sem isso, todo teste dele ficava
 * parado no menu, achado deste lote).
 */
const CASE_GAMES = [
  {
    engine: 'Jogo 2D',
    code: [
      "SZGame2D.setupStage(400, 200, '#dff6ff'); let x = 0; let temChave = false; let portaAberta = false; let vidas = 3; let pontos = 0; let fim = false;",
      "SZGame2D.onKey('Space', function () { if (!fim) pontos = pontos + 1; });",
      "SZGame2D.gameLoop(function () { if (!fim && SZGame2D.keyDown('ArrowRight')) x = x + 4; if (x > 100) temChave = true; if (temChave && x > 220) portaAberta = true; if (!fim && x === 0 && SZGame2D.everySeconds('perigo', 1)) { vidas = vidas - 1; if (vidas === 0) fim = true; } SZGame2D.clear(); });",
    ].join('\n'),
  },
  {
    engine: 'Jogo 2D Avançado',
    code: [
      'SZGameKit.setup({ width: 400, height: 200 }); let x = 0; let temChave = false;',
      'let portaAberta = false; let vidas = 3; let pontos = 0; let fim = false;',
      'let perigo = 0; SZGameKit.onUpdate(function (dt) { if (fim) return;',
      "if (SZGameKit.keyDown('ArrowRight')) x += 240 * dt; if (x > 100) temChave = true;",
      "if (SZGameKit.keyPressed('Space')) pontos++; if (temChave && x > 220) portaAberta = true;",
      'if (x === 0 && (perigo += dt) >= 1) { perigo = 0; vidas--; fim = vidas === 0; } });',
      'SZGameKit.start();',
    ].join('\n'),
  },
] as const

/** O botão que acrescenta um passo ao teste (`tests.form.more`). */
const MORE_STEPS = '+ Mais um passo'

interface CaseStep {
  kind: 'press' | 'hold' | 'wait'
  key?: string
  seconds?: string
}

interface CaseTest {
  name: string
  steps: readonly CaseStep[]
  variable: string
  compare: string
  value?: string
  status: 'passed' | 'failed'
  text?: string
}

async function newCase(page: Page, item: CaseTest): Promise<void> {
  await page.getByRole('button', { name: '+ Novo teste' }).click()
  const form = page.getByRole('form', { name: 'Novo teste' })
  await form.getByLabel('Nome do teste').fill(item.name)
  for (const [index, step] of item.steps.entries()) {
    const n = index + 1
    if (index > 0) await form.getByRole('button', { name: MORE_STEPS, exact: true }).click()
    await form.getByLabel(`Passo ${n}`, { exact: true }).selectOption(step.kind)
    if (step.key) await form.getByLabel(`Tecla do passo ${n}`).selectOption(step.key)
    if (step.seconds) await form.getByLabel(`Segundos do passo ${n}`).fill(step.seconds)
  }
  await form.getByLabel('Qual variável').selectOption(item.variable)
  await form.getByLabel('Como comparar').selectOption(item.compare)
  if (item.value !== undefined) await form.getByLabel('Valor para comparar').fill(item.value)
  await form.getByRole('button', { name: 'Salvar teste' }).click()
  await expect(form).toBeHidden()
}

const CASES: readonly CaseTest[] = [
  {
    name: 'A seta leva até a chave',
    steps: [{ kind: 'hold', key: 'ArrowRight', seconds: '1' }],
    variable: 'temChave',
    compare: 'equals',
    value: 'verdadeiro',
    status: 'passed',
  },
  {
    name: 'Com a chave a porta abre',
    steps: [{ kind: 'hold', key: 'ArrowRight', seconds: '1.5' }],
    variable: 'portaAberta',
    compare: 'equals',
    value: 'verdadeiro',
    status: 'passed',
  },
  {
    name: 'Espaço abre a porta',
    steps: [{ kind: 'press', key: 'Space' }],
    variable: 'portaAberta',
    compare: 'equals',
    value: 'verdadeiro',
    status: 'failed',
    text: 'Não passou: portaAberta terminou em falso.',
  },
  {
    name: 'Parado no começo perde vida',
    steps: [{ kind: 'wait', seconds: '1.5' }],
    variable: 'vidas',
    compare: 'decreased',
    status: 'passed',
  },
  {
    name: 'Espaço marca ponto',
    steps: [{ kind: 'press', key: 'Space' }],
    variable: 'pontos',
    compare: 'increased',
    status: 'passed',
  },
  {
    name: 'Sem vidas o jogo acaba',
    steps: [{ kind: 'wait', seconds: '4.5' }],
    variable: 'fim',
    compare: 'equals',
    value: 'verdadeiro',
    status: 'passed',
  },
]

for (const game of CASE_GAMES)
  test(`Meus testes no ${game.engine}: chave, porta, vida, placar e fim`, async ({
    page,
    browserName,
  }) => {
    // O ajudante da colagem confere o programa inteiro pela caixa acessível do Monaco, e no WebKit
    // ela guarda só um trecho variável perto do cursor (as seis últimas de dez linhas, as duas
    // últimas de sete, o fim de uma linha comprida): o jogo do Avançado nunca cabe inteiro. O
    // executor é o mesmo nos três navegadores; o Jogo 2D cobre o WebKit, e o "Jogar" do menu do
    // Avançado tem teste próprio no piloto (`studentTests/driver.test.ts`).
    test.skip(
      browserName === 'webkit' && game.engine === 'Jogo 2D Avançado',
      'A colagem do WebKit não confere um programa deste tamanho.',
    )
    test.setTimeout(180_000)
    await createProject(page)
    await instalarJogo2D(page, game.engine)
    await replaceBridgeScript(page, game.code)
    await page.getByRole('tab', { name: 'Meus testes' }).click()
    for (const item of CASES) await newCase(page, item)
    await page.getByRole('button', { name: 'Rodar os testes' }).click()
    const status = page.locator('[data-sz-devtools="tests"] [role="status"]')
    await expect(status).toContainText('5 de 6 testes passaram.', { timeout: 120_000 })
    const cards = page.locator('[data-sz-devtools="tests"] article')
    for (const [index, item] of CASES.entries()) {
      await expect(cards.nth(index), item.name).toHaveAttribute('data-sz-test-status', item.status)
      if (item.text) await expect(cards.nth(index)).toContainText(item.text)
    }
  })
