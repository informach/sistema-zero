/**
 * Sobre `qa/room-serve.ts`: segura a resposta do primeiro PUT depois da gravação, faz outro
 * gesto e sai da tela. O segundo PUT precisa usar a revisão nova e sobreviver à desmontagem.
 * Compilar para Node como `room-build-smoke.ts`; `ROOM_QA_URL` escolhe a prévia local.
 */
import assert from 'node:assert/strict'
import { chromium } from '@playwright/test'

const base = process.env.ROOM_QA_URL ?? 'http://127.0.0.1:5284'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
let soltar = () => {}
const retida = new Promise<void>((resolve) => {
  soltar = resolve
})
let primeiraGravada = () => {}
const gravada = new Promise<void>((resolve) => {
  primeiraGravada = resolve
})
const envios: { revision: number; status: number }[] = []

try {
  await page.goto(`${base}/?avatar=0`)
  await page.getByRole('button', { name: 'Clima', exact: true }).click()
  const antes = await (await page.request.get(`${base}/api/members/house`)).json()
  await page.route('**/api/members/house', async (route) => {
    if (route.request().method() !== 'PUT') return route.continue()
    const body = route.request().postDataJSON()
    const response = await route.fetch()
    envios.push({ revision: body.revision, status: response.status() })
    if (envios.length === 1) {
      primeiraGravada()
      await retida
    }
    await route.fulfill({ response })
  })
  await page.getByRole('button', { name: 'Noite', exact: true }).click()
  await Promise.race([
    gravada,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Primeiro PUT ausente')), 15000),
    ),
  ])
  await page.getByRole('button', { name: 'Tarde', exact: true }).click()
  await page.getByRole('button', { name: 'Sair da prévia do quarto', exact: true }).click()
  soltar()
  const prazo = Date.now() + 15000
  let atual = antes
  while (Date.now() < prazo) {
    atual = await (await page.request.get(`${base}/api/members/house`)).json()
    if (atual.revision === antes.revision + 2) break
    await page.waitForTimeout(100)
  }
  assert.equal(atual.revision, antes.revision + 2, 'O gesto pendente não foi gravado')
  assert.equal(
    atual.house.rooms.find((r: { id: string }) => r.id === atual.house.roomId).lighting,
    'tarde',
  )
  assert.deepEqual(envios, [
    { revision: antes.revision, status: 200 },
    { revision: antes.revision + 1, status: 200 },
  ])
  await page.getByRole('button', { name: 'Voltar à prévia do quarto', exact: true }).click()
  await page.getByRole('button', { name: 'Clima', exact: true }).click()
  await page.getByRole('button', { name: 'Tarde', exact: true }).waitFor()
  assert.equal(
    await page.getByRole('button', { name: 'Tarde', exact: true }).getAttribute('aria-pressed'),
    'true',
  )
  if (process.env.ROOM_QA_SHOT) await page.screenshot({ path: process.env.ROOM_QA_SHOT })
  console.log(
    'OK: sair durante o salvamento mantém o gesto novo, com CAS e revisão correta; reabrir confirma a persistência',
  )
} finally {
  soltar()
  await browser.close()
}
