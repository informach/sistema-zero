/**
 * Extrai o texto das fontes pendentes do Zappy com o CÓDIGO DO PRÓPRIO ADMIN
 * (`extractZappySourceContent`, que não depende de sessão de navegador): a legenda do vídeo no
 * Vimeo e o texto do PDF do caderno no R2 privado. Como no Admin, a legenda do vídeo também é
 * guardada no R2 do ambiente (`admin/captions/<id>-<idioma>.vtt`); nenhum curso muda aqui.
 *
 * Roda num processo filho com as variáveis do Admin do ambiente (só na memória) e
 * `--conditions=react-server` (neutraliza o `server-only`); quem chama é `base-do-zappy.ts`.
 * Entrada: JSON com as pendências no stdin. Saída: uma linha `SZ_EXTRACAO=<json>`.
 */
const pendencias = JSON.parse(await Bun.stdin.text()) as {
  sourceRef: string
  extraction: unknown
}[]
const { extractZappySourceContent } = await import(
  '../../../packages/admin/src/server/zappy-knowledge'
)
const saida: { sourceRef: string; content?: string; error?: string }[] = []
for (const p of pendencias) {
  try {
    saida.push({
      sourceRef: p.sourceRef,
      content: await extractZappySourceContent(p.extraction as never),
    })
  } catch (causa) {
    saida.push({
      sourceRef: p.sourceRef,
      error: causa instanceof Error ? causa.message : 'Falha desconhecida na extração',
    })
  }
}
console.log(`SZ_EXTRACAO=${JSON.stringify(saida)}`)
