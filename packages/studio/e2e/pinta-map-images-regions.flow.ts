import { expect, test } from '@playwright/test'

test('imagens reais preservam o renderer publicado e as regiões assinadas', async ({
  page,
}, info) => {
  test.setTimeout(120000)
  const cdp = await page.context().newCDPSession(page),
    rate = Number(info.project.metadata.cpuSlowdown ?? 1)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate })
  await page.goto('/')
  const proof = await page.evaluate(async () => {
    const lab = window as unknown as {
      referenceMapImageProbe: (mode: string) => Promise<unknown>
      runMapImageProbe: (
        mode: string,
      ) => Promise<{ cases: Array<{ expected: unknown; actual: unknown }>; preview: string }>
      runWorldMapImageProbe: () => Promise<{
        pixel: { width: number; height: number }
        vector: { width: number; height: number }
        decoderRoots: string[]
      }>
    }
    const before = await lab.referenceMapImageProbe('legacy'),
      after = await lab.runMapImageProbe('legacy'),
      regions = await lab.runMapImageProbe('regions'),
      world = await lab.runWorldMapImageProbe()
    const image = document.createElement('img')
    image.src = regions.preview
    image.alt = 'Máscara, gradiente e peças por regiões'
    document.body.append(image)
    return { before, after, regions: regions.cases, world }
  })
  await info.attach('comparacao-imagens', {
    body: JSON.stringify({ cpuSlowdown: rate, ...proof }),
    contentType: 'application/json',
  })
  expect(proof.after).toEqual(proof.before)
  expect(proof.regions).toHaveLength(36)
  for (const item of proof.regions) expect(item.actual, JSON.stringify(item)).toEqual(item.expected)
  for (const image of [proof.world.pixel, proof.world.vector]) {
    expect(image.width).toBe(512)
    expect(image.height).toBe(512)
  }
  expect(proof.world.decoderRoots).toHaveLength(1)
  expect(proof.world.decoderRoots[0]).toContain(
    'width="512" height="512" viewBox="0 0 160000 160000"',
  )
  await info.attach('imagens-regioes', { body: await page.screenshot(), contentType: 'image/png' })
  await cdp.detach()
})
