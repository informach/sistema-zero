import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { expect, type Frame, type Page, test } from '@playwright/test'

/**
 * Lote 4 da missão (seção 8, "descarte de GPU" e "memória estável em 10 ciclos", 21/11/2026).
 *
 * Os motores 3D não expõem as contas do renderer, então a prova conta os objetos do próprio WebGL:
 * um script de teste, em todo quadro da página, embrulha criar e apagar de buffers, texturas,
 * programas, shaders, framebuffers, renderbuffers e vertex arrays. Os VIVOS são guardados por
 * contexto (apagar duas vezes, ou apagar o que não é dele, não desconta nada) e os CRIADOS são
 * somados. Um contexto perdido (`forceContextLoss` no descarte) sai da soma dos vivos.
 *
 * Cada jogo é reiniciado 10 vezes DENTRO do mesmo documento, pelo caminho do próprio motor (o
 * Parar e Rodar troca o documento e já é medido em `preview-resource-release.spec.ts`). Critério:
 * - os quatro últimos recomeços têm as MESMAS contas vivas (um vazamento por recomeço cresce a
 *   cada um);
 * - as contas sobem em no máximo uma passagem entre recomeços: a sonda de quadros por segundo
 *   pode baixar a qualidade uma vez (medido no Mundo 3D: o pós-processamento sai, entram as
 *   variantes leves dos materiais);
 * - no Jogo 3D e no 3D Avançado o recomeço RECRIA a cena, então os criados sobem a cada ciclo
 *   (senão contas iguais provariam só que nada aconteceu);
 * - o Mundo 3D recomeça "leve", no lugar, sem recriar objetos do WebGL: ele prova só isso, em
 *   "alta" e em "leve" (o bloco Qualidade fixa o nível antes dos ciclos);
 * - a API de recomeço tem de existir e o último ciclo tem de ter contexto e objetos vivos.
 * (Revisão do lote 4: a primeira versão aceitava um recomeço que não fazia nada.)
 */

const GAMES = [
  { engine: 'Jogo 3D', name: 'Cubo girando', restart: 'game3d', quality: null },
  // Com um modelo .glb do Molda: o cache de modelos e as cópias passam pelo recomeço.
  { engine: 'Jogo 3D', name: 'Meu herói do Molda', restart: 'game3d', quality: null },
  { engine: 'Mundo 3D', name: 'Meu Mundo', restart: 'world3d', quality: 'alta' },
  { engine: 'Mundo 3D', name: 'Meu Mundo', restart: 'world3d', quality: 'leve' },
  {
    engine: 'Jogo 3D Avançado',
    name: 'Defesa da Torre Profissional',
    restart: 'kit3d',
    quality: null,
  },
] as const

type Counts = Record<string, number>

// Uma sabotagem grava em outro arquivo (`STUDIO_GPU_CYCLES_OUTPUT`): foi uma rodada de sabotagem
// que sobrescreveu a evidência boa na primeira versão.
const OUTPUT = resolve(
  process.env.STUDIO_GPU_CYCLES_OUTPUT ?? '.cache/mission/engine-gpu-cycles.json',
)

/** De onde veio a medida: o SHA e se havia mudança sem commit no código ou nos testes. */
function provenance(): { sha: string | null; dirty: boolean | null } {
  try {
    const sha = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim()
    const dirty =
      execSync('git status --porcelain -- src e2e', { encoding: 'utf8' }).trim().length > 0
    return { sha, dirty }
  } catch {
    return { sha: null, dirty: null }
  }
}

