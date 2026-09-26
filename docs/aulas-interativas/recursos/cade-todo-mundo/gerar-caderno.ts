/** Gera o PDF do Caderno do Aluno a partir do HTML no visual do caderno de referência. */
import { spawnSync } from 'node:child_process'
import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  JARDIM_ASSETS,
  JARDIM_BASE_ESCONDERIJOS,
  JARDIM_BASE_PERSONAGENS,
  JARDIM_PARES,
  type JardimSpriteName,
  jardimSpriteRect,
} from '../../../../packages/studio/src/arte/jardim-assets'
import { FONTE as baloo } from '../../../../packages/studio/src/official-extensions/gameUiFonts/baloo2'
import { FONTE as nunito } from '../../../../packages/studio/src/official-extensions/gameUiFonts/nunito'

const scriptDir = import.meta.dir
const root = resolve(scriptDir, '../../../..')
const output = resolve(root, 'output/pdf/cade-todo-mundo-caderno-do-aluno.pdf')
const templatePath = resolve(scriptDir, 'caderno-do-aluno.template.html')
const zappyPath = resolve(root, 'packages/community-kids/public/zappy/happy.webp')

const fontFaces = [
  `@font-face { font-family: Nunito; src: url(data:font/woff2;base64,${nunito.base64}) format('woff2'); font-style: normal; font-weight: 400 800; }`,
  `@font-face { font-family: 'Baloo 2'; src: url(data:font/woff2;base64,${baloo.base64}) format('woff2'); font-style: normal; font-weight: 400 800; }`,
].join('\n')

const item = (name: JardimSpriteName, centroX: number, baseY: number) => {
  const asset = JARDIM_ASSETS[name]
  const { x, y } = jardimSpriteRect(name, centroX, baseY)
  return `<svg x="${x}" y="${y}" width="${asset.width}" height="${asset.height}" viewBox="${asset.viewBox}">${asset.body}</svg>`
}

function scene(revealed: boolean) {
  const characters = JARDIM_PARES.map(({ personagem, centroX }) =>
    item(personagem, centroX, JARDIM_BASE_PERSONAGENS),
  ).join('')
  const hiding = revealed
    ? ''
    : JARDIM_PARES.map(({ esconderijo, centroX }) =>
        item(esconderijo, centroX, JARDIM_BASE_ESCONDERIJOS),
      ).join('')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">${JARDIM_ASSETS.jardim.body}${characters}${hiding}</svg>`
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
}

const html = readFileSync(templatePath, 'utf8')
  .replace('/* {{FONT_FACES}} */', fontFaces)
  .replaceAll('{{SCENE_HIDDEN}}', scene(false))
  .replaceAll('{{SCENE_REVEALED}}', scene(true))
  .replace('{{ZAPPY}}', `data:image/webp;base64,${readFileSync(zappyPath).toString('base64')}`)

const browser = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
].find(existsSync)

if (!browser) throw new Error('Chrome ou Edge não encontrado para gerar o Caderno do Aluno.')

const temporary = mkdtempSync(join(tmpdir(), 'sistema-zero-caderno-'))
const htmlPath = join(temporary, 'caderno.html')
const temporaryPdf = join(temporary, 'caderno.pdf')
const browserProfile = join(temporary, 'chrome-profile')

try {
  if (html.includes('{{')) throw new Error('O template do caderno tem campos sem preencher.')
  writeFileSync(htmlPath, html)
  const result = spawnSync(
    browser,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      `--user-data-dir=${browserProfile}`,
      '--virtual-time-budget=5000',
      '--print-to-pdf-no-header',
      `--print-to-pdf=${temporaryPdf}`,
      pathToFileURL(htmlPath).href,
    ],
    { encoding: 'utf8', timeout: 60000 },
  )

  if (
    result.error ||
    result.status !== 0 ||
    !existsSync(temporaryPdf) ||
    statSync(temporaryPdf).size < 1000
  ) {
    throw new Error(`Falha ao gerar o PDF: ${result.error?.message ?? result.stderr}`)
  }
  copyFileSync(temporaryPdf, output)
  console.log(output)
} finally {
  // Só remove a pasta temporária exclusiva criada acima, nunca um caminho amplo.
  const resolvedTemporary = realpathSync(temporary)
  const resolvedTempRoot = realpathSync(tmpdir())
  if (
    dirname(resolvedTemporary) === resolvedTempRoot &&
    basename(resolvedTemporary).startsWith('sistema-zero-caderno-') &&
    resolvedTemporary.startsWith(`${resolvedTempRoot}${sep}`)
  ) {
    rmSync(resolvedTemporary, { recursive: true, force: true })
  }
}
