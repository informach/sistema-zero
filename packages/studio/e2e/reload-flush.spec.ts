import { readFileSync } from 'node:fs'
import { expect, type Page, test } from '@playwright/test'

/**
 * A gravação de SAÍDA do Estúdio: recarregar logo depois de uma mudança, SEM esperar o "Salvo",
 * não pode perder a mudança; e esconder a aba grava na hora.
 *
 * A mudança está na store ("Alterações não salvas") e quem grava é o flush do
 * `beforeunload`/`pagehide`. Até 11/09/2026 ele pedia a gravação, mas a transação do IndexedDB
 * dependia do AUTO-commit, que só acontece depois que a página recebe o resultado de cada `put`: se
 * a troca de documento chega antes, a transação morre. E uma LEITURA em auto-commit ainda aberta
 * trancava a gravação (a escrita espera as transações anteriores do mesmo store), então as duas
 * morriam juntas. O conserto: toda transação do banco dos projetos pede tudo de uma vez e fecha com
 * `commit()` explícito (`state/idbTransaction.ts`), e o flush não espera um autosave em voo para
 * pedir a dele.
 *
 * ⭐ O autosave fica SEGURADO (`?autosave-ms=`, o gancho do playground): quem grava aqui é só a
 * saída. Sem isso, no WebKit o autosave chegava antes do reload em metade das rodadas e o teste
 * passava sem provar nada. Por isso também o "Salvar" explícito do começo: o teste parte de um
 * projeto já gravado, e mede só a gravação da saída.
 *
 * ⚠️ O que faz o primeiro teste morder: uma gravação GRANDE (o céu 360° do Molda, ~1,5 milhão de
 * caracteres) e a CPU lenta na saída (só no Chromium). Com uma mudança pequena num computador
 * rápido, a transação antiga terminava dentro da janela da navegação e o teste passaria com e sem
 * o conserto (medido: 30 de 30 nos dois). Não troque o céu por algo leve nem tire a lentidão.
 *
 * ⚠️ O segundo teste traz do Molda e recarrega com a modal AINDA ABERTA: trazer grava na
 * biblioteca pessoal e acorda a varredura dos desenhos, que LÊ o banco dos projetos. É o segundo
 * mecanismo (a leitura aberta que trancava a gravação), o que o primeiro teste evita de propósito.
 *
 * ⚠️ Os outros specs que recarregam esperam o "Salvo" de propósito (eles provam outra coisa);
 * este é o único que NÃO pode esperar.
 */

/** Segura o autosave por 10 minutos (ver o cabeçalho). */
const HOLD_AUTOSAVE = '/?autosave-ms=600000'

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
  await page.goto(HOLD_AUTOSAVE)
  await page.getByRole('button', { name: '+ Novo projeto' }).first().click()
  await page.getByRole('button', { name: 'Criar e abrir' }).click()
  await expect(page).toHaveURL(/\/editor\//)
}

function saveStatus(page: Page, label: string) {
  return page
    .getByText(label, { exact: true })
    .or(page.getByRole('status', { name: label, exact: true }))
}

async function openMenuItem(page: Page, name: string): Promise<void> {
  await page.getByRole('button', { name: 'Mais opções' }).click()
  await page.getByRole('menuitem', { name, exact: true }).click()
}

function advanced3DKit(page: Page) {
  return page
    .getByRole('listitem')
    .filter({ has: page.getByText('Jogo 3D Avançado', { exact: true }) })
}

