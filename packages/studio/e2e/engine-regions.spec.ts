import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { expect, type Page, test } from '@playwright/test'
import { gpuEmulada } from '../src/medida/mundoGrande'
import { proveniencia, servirPasta } from './helpers/servirPasta'

/**
 * A prova das regiões no motor (lote 7 da conclusão do plano do Estúdio, 22/11/2026), com o jogo
 * E: a rota Vila → Floresta → Caverna → Floresta → Vila, dez vezes, no jogo com regiões e no mesmo
 * jogo sem regiões. Confere:
 *
 * - cada entrada numa região dispara o "Quando entrar na região" UMA vez (contado por um ouvinte
 *   a mais, pela mesma API pública do jogo);
 * - os objetos de GPU vivos são os mesmos nas últimas quatro voltas (a carga e o descarte não
 *   vazam);
 * - a carga por regiões carrega e descarrega (a Caverna sai quando o herói volta à Vila).
 *
 * E registra, sem reprovar (a GPU do CI é emulada): quadros por segundo, tempo de quadro nas
 * passagens (p50, p95 e máximo), desenhos por região e memória, nas duas versões. A evidência vai
 * para `docs/estudio-evolucao/evidencias/jogo-e-regioes-2026-11-22/medidas.json`.
 *
 * O jogo E sai de dois geradores: `packages/molda-cenarios/playground/jogo-e/preparar-cenario.mjs`
 * (o cenário, compilado no navegador pela oficina) e
 * `packages/studio/playground/cenarios-integration/preparar-jogo-e.ts` (o Estúdio). Sem eles, a
 * prova é pulada com o recado.
 */

const RAIZ = resolve(import.meta.dirname, '../../..')
const JOGO_E = resolve(RAIZ, 'output/cenarios-reforma/jogo-e')
// As medidas de cada rodada ficam fora do Git (o CI as guarda como artefato); a cópia das
// evidências em `docs/` é atualizada de propósito, não a cada execução (revisão do lote 7).
const OUTPUT = resolve(JOGO_E, 'medidas.json')
const ROTA = [
  ['Vila', -128, -96],
  ['Floresta', 0, -96],
  ['Caverna', 128, -96],
  ['Floresta', 0, -96],
  ['Vila', -128, -96],
] as const
const VOLTAS = 10
const LIVE = ['buffers', 'textures', 'programs', 'vertexArrays'] as const

let servidor: Awaited<ReturnType<typeof servirPasta>>
let base = ''

test.beforeAll(async () => {
  servidor = await servirPasta(JOGO_E)
  base = servidor.base
})
test.afterAll(async () => {
  await servidor.fechar()
})

test.beforeEach(async ({ page }) => {
  // Os objetos de GPU vivos por contexto (o mesmo contador de `engine-gpu-cycles.spec.ts`).
  await page.addInitScript(() => {
    const kinds: Array<[string, string, string]> = [
      ['createBuffer', 'deleteBuffer', 'buffers'],
      ['createTexture', 'deleteTexture', 'textures'],
      ['createProgram', 'deleteProgram', 'programs'],
      ['createVertexArray', 'deleteVertexArray', 'vertexArrays'],
    ]
    const live = new Map<object, Record<string, Set<unknown>>>()
    const liveOf = (context: object) => {
      let l = live.get(context)
      if (!l) {
        l = {}
        for (const [, , name] of kinds) l[name] = new Set()
        live.set(context, l)
      }
      return l
    }
    for (const prototype of [
      (window as unknown as { WebGL2RenderingContext?: { prototype: object } })
        .WebGL2RenderingContext?.prototype,
      (window as unknown as { WebGLRenderingContext?: { prototype: object } }).WebGLRenderingContext
        ?.prototype,
    ]) {
      if (!prototype) continue
      const target = prototype as Record<string, unknown>
      for (const [create, remove, name] of kinds) {
        const original = target[create] as ((...a: unknown[]) => unknown) | undefined
        const originalRemove = target[remove] as ((i: unknown) => unknown) | undefined
        if (typeof original !== 'function' || typeof originalRemove !== 'function') continue
        target[create] = function (this: object, ...args: unknown[]) {
          const made = original.apply(this, args)
          if (made) liveOf(this)[name]?.add(made)
          return made
        }
        target[remove] = function (this: object, item: unknown) {
          liveOf(this)[name]?.delete(item)
          return originalRemove.call(this, item)
        }
      }
    }
    Object.defineProperty(window, '__szGpuVivos', {
      value: () => {
        const total: Record<string, number> = {}
        for (const [context, l] of live) {
          if ((context as { isContextLost(): boolean }).isContextLost()) continue
          for (const [name, items] of Object.entries(l))
            total[name] = (total[name] ?? 0) + items.size
        }
        return total
      },
    })
  })
})

