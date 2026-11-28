// Nas telas com menu lateral, garante que o menu vá até o fim do quadro quando o conteúdo é curto.
// Roda depois dos geradores (é idempotente).
import { fileURLToPath as caminhoDoArquivo } from 'node:url'
// Pasta docs/familias-e-escolas/canvas (este script fica em canvas/scripts).
const RAIZ = caminhoDoArquivo(new URL('..', import.meta.url)).replace(/\\/g, '/').replace(/\/$/, '')
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
const projeto = RAIZ + '/project'
const marca = 'display: flex; flex-wrap: wrap">'
let mexidos = 0
for (const nome of readdirSync(projeto).filter((f) => f.startsWith('Tela-') && f.endsWith('.dc.html'))) {
  const caminho = join(projeto, nome)
  const s = readFileSync(caminho, 'utf8')
  const inicio = s.indexOf('</helmet>')
  if (inicio === -1) continue
  const i = s.indexOf(marca, inicio)
  // Só a moldura raiz: a primeira <div> depois do <helmet>.
  if (i === -1 || i - inicio > 420) continue
  const linha = s.slice(s.lastIndexOf('<div', i), i)
  if (linha.includes('min-height')) continue
  writeFileSync(caminho, `${s.slice(0, i)}display: flex; flex-wrap: wrap; min-height: 900px">${s.slice(i + marca.length)}`)
  mexidos++
}
console.log(`altura mínima aplicada em ${mexidos} telas`)
