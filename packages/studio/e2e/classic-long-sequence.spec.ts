import { expect, test } from '@playwright/test'

/**
 * Uma sequência única de 10 mil blocos (lote 3 da missão, conserto B, 21/11/2026).
 *
 * O Blockly 12 desenha uma sequência longa no mesmo corpo com recursão na cadeia de pais e para no
 * meio da carga (no Chromium, por volta de 2 mil blocos seguidos). Antes, o erro virava só um aviso
 * no console e a regeneração seguinte gravava o workspace parcial: o projeto passava de 10 mil
 * para ~2,1 mil blocos, sem nada na tela. O que se exige aqui: a área de blocos diz que não deu
 * para abrir, e o projeto continua com todos os blocos. Abrir uma sequência assim no editor de
 * blocos (carga por partes dentro dos corpos) segue pendente e registrado em
 * `docs/estudio-evolucao/classico-em-escala.md`.
 */

const contarBlocos = () => {
  const projeto = (
    window as unknown as { __aula: { projeto(): { blocksState: unknown } | null } }
  ).__aula.projeto()
  let blocos = 0
  // Sem JSON.stringify: o nativo recursa numa cadeia assim.
  const pendentes: unknown[] = [projeto?.blocksState]
  while (pendentes.length > 0) {
    const atual = pendentes.pop()
    if (!atual || typeof atual !== 'object') continue
    const tipo = (atual as { type?: unknown }).type
    if (typeof tipo === 'string' && tipo.startsWith('sz_')) blocos++
    for (const valor of Object.values(atual)) pendentes.push(valor)
  }
  return blocos
}

test('a sequência que o editor de blocos não abre não perde nenhum bloco', async ({ page }) => {
  test.setTimeout(180_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/aula?aula=desafio-primeiro-jogo/desafio-dia-3&escala=10000&forma=sequencia')
  const recado = page.locator('[data-sz-blocks-restore-failed]')
  await expect(recado).toBeVisible({ timeout: 120_000 })
  await expect(recado.getByRole('alert')).toContainText('Nada foi perdido')
  // A aula só tem o modo Blocos: o recado não manda a criança para a Ponte, que ali não existe.
  await expect(recado.getByRole('alert')).toContainText('Peça ajuda a um adulto')
  await expect(recado.getByRole('alert')).not.toContainText('Ponte')
  // Os eventos da carga parcial chegam depois do recado: espera passarem e confere o projeto.
  await page.waitForTimeout(3000)
  expect(await page.evaluate(contarBlocos)).toBe(10_000)
  // Nenhum bloco parcial fica à vista para ser editado como se fosse o projeto.
  await expect(page.locator('svg.blocklySvg .blocklyBlockCanvas .blocklyDraggable')).toHaveCount(0)
  // Revisão do lote 3 (achado 2): o recado fica POR CIMA da paleta (nada arrastado dela para o
  // canvas escondido) e o canvas limpo é só de leitura (nada colado ali se perde calado).
  const recadoCobreAPaleta = await page.evaluate(() => {
    const paleta = document.querySelector('.blocklyToolbox')?.getBoundingClientRect()
    if (!paleta) return false
    const ponto = document.elementFromPoint(paleta.left + paleta.width / 2, paleta.top + 24)
    return Boolean(ponto?.closest('[data-sz-blocks-restore-failed]'))
  })
  expect(recadoCobreAPaleta).toBe(true)
  await expect(page.locator('.blocklyReadOnly').first()).toBeAttached()
})
