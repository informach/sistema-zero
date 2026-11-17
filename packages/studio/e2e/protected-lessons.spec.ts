import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, type Page, test } from '@playwright/test'
import { gesto, instalarRobo, type JogoDaAula } from './helpers/palco'

/**
 * Cursos protegidos: Cadê Todo Mundo? e A Chave do Farol, os dois gravados por inteiro.
 *
 * Cada aula abre no Estúdio da aula (`/aula?aula=…`, o `StudioLesson` com o projeto inicial, o
 * nível e os blocos liberados do manifesto) e o teste refaz, na ordem, TODOS os gestos de Estúdio
 * do roteiro gravado, com a mesma biblioteca do robô de gravação. Ao fim de cada parte, o projeto
 * tem de cumprir os objetivos de estrutura daquela parte, com a régua do servidor.
 *
 * O que fica de fora, por ser da página da aula e não do Estúdio: expandir e reduzir, Verificar
 * projeto, Enviar, Próxima parte, Concluir aula e o Compartilhar. Os objetivos que RODAM o jogo
 * passam pelo executor do servidor só quando há um Chromium apontado (`SZ_CHECK_CHROMIUM` ou
 * `PW_CHROMIUM`): o documento que o Members monta, aberto pelo `check-objectives.mjs`.
 */

const aqui = dirname(fileURLToPath(import.meta.url))
const pacote = resolve(aqui, '..')
const FAISCA = resolve(pacote, '../../docs/aulas-interativas/faisca')
const SAIDA = resolve(pacote, process.env.PROTECTED_LESSONS_DIR ?? '.cache/protected-lessons')

/** O `script.js` que cada parte deixa pronto, guardado no repositório. */
const REFERENCIAS = resolve(aqui, 'fixtures/protected-lessons')
/** Só com decisão da dona: regravar é admitir que o que foi ensinado mudou. */
const REGRAVAR = process.env.PROTECTED_LESSONS_UPDATE === '1'

/**
 * Cada evento do Jogo 2D leva no fim uma chave interna (o id do bloco, sorteado quando o bloco
 * sai da paleta). O programa é o mesmo com qualquer chave.
 */
const semChaveDeEvento = (codigo: string) =>
  codigo.replace(/^(\s*\}, )"[^"\n]*"\);$/gm, '$1"<chave>");')

/**
 * A parte em que o jogo fica igual ao projeto final do curso (as partes seguintes são a
 * personalização, que troca imagens e frases de propósito).
 */
const CHEGADA: Record<string, string> = {
  'cade-todo-mundo-aula-2': 'contar-achados',
  'desafio-dia-3': 'decisao',
}
const CABECALHO = '// Gerado pelo Sistema Zero Studio\n\n'

/** O navegador do executor dos objetivos de execução (opcional). */
const EXECUTOR = process.env.SZ_CHECK_CHROMIUM ?? process.env.PW_CHROMIUM ?? ''

const AULAS = [
  { curso: 'cade-todo-mundo', arquivo: 'cade-todo-mundo-aula-1' },
  { curso: 'cade-todo-mundo', arquivo: 'cade-todo-mundo-aula-2' },
  { curso: 'desafio-primeiro-jogo', arquivo: 'desafio-dia-1' },
  { curso: 'desafio-primeiro-jogo', arquivo: 'desafio-dia-2' },
  { curso: 'desafio-primeiro-jogo', arquivo: 'desafio-dia-3' },
] as const

/** Gestos que são da página da aula (ou do Mural), não do Estúdio montado aqui. */
const DA_PAGINA_DA_AULA =
  /^(expandir est[uú]dio|reduzir est[uú]dio|verificar projeto|enviar projeto|pr[oó]xima parte|concluir aula|compartilhar|clicar ["“].*|apontar ["“].*)$/i

interface Manifesto {
  blocks: {
    key: string
    content?: {
      kind?: string
      activity?: { type?: string; stage?: JogoDaAula['stage']; targets?: JogoDaAula['targets'] }
    }
  }[]
  sections: { key: string; title: string; blockKeys: string[]; workspaceKey?: string | null }[]
}

