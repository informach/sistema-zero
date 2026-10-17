import { expect, test } from '@playwright/test'

test('API e PostgreSQL preservam aceite, execução, conclusão e reabertura pelo guia real', async ({
  page,
  request,
}) => {
  test.setTimeout(60_000)
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  const fixture = await request.get('/fixture').then((r) => r.json())
  const headers = { 'x-sz-viewer': fixture.viewerId }
  await page.goto('/native.html')
  await page.getByRole('button', { name: /^Continuar / }).click()
  await expect(page.getByRole('heading', { name: 'Vamos retomar?', exact: true })).toBeVisible({
    timeout: 30_000,
  })
  const interrupted = await request.get('/fixture/state').then((r) => r.json())
  expect(interrupted.revision).toBeNull()
  expect(interrupted.operation.status).toBe('failed')
  await page.getByRole('button', { name: 'Tentar de novo', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Confira este caminho', exact: true }),
  ).toBeVisible({ timeout: 30_000 })
  const before = await request.get('/fixture/state').then((r) => r.json())
  expect(before.revision).toBeNull()
  expect(before.draft.status).toBe('ready')
  expect(before.providerCalls).toBeGreaterThanOrEqual(4)
  const plan = page.getByRole('region', { name: 'Meu caminho', exact: true })
  await expect(plan.locator('li')).toHaveCount(3)
  await page.getByRole('button', { name: 'Este é o meu jogo', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Continuar no Estúdio', exact: true }),
  ).toBeVisible()
  const view = await request
    .get(`/api/pensa/projects/${fixture.projectId}`, { headers })
    .then((r) => r.json())
  const future = view.revision.plan.missions.at(-1)
  const blocked = await request.post(`/api/pensa/missions/${future.id}/start`, {
    headers,
    data: {
      requestId: crypto.randomUUID(),
      baseRevisionId: view.revision.id,
      contentRevision: future.contentRevision,
      expectedProgressRevision: 0,
    },
  })
  expect(blocked.status()).toBe(409)
  await page.getByRole('button', { name: 'Continuar no Estúdio', exact: true }).click()
  await expect(
    page.getByRole('complementary', { name: 'Missão do Pensa', exact: true }),
  ).toBeVisible()
  await page
    .getByRole('button', { name: 'Guardar jogo com a extensão recomendada', exact: true })
    .click()
  await expect(
    page.getByText('Jogo guardado no banco de verificação.', { exact: true }),
  ).toBeVisible()
  for (let i = 0; i < 3; i++) {
    await page
      .getByRole('button', {
        name: i === 0 ? 'Já preparei' : i === 1 ? 'Conferi e está pronto' : 'Experimentei',
        exact: true,
      })
      .click()
    await expect(page.getByText('Pronta', { exact: true })).toBeVisible()
    if (i < 2)
      await page.getByRole('button', { name: 'Continuar meu caminho', exact: true }).click()
  }
  const complete = await request.get('/fixture/state').then((r) => r.json())
  expect(
    complete.progress.filter((p: { status: string }) => p.status === 'completed'),
  ).toHaveLength(3)
  expect(complete.revision.id).toBe(view.revision.id)
  await page.getByRole('button', { name: 'Quero mexer de novo', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Conferi de novo', exact: true })).toBeVisible()
  const reopened = await request.get('/fixture/state').then((r) => r.json())
  expect(
    reopened.progress.find((p: { missionId: string }) => p.missionId === future.id).validity,
  ).toBe('needs_review')
  await page.getByRole('button', { name: 'Conferi de novo', exact: true }).click()
  await expect(page.getByText('Pronta', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Voltar ao plano', exact: true }).first().click()
  await page.reload()
  await page.getByRole('button', { name: /^Continuar / }).click()
  await expect(
    page.getByRole('heading', { name: 'Seu jogo está pronto!', exact: true }),
  ).toBeVisible()
  const final = await request
    .get(`/api/pensa/projects/${fixture.projectId}`, { headers })
    .then((r) => r.json())
  expect(final.nextAction.type).toBe('completed')
  expect(errors).toEqual([])
})
