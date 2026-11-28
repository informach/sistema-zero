// Extrai o texto visível de cada prancha para a pasta ../especificacao (um .txt por prancha) e os post-its do canvas.
import { fileURLToPath as caminhoDoArquivo } from 'node:url'
// Pasta docs/familias-e-escolas/canvas (este script fica em canvas/scripts).
const RAIZ = caminhoDoArquivo(new URL('..', import.meta.url)).replace(/\\/g, '/').replace(/\/$/, '')
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const BASE = RAIZ
const projeto = join(BASE, 'project')
const saida = join(BASE, '..', 'especificacao')
mkdirSync(saida, { recursive: true })

const canvas = JSON.parse(readFileSync(join(projeto, 'canvas.json'), 'utf8'))
const ordem = canvas.order
let total = 0
for (const nome of ordem) {
  const fonte = readFileSync(join(projeto, nome), 'utf8')
  let corpo = /<x-dc>([\s\S]*?)<\/x-dc>/.exec(fonte)[1].replace(/<helmet>[\s\S]*?<\/helmet>/, '')
  corpo = corpo
    .replace(/<h1[^>]*>/g, '\n\n# ')
    .replace(/<h2[^>]*>/g, '\n\n## ')
    .replace(/<h3[^>]*>/g, '\n\n### ')
    .replace(/<legend[^>]*>/g, '\n\n### ')
    .replace(/<li[^>]*>/g, '\n- ')
    .replace(/<(p|div|article|section|label|button|a|strong|option)[^>]*>/g, (m, tag) => (tag === 'strong' ? ' **' : '\n'))
    .replace(/<\/strong>/g, '** ')
    .replace(/<input[^>]*value="([^"]*)"[^>]*>/g, ' [campo: $1] ')
    .replace(/<textarea[^>]*>/g, '\n[campo de texto] ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n /g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  const quadro = canvas.boards[nome]
  const cabecalho = `PRANCHA: ${quadro.title} (arquivo ${nome}, página "${quadro.page}")\n\n`
  const notas = Object.values(canvas.notes)
    .filter((n) => !n.kind && n.page === quadro.page && n.x === quadro.x)
    .map((n) => `\n\n[POST-IT DA EQUIPE, fora da tela] ${n.text}`)
    .join('')
  const texto = cabecalho + corpo + notas + '\n'
  writeFileSync(join(saida, nome.replace('.dc.html', '.txt')), texto)
  total += texto.length
}
console.log(`pranchas: ${ordem.length}, caracteres: ${total}`)
