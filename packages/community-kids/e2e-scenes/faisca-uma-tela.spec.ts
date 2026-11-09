import { expect, type Locator, type Page, test } from '@playwright/test'

/**
 * "Experiências numa tela só" (09/11/2026, Canvas aprovado por ela): nas 8 telas do Faísca, a CENA,
 * a FALA DO ZAPPY e os CONTROLES ficam inteiros na janela sem a criança precisar rolar, no modo
 * normal (com a experiência rolada até o console) e no ampliado. Rolar pode, mas só para chegar às
 * descobertas e aos testes. Na tela larga, os dois cartões ficam metade/metade, e a cena fica no
 * topo, logo abaixo da linha das estrelas.
 *
 * A página leva as barras do app de verdade (`?barras`): no celular a barra de cima e a de abas, e
 * em toda largura o rodapé fixo da aula. "À vista" é entre elas, e nada pode estar por cima.
 */
const EXPERIENCIAS = [
  ['ponte', 'experiencia'],
  ['moedas', 'experiencia'],
  ['simbolos', 'experiencia'],
  ['cabana', 'experiencia'],
  ['ilha', 'experiencia-ponto-de-vista'],
  ['ilha', 'experiencia-posicao-3d'],
  ['ilha', 'experiencia-contato-3d'],
  ['ilha', 'experiencia-pergunta-com-nao'],
] as const

const TELAS = [
  { width: 1366, height: 768 },
  { width: 1024, height: 768 },
  { width: 920, height: 768 },
  { width: 390, height: 844 },
  { width: 375, height: 667 },
] as const

type Faixa = { topo: number; fim: number }

/**
 * A parte da janela que a criança vê: abaixo da barra de cima do celular e acima do rodapé fixo da
 * aula (que fica acima das abas). No ampliado, a janela toda (ele cobre as barras).
 */
async function faixaVisivel(page: Page, ampliado: boolean): Promise<Faixa> {
  return page.evaluate((ampliado) => {
    if (ampliado) return { topo: 0, fim: innerHeight }
    const topo = document.querySelector('.ensaio-topo')?.getBoundingClientRect()
    const rodape = document.querySelector('.sz-lesson-nav-immersive')?.getBoundingClientRect()
    return {
      topo: topo && topo.height > 0 ? topo.bottom : 0,
      fim: rodape && rodape.height > 0 ? rodape.top : innerHeight,
    }
  }, ampliado)
}

/** O retângulo inteiro dentro da faixa visível (com 1px de folga para o arredondamento). */
async function inteiroNaJanela(page: Page, faixa: Faixa, alvo: Locator, nome: string) {
  const box = await alvo.boundingBox()
  if (!box) throw new Error(`${nome} não apareceu`)
  const janela = page.viewportSize()
  if (!janela) throw new Error('janela sem tamanho')
  expect(box.y, `${nome} começa embaixo da barra de cima`).toBeGreaterThanOrEqual(faixa.topo - 1)
  expect(box.x, `${nome} começa antes da janela`).toBeGreaterThanOrEqual(-1)
  expect(box.y + box.height, `${nome} passa para trás do rodapé`).toBeLessThanOrEqual(faixa.fim + 1)
  expect(box.x + box.width, `${nome} passa da direita da janela`).toBeLessThanOrEqual(
    janela.width + 1,
  )
}