// Um teste que reprova reinicia o processo do Playwright: o relatório é lido do disco e cada
// jogo substitui a própria linha, para nenhum resultado se perder.
function saveRow(row: {
  key: string
  engine: string
  game: string
  quality: string | null
  opened: Counts
  cycles: Counts[]
  errors: string[]
}) {
  const previous = existsSync(OUTPUT)
    ? (JSON.parse(readFileSync(OUTPUT, 'utf8')) as { rows: Array<{ key: string }> }).rows
    : []
  const rows = [...previous.filter((item) => item.key !== row.key), row]
  const report = { measuredAt: new Date().toISOString(), ...provenance(), rows }
  mkdirSync(dirname(OUTPUT), { recursive: true })
  writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`)
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const kinds: Array<[string, string, string]> = [
      ['createBuffer', 'deleteBuffer', 'buffers'],
      ['createTexture', 'deleteTexture', 'textures'],
      ['createProgram', 'deleteProgram', 'programs'],
      ['createShader', 'deleteShader', 'shaders'],
      ['createFramebuffer', 'deleteFramebuffer', 'framebuffers'],
      ['createRenderbuffer', 'deleteRenderbuffer', 'renderbuffers'],
      ['createVertexArray', 'deleteVertexArray', 'vertexArrays'],
    ]
    const perContext = new Map<object, Record<string, Set<unknown>>>()
    const created: Record<string, number> = {}
    for (const [, , name] of kinds) created[name] = 0
    const liveOf = (context: object) => {
      let live = perContext.get(context)
      if (!live) {
        live = {}
        for (const [, , name] of kinds) live[name] = new Set()
        perContext.set(context, live)
      }
      return live
    }
    const prototypes = [
      (window as unknown as { WebGLRenderingContext?: { prototype: object } }).WebGLRenderingContext
        ?.prototype,
      (window as unknown as { WebGL2RenderingContext?: { prototype: object } })
        .WebGL2RenderingContext?.prototype,
    ]
    for (const prototype of prototypes) {
      if (!prototype) continue
      const target = prototype as Record<string, unknown>
      for (const [create, remove, name] of kinds) {
        const original = target[create]
        const originalRemove = target[remove]
        if (typeof original !== 'function' || typeof originalRemove !== 'function') continue
        target[create] = function (this: object, ...args: unknown[]) {
          const made = (original as (...a: unknown[]) => unknown).apply(this, args)
          if (made) {
            liveOf(this)[name]?.add(made)
            created[name] = (created[name] ?? 0) + 1
          }
          return made
        }
        target[remove] = function (this: object, item: unknown) {
          // Só desconta o que este contexto criou e ainda estava vivo.
          liveOf(this)[name]?.delete(item)
          return (originalRemove as (i: unknown) => unknown).call(this, item)
        }
      }
    }
    Object.defineProperty(window, '__szWebGLCounts', {
      value: () => {
        const total: Record<string, number> = { contexts: 0 }
        for (const [, , name] of kinds) total[name] = 0
        for (const [context, live] of perContext) {
          if ((context as { isContextLost(): boolean }).isContextLost()) continue
          total.contexts = (total.contexts ?? 0) + 1
          for (const [name, items] of Object.entries(live))
            total[name] = (total[name] ?? 0) + items.size
        }
        for (const [name, value] of Object.entries(created)) total[`created_${name}`] = value
        return total
      },
    })
  })
})

async function previewFrame(page: Page): Promise<Frame> {
  const handle = await page.locator('iframe[title="Pré-visualização"]').elementHandle()
  const frame = await handle?.contentFrame()
  if (!frame) throw new Error('A prévia não tem documento.')
  return frame
}

async function countsIn(frame: Frame): Promise<Counts> {
  return frame.evaluate(() =>
    (window as unknown as { __szWebGLCounts: () => Record<string, number> }).__szWebGLCounts(),
  )
}

async function restartIn(frame: Frame, how: (typeof GAMES)[number]['restart']) {
  await frame.evaluate((kind) => {
    const w = window as unknown as Record<string, Record<string, (...a: unknown[]) => unknown>>
    // Sem `?.`: uma API ausente reprova, em vez de virar um recomeço que não fez nada.
    const call = (name: string, method: string, ...args: unknown[]) => {
      const fn = w[name]?.[method]
      if (typeof fn !== 'function') throw new Error(`${name}.${method} não existe no jogo`)
      return fn.apply(w[name], args)
    }
    if (kind === 'game3d') call('SZGame3D', 'restart')
    else if (kind === 'world3d') call('SZWorld3D', 'restart')
    else {
      // O "jogar de novo" do 3D Avançado: do menu para jogando é partida nova (o motor refaz o
      // projeto da criança e solta o que a partida anterior criou).
      call('SZGameKit3D', 'setState', 'menu')
      call('SZGameKit3D', 'setState', 'jogando')
    }
  }, how)
}

const LIVE = [
  'contexts',
  'buffers',
  'textures',
  'programs',
  'shaders',
  'framebuffers',
  'renderbuffers',
  'vertexArrays',
]

for (const game of GAMES)
  test(`GPU do ${game.engine} estável em 10 recomeços: ${game.name}${
    game.quality ? ` (${game.quality})` : ''
  }`, async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'A contagem é a mesma em todo motor; mede no Chromium.')
    test.setTimeout(300_000)
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/')
    const card = page
      .locator('button')
      .filter({ has: page.getByText(game.name, { exact: true }) })
      .first()
    await expect(card).toBeVisible()
    await card.click()
    await expect(page).toHaveURL(/\/editor\//, { timeout: 30_000 })
    await expect(
      page.frameLocator('iframe[title="Pré-visualização"]').locator('canvas').first(),
    ).toBeVisible({ timeout: 90_000 })
    // Os modelos chegam depois do primeiro quadro: espera a contagem parar antes de medir.
    await page.waitForTimeout(4000)
    const frame = await previewFrame(page)
    if (game.quality)
      await frame.evaluate((mode) => {
        const world = (window as unknown as { SZWorld3D?: { quality?(mode: string): void } })
          .SZWorld3D
        if (typeof world?.quality !== 'function') throw new Error('SZWorld3D.quality não existe')
        world.quality(mode)
      }, game.quality)
    const opened = await countsIn(frame)
    const cycles: Counts[] = []
    for (let cycle = 0; cycle < 10; cycle++) {
      await restartIn(frame, game.restart)
      await page.waitForTimeout(1500)
      cycles.push(await countsIn(frame))
    }
    const first = cycles[0] as Counts
    const last = cycles.at(-1) as Counts
    const key = `${game.engine}|${game.name}|${game.quality ?? ''}`
    saveRow({
      key,
      engine: game.engine,
      game: game.name,
      quality: game.quality,
      opened,
      cycles,
      errors,
    })
    console.log(JSON.stringify({ key, opened, first, last }))

    // Anti-vácuo: o jogo usa WebGL de verdade, e a contagem enxerga.
    expect(opened.contexts).toBeGreaterThan(0)
    expect((opened.buffers ?? 0) + (opened.textures ?? 0)).toBeGreaterThan(0)
    const pick = (counts: Counts) => LIVE.map((kind) => counts[kind] ?? 0)
    // Os quatro últimos recomeços iguais: nada cresce a cada recomeço.
    for (const counts of cycles.slice(-4)) expect(pick(counts)).toEqual(pick(last))
    // No máximo uma passagem com alguma conta subindo (a troca de qualidade).
    let rises = 0
    for (let index = 1; index < cycles.length; index++) {
      const before = pick(cycles[index - 1] as Counts)
      if (pick(cycles[index] as Counts).some((value, at) => value > (before[at] ?? 0))) rises++
    }
    expect(rises, 'passagens entre recomeços com alguma conta subindo').toBeLessThanOrEqual(1)
    // O jogo continua desenhando depois dos recomeços.
    expect(last.contexts ?? 0).toBeGreaterThanOrEqual(1)
    expect((last.buffers ?? 0) + (last.textures ?? 0)).toBeGreaterThan(0)
    // No Jogo 3D e no 3D Avançado o recomeço recria a cena: os criados sobem a cada ciclo.
    if (game.restart !== 'world3d')
      for (let index = 1; index < cycles.length; index++)
        expect(
          (cycles[index] as Counts).created_buffers ?? 0,
          `buffers criados até o ${index + 1}º recomeço`,
        ).toBeGreaterThan((cycles[index - 1] as Counts).created_buffers ?? 0)
    expect(errors).toEqual([])
  })
