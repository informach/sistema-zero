# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: programming-accessibility.spec.ts >> Programação mantém o flyout interativo em celular
- Location: e2e\programming-accessibility.spec.ts:95:1

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false

Call Log:
- Timeout 5000ms exceeded while waiting on the predicate
```

# Page snapshot

```yaml
- generic [ref=e4]:
  - banner [ref=e5]:
    - button "Sistema Zero Studio" [ref=e6]:
      - img "Sistema Zero Studio" [ref=e7]
    - button "Meu projeto" [ref=e18]
    - status "Salvo" [ref=e19]
    - generic [ref=e20]:
      - button "Blocos" [pressed] [ref=e21]
      - button "Ponte" [ref=e22]
    - generic [ref=e23]:
      - button "Compartilhar" [ref=e25]:
        - img [ref=e26]
      - button "Ocultar pré-visualização" [pressed] [ref=e29]:
        - img [ref=e30]
      - button "Mais opções" [ref=e34]:
        - img [ref=e35]
  - main [ref=e39]:
    - generic [ref=e45]:
      - tablist "Painéis do editor" [ref=e47]:
        - tab "Blocos" [selected] [ref=e48]
        - tab "Pré-visualização" [ref=e49]
        - tab "Console" [ref=e50]
      - generic [ref=e51]:
        - tabpanel "Blocos" [ref=e52]:
          - tabpanel "Editores do projeto" [ref=e55]:
            - generic [ref=e58]:
              - tree [ref=e60]:
                - treeitem "🔎 Pesquisar" [level=1] [ref=e61]:
                  - generic [ref=e62] [cursor=pointer]:
                    - generic:
                      - generic: 🔎 Pesquisar
                - treeitem "🗂️ Áreas do projeto" [level=1] [ref=e63]:
                  - generic [ref=e64] [cursor=pointer]:
                    - generic: 🗂️ Áreas do projeto
                - treeitem "HTML" [level=1] [ref=e65]:
                  - generic [ref=e66] [cursor=pointer]:
                    - generic: HTML
                - treeitem "SVG" [level=1] [ref=e67]:
                  - generic [ref=e68] [cursor=pointer]:
                    - generic: SVG
                - treeitem "CSS" [level=1] [ref=e69]:
                  - generic [ref=e70] [cursor=pointer]:
                    - generic: CSS
                - treeitem "Programação" [expanded] [level=1] [ref=e71]:
                  - generic [ref=e72] [cursor=pointer]:
                    - generic: Programação
                  - group [ref=e73]:
                    - treeitem "🏷️ Variáveis" [level=2] [ref=e74]:
                      - generic [ref=e75] [cursor=pointer]:
                        - generic: 🏷️ Variáveis
                    - treeitem "❓ Lógica & Se" [level=2] [ref=e76]:
                      - generic [ref=e77] [cursor=pointer]:
                        - generic: ❓ Lógica & Se
                    - treeitem "🔁 Repetições" [level=2] [ref=e78]:
                      - generic [ref=e79] [cursor=pointer]:
                        - generic: 🔁 Repetições
                    - treeitem "📋 Listas" [level=2] [ref=e80]:
                      - generic [ref=e81] [cursor=pointer]:
                        - generic: 📋 Listas
                    - treeitem "🖥️ Console & Avisos" [level=2] [ref=e82]:
                      - generic [ref=e83] [cursor=pointer]:
                        - generic: 🖥️ Console & Avisos
                    - treeitem "💾 Dados & Web" [level=2] [ref=e84]:
                      - generic [ref=e85] [cursor=pointer]:
                        - generic: 💾 Dados & Web
                    - treeitem "⏳ Assíncrono" [level=2] [ref=e86]:
                      - generic [ref=e87] [cursor=pointer]:
                        - generic: ⏳ Assíncrono
                    - treeitem "🔢 Matemática" [level=2] [ref=e88]:
                      - generic [ref=e89] [cursor=pointer]:
                        - generic: 🔢 Matemática
                    - treeitem "🔣 Valores" [level=2] [ref=e90]:
                      - generic [ref=e91] [cursor=pointer]:
                        - generic: 🔣 Valores
                    - treeitem "🌐 Página" [level=2] [ref=e92]:
                      - generic [ref=e93] [cursor=pointer]:
                        - generic: 🌐 Página
                    - treeitem "⚡ Eventos" [active] [level=2] [selected] [ref=e94]:
                      - generic [ref=e95] [cursor=pointer]:
                        - generic: ⚡ Eventos
                    - treeitem "🧩 Funções" [level=2] [ref=e96]:
                      - generic [ref=e97] [cursor=pointer]:
                        - generic: 🧩 Funções
                    - treeitem "🏛️ Classes" [level=2] [ref=e98]:
                      - generic [ref=e99] [cursor=pointer]:
                        - generic: 🏛️ Classes
                    - treeitem "📦 Objetos" [level=2] [ref=e100]:
                      - generic [ref=e101] [cursor=pointer]:
                        - generic: 📦 Objetos
                - treeitem "Canvas" [level=1] [ref=e102]:
                  - generic [ref=e103] [cursor=pointer]:
                    - generic: Canvas
                - treeitem "Canvas 3D" [level=1] [ref=e104]:
                  - generic [ref=e105] [cursor=pointer]:
                    - generic: Canvas 3D
                - treeitem "Avançado" [level=1] [ref=e106]:
                  - generic [ref=e107] [cursor=pointer]:
                    - generic: Avançado
              - img [ref=e108]:
                - generic "Espaço de trabalho do Blockly" [ref=e109]
              - img
              - img [ref=e121]
              - img [ref=e124]:
                - generic [ref=e127]:
                  - generic [ref=e128]:
                    - generic [ref=e131]: Quando
                    - generic [ref=e134]: apertar
                    - generic [ref=e137]: a tecla
                    - generic [ref=e139]: fazer
                  - generic [ref=e140]:
                    - generic [ref=e144]: a
                    - generic [ref=e147]: tecla
                    - generic [ref=e149]: do evento
                  - generic [ref=e150]:
                    - generic [ref=e153]: Quando clicarem
                    - generic [ref=e156]: no elemento id
                    - generic [ref=e160]: meuBotao
                    - generic [ref=e162]: fazer
                  - generic [ref=e163]:
                    - generic [ref=e166]: Quando clicarem em qualquer lugar da tela
                    - generic [ref=e168]: fazer
                  - generic [ref=e169]:
                    - generic [ref=e172]: Quando o mouse passar
                    - generic [ref=e174]: sobre
                    - generic [ref=e177]: o elemento id
                    - generic [ref=e181]: meuElemento
                    - generic [ref=e183]: fazer
                  - generic [ref=e184]:
                    - generic [ref=e187]: Quando mover o mouse/dedo
                    - generic [ref=e189]: fazer
                  - generic [ref=e190]:
                    - generic [ref=e193]: Quando apertar o mouse/dedo
                    - generic [ref=e195]: fazer
                  - generic [ref=e196]:
                    - generic [ref=e199]: Quando soltar o mouse/dedo
                    - generic [ref=e201]: fazer
                  - generic [ref=e202]:
                    - generic [ref=e205]: posição do clique
                    - generic [ref=e208]: X (horizontal)
                  - generic [ref=e210]:
                    - generic [ref=e213]: Quando digitar
                    - generic [ref=e216]: no elemento id
                    - generic [ref=e220]: meuInput
                    - generic [ref=e222]: fazer
                  - generic [ref=e223]:
                    - generic [ref=e226]: Quando enviar
                    - generic [ref=e229]: o formulário id
                    - generic [ref=e233]: meuForm
                    - generic [ref=e235]: fazer
                  - generic [ref=e236]:
                    - generic [ref=e239]: Quando a janela mudar de tamanho
                    - generic [ref=e241]: fazer
                  - generic [ref=e242]:
                    - generic [ref=e245]: Quando a tela cheia mudar
                    - generic [ref=e247]: fazer
                  - generic [ref=e248]:
                    - generic [ref=e251]: Quando abrir o menu do botão direito
                    - generic [ref=e253]: fazer
                  - generic [ref=e254]:
                    - generic [ref=e257]: Quando a janela perder o foco
                    - generic [ref=e259]: fazer
                  - generic [ref=e260]:
                    - generic [ref=e263]: ao clicar no elemento
                    - generic [ref=e265]: fazer
                  - generic [ref=e267]:
                    - generic [ref=e270]: quando
                    - generic [ref=e273]: clicar
                    - generic [ref=e276]: em
                    - generic [ref=e279]: o elemento id
                    - generic [ref=e283]: meuBotao
                    - generic [ref=e285]: chamar a função
                    - generic [ref=e288]: fazerAlgo
                  - generic [ref=e289]:
                    - generic [ref=e292]: no evento,
                    - generic [ref=e295]: cancelar a ação padrão
              - img
              - img
        - tabpanel "Pré-visualização":
          - generic:
            - generic:
              - button "Parar a execução do preview": ⏹
              - button "Atualizar o preview": ⟳
              - generic "Meu projeto"
            - iframe [ref=e297]:
              
