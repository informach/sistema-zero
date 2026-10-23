import { randomBytes } from 'node:crypto'
import { expect, type Page, test } from '@playwright/test'

async function loginParent(page: Page) {
  await page.goto('http://127.0.0.1:43108/login/responsavel')
  await page.getByRole('button', { name: 'Entrar com senha', exact: true }).click()
  await page.getByLabel('E-mail', { exact: true }).fill('qa-adult@example.invalid')
  await page.getByLabel('Senha', { exact: true }).fill('Local-QA-adult-2026!')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page).toHaveURL(/\/pais/)
}

test('the same account keeps the Kids parent area and child identity; its parental token cannot select adult data', async ({
  page,
  context,
}) => {
  await loginParent(page)
  await expect(page.getByText('Criador QA', { exact: true }).first()).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Ir para a área da criança', exact: true }).first(),
  ).toBeVisible()
  const token = (await context.cookies()).find((cookie) =>
    cookie.name.endsWith('sz_kids_access'),
  )?.value
  expect(token).toBeTruthy()
  const response = await page.request.get('http://127.0.0.1:43100/members/journey/adult', {
    headers: { authorization: `Bearer ${token}` },
  })
  expect(response.status()).toBe(403)
})

test('a real child profile token cannot inherit the adult course purchased by its account', async ({
  page,
  context,
}) => {
  await loginParent(page)
  const parentToken = (await context.cookies()).find((cookie) =>
    cookie.name.endsWith('sz_kids_access'),
  )?.value
  expect(parentToken).toBeTruthy()
  const profileId = '22222222-aaaa-4222-8222-222222222222'
  const deviceToken = randomBytes(32).toString('base64url')
  const authorized = await page.request.post('http://127.0.0.1:43100/auth/kids/grants', {
    headers: { authorization: `Bearer ${parentToken}` },
    data: {
      profileId,
      deviceToken,
      label: 'Isolated QA browser',
      durationDays: 0,
      mode: 'current',
    },
  })
  expect(authorized.status()).toBe(200)
  const entered = await page.request.post('http://127.0.0.1:43100/auth/kids/enter', {
    data: { profileId, deviceToken },
  })
  expect(entered.status()).toBe(200)
  const body = (await entered.json()) as { tokens: { accessToken: string } }
  expect(body.tokens.accessToken).toBeTruthy()
  const course = await page.request.get('http://127.0.0.1:43100/members/courses/qa-jogos', {
    headers: { authorization: `Bearer ${body.tokens.accessToken}` },
  })
  expect(course.status()).toBe(403)
})
