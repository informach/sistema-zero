import { readFileSync } from 'node:fs'
import { expect, type Page, test } from '@playwright/test'
import { nativeRecovery } from '../src/state/projectRecoveryGuards'
import { PROJECT_STORAGE_VERSION, projectBlocksKey } from '../src/state/projectStorageKeys'
import { decodeProjectStorageValue } from '../src/state/projectStorageTransport'
import { attachMenuInteractions, recordMenuInteractions } from './helpers/menuInteractionTrace'
import {
  disposeNativeInputTrace,
  startNativeInputTrace,
  stopNativeInputTrace,
} from './helpers/nativeInputTrace'

test.afterAll(async ({ browser }, info) => disposeNativeInputTrace(browser, info))

test.beforeEach(async ({ page }) => {
  await startNativeInputTrace(page)
  await recordMenuInteractions(page)
})
test.afterEach(async ({ page }, info) => {
  await stopNativeInputTrace(page, info)
  await attachMenuInteractions(page, info)
})

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
  await expect(page.getByRole('menuitem', { name, exact: true })).toBeHidden()
}

/**
 * A porta dos modelos 3D no menu ⋯ (desde 18/09/2026 cada tipo de material tem a
 * sua, e a janela abre na aba certa). Os arquivos 3D deixaram de morar atrás da
 * palavra "Imagens".
 */
async function openModels3D(page: Page): Promise<void> {
  await openMenuItem(page, 'Modelos 3D')
}

function advanced3DKit(page: Page) {
  return page
    .getByRole('listitem')
    .filter({ has: page.getByText('Jogo 3D Avançado', { exact: true }) })
}

/** O "Enviar modelo 3D" e o "Trazer do Molda" do céu só existem com um consumidor 3D. */
async function installAdvanced3D(page: Page): Promise<void> {
  await openMenuItem(page, 'Mais blocos')
  await advanced3DKit(page).getByRole('button', { name: 'Pôr no meu jogo', exact: true }).click()
  await expect(advanced3DKit(page).getByText('No meu jogo', { exact: true })).toBeVisible()
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

/** A edição precisa estar no journal OU já promovida por uma gravação concorrente. */
async function hiddenDraftHasAdvanced3D(page: Page, expectedName: string): Promise<boolean> {
  // Observe native records without promoting journals or returning a deep decoded
  // document through the browser protocol. Decode with the production transport in Node.
  const snapshot = await page.evaluate(async (version) => {
    const id = decodeURIComponent(location.pathname.split('/').at(-1)!)
    const prefix = `sz:v${version}:project-recovery:${id}:`
    const metaKey = `sz:v${version}:project-meta:${id}`
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('sistema-zero-studio')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    try {
      return await new Promise<{
        id: string
        metaKey: string
        meta: unknown
        drafts: Array<{ key: IDBValidKey; value: unknown }>
      }>((resolve, reject) => {
        const tx = db.transaction('kv', 'readonly')
        const range = IDBKeyRange.bound(prefix, `${prefix}\uffff`)
        const keys = tx.objectStore('kv').getAllKeys(range)
        const request = tx.objectStore('kv').getAll(range)
        const committed = tx.objectStore('kv').get(metaKey)
        tx.oncomplete = () =>
          resolve({
            id,
            metaKey,
            meta: committed.result,
            drafts: keys.result.map((key, index) => ({ key, value: request.result[index] })),
          })
        tx.onabort = () => reject(tx.error)
      })
    } finally {
      db.close()
    }
  }, PROJECT_STORAGE_VERSION)
  const matches = (value: unknown) => {
    const meta = value as
      | { id?: string; name?: string; installedExtensions?: Array<{ id: string }> }
      | undefined
    return (
      meta?.id === snapshot.id &&
      meta.name === expectedName &&
      meta.installedExtensions?.some((extension) => extension.id === 'game-3d-advanced') === true
    )
  }
  if (matches(decodeProjectStorageValue(snapshot.metaKey, snapshot.meta))) return true
  return snapshot.drafts.some(({ key, value }) => {
    if (typeof key !== 'string') return false
    const draft = nativeRecovery(
      decodeProjectStorageValue(key, value),
      key,
      PROJECT_STORAGE_VERSION,
    )
    return (
      draft.projectId === snapshot.id &&
      draft.write.puts?.some(([key, meta]) => key === snapshot.metaKey && matches(meta)) === true
    )
  })
}

/** Arrasta uma Área do projeto da paleta para o canvas (o mesmo gesto do `topbar-undo.spec.ts`). */
async function dragAreaFromFlyout(page: Page, label: string): Promise<void> {
  const category = page
    .locator('.blocklyToolboxCategory')
    .filter({ hasText: 'Áreas do projeto' })
    .first()
  const source = page
    .locator('.blocklyToolboxFlyout .blocklyDraggable')
    .filter({ hasText: label })
    .first()
  if (!(await source.isVisible())) await category.click()
  await expect(source).toBeVisible()
  const sourceBox = await source.boundingBox()
  const freeSpot = () =>
    page.evaluate(() => {
      const background = document.querySelector('.blocklyMainBackground')?.getBoundingClientRect()
      if (!background) return null
      for (let y = background.bottom - 64; y > background.top + 64; y -= 32) {
        for (let x = background.right - 64; x > background.left + 64; x -= 32) {
          if (document.elementFromPoint(x, y)?.classList.contains('blocklyMainBackground')) {
            return { x, y }
          }
        }
      }
      return null
    })
  // O workspace pode estar se rearrumando (a área anterior acabou de cair): espera um ponto livre.
  let target = await freeSpot()
  for (let tentativa = 0; tentativa < 50 && !target; tentativa++) {
    await page.waitForTimeout(100)
    target = await freeSpot()
  }
  if (!sourceBox || !target) throw new Error('Área ou workspace sem ponto interativo')
  await page.mouse.move(sourceBox.x + 5, sourceBox.y + 5)
  await page.mouse.down()
  await page.mouse.move(target.x, target.y, { steps: 8 })
  await page.mouse.up()
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

  await openModels3D(page)
  await page.locator('input[name="project-3d-files"]').setInputFiles(bigSkyFile())
  await expect(page.getByLabel('Nome do modelo 3D ceu-grande')).toHaveValue('ceu-grande')
  await page.keyboard.press('Escape')
  await reloadRightAway(page)

  await openModels3D(page)
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

  await openModels3D(page)
  await page.getByRole('button', { name: /Trazer do Molda/ }).click()
  const modal = page.getByRole('dialog', { name: 'Trazer do Molda', exact: true })
  for (const name of ['nave-do-molda', 'grama-do-molda', 'ceu-do-molda']) {
    const card = modal.getByRole('listitem').filter({ has: page.getByText(name, { exact: true }) })
    await card.getByRole('button', { name: 'Adicionar ao projeto', exact: true }).click()
    await expect(card.getByText('✓ no projeto', { exact: true })).toBeVisible()
  }
  // Sem fechar a modal: é quando a varredura dos desenhos costuma estar lendo o banco.
  await reloadRightAway(page)

  // A textura é IMAGEM e cai na aba de imagens; o modelo e o céu, na de 3D.
  await openMenuItem(page, 'Imagens')
  await expect(page.getByLabel('Nome da imagem grama-do-molda')).toHaveValue('grama-do-molda')
  await page.getByRole('tab', { name: 'Modelos 3D' }).click()
  await expect(page.getByLabel('Nome do modelo 3D nave-do-molda')).toHaveValue('nave-do-molda')
  await expect(page.getByLabel('Nome do modelo 3D ceu-do-molda')).toHaveValue('ceu-do-molda')
  expect(errors).toEqual([])
})

