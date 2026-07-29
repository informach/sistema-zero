# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke.spec.ts >> Sistema Zero Studio — smoke >> Preview executa automaticamente ao abrir e recarregar o editor
- Location: e2e\smoke.spec.ts:220:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('iframe[title="Pré-visualização"]').contentFrame().getByRole('heading', { name: 'Preview apos reload' })
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 15000ms
  - waiting for locator('iframe[title="Pré-visualização"]').contentFrame().getByRole('heading', { name: 'Preview apos reload' })

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e4]:
    - banner [ref=e5]:
      - button "Sistema Zero Studio" [ref=e6]:
        - img "Sistema Zero Studio" [ref=e7]
      - generic [ref=e36]: /
      - button "Meu projeto" [ref=e37]
      - generic [ref=e39]: Salvo
      - generic [ref=e40]:
        - button "Blocos" [pressed] [ref=e41]
        - button "Ponte" [ref=e42]
      - generic [ref=e43]:
        - button "Compartilhar" [ref=e45]:
          - img [ref=e46]
          - generic [ref=e49]: Compartilhar
        - button "Ocultar pré-visualização" [pressed] [ref=e50]:
          - img [ref=e51]
        - button "Mais opções" [ref=e55]:
          - img [ref=e56]
    - main [ref=e60]:
      - generic [ref=e61]:
        - generic [ref=e66]:
          - tabpanel "Editores do projeto" [ref=e70]:
            - generic [ref=e73]:
              - tree [ref=e75]:
                - treeitem "🔎 Pesquisar" [level=1] [ref=e76]:
                  - generic [ref=e77] [cursor=pointer]:
                    - generic:
                      - generic: 🔎 Pesquisar
                - treeitem "🗂️ Áreas do projeto" [level=1] [ref=e78]:
                  - generic [ref=e79] [cursor=pointer]:
                    - generic: 🗂️ Áreas do projeto
                - treeitem "HTML" [level=1] [ref=e80]:
                  - generic [ref=e81] [cursor=pointer]:
                    - generic: HTML
                - treeitem "SVG" [level=1] [ref=e82]:
                  - generic [ref=e83] [cursor=pointer]:
                    - generic: SVG
                - treeitem "CSS" [level=1] [ref=e84]:
                  - generic [ref=e85] [cursor=pointer]:
                    - generic: CSS
                - treeitem "Programação" [level=1] [ref=e86]:
                  - generic [ref=e87] [cursor=pointer]:
                    - generic: Programação
                - treeitem "Canvas" [level=1] [ref=e88]:
                  - generic [ref=e89] [cursor=pointer]:
                    - generic: Canvas
                - treeitem "Canvas 3D" [level=1] [ref=e90]:
                  - generic [ref=e91] [cursor=pointer]:
                    - generic: Canvas 3D
                - treeitem "Avançado" [level=1] [ref=e92]:
                  - generic [ref=e93] [cursor=pointer]:
                    - generic: Avançado
              - img [ref=e94]:
                - generic "Espaço de trabalho do Blockly" [ref=e95]
              - img [ref=e107]
              - img [ref=e110]
              - img
              - img
          - separator [ref=e113]
          - generic [ref=e115]:
            - generic [ref=e116]:
              - button "Parar a execução do preview" [ref=e117]: ⏹ Parar
              - button "Atualizar o preview" [ref=e118]: ⟳ Atualizar
              - generic "Meu projeto" [ref=e119]
              - generic [ref=e120]: Executando
            - iframe [ref=e121]:
              
        - separator [ref=e122]
        - generic [ref=e124]:
          - tablist "Painéis" [ref=e126]:
            - tab "Console" [selected] [ref=e127]
          - tabpanel "Console" [ref=e129]:
            - generic [ref=e130]:
              - generic [ref=e131]:
                - generic [ref=e132]: 0 mensagens
                - button "Limpar" [ref=e133]
              - paragraph [ref=e135]: Sem mensagens. Use console.log para registrar algo.
  - generic [ref=e136]:
    - alert
    - alert
