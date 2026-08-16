import { expect, type Page, test } from '@playwright/test'

/**
 * Cenário RELATADO por ela (15/08), reproduzido passo a passo:
 *
 * "tenho um projeto com as três áreas vazias; copiei os blocos de DENTRO da área
 *  de outro projeto (a área mesmo não cola), colei aqui, arrastei para dentro do
 *  Ao iniciar — e a tela ficou em branco. Deveria ter pelo menos pintado a cor
 *  que eu escolhi no bloco 'preparar o jogo', não?"
 *
 * O observável decisivo é o `srcdoc` do iframe de preview: ele diz, sem
 * adivinhação, se o runtime do Jogo 2D entrou no documento e se o programa
 * chama o `setupStage`. É lido A CADA PASSO.
 */

const COR = '#ff8800'

async function createProject(page: Page): Promise<void> {
  await page.goto('/')
  await page.getByRole('button', { name: '+ Novo projeto' }).first().click()
  await page.getByRole('button', { name: 'Criar e abrir' }).click()
  await expect(page).toHaveURL(/\/editor\//)
}

/** Documento montado para o preview (o iframe é sandbox: lemos o ATRIBUTO). */
async function previewDoc(page: Page): Promise<string> {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('iframe'))
      .map((frame) => frame.getAttribute('srcdoc') ?? '')
      .join('\n<!--/-->\n'),
  )
}

/** Põe uma Área do projeto pelo caminho REAL: gaveta 🗂️ → clique no bloco. */
async function addArea(page: Page, label: string): Promise<void> {
  // ⚠️ O clique vai na CATEGORIA, não no <span> do rótulo: o div pai intercepta
  // os eventos de ponteiro e o clique no span nunca chega.
  await page.locator('.blocklyToolboxCategory', { hasText: '🗂️ Áreas do projeto' }).first().click()
  await page.locator('.blocklyFlyout').getByText(label, { exact: false }).first().click()
  await expect(
    page.locator('.blocklyBlockCanvas').getByText(label, { exact: false }).first(),
  ).toBeVisible()
}

/** Cola uma subárvore pelo menu de contexto REAL (mesmo caminho da UI). */
async function pasteBlocks(
  page: Page,
  block: Record<string, unknown>,
  requiredExtensions: string[] = [],
): Promise<void> {
  await page.evaluate(
    ([payload]) => localStorage.setItem('sz:block-clipboard', payload as string),
    [JSON.stringify({ version: 1, block, requiredExtensions, copiedAt: Date.now() })],
  )
  await page
    .locator('.blocklySvg')
    .first()
    .click({ button: 'right', position: { x: 620, y: 420 } })
  await page.getByText('Colar blocos', { exact: true }).click()
}

/** Arrasta com o MOUSE (gesto real) o bloco `de` até encostar em `para`. */
async function dragOnto(page: Page, de: string, para: string): Promise<void> {
  const origem = page.locator('.blocklyBlockCanvas').getByText(de, { exact: false }).first()
  const destino = page.locator('.blocklyBlockCanvas').getByText(para, { exact: false }).first()
  const a = await origem.boundingBox()
  const b = await destino.boundingBox()
  if (!a || !b) throw new Error(`sem bounding box: ${de} / ${para}`)
  await page.mouse.move(a.x + 8, a.y + a.height / 2)
  await page.mouse.down()
  // O encaixe do CHILDREN fica abaixo e à direita do rótulo da área.
  await page.mouse.move(b.x + 34, b.y + b.height + 26, { steps: 24 })
  await page.mouse.up()
}

