/**
 * A arte da capa do Passo a passo de "Meu primeiro desenho no Pinta" (23/11/2026).
 *
 * O curso não tem ilustração própria nem cena 3D: a arte parte da ilustração da Chave do Farol
 * (`caderno-visual/arte/capa-desafio-farol.jpg`), o jogo que a criança redesenha, e põe em
 * destaque a chave desenhada no Pinta, como a aula ensina e como a chave de exemplo do jogo pronto
 * (`qa/meu-desenho-projeto.ts`): dois dentes e a haste com o Retângulo, a argola com o Círculo por
 * cima, preenchimento rosa, o contorno escuro que o Pinta já traz e um brilho de Pincel. O traço
 * treme um pouco, como desenho à mão, e a chave brilha no alto da arte, perto do personagem, longe
 * da faixa da capa (que cobre de 590 a 660 px da folha, a altura 929 a 1039 desta arte).
 *
 * Rodar (do repositório): `node docs/design/meu-primeiro-desenho-capa/capa.mjs`. O Chrome
 * renderiza a composição e o JPEG sai em
 * `docs/aulas-interativas-tecnico/recursos/caderno-visual/arte/capa-meu-primeiro-desenho.jpg`.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../../', import.meta.url))
const arte = resolve(root, 'docs/aulas-interativas-tecnico/recursos/caderno-visual/arte')
const saida = resolve(arte, 'capa-meu-primeiro-desenho.jpg')
const base = readFileSync(resolve(arte, 'capa-desafio-farol.jpg')).toString('base64')
const { chromium } = createRequire(resolve(root, 'packages/studio/package.json'))(
  '@playwright/test',
)

// A arte base tem 1448 × 1086. A chave usa as formas da chave de exemplo (quadro de 64), maiores.
const LARGURA = 1448
const ALTURA = 1086
const ROSA = '#ec4f97'
const TINTA = '#1f2433'

/** Uma estrela de quatro pontas, o brilho em volta da chave. */
const estrela = (x, y, r, cor, giro = 0) =>
  `<path transform="translate(${x} ${y}) rotate(${giro}) scale(${r / 10})" d="M0 -10 C1.2 -3 3 -1.2 10 0 C3 1.2 1.2 3 0 10 C-1.2 3 -3 1.2 -10 0 C-3 -1.2 -1.2 -3 0 -10Z" fill="${cor}"/>`

// As formas no quadro de 64 da chave de exemplo: dentes e haste primeiro, a argola por cima.
const formas = `
  <rect x="44" y="35" width="6" height="11" rx=".6"/>
  <rect x="53" y="35" width="6" height="14" rx=".6"/>
  <rect x="26" y="28" width="35" height="8" rx=".6"/>
  <circle cx="17" cy="32" r="13"/>`

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${LARGURA}" height="${ALTURA}" viewBox="0 0 ${LARGURA} ${ALTURA}">
  <defs>
    <filter id="mao" x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency="0.22" numOctaves="2" seed="7" result="ruido"/>
      <feDisplacementMap in="SourceGraphic" in2="ruido" scale="0.6" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
    <filter id="halo" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="2.2"/>
    </filter>
    <filter id="sombra" x="-50%" y="-200%" width="200%" height="500%">
      <feGaussianBlur stdDeviation="9"/>
    </filter>
    <radialGradient id="luz" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#fffbe8" stop-opacity=".95"/>
      <stop offset=".55" stop-color="#fff3c4" stop-opacity=".55"/>
      <stop offset="1" stop-color="#fff3c4" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <image href="data:image/jpeg;base64,${base}" width="${LARGURA}" height="${ALTURA}"/>
  <!-- A luz em volta da chave. -->
  <ellipse cx="610" cy="300" rx="330" ry="215" fill="url(#luz)" opacity=".8"/>
  <!-- A sombra no chão, para a chave flutuar sobre a areia. -->
  <ellipse cx="628" cy="452" rx="165" ry="18" fill="#5a4320" opacity=".26" filter="url(#sombra)"/>
  <g transform="translate(610 300) rotate(-10) scale(8.6) translate(-32.5 -34)">
    <!-- O halo branco da chave. -->
    <g fill="#ffffff" stroke="#ffffff" stroke-width="6" opacity=".9" filter="url(#halo)" stroke-linejoin="round">${formas}</g>
    <!-- A chave desenhada: rosa, com o contorno escuro do Pinta, traço de mão. -->
    <g fill="${ROSA}" stroke="${TINTA}" stroke-width="2.1" stroke-linejoin="round" filter="url(#mao)">${formas}</g>
    <!-- O brilho de Pincel na argola. -->
    <path d="M10.5 30.5 C10.8 27.5 12.6 25.4 15.6 24.6" fill="none" stroke="#ffffff" stroke-width="2.6" stroke-linecap="round" filter="url(#mao)"/>
    <circle cx="9.9" cy="34" r="1.3" fill="#ffffff" filter="url(#mao)"/>
  </g>
  <!-- As estrelinhas de brilho. -->
  ${estrela(372, 196, 26, '#ffffff', 8)}
  ${estrela(420, 140, 13, '#ffe27a')}
  ${estrela(880, 214, 28, '#ffffff', -6)}
  ${estrela(836, 142, 14, '#ffe27a', 10)}
  ${estrela(906, 380, 15, '#ffe27a')}
  ${estrela(450, 428, 14, '#ffffff', 12)}
  ${estrela(740, 104, 10, '#ffffff')}
</svg>`

const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.SZ_CHECK_CHROMIUM ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe',
})
try {
  const page = await browser.newPage({
    viewport: { width: LARGURA, height: ALTURA },
    deviceScaleFactor: 1,
  })
  await page.setContent(`<!doctype html><html><body style="margin:0">${svg}</body></html>`)
  await page.evaluate(async () => {
    await Promise.all([...document.images].map((i) => i.decode().catch(() => {})))
  })
  const jpeg = await page.screenshot({
    type: 'jpeg',
    quality: 92,
    clip: { x: 0, y: 0, width: LARGURA, height: ALTURA },
  })
  writeFileSync(saida, jpeg)
  console.log(`${saida} (${LARGURA} × ${ALTURA})`)
} finally {
  await browser.close()
}
