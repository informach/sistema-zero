import { expect, type Page, test } from '@playwright/test'
import { createEmptyProject } from '../src/core/project'
import { projectFilesKey, projectHeadKey, projectMetaKey } from '../src/state/projectStorageKeys'
import { projectStorageEntries } from '../src/state/projectStorageRecords'
import { readProjectStorageRecords as records } from './projectStorageInspection'

/**
 * A migração da lista (v3 → v4) interrompida de verdade (lote 1, item 7, 22/11/2026): recarregar
 * a página no meio da preparação e, no Chromium, matar o processo da aba (`Page.crash`), várias
 * vezes seguidas. Cada projeto precisa estar sempre INTEIRO na versão 3 ou COMPLETO na versão 4,
 * sem as partes v3 (saem na mesma transação) e com UMA cópia de segurança que guarda a origem; ao
 * fim, a lista abre todos, sem "Preservado".
 * A promoção é uma transação só (cópia de segurança, cabeça e partes juntas, `promoteLocalMigration`),
 * e a cópia tem a chave pelo hash da origem: repetir a migração não cria uma segunda.
 */

const TOTAL = 30
// Um script grande deixa a preparação de cada projeto mais lenta (hash e conferência), e a janela
// para interromper no meio fica larga o bastante para acontecer de verdade.
const BIG = `// ${'peça do cenário '.repeat(6000)}\n`

function legacyProject(index: number) {
  const id = `migracao-${String(index).padStart(2, '0')}`
  const project = createEmptyProject(id, `Jogo antigo ${index}`)
  project.files['script.js'] = `${BIG}let pontos = ${index}\n`
  return project
}

const projects = Array.from({ length: TOTAL }, (_, index) => legacyProject(index))

async function seedLegacy(page: Page) {
  // Uma página da mesma origem que não monta o Estúdio: nada migra enquanto a semente é gravada.
  await page.goto('/favicon.svg')
  const entries = projects.flatMap((project) => [
    ...projectStorageEntries(project, 3),
    [
      projectHeadKey(project.id, 3),
      { version: 1, token: `cabeca-${project.id}`, writer: 'aba-antiga', base: null, sequence: 1 },
    ] as [string, unknown],
  ])
  await page.evaluate(async (entries) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('sistema-zero-studio', 1)
      request.onupgradeneeded = () => request.result.createObjectStore('kv')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    const tx = db.transaction('kv', 'readwrite')
    const store = tx.objectStore('kv')
    for (const [key, value] of entries) store.put(value, key)
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    db.close()
  }, entries)
}

type Stored = { [key: string]: unknown }

/** As partes da versão 3 que a promoção leva junto (a cabeça e o histórico ficam). */
const LEGACY_PARTS = ['meta', 'files', 'state', 'blocks', 'assets']