```

# Test source

```ts
  18  |     .poll(() =>
  19  |       programming.locator(':scope > .blocklyToolboxCategory').evaluate((row) => {
  20  |         const style = getComputedStyle(row)
  21  |         return `${style.outlineStyle} ${style.outlineWidth}`
  22  |       }),
  23  |     )
  24  |     .toBe('solid 3px')
  25  | 
  26  |   await programming.click()
  27  |   const events = page.getByRole('treeitem', { name: '⚡ Eventos', exact: true })
  28  |   await events.click()
  29  |   await expect
  30  |     .poll(() =>
  31  |       events
  32  |         .locator(':scope > .blocklyToolboxCategory .sz-toolbox-programming-label')
  33  |         .evaluate((label) => getComputedStyle(label).color),
  34  |     )
  35  |     .toBe('rgb(255, 255, 255)')
  36  | 
  37  |   await page.keyboard.press('Escape')
  38  |   await pasteBlocklyBlocks(page, {
  39  |     type: 'sz_js_on_click',
  40  |     fields: { TARGET_KIND: 'id', TARGET: 'meuBotao' },
  41  |   })
  42  |   const eventBlock = page.locator('.blocklyBlockCanvas .sz_js_on_click').first()
  43  |   await expect(eventBlock).toBeVisible()
  44  |   await expect
  45  |     .poll(() =>
  46  |       eventBlock.evaluate((block) => {
  47  |         const text = block.querySelector('text.blocklyText')
  48  |         const path = block.querySelector(':scope > .blocklyPath')
  49  |         if (!text || !path) return 0
  50  |         const rgb = (value: string): number[] =>
  51  |           value
  52  |             .match(/[\d.]+/g)
  53  |             ?.slice(0, 3)
  54  |             .map(Number) ?? []
  55  |         const luminance = (value: string): number => {
  56  |           const channels = rgb(value).map((channel) => channel / 255)
  57  |           const linear = channels.map((channel) =>
  58  |             channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  59  |           )
  60  |           return 0.2126 * (linear[0] ?? 0) + 0.7152 * (linear[1] ?? 0) + 0.0722 * (linear[2] ?? 0)
  61  |         }
  62  |         const foreground = luminance(getComputedStyle(text).fill)
  63  |         const background = luminance(getComputedStyle(path).fill)
  64  |         return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05)
  65  |       }),
  66  |     )
  67  |     .toBeGreaterThanOrEqual(4.5)
  68  | 
  69  |   await page.getByRole('treeitem', { name: '🔎 Pesquisar', exact: true }).click()
  70  |   const search = page.locator('input[name="block-search"]')
  71  |   await expect(search).toBeVisible()
  72  |   await expect(search).toHaveAttribute('type', 'search')
  73  |   await expect(search).toHaveAttribute('autocomplete', 'off')
  74  |   await expect(search).toHaveAttribute('aria-label', 'Pesquisar blocos')
  75  |   await expect(search).toHaveAttribute('placeholder', 'Pesquisar blocos…')
  76  |   await expect(search).toHaveJSProperty('spellcheck', false)
  77  |   await search.focus()
  78  |   await expect
  79  |     .poll(() => search.evaluate((input) => getComputedStyle(input).outlineStyle))
  80  |     .toBe('solid')
  81  | 
  82  |   await page.emulateMedia({ reducedMotion: 'reduce' })
  83  |   const programmingRow = programming.locator(':scope > .blocklyToolboxCategory')
  84  |   await programmingRow.hover()
  85  |   await expect
  86  |     .poll(() =>
  87  |       programmingRow.evaluate((row) => {
  88  |         const style = getComputedStyle(row)
  89  |         return `${style.transitionDuration} ${style.transform}`
  90  |       }),
  91  |     )
  92  |     .toBe('0s none')
  93  | })
  94  | 
  95  | test('Programação mantém o flyout interativo em celular', async ({ page }) => {
  96  |   await page.setViewportSize({ width: 375, height: 812 })
  97  |   await createProject(page)
  98  | 
  99  |   await page.getByRole('treeitem', { name: 'Programação', exact: true }).click()
  100 |   await page.getByRole('treeitem', { name: '⚡ Eventos', exact: true }).click()
  101 | 
  102 |   const flyout = page.locator('.blocklyToolboxFlyout')
  103 |   const firstBlock = flyout.locator('.blocklyDraggable').first()
  104 |   await expect(flyout).toBeVisible()
  105 |   await expect(firstBlock).toBeVisible()
  106 |   await expect
  107 |     .poll(() =>
  108 |       page.evaluate(() => {
  109 |         const injection = document.querySelector('.injectionDiv')?.getBoundingClientRect()
  110 |         const flyoutRect = document.querySelector('.blocklyToolboxFlyout')?.getBoundingClientRect()
  111 |         if (!injection || !flyoutRect) return false
  112 |         return (
  113 |           flyoutRect.top >= injection.top &&
  114 |           flyoutRect.bottom <= Math.min(injection.bottom, window.innerHeight)
  115 |         )
  116 |       }),
  117 |     )
> 118 |     .toBe(true)
      |      ^ Error: expect(received).toBe(expected) // Object.is equality
  119 | 
  120 |   const workspaceBlocks = page.locator('.blocklyWorkspace .blocklyBlockCanvas .blocklyDraggable')
  121 |   const countBefore = await workspaceBlocks.count()
  122 |   const source = await firstBlock.boundingBox()
  123 |   const target = await page.evaluate(() => {
  124 |     const background = document.querySelector('.blocklyMainBackground')?.getBoundingClientRect()
  125 |     if (!background) return null
  126 |     for (let y = background.top + 48; y < background.bottom - 48; y += 32) {
  127 |       for (let x = background.right - 48; x > background.left + 48; x -= 32) {
  128 |         if (document.elementFromPoint(x, y)?.classList.contains('blocklyMainBackground')) {
  129 |           return { x, y }
  130 |         }
  131 |       }
  132 |     }
  133 |     return null
  134 |   })
  135 |   if (!source || !target) throw new Error('Flyout ou workspace sem ponto interativo no celular')
  136 | 
  137 |   await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2)
  138 |   await page.mouse.down()
  139 |   await page.mouse.move(target.x, target.y, { steps: 8 })
  140 |   await page.mouse.up()
  141 |   await expect.poll(() => workspaceBlocks.count()).toBeGreaterThan(countBefore)
  142 | })
  143 | 
  144 | test('campos infantis de CSS, Canvas e SVG têm nome, foco e erros acessíveis', async ({ page }) => {
  145 |   await createProject(page)
  146 |   await pasteBlocklyBlocks(page, {
  147 |     type: 'sz_frame_appearance',
  148 |     inputs: {
  149 |       CHILDREN: {
  150 |         block: {
  151 |           type: 'sz_css_body_background',
  152 |           fields: { COLOR: '#0b1020' },
  153 |           next: {
  154 |             block: {
  155 |               type: 'sz_css_background_image',
  156 |               fields: { SELECTOR: 'body', URL: 'fundo.png' },
  157 |             },
  158 |           },
  159 |         },
  160 |       },
  161 |     },
  162 |   })
  163 |   const colourBlock = page.locator('.blocklyBlockCanvas .sz_css_body_background').first()
  164 |   await expect(colourBlock).toBeVisible()
  165 |   await colourBlock.locator(':scope > .blocklyEditableField').click()
  166 |   const hexInput = page.locator('.sz-hex-input-row input[type="text"]')
  167 |   await expect(hexInput).toHaveAttribute('aria-label', 'Cor em hexadecimal')
  168 |   await expect(hexInput).not.toBeFocused()
  169 |   await hexInput.focus()
  170 |   await expect
  171 |     .poll(() => hexInput.evaluate((input) => getComputedStyle(input).outlineStyle))
  172 |     .not.toBe('none')
  173 |   await hexInput.fill('#ruim')
  174 |   await page.locator('.sz-hex-input-row button', { hasText: 'OK' }).click()
  175 |   await expect(hexInput).toHaveAttribute('aria-invalid', 'true')
  176 |   await expect(page.locator('.sz-field-picker__error')).toContainText('Use o formato #rrggbb')
  177 |   await page.keyboard.press('Escape')
  178 | 
  179 |   const assetBlock = page.locator('.blocklyBlockCanvas .sz_css_background_image').first()
  180 |   await assetBlock.getByText('fundo.png', { exact: true }).click()
  181 |   const assetInput = page.locator('.sz-asset-picker__input')
  182 |   await expect(assetInput).toHaveAttribute('aria-label', 'Nome da imagem')
  183 |   await expect(assetInput).not.toBeFocused()
  184 |   await assetInput.focus()
  185 |   await expect
  186 |     .poll(() => assetInput.evaluate((input) => getComputedStyle(input).outlineStyle))
  187 |     .not.toBe('none')
  188 |   await page.keyboard.press('Escape')
  189 | 
  190 |   await pasteBlocklyBlocks(page, {
  191 |     type: 'sz_frame_structure',
  192 |     inputs: {
  193 |       CHILDREN: {
  194 |         block: {
  195 |           type: 'sz_html_svg',
  196 |           fields: { ID: 'arte', WIDTH: '200', HEIGHT: '200', VIEWBOX: '0 0 200 200' },
  197 |           inputs: {
  198 |             CHILDREN: {
  199 |               block: {
  200 |                 type: 'sz_svg_circle',
  201 |                 fields: { ID: 'bola', CX: '100', CY: '100', R: '40', FILL: '#a78bfa' },
  202 |               },
  203 |             },
  204 |           },
  205 |         },
  206 |       },
  207 |     },
  208 |   })
  209 |   const svgBlock = page.locator('.blocklyBlockCanvas .sz_svg_circle').first()
  210 |   await svgBlock.getByText('#a78bfa', { exact: true }).click()
  211 |   const svgPalette = page.getByRole('group', { name: 'Cores prontas' })
  212 |   await expect(svgPalette).toBeVisible()
  213 |   await expect(page.locator('[role="listbox"]')).toHaveCount(0)
  214 |   const svgInput = page.getByRole('textbox', { name: 'Cor em texto' })
  215 |   await svgInput.fill('')
  216 |   await page.locator('.sz-svg-paint-picker__confirm').click()
  217 |   await expect(svgInput).toHaveAttribute('aria-invalid', 'true')
  218 |   await expect(page.locator('.sz-field-picker__error')).toContainText('Escolha uma cor')
```