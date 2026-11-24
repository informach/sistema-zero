import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'

const raiz = resolve(import.meta.dirname, '../../../..'),
  pasta = resolve(raiz, 'output/cenarios-reforma/lote8-integracao-terreno-juncao'),
  { cena } = JSON.parse(readFileSync(resolve(pasta, 'resultado.json'), 'utf8')),
  modulo = (p) => `/@fs/${resolve(raiz, p).replaceAll('\\', '/')}`
let arquivo, danificado, pngDanificado
for (const a of cena.arquivos.filter((a) => a.mime === 'model/gltf-binary')) {
  const b = readFileSync(resolve(pasta, a.caminho)),
    n = b.readUInt32LE(12),
    j = JSON.parse(b.toString('utf8', 20, 20 + n)),
    imagem = j.images?.find((i) => i.mimeType === 'image/png' && i.bufferView !== undefined)
  if (!imagem) continue
  const view = j.bufferViews[imagem.bufferView],
    inicio = 28 + n + (view.byteOffset ?? 0),
    fim = inicio + view.byteLength
  for (let p = inicio + 8; p + 12 <= fim; p += b.readUInt32BE(p) + 12) {
    if (b.readUInt32BE(p + 4) !== 0x49444154) continue
    danificado = Buffer.from(b)
    // Mantém envelope/dimensões, mas declara profundidade de amostras inexistente no PNG.
    // O preflight estrutural não substitui o decoder nativo de pixels.
    danificado[inicio + 24] = 3
    pngDanificado = danificado.subarray(inicio, fim)
    arquivo = a.caminho
    a.digest = createHash('sha256').update(danificado).digest('hex')
    break
  }
  if (arquivo) break
}
assert.ok(arquivo, 'Fixture precisa de PNG embutido')
const browser = await chromium.launch({ channel: 'chrome', headless: true }),
  p = await browser.newPage(),
  erros = []
p.on('pageerror', (e) => erros.push(e.message))
try {
  await p.goto('http://127.0.0.1:4541/?vazio=1')
  await p.waitForFunction(() => window.__cenarios)
  const r = await p.evaluate(
    async (u) => {
      const { carregarCenaNoThree } = await import(u.runtime),
        { conferirConteudoCompilado } = await import(u.conteudo),
        { lerGlb } = await import(u.modelos),
        { encodeGlbContainer } = await import(u.containers),
        arquivos = new Map(
          await Promise.all(
            u.cena.arquivos.map(async (a) => [
              a.caminho,
              a.caminho === u.arquivo
                ? Uint8Array.from(atob(u.dados), (c) => c.charCodeAt(0))
                : new Uint8Array(await (await fetch(`${u.pasta}/${a.caminho}`)).arrayBuffer()),
            ]),
          ),
        )
      const criar = URL.createObjectURL,
        revogar = URL.revokeObjectURL,
        abertos = new Map()
      let criadas = 0
      URL.createObjectURL = (blob) => {
        const u = criar.call(URL, blob)
        abertos.set(u, { tipo: blob.type, bytes: blob.size, origem: new Error().stack })
        criadas++
        return u
      }
      URL.revokeObjectURL = (url) => {
        abertos.delete(url)
        revogar.call(URL, url)
      }
      try {
        const url = URL.createObjectURL(
            new Blob([Uint8Array.from(atob(u.png), (c) => c.charCodeAt(0))], { type: 'image/png' }),
          ),
          img = new Image()
        img.src = url
        let decode = 'aceitou'
        try {
          await img.decode()
        } catch (e) {
          decode = e.name
        } finally {
          URL.revokeObjectURL(url)
        }
        if (decode === 'aceitou')
          throw Error('A fixture precisa de uma imagem recusada pelo decoder nativo.')
        await conferirConteudoCompilado(u.cena, arquivos)
        try {
          const r = await carregarCenaNoThree(
            { cena: u.cena, arquivos },
            new AbortController().signal,
          )
          r.descartar()
          throw Error(`A cena inválida foi aceita; decode=${decode}, arquivo=${u.arquivo}`)
        } catch (erro) {
          if (!/decodificar uma imagem do modelo/.test(erro.message)) throw erro
          if (abertos.size)
            throw Error(
              `URLs de imagem não liberadas após falha: ${JSON.stringify([...abertos.values()])}`,
            )
          // Uma URL declarada pelo chamador continua sendo dele, mesmo quando sua imagem falha.
          // Usa o leitor nativo diretamente; o pacote compilado continua exigindo GLB autocontido.
          const emprestada = URL.createObjectURL(
              new Blob([Uint8Array.from(atob(u.png), (c) => c.charCodeAt(0))], {
                type: 'image/png',
              }),
            ),
            bytes = arquivos.get(u.arquivo),
            n = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(12, true),
            json = JSON.parse(new TextDecoder().decode(bytes.subarray(20, 20 + n))),
            imagem = json.images[0]
          delete imagem.bufferView
          imagem.uri = emprestada
          let recusouEmprestada = false
          try {
            const p = await lerGlb(encodeGlbContainer(json, [bytes.subarray(28 + n)]).buffer)
            p.descartar()
          } catch (e) {
            if (!/decodificar uma imagem do modelo/.test(e.message)) throw e
            recusouEmprestada = true
          }
          if (!recusouEmprestada || !abertos.has(emprestada))
            throw Error('O leitor revogou uma URL pertencente ao chamador.')
          URL.revokeObjectURL(emprestada)
          return {
            preflightPassou: true,
            decodeNativo: decode,
            decoderRecusou: true,
            mensagem: erro.message,
            urlsCriadas: criadas,
            urlsNaoLiberadas: abertos.size,
            urlDoChamadorPreservada: true,
          }
        }
      } finally {
        URL.createObjectURL = criar
        URL.revokeObjectURL = revogar
      }
    },
    {
      cena,
      arquivo,
      png: pngDanificado.toString('base64'),
      dados: danificado.toString('base64'),
      pasta: modulo('output/cenarios-reforma/lote8-integracao-terreno-juncao'),
      runtime: modulo('packages/molda-cenarios-motor/src/compilar/runtime-three.ts'),
      conteudo: modulo('packages/molda-cenarios-motor/src/compilar/conteudo.ts'),
      modelos: modulo('packages/molda-cenarios-motor/src/modelos.ts'),
      containers: modulo('packages/molda/src/export/glbContainer.ts'),
    },
  )
  assert.deepEqual(erros, [])
  writeFileSync(
    resolve(raiz, 'output/cenarios-reforma/lote8-runtime/imagem-invalida.json'),
    JSON.stringify(r, null, 2),
  )
  console.log(JSON.stringify(r))
} finally {
  await browser.close()
}