test('esconder a aba grava NA HORA, sem esperar o autosave', async ({ page }, testInfo) => {
  // No iPad o Safari pode descartar uma aba em segundo plano sem `pagehide`: o
  // `visibilitychange` para `hidden` é o último evento com que dá para contar.
  test.setTimeout(60_000)
  const errors = collectPageErrors(page)

  await createProject(page)
  await installAdvanced3D(page)
  await saveNow(page)
  // Uma edição de metadados não dispara Rodar. Assim uma prévia que confirma a
  // instalação da extensão não pode satisfazer a verificação desta edição nova.
  const name = `Rascunho escondido ${testInfo.repeatEachIndex}`
  await page.getByRole('button', { name: 'Meu projeto', exact: true }).click()
  const nameInput = page.getByRole('textbox', { name: 'Nome do projeto' })
  await nameInput.fill(name)
  await nameInput.press('Enter')
  await expect(saveStatus(page, 'Alterações não salvas')).toBeVisible()

  expect(await hiddenDraftHasAdvanced3D(page, name)).toBe(false)
  await setVisibility(page, 'hidden')
  // A saída guarda a edição, ainda que outra gravação já tenha promovido o
  // journal. O nome novo impede uma confirmação antiga de satisfazer o teste.
  try {
    await expect.poll(() => hiddenDraftHasAdvanced3D(page, name), { timeout: 10_000 }).toBe(true)
  } catch (error) {
    const storage = await page.evaluate(async () => {
      const local = Object.fromEntries(
        Object.entries(localStorage).filter(([key]) => key.startsWith('sz:studio-exit:')),
      )
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('sistema-zero-studio')
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
      try {
        return await new Promise((resolve, reject) => {
          const tx = db.transaction('kv', 'readonly')
          const keys = tx.objectStore('kv').getAllKeys()
          const values = tx.objectStore('kv').getAll()
          tx.oncomplete = () =>
            resolve({
              local,
              records: keys.result.map((key, index) => [key, values.result[index]]),
            })
          tx.onabort = () => reject(tx.error)
        })
      } finally {
        db.close()
      }
    })
    await testInfo.attach('exit-storage-diagnostic', {
      body: JSON.stringify(storage),
      contentType: 'application/json',
    })
    throw error
  }
  // Reabrir sem voltar à aba nem pedir um save: a recuperação deve bastar.
  await page.reload()
  await expect(page.getByRole('button', { name, exact: true })).toBeVisible()
  await openMenuItem(page, 'Mais blocos')
  await expect(advanced3DKit(page).getByText('No meu jogo', { exact: true })).toBeVisible()
  expect(errors).toEqual([])
})

