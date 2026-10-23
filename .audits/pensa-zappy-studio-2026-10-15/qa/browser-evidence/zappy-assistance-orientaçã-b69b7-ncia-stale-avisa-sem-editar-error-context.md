# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: zappy-assistance.spec.ts >> orientação: ação real do Monaco captura seleção e referência stale avisa sem editar
- Location: e2e\zappy-assistance.spec.ts:60:1

# Error details

```
Error: expect(locator).toHaveValue(expected) failed

Locator: getByLabel('Sua dúvida para o Zappy')
Expected: "Me explique este trecho."
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toHaveValue" with timeout 5000ms
  - waiting for getByLabel('Sua dúvida para o Zappy')

```

```yaml
- main:
  - button "Abrir Zappy Pro"
  - complementary:
    - text: Arquivos
    - button "Novo arquivo na raiz"
    - button "Nova pasta na raiz"
    - button "src"
    - button "Novo arquivo em src"
    - button "Excluir src"
    - button "main.ts"
    - button "Excluir src/main.ts"
  - separator
  - button "src/main.ts"
  - button "Fechar src/main.ts": ×
  - button "Formatar código"
  - button "Diminuir fonte do editor": A−
  - button "13"
  - button "Aumentar fonte do editor": A+
  - code:
    - textbox "Editor content": export const goal = 10 export const speed = 2
    - menu:
      - listitem:
        - menuitem "Go to Definition Ctrl+F12"
      - listitem:
        - menuitem "Explicar seleção com Zappy Pro"
      - menuitem "Investigar seleção com Zappy Pro"
      - menuitem "Peek"
      - checkbox [disabled]
      - menuitem "Format Document Shift+Alt+F"
- alert
- alert
```

# Test source