interface Volta {
  gpu: Record<string, number>
  entradas: Record<string, number>
  carregadas: string[]
  falhas: string[]
}

async function passar(page: Page, x: number, z: number) {
  return page.evaluate(
    async ([x, z]) => {
      const w = window as unknown as {
        SZGame3D: { setPosition(o: unknown, x: number, y: number, z: number): void }
        __qaJogoE: { heroi: unknown }
      }
      w.SZGame3D.setPosition(w.__qaJogoE.heroi, x, 6, z)
      // Os intervalos de quadro durante a passagem (a carga da região acontece aqui).
      const intervalos: number[] = []
      let antes = performance.now()
      await new Promise<void>((pronto) => {
        const fim = antes + 3000
        const quadro = (agora: number) => {
          intervalos.push(agora - antes)
          antes = agora
          if (agora < fim) requestAnimationFrame(quadro)
          else pronto()
        }
        requestAnimationFrame(quadro)
      })
      return intervalos
    },
    [x, z] as const,
  )
}

/**
 * Espera a Caverna sair da carga (2 s de cena longe dela, depois da volta à Vila). O relógio da
 * cena anda por quadro: na GPU emulada isso leva mais que 2 s reais. Sem regiões, não há o que
 * esperar.
 */
async function esperarCavernaFora(page: Page) {
  await page.waitForFunction(
    () => {
      const h = (
        window as unknown as {
          __qaJogoE: {
            cena: {
              _sceneHandle?: {
                estadoDasRegioes(): { carregadas: Iterable<string> } | null
                dados: { regioes?: Array<{ id: string; nome: string }> }
              }
            }
          }
        }
      ).__qaJogoE.cena._sceneHandle
      const caverna = h?.dados.regioes?.find((r) => r.nome === 'Caverna')?.id
      if (!caverna) return true
      return ![...(h?.estadoDasRegioes()?.carregadas ?? [])].includes(caverna)
    },
    undefined,
    { timeout: 120_000, polling: 500 },
  )
}

type Regioes = {
  carregadas: readonly string[]
  falhas: readonly string[]
} | null

/**
 * Espera uma região entrar na carga, pelo nome (revisão do lote 7: o bloco decide pela caixa, sem
 * olhar a carga, então contar as entradas não prova que a região carregou). Uma região que falha
 * reprova na hora, com o recado do motor.
 */
async function esperarCarregada(page: Page, nome: string) {
  await page.waitForFunction(
    (nome) => {
      const h = (
        window as unknown as {
          __qaJogoE: {
            cena: {
              _sceneHandle?: {
                estadoDasRegioes(): {
                  carregadas: readonly string[]
                  falhas: readonly string[]
                  aviso: string | null
                } | null
                dados: { regioes?: Array<{ id: string; nome: string }> }
              }
            }
          }
        }
      ).__qaJogoE.cena._sceneHandle
      const id = h?.dados.regioes?.find((r) => r.nome === nome)?.id
      if (!id) return true
      const estado = h?.estadoDasRegioes()
      if (estado?.falhas.length)
        throw Error(`A região falhou: ${estado.falhas.join(', ')} (${estado.aviso ?? ''})`)
      return estado?.carregadas.includes(id) ?? false
    },
    nome,
    { timeout: 120_000, polling: 250 },
  )
}

