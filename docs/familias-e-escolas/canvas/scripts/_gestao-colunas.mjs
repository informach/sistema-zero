// Reorganiza a tela A6 (Gestão · Início): o código do contraturno e o ranking da escola descem para baixo de Turmas,
// para a coluna da direita não ficar mais alta que a da esquerda.
import { fileURLToPath as caminhoDoArquivo } from 'node:url'
// Pasta docs/familias-e-escolas/canvas (este script fica em canvas/scripts).
const RAIZ = caminhoDoArquivo(new URL('..', import.meta.url)).replace(/\\/g, '/').replace(/\/$/, '')
import { readFileSync, writeFileSync } from 'node:fs'
const caminho = RAIZ + '/project/Tela-Gestao.dc.html'
let s = readFileSync(caminho, 'utf8')
if (s.includes('data-colunas-ok')) {
  console.log('ja reorganizada')
  process.exit(0)
}
const iAside = s.indexOf('<aside style="flex: 1 1 340px')
const iAsideFim = s.indexOf('</aside>', iAside)
if (iAside === -1 || iAsideFim === -1) throw new Error('aside nao encontrado')
const aside = s.slice(iAside, iAsideFim)
const iNavy = aside.indexOf('<section style="background: #121733')
if (iNavy === -1) throw new Error('cartao do contraturno nao encontrado')
const navyFim = aside.indexOf('</section>', iNavy) + '</section>'.length
const navy = aside.slice(iNavy, navyFim)
const iRank = aside.indexOf('<section', navyFim)
if (iRank === -1) throw new Error('cartao do ranking nao encontrado')
const rankFim = aside.indexOf('</section>', iRank) + '</section>'.length
const rank = aside.slice(iRank, rankFim)
const asideNovo = `${aside.slice(0, iNavy).trimEnd()}\n`

const iTurmas = s.lastIndexOf('<section style="flex: 999 1 620px', iAside)
const turmasFim = s.lastIndexOf('</section>', iAside) + '</section>'.length
if (iTurmas === -1) throw new Error('secao Turmas nao encontrada')
const turmas = s.slice(iTurmas, turmasFim).replace('<section style="flex: 999 1 620px; min-width: 0; ', '<section style="')
const esquerda = `<div data-colunas-ok style="flex: 999 1 620px; min-width: 0; display: flex; flex-direction: column; gap: 24px">
${turmas}
<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(300px, 100%), 1fr)); gap: 24px">
${navy}
${rank}
</div>
</div>`
s = s.slice(0, iTurmas) + esquerda + s.slice(turmasFim, iAside) + asideNovo + s.slice(iAsideFim)
writeFileSync(caminho, s)
console.log('colunas reorganizadas')
