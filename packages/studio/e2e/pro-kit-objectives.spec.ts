import { expect, test } from '@playwright/test'
import { STUDIO_PRO_TEMPLATES } from '@sistemazero/core/studio'
import { driveGame, type GameSnapshot as Snapshot } from '../../studio-runtime/runtime/gameplay.mjs'
import { materializeTestTemplate } from '../../studio-runtime/tests/template-files'
import { createTestProArtifact } from './helpers/proArtifact'

for (const metadata of STUDIO_PRO_TEMPLATES.filter((value) => value.kitVersion)) {
  test(`${metadata.id}: reaches the real objective with input and restarts; losing states are recoverable`, async ({
    page,
  }) => {
    test.setTimeout(180_000)
    const { allFiles: files } = await materializeTestTemplate(metadata.id)
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    const artifact = await createTestProArtifact(page, files, metadata.id)
    try {
      const frame = page.frameLocator('#game')
      await expect(frame.locator('#start')).toBeEnabled()
      const gameFrame = page
        .frames()
        .find((candidate) => candidate.url().startsWith('https://runtime.test/'))!
      await gameFrame.waitForFunction(() => {
        const game = (window as unknown as { __studioGame?: { inspect(): Snapshot } }).__studioGame
        return game && !['loading', 'error'].includes(game.inspect().readiness ?? 'ready')
      })
      await frame.locator('#start').click()
      const drive = (lose: boolean) =>
        page
          .frames()
          .find((candidate) => candidate.url().startsWith('https://runtime.test/'))!
          .evaluate(driveGame, { id: metadata.id, lose })
      if (metadata.engine !== 'three' || metadata.id === 'three-tactics') {
        const lost = await drive(true)
        expect(lost.phase, JSON.stringify(lost)).toBe('lost')
        await frame.locator('#restart').click()
      }
      const won = await drive(false)
      expect(won.phase, JSON.stringify(won)).toBe('won')
      await frame.locator('#restart').click()
      const restarted = await frame
        .locator('body')
        .evaluate(() =>
          (window as unknown as { __studioGame: { inspect(): Snapshot } }).__studioGame.inspect(),
        )
      expect(restarted.phase).toBe('playing')
      expect(restarted.score).toBe(0)
      if (metadata.id === 'canvas-survival') {
        expect(restarted.seed).toBe(won.seed)
        expect(restarted.health).toBe(restarted.maxHealth)
      }
      expect(errors).toEqual([])
    } finally {
      await artifact.dispose()
    }
  })
}
