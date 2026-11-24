import { mkdir, rm, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { chromium } from 'playwright-core'

/**
 * A primeira metade do gerador do jogo E (lote 7 da conclusão, 22/11/2026): abre o playground da
 * oficina (`bun run dev:oficina`, porta 4541) num Chrome sem janela, monta e compila o cenário lá
 * dentro (`oficina/qa-jogo-e.ts`) e grava os dois pacotes (com e sem regiões) em
 * `output/cenarios-reforma/jogo-e/pacote-*`. A segunda metade (o Estúdio) é
 * `packages/studio/playground/cenarios-integration/preparar-jogo-e.ts`.
 */
const raiz = resolve(import.meta.dirname, '../../../..'),
  pasta = resolve(raiz, 'output/cenarios-reforma/jogo-e')
const navegador = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const pagina = await navegador.newPage()
  const erros = []
  pagina.on('pageerror', (e) => erros.push(e.message))
  pagina.on('console', (m) => {
    if (m.text().startsWith('[jogo-e]')) console.log(m.text())
  })
  await pagina.goto('http://127.0.0.1:4541/?vazio=1')
  await pagina.waitForFunction(() => window.__cenarios)
  const resultado = await pagina.evaluate(async () => {
    const m = await import('/qa-jogo-e.ts')
    return m.montarJogoE()
  })
  for (const nome of ['regioes', 'inteiro']) {
    const pacote = resultado[nome],
      destino = resolve(pasta, `pacote-${nome}`)
    await rm(destino, { recursive: true, force: true })
    await mkdir(destino, { recursive: true })
    await writeFile(resolve(destino, 'cena.json'), JSON.stringify(pacote.cena))
    for (const [caminho, conteudo] of pacote.arquivos) {
      const arquivo = resolve(destino, 'arquivos', caminho)
      await mkdir(dirname(arquivo), { recursive: true })
      await writeFile(arquivo, Buffer.from(conteudo, 'base64'))
    }
    console.log(
      `Jogo E (${nome}): ${pacote.cena.nos.length} nós, ${pacote.cena.regioes?.length ?? 0} regiões, ${pacote.arquivos.length} arquivos.`,
    )
  }
  if (erros.length) throw Error(erros.join('\n'))
  console.log(`Cenário do jogo E: ${resultado.objetos} objetos, gravado em ${pasta}.`)
} finally {
  await navegador.close()
}