test.describe('colar blocos de outro projeto e arrastar para a Área', () => {
  test('só o "preparar o jogo" no Ao iniciar já tem que pintar a cor', async ({ page }) => {
    const erros: string[] = []
    page.on('console', (m) => {
      if (m.type() === 'error') erros.push(m.text())
    })
    page.on('pageerror', (e) => erros.push(String(e)))

    await createProject(page)

    // 1) As três áreas VAZIAS, como no projeto dela.
    await addArea(page, 'Ao iniciar')
    await addArea(page, 'Quando acontecer')
    await addArea(page, 'Enquanto estiver rodando')
    const passo1 = await previewDoc(page)

    // 2) Cola o bloco do palco que veio do OUTRO projeto (só o bloco, sem a área).
    await pasteBlocks(
      page,
      {
        type: 'sz_g2d_setup_stage',
        fields: { BG: COR },
        inputs: {
          W: { shadow: { type: 'sz_val_number', fields: { NUM: 480 } } },
          H: { shadow: { type: 'sz_val_number', fields: { NUM: 320 } } },
        },
      },
      ['game-2d'],
    )
    await expect(
      page.locator('.blocklyBlockCanvas').getByText('Preparar o jogo', { exact: false }).first(),
    ).toBeVisible({ timeout: 15_000 })
    const passo2 = await previewDoc(page)

    // 3) Arrasta o rascunho para DENTRO do Ao iniciar.
    await dragOnto(page, 'Preparar o jogo', 'Ao iniciar')
    await page.waitForTimeout(2_000)
    const passo3 = await previewDoc(page)

    // ⚠️ Bloco ENCAIXADO fica ANINHADO no <g> do bloco pai; solto, o <g> dele é
    // filho direto do canvas. É assim que o teste distingue "o arrasto falhou" de
    // "encaixou e mesmo assim não gerou" — sem isso eu estaria adivinhando.
    const encaixado = await page.evaluate(() => {
      const alvo = Array.from(document.querySelectorAll('.blocklyBlockCanvas text')).find((t) =>
        (t.textContent ?? '').includes('Preparar o jogo'),
      )
      if (!alvo) return 'bloco-nao-encontrado'
      const bloco = alvo.closest('g.blocklyDraggable')
      if (!bloco) return 'sem-grupo'
      const pai = bloco.parentElement?.closest('g.blocklyDraggable')
      return pai ? 'ANINHADO' : 'SOLTO-NO-TOPO'
    })
    await page.screenshot({ path: '.cache/paste-into-area.png', fullPage: false })
    const programa = (doc: string) => {
      const marca = doc.match(/data:text\/javascript;base64,([^"\\]+)/)
      return marca?.[1] ? Buffer.from(marca[1], 'base64').toString('utf8') : '(sem script)'
    }
    const resumo = (rotulo: string, doc: string) => ({
      passo: rotulo,
      temRuntimeG2D: doc.includes('SZGame2D'),
      chamaSetupStage: doc.includes('setupStage('),
      temACor: doc.includes(COR),
    })
    console.log(
      'DIAGNÓSTICO',
      JSON.stringify(
        [resumo('1-areas-vazias', passo1), resumo('2-colado', passo2), resumo('3-dentro', passo3)],
        null,
        2,
      ),
    )
    console.log('O BLOCO ARRASTADO FICOU:', encaixado)
    console.log('PROGRAMA GERADO apos o arrasto:\n', programa(passo3))

    // ⭐ Separa "nunca regerou" de "regerou e ignorou": um CUTUCÃO (mover a área
    // um pouco) não acrescenta conteúdo nenhum, só dispara um evento de mudança.
    // Se o programa passar a ter o setupStage só com isso, o bloco SEMPRE esteve
    // na árvore e o que faltou foi a regeração.
    {
      const area = page
        .locator('.blocklyBlockCanvas')
        .getByText('Ao iniciar', { exact: false })
        .first()
      const caixa = await area.boundingBox()
      if (caixa) {
        await page.mouse.move(caixa.x + 8, caixa.y + caixa.height / 2)
        await page.mouse.down()
        await page.mouse.move(caixa.x + 48, caixa.y + caixa.height / 2 + 20, { steps: 10 })
        await page.mouse.up()
      }
      await page.waitForTimeout(2_000)
      console.log('APOS UM CUTUCAO (sem conteudo novo):\n', programa(await previewDoc(page)))
    }

    // ⭐ O passo que SEPARA as causas: se recarregar faz o bloco passar a gerar,
    // o estado salvo está certo e quem falha é o caminho AO VIVO (o que a
    // extensão recém-instalada pelo colar registra em memória).
    await page.reload()
    await expect(
      page.locator('.blocklyBlockCanvas').getByText('Preparar o jogo', { exact: false }).first(),
    ).toBeVisible({ timeout: 20_000 })
    await page.waitForTimeout(3_000)
    const passo4 = await previewDoc(page)
    console.log('PROGRAMA GERADO apos RELOAD:\n', programa(passo4))
    console.log('APOS RELOAD tem a cor?', passo4.includes(COR))
    console.log('ERROS DE CONSOLE:', JSON.stringify(erros, null, 2))

    // ⭐⭐ O INVARIANTE, e é ele que morde: o programa que roda AO VIVO tem que ser
    // o MESMO que roda depois de recarregar. Comparar com o pós-reload é mais forte
    // que cobrar o `setupStage` na mão — ele pega qualquer bloco que a tela mostre
    // dentro de uma Área e a geração ao vivo ignore, não só este.
    expect(programa(passo3)).toBe(programa(passo4))
    // E a pergunta dela, literal: só o "preparar o jogo" já pinta a cor.
    expect(programa(passo3)).toContain(COR)
  })
})
