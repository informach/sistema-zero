import { expect, type Page, test } from '@playwright/test'
import { projectBlocksKey } from '../../src/state/projectStorageKeys'
import { readProjectStorageRecord } from '../projectStorageInspection'

interface WorkspacePoint {
  x: number
  y: number
}

function serializedBlockIds(state: unknown): Set<string> {
  const ids = new Set<string>()
  const pending = [state]
  const seen = new Set<object>()
  while (pending.length) {
    const value = pending.pop()
    if (value === null || typeof value !== 'object' || seen.has(value)) continue
    seen.add(value)
    if ('id' in value && typeof value.id === 'string') ids.add(value.id)
    pending.push(...Object.values(value))
  }
  return ids
}

async function findEmptyWorkspacePoint(page: Page): Promise<WorkspacePoint | null> {
  const box = await page.locator('.blocklyMainBackground').first().boundingBox()
  if (!box) return null
  return page.evaluate(
    ({ left, top, width, height }) => {
      for (let y = top + height - 16; y >= top + 16; y -= 32) {
        for (let x = left + width - 16; x >= left + 16; x -= 32) {
          if (document.elementFromPoint(x, y)?.classList.contains('blocklyMainBackground')) {
            return { x, y }
          }
        }
      }
      return null
    },
    { left: box.x, top: box.y, width: box.width, height: box.height },
  )
}

/** Abre o menu somente depois que fundo, hit-test e menu estão prontos. */
export async function openWorkspaceContextMenu(page: Page): Promise<void> {
  const pasteItem = page.getByRole('menuitem', { name: 'Colar', exact: true })
  await expect
    .poll(
      async () => {
        if (await pasteItem.isVisible()) return true
        const point = await findEmptyWorkspacePoint(page)
        if (!point) return false
        await page.mouse.click(point.x, point.y, { button: 'right' })
        return pasteItem.isVisible()
      },
      { timeout: 5_000, message: 'Workspace do Blockly sem ponto vazio interativo' },
    )
    .toBe(true)
}

/** Cola pelo mesmo clipboard durável e pelo mesmo comando usados pela interface. */
export async function pasteBlocklyBlocks(
  page: Page,
  block: Record<string, unknown>,
  requiredExtensions: string[] = [],
): Promise<void> {
  const workspaceBlocks = page.locator(
    'svg.blocklySvg > g.blocklyWorkspace > g.blocklyBlockCanvas .blocklyDraggable',
  )
  const blockCountBeforePaste = await workspaceBlocks.count()
  const previousIds = new Set(
    await workspaceBlocks.evaluateAll((blocks) =>
      blocks.map((block) => block.getAttribute('data-id')),
    ),
  )
  await page.evaluate(
    ([payload]) => localStorage.setItem('sz:block-clipboard', payload as string),
    [JSON.stringify({ version: 1, block, requiredExtensions, copiedAt: Date.now() })],
  )
  await openWorkspaceContextMenu(page)
  const pasteItem = page.getByRole('menuitem', { name: 'Colar', exact: true })
  // Diagnostic-only CPU profile: slow the interaction after readiness, not boot.
  const rate = Number(process.env.STUDIO_MENU_REPRO_CPU ?? 1)
  if (!Number.isFinite(rate) || rate < 1) throw Error('STUDIO_MENU_REPRO_CPU inválido')
  const session =
    rate !== 1 && page.context().browser()?.browserType().name() === 'chromium'
      ? await page.context().newCDPSession(page)
      : null
  try {
    if (session) {
      await session.send('Emulation.setCPUThrottlingRate', { rate })
      test.info().annotations.push({ type: 'menu-cpu-throttle', description: String(rate) })
    }
    await pasteItem.click()
    await expect(pasteItem).toBeHidden()
  } finally {
    if (session) {
      await session.send('Emulation.setCPUThrottlingRate', { rate: 1 })
      await session.detach()
    }
  }
  await expect
    .poll(() => workspaceBlocks.count(), {
      timeout: 5_000,
      message: 'O comando de colar terminou, mas o bloco não apareceu no workspace',
    })
    .toBeGreaterThan(blockCountBeforePaste)

  // A status transition can finish before the test resumes. Require the actual
  // new Blockly IDs in committed storage, then the UI acknowledgement.
  const newIds = (
    await workspaceBlocks.evaluateAll((blocks) =>
      blocks.map((block) => block.getAttribute('data-id')),
    )
  ).filter((id): id is string => typeof id === 'string' && !previousIds.has(id))
  expect(newIds.length).toBeGreaterThan(0)
  const projectId = decodeURIComponent(
    new URL(page.url()).pathname.split('/').filter(Boolean).at(-1)!,
  )
  await expect
    .poll(
      async () => {
        const stored = (await readProjectStorageRecord(page, projectBlocksKey(projectId))) as
          | { id?: string; blocksState?: unknown }
          | undefined
        const ids =
          stored?.id === projectId ? serializedBlockIds(stored.blocksState) : new Set<string>()
        return newIds.filter((id) => ids.has(id))
      },
      {
        timeout: 5_000,
        message: 'Os blocos colados ainda não foram confirmados na partição persistida',
      },
    )
    .toEqual(newIds)
  const saveStatus = (label: string) =>
    page
      .getByText(label, { exact: true })
      .or(page.getByRole('status', { name: label, exact: true }))
  await expect(saveStatus('Salvo')).toBeVisible({ timeout: 15_000 })
}