/** O "Enviar modelo 3D" e o "Trazer do Molda" do céu só existem com um consumidor 3D. */
async function installAdvanced3D(page: Page): Promise<void> {
  await openMenuItem(page, 'Extensões')
  await advanced3DKit(page).getByRole('button', { name: 'Instalar', exact: true }).click()
  await expect(advanced3DKit(page).getByText('Instalada', { exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
}

/** Parte de um projeto JÁ gravado: o teste mede só a gravação da saída. */
async function saveNow(page: Page): Promise<void> {
  await openMenuItem(page, 'Salvar')
  await expect(saveStatus(page, 'Salvo')).toBeVisible({ timeout: 10_000 })
}

/**
 * Um aparelho LENTO (o tablet da escola) no instante do reload: o CPU da página a 1/SLOW_CPU.
 * Devagar, a página demora a receber o resultado dos pedidos e a troca de documento chega antes
 * com muito mais frequência. O `commit()` explícito não depende disso. Só existe no Chromium (CDP).
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

/** Recarrega SEM esperar o "Salvo", lento só na saída (solta assim que o documento novo assume). */
async function reloadRightAway(page: Page): Promise<void> {
  // O selo tem que dizer que ainda não salvou, senão o teste estaria passando por outra
  // gravação, e não pela da saída.
  await expect(saveStatus(page, 'Alterações não salvas')).toBeVisible()
  const slow = await slowDevice(page)
  await page.reload({ waitUntil: 'commit' })
  await slow?.release()
}

/**
 * Esconde (ou mostra) a aba. O navegador de teste não troca a visibilidade sozinho, então o
 * estado é trocado no documento e o evento é disparado: é o ouvinte do Estúdio que se prova aqui.
 */
async function setVisibility(page: Page, state: 'hidden' | 'visible'): Promise<void> {
  await page.evaluate((next) => {
    if (next === 'visible') {
      delete (document as { visibilityState?: unknown }).visibilityState
    } else {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => next })
    }
    document.dispatchEvent(new Event('visibilitychange'))
  }, state)
}

function collectPageErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  return errors
}

test('enviar um céu de 1,5 MB e recarregar NA HORA: o arquivo sobrevive', async ({ page }) => {
  test.setTimeout(90_000)
  const errors = collectPageErrors(page)

  await createProject(page)
  await installAdvanced3D(page)
  await saveNow(page)

  await openMenuItem(page, 'Imagens')
  await page.locator('input[name="project-3d-files"]').setInputFiles(bigSkyFile())
  await expect(page.getByLabel('Nome do modelo 3D ceu-grande')).toHaveValue('ceu-grande')
  await page.keyboard.press('Escape')
  await reloadRightAway(page)

  await openMenuItem(page, 'Imagens')
  await expect(page.getByLabel('Nome do modelo 3D ceu-grande')).toHaveValue('ceu-grande')
  expect(errors).toEqual([])
})

test('trazer os três arquivos do Molda e recarregar NA HORA, com a modal aberta: os três sobrevivem', async ({
  page,
}) => {
  test.setTimeout(90_000)
  const errors = collectPageErrors(page)

  await createProject(page)
  await installAdvanced3D(page)
  await saveNow(page)

  await openMenuItem(page, 'Imagens')
  await page.getByRole('button', { name: /Trazer do Molda/ }).click()
  const modal = page.getByRole('dialog', { name: 'Trazer do Molda', exact: true })
  for (const name of ['nave-do-molda', 'grama-do-molda', 'ceu-do-molda']) {
    const card = modal.getByRole('listitem').filter({ has: page.getByText(name, { exact: true }) })
    await card.getByRole('button', { name: 'Adicionar ao projeto', exact: true }).click()
    await expect(card.getByText('✓ no projeto', { exact: true })).toBeVisible()
  }
  // Sem fechar a modal: é quando a varredura dos desenhos costuma estar lendo o banco.
  await reloadRightAway(page)

  await openMenuItem(page, 'Imagens')
  await expect(page.getByLabel('Nome do modelo 3D nave-do-molda')).toHaveValue('nave-do-molda')
  await expect(page.getByLabel('Nome da imagem grama-do-molda')).toHaveValue('grama-do-molda')
  await expect(page.getByLabel('Nome do modelo 3D ceu-do-molda')).toHaveValue('ceu-do-molda')
  expect(errors).toEqual([])
})

test('esconder a aba grava NA HORA, sem esperar o autosave', async ({ page }) => {
  // No iPad o Safari pode descartar uma aba em segundo plano sem `pagehide`: o
  // `visibilitychange` para `hidden` é o último evento com que dá para contar.
  test.setTimeout(60_000)
  const errors = collectPageErrors(page)

  await createProject(page)
  await installAdvanced3D(page)
  await expect(saveStatus(page, 'Alterações não salvas')).toBeVisible()

  await setVisibility(page, 'hidden')
  // O autosave está segurado por 10 minutos: só a gravação da aba escondida explica o "Salvo".
  await expect(saveStatus(page, 'Salvo')).toBeVisible({ timeout: 10_000 })
  await setVisibility(page, 'visible')

  await page.reload()
  await openMenuItem(page, 'Extensões')
  await expect(advanced3DKit(page).getByText('Instalada', { exact: true })).toBeVisible()
  expect(errors).toEqual([])
})