```

# Test source

```ts
  129 |     const exportItem = page.getByRole('menuitem', { name: 'Exportar' })
  130 |     await expect(exportItem).toBeVisible()
  131 | 
  132 |     const topHit = await exportItem.evaluate((element) => {
  133 |       const rect = element.getBoundingClientRect()
  134 |       const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)
  135 |       return { role: hit?.getAttribute('role'), text: hit?.textContent?.trim() }
  136 |     })
  137 |     expect(topHit).toEqual({ role: 'menuitem', text: 'Exportar' })
  138 | 
  139 |     await page.getByRole('menuitem', { name: 'Excluir' }).click()
  140 |     const dialog = page.getByRole('dialog')
  141 |     await expect(dialog).toBeVisible()
  142 |     await expect(dialog.getByText("Excluir o projeto 'Meu projeto'?")).toBeVisible()
  143 |     expect(dialogs).toEqual([])
  144 |     await dialog.getByRole('button', { name: 'Cancelar' }).click()
  145 |   })
  146 | 
  147 |   test('Projeto novo começa sem logs no console', async ({ page }) => {
  148 |     await createProject(page)
  149 |     await expect(
  150 |       page.getByText('Sem mensagens. Use console.log para registrar algo.'),
  151 |     ).toBeVisible()
  152 |     await expect(page.getByText('Sistema Zero: pronto para programar!')).not.toBeVisible()
  153 |   })
  154 | 
  155 |   test('Projeto novo começa sem áreas e oferece as cinco áreas separadas', async ({ page }) => {
  156 |     await createProject(page)
  157 |     await expect(page.locator('.blocklyWorkspace .blocklyDraggable')).toHaveCount(0)
  158 | 
  159 |     await page
  160 |       .locator('.blocklyToolboxCategory')
  161 |       .filter({ hasText: 'Áreas do projeto' })
  162 |       .first()
  163 |       .click()
  164 | 
  165 |     const flyout = page.locator('.blocklyToolboxFlyout')
  166 |     await expect(flyout).toContainText('Estrutura: HTML')
  167 |     await expect(flyout).toContainText('Aparência: CSS')
  168 |     await expect(flyout).toContainText('Ao iniciar')
  169 |     await expect(flyout).toContainText('Quando acontecer')
  170 |     await expect(flyout).toContainText('Enquanto estiver rodando')
  171 |   })
  172 | 
  173 |   test('AIPanel (projeto PRO) mostra badge MOCK por padrão', async ({ page }) => {
  174 |     // A aba IA só existe no modo Código (D2) → projeto profissional.
  175 |     await createProProject(page)
  176 |     await page.getByRole('tab', { name: 'IA' }).click()
  177 |     await expect(page.getByText('mock', { exact: true })).toBeVisible()
  178 |     await expect(page.getByRole('button', { name: 'Configurar IA' }).first()).toBeVisible()
  179 |   })
  180 | 
  181 |   test('Modo Ponte tem blocos + Monaco + preview', async ({ page }) => {
  182 |     await createProject(page)
  183 |     await page.getByRole('button', { name: 'Ponte' }).click()
  184 |     await expect(page.getByRole('button', { name: 'index.html' })).toBeVisible()
  185 |     await expect(page.getByRole('button', { name: 'script.js' })).toBeVisible()
  186 |   })
  187 | 
  188 |   test('Código digitado na Ponte sobrevive à troca IMEDIATA para Blocos', async ({ page }) => {
  189 |     await createProject(page)
  190 |     await openBridgeScript(page)
  191 |     await page.keyboard.type('document.body.innerHTML = "<h1>Persistiu</h1>";')
  192 | 
  193 |     // Troca DENTRO da janela do reverse-parse (~0,9s de debounce + worker, que
  194 |     // morre com a Ponte): a regressão regenerava os arquivos a partir dos
  195 |     // blocos VELHOS e perdia o código digitado. Com as épocas de sincronização,
  196 |     // o BlocksMode deriva os blocos do código e os arquivos ficam intactos.
  197 |     await page.getByRole('button', { name: 'Blocos' }).click()
  198 |     await expect(
  199 |       page
  200 |         .frameLocator('iframe[title="Pré-visualização"]')
  201 |         .getByRole('heading', { name: 'Persistiu' }),
  202 |     ).toBeVisible({
  203 |       timeout: 15_000,
  204 |     })
  205 | 
  206 |     await page.getByRole('button', { name: 'Ponte' }).click()
  207 |     await page.getByRole('button', { name: 'script.js' }).first().click()
  208 |     await expect(page.locator('.monaco-editor .view-lines').first()).toContainText('Persistiu', {
  209 |       timeout: 10_000,
  210 |     })
  211 |     await expect(
  212 |       page
  213 |         .frameLocator('iframe[title="Pré-visualização"]')
  214 |         .getByRole('heading', { name: 'Persistiu' }),
  215 |     ).toBeVisible({
  216 |       timeout: 10_000,
  217 |     })
  218 |   })
  219 | 
  220 |   test('Preview executa automaticamente ao abrir e recarregar o editor', async ({ page }) => {
  221 |     await createProject(page)
  222 |     await openBridgeScript(page)
  223 |     await page.keyboard.type('document.body.innerHTML = "<h1>Preview apos reload</h1>";')
  224 | 
  225 |     await expect(
  226 |       page
  227 |         .frameLocator('iframe[title="Pré-visualização"]')
  228 |         .getByRole('heading', { name: 'Preview apos reload' }),
> 229 |     ).toBeVisible({
      |       ^ Error: expect(locator).toBeVisible() failed
  230 |       timeout: 15_000,
  231 |     })
  232 | 
  233 |     // "Salvar" vive no menu ⋯ da Topbar (decisão de UX kids).
  234 |     await page.getByRole('button', { name: 'Mais opções' }).click()
  235 |     await page.getByRole('menuitem', { name: 'Salvar' }).click()
  236 |     await expect(page.getByText('Salvo')).toBeVisible({ timeout: 10_000 })
  237 | 
  238 |     await page.reload()
  239 | 
  240 |     await expect(
  241 |       page
  242 |         .frameLocator('iframe[title="Pré-visualização"]')
  243 |         .getByRole('heading', { name: 'Preview apos reload' }),
  244 |     ).toBeVisible({
  245 |       timeout: 15_000,
  246 |     })
  247 | 
  248 |     await page.getByRole('button', { name: 'Sistema Zero Studio' }).click()
  249 |     await expect(page).toHaveURL('/')
  250 |     await page.getByRole('button', { name: 'Abrir' }).first().click()
  251 | 
  252 |     await expect(
  253 |       page
  254 |         .frameLocator('iframe[title="Pré-visualização"]')
  255 |         .getByRole('heading', { name: 'Preview apos reload' }),
  256 |     ).toBeVisible({
  257 |       timeout: 15_000,
  258 |     })
  259 |   })
  260 | 
  261 |   test('Modo Código (PRO) permite criar arquivo na árvore', async ({ page }) => {
  262 |     await createProProject(page)
  263 |     await page.getByTitle('Novo arquivo na raiz').click()
  264 |     await page.getByLabel('Nome do novo item').fill('helper-smoke.mjs')
  265 |     await page.getByRole('button', { name: 'Criar', exact: true }).click()
  266 |     await expect(page.getByText('helper-smoke.mjs')).toBeVisible()
  267 |   })
  268 | 
  269 |   test('Terminal (PRO) aparece como CTA sem quebrar a IDE', async ({ page }) => {
  270 |     // A aba Terminal só existe no modo Código (D2) → projeto profissional.
  271 |     await createProProject(page)
  272 |     await page.getByRole('tab', { name: 'Terminal' }).click()
  273 |     await expect(page.getByRole('button', { name: 'Carregar terminal real' })).toBeVisible()
  274 |   })
  275 | 
  276 |   test('Terminal real inicializa WebContainer e monta arquivos do projeto', async ({ page }) => {
  277 |     test.slow()
  278 |     await createProProject(page)
  279 |     await page.getByRole('tab', { name: 'Terminal' }).click()
  280 |     await page.getByRole('button', { name: 'Carregar terminal real' }).click()
  281 | 
  282 |     await expect(page.locator('.xterm')).toBeVisible({ timeout: 60_000 })
  283 |     await expect(page.locator('.xterm-rows')).toContainText('Sistema Zero Studio terminal', {
  284 |       timeout: 60_000,
  285 |     })
  286 |     await expect(page.locator('.xterm-rows')).toContainText('Arquivos do projeto montados', {
  287 |       timeout: 60_000,
  288 |     })
  289 |   })
  290 | })
  291 | 
```