for (const tela of TELAS) {
  const celular = tela.width < 600
  test.describe(`${tela.width}×${tela.height}`, () => {
    test.use({ viewport: tela, hasTouch: celular, isMobile: celular })
    for (const [curso, bloco] of EXPERIENCIAS) {
      test(`${curso} ${bloco}: cena, fala e controles à vista sem rolar`, async ({
        page,
      }, info) => {
        await page.goto(`/?course=${curso}&block=${bloco}&width=900&barras`)
        await page.addStyleTag({
          content: ':root { --font-baloo: "Baloo 2"; --font-nunito: Nunito; }',
        })
        const moldura = page.locator('.sz-discovery-moldura[data-arranjo="faisca"]')
        await expect(moldura).toBeVisible()
        if (curso === 'ilha')
          await expect(page.locator('.sz-island-world[data-ready="true"]')).toBeVisible({
            timeout: 30_000,
          })
        const palco = page.locator('.sz-discovery-palco')
        const modulos = page.locator(
          '.sz-discovery-painel > .sz-discovery-movimento, .sz-discovery-painel > .sz-discovery-modulo',
        )
        for (const ampliado of [false, true]) {
          if (ampliado) {
            await page.getByRole('button', { name: 'Ampliar experiência' }).click()
            await expect(page.locator('.sz-scene-workspace--expanded')).toBeVisible()
          } else {
            // No normal, a criança rola até a experiência: o topo do console logo abaixo da
            // barra de cima (no computador, no topo da janela).
            await page.evaluate(() => {
              const console = document.querySelector('.sz-scene-console')
              const topo = document.querySelector('.ensaio-topo')?.getBoundingClientRect()
              const barra = topo && topo.height > 0 ? topo.height : 0
              if (console)
                window.scrollTo(0, console.getBoundingClientRect().top + window.scrollY - barra)
            })
          }
          await page.waitForTimeout(400)
          const estreito = (await moldura.getAttribute('data-estreito')) === 'true'
          // A foto vem antes das conferências: quando uma falha, a foto mostra o porquê.
          await page.screenshot({ path: info.outputPath(ampliado ? 'ampliado.png' : 'normal.png') })
          const faixa = await faixaVisivel(page, ampliado)
          await inteiroNaJanela(page, faixa, palco, 'a cena')
          // A fala do Zappy: no celular, o balão no topo (com o "Ouvir"); no largo, à direita.
          const fala = estreito
            ? page.locator('.sz-scene-console-visual > .sz-discovery-fala-bloco')
            : page.locator('.sz-scene-console-actions > .sz-discovery-fala-bloco')
          await inteiroNaJanela(page, faixa, fala, 'a fala do Zappy')
          await inteiroNaJanela(
            page,
            faixa,
            fala.getByRole('button', { name: /Ouvir/ }),
            'o "Ouvir" do Zappy',
          )
          const n = await modulos.count()
          expect(n, 'o painel tem controles').toBeGreaterThan(0)
          for (let i = 0; i < n; i++)
            await inteiroNaJanela(page, faixa, modulos.nth(i), `o controle ${i + 1}`)
          // E nada por cima deles (rodapé, abas, barra de cima): o ponto do meio de cada um é dele.
          const cobertos = await page.evaluate(() =>
            [
              ...document.querySelectorAll(
                '.sz-discovery-palco, .sz-discovery-painel > .sz-discovery-movimento, .sz-discovery-painel > .sz-discovery-modulo',
              ),
            ]
              .map((el, i) => {
                const r = el.getBoundingClientRect()
                const no = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
                return no && el.contains(no)
                  ? null
                  : `item ${i} coberto por ${no?.className ?? 'nada'}`
              })
              .filter(Boolean),
          )
          expect(cobertos, 'nada por cima da cena e dos controles').toEqual([])
          // Cada controle dentro do cartão da direita (não passa da borda dele).
          const vazados = await page.evaluate(() => {
            const cartao = document
              .querySelector('.sz-scene-console-actions')
              ?.getBoundingClientRect()
            if (!cartao) return ['sem o cartão da direita']
            return [
              ...document.querySelectorAll(
                '.sz-discovery-painel > .sz-discovery-movimento, .sz-discovery-painel > .sz-discovery-modulo, .sz-discovery-painel button, .sz-discovery-painel .sz-discovery-caderno',
              ),
            ]
              .map((el, i) => {
                const r = el.getBoundingClientRect()
                if (r.width === 0) return null
                return r.left >= cartao.left - 1 && r.right <= cartao.right + 1
                  ? null
                  : `item ${i} (${el.textContent?.trim().slice(0, 20)}) passa da borda do cartão`
              })
              .filter(Boolean)
          })
          expect(vazados, 'controles dentro do cartão').toEqual([])
          // Caber na janela não basta: cada botão do painel (as teclas, as peças, o "Jogar de
          // novo") aparece inteiro, dentro do seu módulo e sem outro módulo por cima dele.
          const conflitos = await page.evaluate(() => {
            const problemas: string[] = []
            const caixas = [
              ...document.querySelectorAll(
                '.sz-discovery-painel > .sz-discovery-movimento, .sz-discovery-painel > .sz-discovery-modulo',
              ),
            ]
            // 3px de folga: os botões 3D da casa sobem 2px (o degrau embaixo deles).
            const dentro = (a: DOMRect, b: DOMRect) =>
              a.left >= b.left - 3 &&
              a.right <= b.right + 3 &&
              a.top >= b.top - 3 &&
              a.bottom <= b.bottom + 3
            const cruza = (a: DOMRect, b: DOMRect) =>
              a.left < b.right - 1 &&
              b.left < a.right - 1 &&
              a.top < b.bottom - 1 &&
              b.top < a.bottom - 1
            caixas.forEach((caixa, i) => {
              const r = caixa.getBoundingClientRect()
              for (const botao of caixa.querySelectorAll('button')) {
                const b = botao.getBoundingClientRect()
                if (b.width === 0) continue
                const nome = botao.getAttribute('aria-label') ?? botao.textContent?.trim() ?? ''
                if (!dentro(b, r)) problemas.push(`"${nome}" sai do controle ${i + 1}`)
                caixas.forEach((outra, j) => {
                  if (j !== i && cruza(b, outra.getBoundingClientRect()))
                    problemas.push(`"${nome}" fica embaixo do controle ${j + 1}`)
                })
              }
            })
            return problemas
          })
          expect(conflitos, 'botões inteiros e sem sobreposição').toEqual([])

          // A cena no topo: logo abaixo da linha das estrelas, nunca centralizada na altura.
          const estrelas = await page.locator('.sz-discovery-hud').boundingBox()
          const cena = await palco.boundingBox()
          if (!estrelas || !cena) throw new Error('sem a linha das estrelas ou a cena')
          expect(cena.y - (estrelas.y + estrelas.height)).toBeLessThan(24)

          if (!estreito) {
            // Dois cartões, metade/metade.
            const esquerda = await page.locator('.sz-scene-console-visual').boundingBox()
            const direita = await page.locator('.sz-scene-console-actions').boundingBox()
            if (!esquerda || !direita) throw new Error('sem as duas colunas')
            expect(Math.abs(esquerda.width - direita.width)).toBeLessThan(4)
            expect(direita.x).toBeGreaterThan(esquerda.x + esquerda.width)
          }
          expect(
            await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
            'sem rolagem de lado',
          ).toBe(true)
        }
      })
    }
  })
}