function quantil(valores: number[], p: number) {
  const ordenados = [...valores].sort((a, b) => a - b)
  return (
    ordenados[Math.min(ordenados.length - 1, Math.ceil(p * ordenados.length) - 1)] ?? Number.NaN
  )
}

/**
 * A placa de vídeo e o commit são os DE VERDADE (plano "Mundos de 2 km", lote 0, 23/11/2026): a
 * frase fixa "emulada" mentia quando a prova rodava numa placa de verdade.
 */
function salvar(chave: string, gpu: string, linha: unknown) {
  const anteriores = existsSync(OUTPUT)
    ? (JSON.parse(readFileSync(OUTPUT, 'utf8')) as { linhas: Record<string, unknown> }).linhas
    : {}
  mkdirSync(dirname(OUTPUT), { recursive: true })
  writeFileSync(
    OUTPUT,
    `${JSON.stringify(
      {
        medidoEm: new Date().toISOString(),
        ...proveniencia(),
        gpu,
        gpuEmulada: gpuEmulada(gpu),
        nota: gpuEmulada(gpu) ? 'placa de vídeo emulada: os tempos não reprovam' : null,
        linhas: { ...anteriores, [chave]: linha },
      },
      null,
      2,
    )}\n`,
  )
}

for (const versao of ['regioes', 'inteiro'] as const)
  test(`jogo E ${versao === 'regioes' ? 'com' : 'sem'} regiões: dez voltas pela rota`, async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== 'chromium', 'A contagem de GPU é do Chromium.')
    test.skip(
      !existsSync(resolve(JOGO_E, `${versao}.html`)),
      'Gere o jogo E antes: preparar-cenario.mjs (molda-cenarios) e preparar-jogo-e.ts (studio).',
    )
    test.setTimeout(600_000)
    const erros: string[] = []
    page.on('pageerror', (e) => erros.push(e.message))
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto(`${base}/${versao}.html`)
    await page.waitForFunction(
      () => (window as unknown as { __qaJogoE?: unknown }).__qaJogoE,
      undefined,
      {
        timeout: 180_000,
      },
    )
    // Um ouvinte a mais por região, pela API pública: conta cada entrada.
    await page.evaluate(() => {
      const w = window as unknown as {
        SZGame3D: { onEnterRegion(o: unknown, n: string, f: () => void): void }
        __qaJogoE: { heroi: unknown }
        __qaEntradas: Record<string, number>
      }
      w.__qaEntradas = {}
      for (const nome of ['Vila', 'Floresta', 'Caverna', 'Lago', 'Praia', 'Montanha'])
        w.SZGame3D.onEnterRegion(w.__qaJogoE.heroi, nome, () => {
          w.__qaEntradas[nome] = (w.__qaEntradas[nome] ?? 0) + 1
        })
    })
    const voltas: Volta[] = []
    const passagens: number[] = []
    const desenhos: Record<string, number[]> = {}
    for (let v = 0; v < VOLTAS; v++) {
      for (const [nome, x, z] of ROTA) {
        passagens.push(...(await passar(page, x, z)))
        // Com regiões, a região onde o herói chegou precisa estar carregada (e a Caverna, que não
        // é vizinha da Vila, só carrega aqui).
        if (versao === 'regioes') await esperarCarregada(page, nome)
        const calls = await page.evaluate(() => {
          const cena = (
            window as unknown as {
              __qaJogoE: { cena: { renderer?: { info: { render: { calls: number } } } } }
            }
          ).__qaJogoE.cena
          return cena.renderer?.info.render.calls ?? null
        })
        if (calls !== null) desenhos[nome] = [...(desenhos[nome] ?? []), calls]
      }
      // A amostra da volta é tirada no estado estável: a Caverna já saiu da carga.
      await esperarCavernaFora(page)
      voltas.push(
        await page.evaluate(() => {
          const w = window as unknown as {
            __szGpuVivos(): Record<string, number>
            __qaEntradas: Record<string, number>
            __qaJogoE: {
              cena: {
                _sceneHandle?: {
                  estadoDasRegioes(): { carregadas: Iterable<string> } | null
                  dados: { regioes?: Array<{ id: string; nome: string }> }
                }
              }
            }
          }
          const handle = w.__qaJogoE.cena._sceneHandle
          const nomeDe = (id: string) => handle?.dados.regioes?.find((r) => r.id === id)?.nome ?? id
          const estado = handle?.estadoDasRegioes() as unknown as Regioes
          return {
            gpu: w.__szGpuVivos(),
            entradas: { ...w.__qaEntradas },
            carregadas: [...(estado?.carregadas ?? [])].map(nomeDe),
            falhas: [...(estado?.falhas ?? [])].map(nomeDe),
          }
        }),
      )
    }
    const memoria = await page.evaluate(
      () =>
        (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory
          ?.usedJSHeapSize ?? null,
    )
    const fps = 1000 / quantil(passagens, 0.5)
    const gpu = await page.evaluate(() => {
      const gl = document.createElement('canvas').getContext('webgl2')
      if (!gl) return 'sem WebGL2'
      const info = gl.getExtension('WEBGL_debug_renderer_info')
      return String(
        info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
      )
    })
    salvar(versao, gpu, {
      voltas: VOLTAS,
      quadro: {
        p50: quantil(passagens, 0.5),
        p95: quantil(passagens, 0.95),
        maximo: Math.max(...passagens),
        fpsMediano: Math.round(fps * 10) / 10,
      },
      desenhosPorRegiao: Object.fromEntries(
        Object.entries(desenhos).map(([nome, lista]) => [nome, quantil(lista, 0.5)]),
      ),
      memoriaJs: memoria,
      gpuNaUltimaVolta: voltas.at(-1)?.gpu,
      entradas: voltas.at(-1)?.entradas,
      erros,
    })
    expect(erros).toEqual([])
    // Os objetos de GPU vivos não crescem nas últimas quatro voltas.
    for (const nome of LIVE) {
      const ultimas = voltas.slice(-4).map((volta) => volta.gpu[nome] ?? 0)
      expect(new Set(ultimas).size, `${nome}: ${ultimas.join(', ')}`).toBe(1)
    }
    if (versao === 'regioes') {
      // Cada entrada conta UMA vez: a Vila começa dentro (1) e volta uma vez por volta; a
      // Floresta, duas por volta; a Caverna, uma.
      const entradas = voltas.at(-1)!.entradas
      expect(entradas.Floresta).toBe(VOLTAS * 2)
      expect(entradas.Caverna).toBe(VOLTAS)
      expect(entradas.Vila).toBe(VOLTAS + 1)
      // De volta à Vila, a Caverna (não vizinha) saiu da carga (a volta só é amostrada depois), e
      // nenhuma região ficou esperando nova tentativa.
      expect(voltas.at(-1)!.carregadas).toContain('Vila')
      expect(voltas.at(-1)!.carregadas).not.toContain('Caverna')
      expect(voltas.flatMap((volta) => volta.falhas)).toEqual([])
      // A capa do jogo E na galeria "Ver os jogos prontos" (lote 9 da conclusão;
      // `scripts/gen-jogo-e-galeria.ts`): a Floresta pela câmera "em volta" do próprio Jogo 3D,
      // DEPOIS das medidas (mover o herói e trocar a câmera não mexem em nenhuma delas).
      await page.evaluate(() => {
        const w = window as unknown as {
          SZGame3D: {
            setPosition(o: unknown, x: number, y: number, z: number): void
            cameraMode(cena: unknown, modo: string, alvo: unknown): void
          }
          __qaJogoE: { cena: unknown; heroi: unknown }
        }
        w.SZGame3D.setPosition(w.__qaJogoE.heroi, 0, 6, -96)
        w.SZGame3D.cameraMode(w.__qaJogoE.cena, 'em-volta', w.__qaJogoE.heroi)
      })
      await esperarCarregada(page, 'Floresta')
      await page.waitForTimeout(3500)
      await page.screenshot({ path: resolve(JOGO_E, 'olhar-inicio.png') })
    }
  })
