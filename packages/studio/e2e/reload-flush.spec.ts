import { readFileSync } from 'node:fs'
import { expect, type Page, test } from '@playwright/test'

/**
 * O flush de SAÍDA: recarregar logo depois de uma mudança, SEM esperar o "Salvo", não pode
 * perder a mudança.
 *
 * A mudança já está na store ("Alterações não salvas") e o autosave (1 s de debounce) ainda não
 * correu: quem grava é o flush do `beforeunload`/`pagehide`. Até 11/09/2026 ele pedia a gravação,
 * mas a transação do IndexedDB dependia do AUTO-commit, que só acontece depois que a página recebe
 * o resultado de cada `put`; se a troca de documento chega antes, a transação morre. O conserto é
 * UMA transação com `commit()` explícito (`state/idbTransaction.ts`).
 *
 * ⚠️ O que faz este teste morder: uma gravação GRANDE (o céu 360° do Molda, ~1,5 milhão de
 * caracteres) e a CPU lenta na saída. Com uma mudança pequena (um bloco colado) num computador
 * rápido, a transação antiga termina dentro da janela da navegação e o teste passaria com e sem o
 * conserto (medido: 30 de 30 nos dois). Não troque o céu por algo leve nem tire a lentidão.
 *
 * ⚠️ Por que ENVIAR o arquivo, e não "Trazer do Molda": trazer do Molda grava na biblioteca pessoal,
 * e isso dispara a varredura dos desenhos, que LÊ o banco dos projetos. No Chromium uma leitura do
 * idb-keyval (auto-commit) ainda em voo tranca a escrita do flush: a readwrite espera as transações
 * anteriores do mesmo store, e a leitura só termina se a página processar os eventos dela. É um
 * SEGUNDO mecanismo, que o `commit()` da escrita não cobre (medido em 11/09/2026: com o conserto, o
 * fluxo do Molda ainda perdeu 2 de 46). Este teste prova o primeiro; o segundo está no relatório do
 * lote e na memória `studio-flush-saida-indexeddb`.
 *
 * ⚠️ Os outros specs que recarregam esperam o "Salvo" de propósito (eles provam outra coisa);
 * este é o único que NÃO pode esperar.
 */

/** O céu do demo do Molda (o mesmo `.hdr` que o "Trazer do Molda" do playground entrega). */
function bigSkyFile(): { name: string; mimeType: string; buffer: Buffer } {
  const demo = JSON.parse(
    readFileSync(new URL('../playground/moldaDemoAssets.json', import.meta.url), 'utf8'),
  ) as { sky: { dataUrl: string } }
  const base64 = demo.sky.dataUrl.slice(demo.sky.dataUrl.indexOf(',') + 1)
  return {
    name: 'ceu-grande.hdr',
    mimeType: 'image/vnd.radiance',
    buffer: Buffer.from(base64, 'base64'),
  }
}

async function createProject(page: Page): Promise<void> {
  await page.goto('/')
  await page.getByRole('button', { name: '+ Novo projeto' }).first().click()
  await page.getByRole('button', { name: 'Criar e abrir' }).click()
  await expect(page).toHaveURL(/\/editor\//)
}

function saveStatus(page: Page, label: string) {
  return page
    .getByText(label, { exact: true })
    .or(page.getByRole('status', { name: label, exact: true }))
}

async function openAssets(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Mais opções' }).click()
  await page.getByRole('menuitem', { name: 'Imagens', exact: true }).click()
}

/**
 * Um aparelho LENTO (o tablet da escola) no instante do reload: o CPU da página a 1/SLOW_CPU.
 * Devagar, a página demora a receber o resultado dos `put` e a troca de documento chega antes com
 * muito mais frequência. O `commit()` explícito não depende disso. Só existe no Chromium (CDP).
 */
const SLOW_CPU = Number(process.env.RELOAD_FLUSH_SLOW_CPU ?? 6)
async function slowDevice(page: Page): Promise<{ release: () => Promise<void> } | null> {
  if (page.context().browser()?.browserType().name() !== 'chromium' || SLOW_CPU <= 1) return null
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: SLOW_CPU })
  return {
    release: async () => {
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 })
      await cdp.detach()
    },
  }
}

test('enviar um céu de 1,5 MB e recarregar NA HORA: o arquivo sobrevive', async ({ page }) => {
  test.setTimeout(90_000)
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))

  await createProject(page)
  // O "Enviar modelo 3D" só existe com um consumidor 3D no projeto.
  await page.getByRole('button', { name: 'Mais opções' }).click()
  await page.getByRole('menuitem', { name: 'Extensões', exact: true }).click()
  const kit = page
    .getByRole('listitem')
    .filter({ has: page.getByText('Jogo 3D Avançado', { exact: true }) })
  await kit.getByRole('button', { name: 'Instalar', exact: true }).click()
  await expect(kit.getByText('Instalada', { exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  // Parte de um projeto JÁ gravado: o que o teste mede é só o flush, e não uma transação
  // anterior que ainda estivesse terminando.
  await expect(saveStatus(page, 'Salvo')).toBeVisible({ timeout: 10_000 })

  await openAssets(page)
  await page.locator('input[name="project-3d-files"]').setInputFiles(bigSkyFile())
  await expect(page.getByLabel('Nome do modelo 3D ceu-grande')).toHaveValue('ceu-grande')
  await page.keyboard.press('Escape')

  // SEM esperar o "Salvo": o selo tem que dizer que ainda não salvou, senão o teste estaria
  // passando pelo autosave e não pelo flush.
  await expect(saveStatus(page, 'Alterações não salvas')).toBeVisible()
  const slow = await slowDevice(page)
  // Lento só na SAÍDA: solta assim que o documento novo assume (o antigo já foi embora).
  await page.reload({ waitUntil: 'commit' })
  await slow?.release()

  await openAssets(page)
  await expect(page.getByLabel('Nome do modelo 3D ceu-grande')).toHaveValue('ceu-grande')
  expect(errors).toEqual([])
})