/** Confere o invariante em cada projeto e devolve quantos já estão na versão 4. */
function checkInvariant(saved: Stored, round: string): number {
  let promoted = 0
  for (const project of projects) {
    const legacyParts = LEGACY_PARTS.filter(
      (part) => saved[`sz:v3:project-${part}:${project.id}`] !== undefined,
    )
    const v4Keys = Object.keys(saved).filter(
      (key) => key.startsWith('sz:v4:project-') && key.endsWith(`:${project.id}`),
    )
    const backups = Object.keys(saved).filter((key) =>
      key.startsWith(`sz:v4:project-backup:${project.id}:`),
    )
    // A cabeça da versão 3 fica nos dois estados (uma aba antiga aberta ainda guarda a edição).
    const legacyHead = saved[projectHeadKey(project.id, 3)] as { token?: string } | undefined
    expect(legacyHead?.token, `${round}: ${project.id} perdeu a cabeça v3`).toBe(
      `cabeca-${project.id}`,
    )
    const meta = saved[projectMetaKey(project.id, 4)] as { name?: string } | undefined
    if (!meta) {
      // Ainda na versão 3: inteiro, e nada da versão 4 pela metade.
      expect(legacyParts, `${round}: ${project.id} ficou com a origem v3 incompleta`).toEqual(
        LEGACY_PARTS,
      )
      const legacy = saved[projectMetaKey(project.id, 3)] as { name?: string }
      expect(legacy.name, `${round}: a origem v3 de ${project.id} mudou`).toBe(project.name)
      expect(v4Keys, `${round}: ${project.id} ficou com partes v4 sem a meta`).toEqual([])
      expect(backups, `${round}: ${project.id} ficou com cópia sem a promoção`).toEqual([])
      continue
    }
    // Na versão 4: completo, sem as partes v3 (saem na mesma transação) e com UMA cópia.
    promoted++
    expect(legacyParts, `${round}: ${project.id} está nas duas versões ao mesmo tempo`).toEqual([])
    expect(meta.name, `${round}: ${project.id} mudou de nome`).toBe(project.name)
    const files = saved[`sz:v4:project-files:${project.id}`] as {
      files?: { [name: string]: string }
    }
    expect(files?.files?.['script.js'], `${round}: ${project.id} mudou de código`).toBe(
      project.files['script.js'],
    )
    const head = saved[projectHeadKey(project.id, 4)] as { token?: string } | undefined
    expect(head?.token, `${round}: ${project.id} perdeu a cabeça`).toBe(`cabeca-${project.id}`)
    expect(backups, `${round}: ${project.id} precisa de exatamente uma cópia`).toHaveLength(1)
    const backup = saved[backups[0]!] as { records?: Stored } | undefined
    const archived = backup?.records?.[projectFilesKey(project.id, 3)] as
      | { files?: { [name: string]: string } }
      | undefined
    expect(
      (backup?.records?.[projectMetaKey(project.id, 3)] as { name?: string } | undefined)?.name,
      `${round}: a cópia de ${project.id} não guarda a origem`,
    ).toBe(project.name)
    expect(
      archived?.files?.['script.js'],
      `${round}: a cópia de ${project.id} perdeu o código`,
    ).toBe(project.files['script.js'])
  }
  return promoted
}

async function observe(page: Page, round: string): Promise<number> {
  await page.goto('/favicon.svg')
  return checkInvariant(await records(page), round)
}

test('recarregar e matar a aba no meio da migração nunca deixa projeto pela metade', async ({
  page,
  context,
  browserName,
}) => {
  test.setTimeout(240_000)
  await seedLegacy(page)
  expect(await observe(page, 'semente')).toBe(0)

  // No Chromium a CPU lenta alarga a janela da preparação (o aparelho modesto da família).
  const throttle = async (target: Page) => {
    if (browserName !== 'chromium') return
    const cdp = await context.newCDPSession(target)
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  }

  const counts: number[] = []
  let current = page
  const delays = [120, 260, 420, 600, 850, 1200, 1700, 2400]
  for (const [round, delay] of delays.entries()) {
    await throttle(current)
    await current.goto('/')
    await current.waitForTimeout(delay)
    const crash = browserName === 'chromium' && round % 2 === 1
    if (crash) {
      // O processo da aba morre sem descarregar a página: as transações em voo não chegam ao fim.
      // `Page.crash` nunca responde (a aba morre antes): dispara e espera o evento da página.
      const cdp = await context.newCDPSession(current)
      const crashed = new Promise<void>((resolve) => current.once('crash', () => resolve()))
      void cdp.send('Page.crash').catch(() => {})
      await crashed
      await current.close()
      current = await context.newPage()
    }
    counts.push(await observe(current, `${crash ? 'aba morta' : 'recarga'} ${round} (${delay} ms)`))
  }

  // Ao fim, a lista abre inteira: todos promovidos, uma cópia cada, nenhum "Preservado".
  await current.goto('/')
  for (const project of projects)
    await expect(
      current.getByRole('button', { name: `Abrir projeto ${project.name}`, exact: true }),
    ).toBeVisible({ timeout: 60_000 })
  await expect(current.getByText('Preservado — peça ajuda para abrir')).toHaveCount(0)
  expect(await observe(current, 'final')).toBe(TOTAL)
  test.info().annotations.push({ type: 'promovidos por rodada', description: counts.join(', ') })
  console.log(`[migração interrompida] promovidos por rodada: ${counts.join(', ')}`)
  // A prova só vale se alguma rodada parou no meio (nem zero nem todos).
  expect(
    counts.some((count) => count > 0 && count < TOTAL),
    `nenhuma interrupção caiu no meio da migração: ${counts.join(', ')}`,
  ).toBe(true)
})
