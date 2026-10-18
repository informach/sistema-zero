import { expect, test } from '@playwright/test'
import type {
  BootChannelScenario,
  BootStoreScenario,
  runBootChannelProof,
  runBootStoreProof,
} from '../../../experiments/studio-python-runtime/bootStoreHost'

declare global {
  interface Window {
    __pythonBootStoreProof: typeof runBootStoreProof
    __pythonBootChannelProof: typeof runBootChannelProof
    __pythonBootChannelWaiting?: boolean
  }
}

for (const scenario of ['complete', 'forged', 'abort', 'timeout'] satisfies BootChannelScenario[]) {
  test(`native immutable boot channel: ${scenario}`, async ({ page }, testInfo) => {
    if (scenario === 'timeout') await page.clock.install()
    await page.goto('/')
    await page.waitForFunction(() => typeof window.__pythonBootChannelProof === 'function')
    const pending = page.evaluate((scenario) => window.__pythonBootChannelProof(scenario), scenario)
    if (scenario === 'timeout') {
      await page.waitForFunction(() => window.__pythonBootChannelWaiting === true)
      await page.clock.fastForward(30001)
    }
    const result = await pending
    await testInfo.attach('boot-channel-result', {
      body: JSON.stringify(result, null, 2),
      contentType: 'application/json',
    })
    expect(result.brokerClosed).toBe(true)
    if (scenario !== 'forged') expect(result.readerClosed).toBe(true)
    expect(result.ownerAborted).toBe(scenario === 'abort')
    expect(result.errors).toHaveLength(scenario === 'forged' || scenario === 'timeout' ? 1 : 0)
  })
}

for (const scenario of ['cache', 'concurrent', 'cancel', 'repair'] satisfies BootStoreScenario[]) {
  test(`native immutable boot cache: ${scenario}`, async ({ page }, testInfo) => {
    await page.goto('/')
    await page.waitForFunction(() => typeof window.__pythonBootStoreProof === 'function')
    const result = await page.evaluate(
      (scenario) => window.__pythonBootStoreProof(scenario),
      scenario,
    )
    await testInfo.attach('boot-store-result', {
      body: JSON.stringify(result, null, 2),
      contentType: 'application/json',
    })
    expect(result).toMatchObject({
      scenario,
      nativeCache: true,
      nativeLocks: true,
      nativeFetchUnchanged: true,
    })
    expect(result.locks.held).toHaveLength(0)
    expect(result.locks.pending).toHaveLength(0)
  })
}
