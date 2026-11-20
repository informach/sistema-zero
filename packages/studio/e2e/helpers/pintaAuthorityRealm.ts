import type { Page } from '@playwright/test'

export type PintaAuthorityProof = typeof import('../../../pinta/src/state/persistence') &
  typeof import('../../../pinta/src/core/project') &
  typeof import('../../../pinta/src/state/clipboardStore')

declare global {
  interface Window {
    pinta026: PintaAuthorityProof
    client026: ReturnType<PintaAuthorityProof['createPintaPersistence']>
    ram026: import('../../../pinta/src/core/project').PintaAsset
    chunkMap?: import('../../../pinta/src/core/project').TilemapAsset
    chunkClient?: ReturnType<PintaAuthorityProof['createPintaPersistence']>
  }
}

/** Both suites consume one browser module contract, including isolated compilation. */
export async function openPintaAuthorityProof(page: Page, version = 'current') {
  await page.goto(`/proof/${version}.html`)
  await page.waitForFunction(() => !!window.pinta026)
}