```ts
  1   | import { mkdtemp, rm } from 'node:fs/promises'
  2   | import { tmpdir } from 'node:os'
  3   | import { basename, dirname, join, resolve } from 'node:path'
  4   | import { fileURLToPath } from 'node:url'
  5   | import { expect, type Page, test } from '@playwright/test'
  6   | import { build, type PreviewServer, preview } from 'vite'
  7   | 
  8   | let root: string, server: PreviewServer, url: string
  9   | test.beforeAll(async () => {
  10  |   test.setTimeout(180000)
  11  |   root = await mkdtemp(join(tmpdir(), 'sz-zappy-assistance-'))
  12  |   const configFile = fileURLToPath(new URL('../playground/vite.config.ts', import.meta.url))
  13  |   const fixture = fileURLToPath(new URL('./fixtures/zappy-assistance', import.meta.url))
  14  |   await build({
  15  |     configFile,
  16  |     root: fixture,
  17  |     logLevel: 'warn',
  18  |     build: { outDir: root, emptyOutDir: true, target: 'esnext' },
  19  |   })
  20  |   server = await preview({
  21  |     configFile,
  22  |     root: fixture,
  23  |     build: { outDir: root },
  24  |     preview: { host: '127.0.0.1', port: 0, strictPort: false },
  25  |   })
  26  |   const address = server.httpServer.address()
  27  |   if (!address || typeof address === 'string') throw new Error('Fixture server is not listening')
  28  |   url = `http://127.0.0.1:${address.port}`
  29  | })
  30  | test.afterAll(async () => {
  31  |   if (server)
  32  |     await new Promise<void>((done, reject) =>
  33  |       server.httpServer.close((error) => (error ? reject(error) : done())),
  34  |     )
  35  |   if (
  36  |     root &&
  37  |     dirname(resolve(root)) === resolve(tmpdir()) &&
  38  |     basename(root).startsWith('sz-zappy-assistance-')
  39  |   )
  40  |     await rm(root, { recursive: true, force: true })
  41  | })
  42  | const proof = async (page: Page) =>
  43  |   JSON.parse((await page.getByLabel('Dados da prova').textContent()) ?? '{}')
  44  | test.beforeEach(async ({ page }) => {
  45  |   await page.goto(url)
  46  |   await expect(page.locator('.monaco-editor textarea').first()).toBeVisible()
  47  | })
  48  | 
  49  | test('manual: escrever no Monaco não abre assistência nem inicia pedidos', async ({ page }) => {
  50  |   const editor = page.locator('.monaco-editor textarea').first()
  51  |   await editor.press('Control+Home')
  52  |   await editor.press('Control+A')
  53  |   await editor.fill('export const goal = 11\nexport const speed = 3\n')
  54  |   await expect.poll(async () => (await proof(page)).source).toContain('goal = 11')
  55  |   expect((await proof(page)).asked).toEqual([])
  56  |   expect((await proof(page)).created).toEqual([])
  57  |   await expect(page.getByRole('dialog', { name: 'Zappy Pro' })).toHaveCount(0)
  58  | })
  59  | 
  60  | test('orientação: ação real do Monaco captura seleção e referência stale avisa sem editar', async ({
  61  |   page,
  62  | }) => {
  63  |   const editor = page.locator('.monaco-editor textarea').first()
  64  |   await editor.press('Control+Home')
  65  |   await editor.press('ArrowDown')
  66  |   await editor.press('Home')
  67  |   await editor.press('Shift+End')
  68  |   await editor.press('Shift+F10')
  69  |   await page.getByRole('menuitem', { name: 'Explicar seleção com Zappy Pro', exact: true }).click()
> 70  |   await expect(page.getByLabel('Sua dúvida para o Zappy')).toHaveValue('Me explique este trecho.')
      |                                                            ^ Error: expect(locator).toHaveValue(expected) failed
  71  |   await page.getByRole('button', { name: 'Perguntar', exact: true }).click()
  72  |   await expect(
  73  |     page.getByText(
  74  |       'A variável selecionada controla a velocidade; você pode ajustar o valor manualmente.',
  75  |     ),
  76  |   ).toBeVisible()
  77  |   const captured = await proof(page)
  78  |   expect(captured.asked[0].context.pro.selection).toMatchObject({
  79  |     path: 'src/main.ts',
  80  |     startLine: 2,
  81  |     endLine: 2,
  82  |   })
  83  |   expect(captured.created).toEqual([])
  84  |   await editor.press('Control+Home')
  85  |   await editor.press('Control+A')
  86  |   await editor.fill('export const goal = 11\nexport const speed = 4\n')
  87  |   await page.getByRole('button', { name: 'src/main.ts:2', exact: true }).click()
  88  |   await expect(page.getByText(/não corresponde mais à versão analisada/)).toBeVisible()
  89  |   expect((await proof(page)).source).toContain('speed = 4')
  90  | })
  91  | 
  92  | test('investigação: resposta passa ao construtor sem iniciar job', async ({ page }) => {
  93  |   await page.getByRole('button', { name: 'Abrir Zappy Pro' }).click()
  94  |   await page.getByRole('button', { name: 'Investigar', exact: true }).click()
  95  |   await page.getByLabel('Sua dúvida para o Zappy').fill('Era para pular, mas atravessa o chão')
  96  |   await page.getByRole('button', { name: 'Perguntar', exact: true }).click()
  97  |   await expect(
  98  |     page.getByText(
  99  |       'Compare o movimento esperado com a posição observada antes de alterar a regra.',
  100 |     ),
  101 |   ).toBeVisible()
  102 |   await page.getByRole('button', { name: 'Preparar alteração a partir desta resposta' }).click()
  103 |   await expect(page.getByLabel('O que vamos construir?')).toBeVisible()
  104 |   expect((await proof(page)).asked[0].context.pro.intent).toBe('investigate')
  105 |   expect((await proof(page)).created).toEqual([])
  106 |   expect((await proof(page)).source).toContain('goal = 10')
  107 | })
  108 | 
  109 | for (const [scope, objective] of [
  110 |   ['part', 'Ajustar a meta para doze sem alterar os controles'],
  111 |   ['game', 'Criar o jogo completo com a meta de doze e os controles atuais'],
  112 | ] as const)
  113 |   test(`${scope}: proposta exige aplicação explícita e permite voltar à autoria manual`, async ({
  114 |     page,
  115 |   }) => {
  116 |     await page.getByRole('button', { name: 'Abrir Zappy Pro' }).click()
  117 |     await page.getByRole('button', { name: 'Construir', exact: true }).click()
  118 |     await page.getByLabel('Tamanho do pedido').selectOption(scope)
  119 |     await page.getByLabel('O que vamos construir?').fill(objective)
  120 |     expect((await proof(page)).created).toEqual([])
  121 |     await page.getByRole('button', { name: 'Preparar proposta', exact: true }).click()
  122 |     await expect(page.getByText('Proposta pronta para revisar')).toBeVisible()
  123 |     expect((await proof(page)).created[0].request.scope).toBe(scope)
  124 |     expect((await proof(page)).source).toContain('goal = 10')
  125 |     await page.getByRole('button', { name: 'Conversar', exact: true }).click()
  126 |     await expect(page.getByRole('button', { name: 'Aplicar alterações' })).toBeVisible()
  127 |     await page.getByRole('button', { name: 'Aplicar alterações' }).click()
  128 |     await expect.poll(async () => (await proof(page)).source).toContain('goal = 12')
  129 |     await page.getByRole('button', { name: 'Desfazer alterações' }).click()
  130 |     await expect.poll(async () => (await proof(page)).source).toContain('goal = 10')
  131 |     expect((await proof(page)).asked).toEqual([])
  132 |   })
  133 | 
```