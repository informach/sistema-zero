// Aplica trocas exatas nas pranchas. Cada troca precisa casar exatamente uma vez, senão o script para.
// Uso: node trocar.mjs <arquivo-de-trocas.json>
import { fileURLToPath as caminhoDoArquivo } from 'node:url'
// Pasta docs/familias-e-escolas/canvas (este script fica em canvas/scripts).
const RAIZ = caminhoDoArquivo(new URL('..', import.meta.url)).replace(/\\/g, '/').replace(/\/$/, '')
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const projeto = RAIZ + '/project'
const trocas = JSON.parse(readFileSync(process.argv[2], 'utf8'))
const textos = new Map()
const falhas = []
for (const [i, t] of trocas.entries()) {
  if (!textos.has(t.arquivo)) textos.set(t.arquivo, readFileSync(join(projeto, t.arquivo), 'utf8'))
  const atual = textos.get(t.arquivo)
  const vezes = atual.split(t.de).length - 1
  if (vezes !== 1) {
    falhas.push(`troca ${i} em ${t.arquivo}: casou ${vezes} vez(es): ${t.de.slice(0, 70)}`)
    continue
  }
  textos.set(t.arquivo, atual.replace(t.de, () => t.para))
}
if (falhas.length) {
  console.log(falhas.join('\n'))
  process.exit(1)
}
for (const [arquivo, texto] of textos) writeFileSync(join(projeto, arquivo), texto)
console.log(`ok: ${trocas.length} trocas em ${textos.size} arquivos`)