/**
 * Registra cada cópia de saída (`project-recovery`) DESTE projeto no instante em que ela é gravada.
 * A gravação normal que confirma depois apaga a cópia (`commitProjectRecovery`), então ler o banco
 * depois chegava tarde em parte das rodadas: a prova lê o que foi gravado, não o que sobrou.
 */
async function recordExitCopies(page: Page) {
  await page.evaluate((version) => {
    const id = decodeURIComponent(location.pathname.split('/').at(-1)!)
    const prefix = `sz:v${version}:project-recovery:${id}:`
    const copies: Array<{ key: string; value: unknown }> = []
    ;(window as typeof window & { __szExitCopies?: typeof copies }).__szExitCopies = copies
    const put = IDBObjectStore.prototype.put
    IDBObjectStore.prototype.put = function (value: unknown, key?: IDBValidKey) {
      if (typeof key === 'string' && key.startsWith(prefix))
        copies.push({ key, value: structuredClone(value) })
      return put.call(this, value, key)
    }
  }, PROJECT_STORAGE_VERSION)
}

/** As cópias de saída registradas, decodificadas pelo transporte de produção: os tipos de bloco. */
async function recordedExitCopies(page: Page): Promise<Array<{ start: boolean; events: boolean }>> {
  const snapshot = await page.evaluate(() => ({
    id: decodeURIComponent(location.pathname.split('/').at(-1)!),
    copies:
      (window as typeof window & { __szExitCopies?: Array<{ key: string; value: unknown }> })
        .__szExitCopies ?? [],
  }))
  const blocksKey = projectBlocksKey(snapshot.id)
  const found: Array<{ start: boolean; events: boolean }> = []
  for (const { key, value } of snapshot.copies) {
    const draft = nativeRecovery(
      decodeProjectStorageValue(key, value),
      key,
      PROJECT_STORAGE_VERSION,
    )
    if (draft.projectId !== snapshot.id) continue
    const blocks = draft.write.puts?.find(([putKey]) => putKey === blocksKey)
    if (!blocks) continue
    const text = JSON.stringify(blocks[1])
    found.push({ start: text.includes('sz_frame_start'), events: text.includes('sz_frame_events') })
  }
  return found
}

test('desfazer um bloco e esconder a aba na mesma tarefa: a cópia de saída já vem sem o bloco', async ({
  page,
}) => {
  // O Blockly entrega o evento da mudança num quadro + setTimeout(0), e com a aba escondida o
  // quadro nem vem (iPad). A gravação da aba escondida precisa materializar o que está no canvas
  // mesmo sem o evento ter chegado ao painel. Duas áreas, e só a segunda é desfeita: o canvas
  // vazio apagaria a partição dos blocos em vez de gravá-la, e a prova ficaria sem o que ler.
  test.setTimeout(60_000)
  const errors = collectPageErrors(page)
  const topBlocks = page.locator(
    'svg.blocklySvg > g.blocklyWorkspace > g.blocklyBlockCanvas > g.blocklyDraggable',
  )

  await createProject(page)
  await dragAreaFromFlyout(page, 'Ao iniciar')
  await expect(topBlocks).toHaveCount(1)
  await dragAreaFromFlyout(page, 'Quando acontecer')
  await expect(topBlocks).toHaveCount(2)
  await saveNow(page)
  await recordExitCopies(page)

  // Desfazer a segunda área e esconder a aba sem devolver o controle ao navegador entre os dois.
  await page.evaluate(() => {
    const undo = document.querySelector<HTMLButtonElement>('button[aria-label="Desfazer"]')
    if (!undo || undo.disabled) throw new Error('Desfazer indisponível')
    undo.click()
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' })
    document.dispatchEvent(new Event('visibilitychange'))
  })

  // A cópia que a aba escondida grava já vem sem a área desfeita; nenhuma cópia leva a área.
  await expect
    .poll(async () => (await recordedExitCopies(page)).length, { timeout: 10_000 })
    .toBeGreaterThan(0)
  expect(await recordedExitCopies(page)).toEqual(
    (await recordedExitCopies(page)).map(() => ({ start: true, events: false })),
  )
  expect(errors).toEqual([])
})
