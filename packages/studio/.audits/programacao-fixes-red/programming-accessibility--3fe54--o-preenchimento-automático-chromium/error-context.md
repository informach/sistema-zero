# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: programming-accessibility.spec.ts >> entrada livre do seletor de nomes desativa o preenchimento automático
- Location: e2e\programming-accessibility.spec.ts:221:1

# Error details

```
Error: expect(locator).toHaveAttribute(expected) failed

Locator:  locator('.sz-name-picker__input')
Expected: "blockly-name-canvas"
Received: ""
Timeout:  5000ms

Call log:
  - Expect "toHaveAttribute" with timeout 5000ms
  - waiting for locator('.sz-name-picker__input')
    14 × locator resolved to <input type="text" spellcheck="false" class="sz-name-picker__input" aria-label="id da tela de desenho" placeholder="id da tela de desenho"/>
       - unexpected value "null"

```

```yaml
- textbox "id da tela de desenho": tela
```

# Test source

```ts
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
  219 | })
  220 | 
  221 | test('entrada livre do seletor de nomes desativa o preenchimento automático', async ({ page }) => {
  222 |   await createProject(page)
  223 |   await pasteBlocklyBlocks(page, {
  224 |     type: 'sz_frame_start',
  225 |     inputs: {
  226 |       CHILDREN: {
  227 |         block: {
  228 |           type: 'sz_canvas_setup',
  229 |           fields: { CANVAS_ID: 'tela', CTX: 'pincel' },
  230 |         },
  231 |       },
  232 |     },
  233 |   })
  234 | 
  235 |   const setup = page.locator('.blocklyBlockCanvas .sz_canvas_setup').first()
  236 |   await setup.getByText('tela', { exact: true }).click()
  237 |   const input = page.locator('.sz-name-picker__input')
  238 |   await expect(input).toBeVisible()
> 239 |   await expect(input).toHaveAttribute('name', 'blockly-name-canvas')
      |                       ^ Error: expect(locator).toHaveAttribute(expected) failed
  240 |   await expect(input).toHaveAttribute('autocomplete', 'off')
  241 | })
  242 | 
```