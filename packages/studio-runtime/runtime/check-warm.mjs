// Aquecimento da verificação dos objetivos (23/11/2026). O Worker roda este script no contêiner da
// criança quando ela abre uma parte com objetivos que rodam o jogo: o Chromium abre e fecha uma
// vez, com as mesmas opções do `check-objectives.mjs`, e o primeiro "Verificar projeto" encontra
// o navegador já lido do disco.

import { chromium } from 'playwright-core'

const browser = await chromium.launch({
  headless: true,
  timeout: 15_000,
  ...(process.env.SZ_CHECK_CHROMIUM ? { executablePath: process.env.SZ_CHECK_CHROMIUM } : {}),
})
try {
  const page = await browser.newPage()
  await page.setContent('<!doctype html><title>aquecendo</title>')
} finally {
  await browser.close()
}