/** Os gestos entre colchetes de cada clipe do roteiro, na ordem (os da edição ficam de fora). */
function gestosDoRoteiro(caminho: string): Map<string, string[]> {
  const saida = new Map<string, string[]>()
  let clipe: string | null = null
  for (const linha of readFileSync(caminho, 'utf8').split('\n')) {
    const marca = /^\*\*Clipe:\*\*\s*`([^`]+)`/.exec(linha)
    if (marca?.[1]) {
      clipe = marca[1]
      continue
    }
    if (!clipe || !linha.startsWith('**Na tela:**')) continue
    const lista = saida.get(clipe) ?? []
    for (const [, verbo] of linha.matchAll(/\[([^\]]+)\]/g))
      if (verbo && !/^na edi[cç][aã]o/i.test(verbo.trim())) lista.push(verbo.trim())
    saida.set(clipe, lista)
  }
  return saida
}

async function projetoDaTela(page: Page): Promise<unknown> {
  return page.evaluate(() =>
    (window as unknown as { __aula: { projeto(): unknown } }).__aula.projeto(),
  )
}

/**
 * O projeto depois que o Estúdio terminou de ler os blocos (o código é gerado um instante depois
 * do último gesto): duas leituras seguidas com o mesmo `script.js`.
 */
async function projetoAssentado(page: Page): Promise<{ files: Record<string, string> }> {
  let antes = ''
  for (let vez = 0; vez < 20; vez++) {
    await page.waitForTimeout(400)
    const projeto = (await projetoDaTela(page)) as { files: Record<string, string> }
    const agora = projeto.files['script.js'] ?? ''
    if (agora === antes) return projeto
    antes = agora
  }
  throw new Error('O código do projeto não parou de mudar.')
}

for (const { curso, arquivo } of AULAS) {
  test(`${arquivo}: os gestos gravados montam o jogo no Estúdio da aula`, async ({ page }) => {
    test.setTimeout(15 * 60_000)
    const manifestoEm = resolve(FAISCA, curso, `${arquivo}.manifesto.json`)
    const manifesto = JSON.parse(readFileSync(manifestoEm, 'utf8')) as Manifesto
    const gestos = gestosDoRoteiro(resolve(FAISCA, curso, `${arquivo}.roteiro.md`))
    const jogos: JogoDaAula[] = manifesto.blocks.flatMap((bloco) => {
      const atividade = bloco.content?.kind === 'interactive' ? bloco.content.activity : undefined
      return atividade?.type === 'project-play' && atividade.stage
        ? [{ stage: atividade.stage, targets: atividade.targets ?? [] }]
        : []
    })
    const pasta = resolve(SAIDA, arquivo)
    mkdirSync(pasta, { recursive: true })

    const erros: string[] = []
    page.on('pageerror', (erro) => erros.push(String(erro)))

    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`/aula?aula=${curso}/${arquivo}`)
    await page.locator('.blocklyToolbox').waitFor({ timeout: 60_000 })
    await page.locator('iframe[title="Pré-visualização"]').waitFor({ timeout: 60_000 })
    await instalarRobo(page, jogos)

    let feitos = 0
    let chegou = false
    for (const parte of manifesto.sections) {
      if (!parte.workspaceKey) continue
      const clipe = parte.blockKeys.find((chave) => gestos.has(chave))
      const lista = clipe ? (gestos.get(clipe) ?? []) : []
      // Só as partes em que a criança monta no Estúdio (o fecho é o Compartilhar da página).
      if (!lista.some((verbo) => /^expandir est[uú]dio$/i.test(verbo))) continue
      if (lista.some((verbo) => /^compartilhar$/i.test(verbo))) continue

      await test.step(`${parte.key}: ${parte.title}`, async () => {
        for (const [indice, verbo] of lista.entries()) {
          if (DA_PAGINA_DA_AULA.test(verbo)) continue
          try {
            await gesto(page, verbo)
          } catch (erro) {
            await page.screenshot({ path: resolve(pasta, `${parte.key}-falhou.png`) })
            throw new Error(
              `${arquivo} › ${parte.key} › gesto ${indice + 1} [${verbo}]: ${
                erro instanceof Error ? erro.message : String(erro)
              }`,
            )
          }
          feitos += 1
        }
        await page.screenshot({ path: resolve(pasta, `${parte.key}.png`) })
        const projetoEm = resolve(pasta, `${parte.key}.projeto.json`)
        const projeto = await projetoAssentado(page)
        writeFileSync(projetoEm, JSON.stringify(projeto))
        const gerado = semChaveDeEvento(projeto.files['script.js'] ?? '')
        const referencia = resolve(REFERENCIAS, arquivo, `${parte.key}.script.js`)
        if (REGRAVAR || !existsSync(referencia)) {
          if (!REGRAVAR && process.env.CI) throw new Error(`Falta a referência ${referencia}`)
          mkdirSync(dirname(referencia), { recursive: true })
          writeFileSync(referencia, gerado)
        }
        expect(gerado, `o código que a parte ${parte.key} deixa pronto`).toBe(
          readFileSync(referencia, 'utf8'),
        )
        if (CHEGADA[arquivo] === parte.key) {
          const final = JSON.parse(
            readFileSync(resolve(FAISCA, curso, 'projeto-final.szproject.json'), 'utf8'),
          ) as { files: Record<string, string> }
          expect(gerado.replace(CABECALHO, ''), 'o jogo montado é o projeto final do curso').toBe(
            semChaveDeEvento(final.files['script.js'] ?? ''),
          )
          chegou = true
        }
        const objetivos = JSON.parse(
          execFileSync(
            'bun',
            ['scripts/check-lesson-objectives.ts', manifestoEm, parte.key, projetoEm],
            {
              cwd: pacote,
              encoding: 'utf8',
              timeout: 240_000,
              // Com um Chromium apontado, os objetivos que RODAM o jogo passam pelo executor do
              // servidor (`studio-runtime/runtime/check-objectives.mjs`). Sem ele, saem sem nota.
              env: { ...process.env, SZ_CHECK_CHROMIUM: EXECUTOR },
            },
          ),
        ) as { checkId: string; label: string; passed: boolean | null; execucao: boolean }[]
        writeFileSync(
          resolve(pasta, `${parte.key}.objetivos.json`),
          JSON.stringify(objetivos, null, 1),
        )
        const faltou = objetivos.filter((objetivo) => objetivo.passed === false)
        expect(faltou, `objetivos da parte ${parte.key}`).toEqual([])
        if (EXECUTOR)
          expect(
            objetivos.filter((objetivo) => objetivo.passed === null),
            `objetivos de execução sem nota na parte ${parte.key}`,
          ).toEqual([])
      })
    }

    expect(feitos).toBeGreaterThan(10)
    if (CHEGADA[arquivo]) expect(chegou, 'a parte de chegada rodou').toBe(true)
    expect(erros).toEqual([])
  })
}
