// Mostra o trecho-fonte em volta de cada frase procurada, para montar trocas exatas.
import { fileURLToPath as caminhoDoArquivo } from 'node:url'
// Pasta docs/familias-e-escolas/canvas (este script fica em canvas/scripts).
const RAIZ = caminhoDoArquivo(new URL('..', import.meta.url)).replace(/\\/g, '/').replace(/\/$/, '')
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
const projeto = RAIZ + '/project'
const frases = JSON.parse(readFileSync(process.argv[2], 'utf8'))
const antes = Number(process.argv[3] ?? 140)
const depois = Number(process.argv[4] ?? 260)
const arquivos = readdirSync(projeto).filter((f) => f.endsWith('.dc.html'))
for (const frase of frases) {
  let achou = 0
  for (const a of arquivos) {
    const s = readFileSync(join(projeto, a), 'utf8')
    let i = -1
    while ((i = s.indexOf(frase, i + 1)) !== -1) {
      achou++
      console.log(`[${a}] …${s.slice(Math.max(0, i - antes), i + frase.length + depois).replace(/\n/g, '⏎')}…\n`)
    }
  }
  if (!achou) console.log(`[NADA] ${frase}\n`)
}
