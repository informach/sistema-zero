import { mkdir, rm, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { chromium } from 'playwright-core'

/**
 * O gerador do mundo de prova de 2 km (plano "Mundos de 2 km", lote 7, 23/11/2026), no molde do
 * jogo E: abre o playground da oficina (`bun run dev:oficina`, porta 4541) num Chrome sem janela,
 * monta e compila o mundo em campo lá dentro (`oficina/qa-mundo-2km.ts`) e grava o pacote em
 * `output/cenarios-reforma/mundo-2km/pacote-regioes`. A segunda metade (o Estúdio) é
 * `packages/studio/playground/cenarios-integration/preparar-jogo-e.ts` com
 * `JOGO_E_PASTA=output/cenarios-reforma/mundo-2km`.
 */
const raiz = resolve(import.meta.dirname, '../../../..'),
  pasta = resolve(raiz, 'output/cenarios-reforma/mundo-2km')
const navegador = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const pagina = await navegador.newPage()
  const erros = []
  pagina.on('pageerror', (e) => erros.push(e.message))
  pagina.on('console', (m) => {
    if (m.text().startsWith('[mundo-2km]')) console.log(m.text())
  })
  await pagina.goto('http://127.0.0.1:4541/?vazio=1')
  await pagina.waitForFunction(() => window.__cenarios)
  const resultado = await pagina.evaluate(async () => {
    const m = await import('/qa-mundo-2km.ts')
    return m.montarMundoDe2km()
  })
  const pacote = resultado.regioes,
    destino = resolve(pasta, 'pacote-regioes')
  await rm(destino, { recursive: true, force: true })
  await mkdir(destino, { recursive: true })
  await writeFile(resolve(destino, 'cena.json'), JSON.stringify(pacote.cena))
  let bytes = 0
  for (const [caminho, conteudo] of pacote.arquivos) {
    const arquivo = resolve(destino, 'arquivos', caminho)
    await mkdir(dirname(arquivo), { recursive: true })
    const dados = Buffer.from(conteudo, 'base64')
    bytes += dados.length
    await writeFile(arquivo, dados)
  }
  console.log(
    `Mundo de 2 km: ${resultado.objetos} objetos, ${pacote.cena.nos.length} nós, ${pacote.cena.regioes?.length ?? 0} regiões, ${pacote.arquivos.length} arquivos, ${(bytes / 2 ** 20).toFixed(1)} MiB; cena.json ${(JSON.stringify(pacote.cena).length / 1024).toFixed(0)} KB.`,
  )
  if (erros.length) throw Error(erros.join('\n'))
} finally {
  await navegador.close()
}
