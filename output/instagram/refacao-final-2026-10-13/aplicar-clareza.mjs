import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'

const base=path.resolve('docs/marketing/kids/comunidade-dos-criadores/instagram')
const work=path.resolve('output/instagram/refacao-final-2026-10-13')
const history=path.join(base,'historico/2026-10-13-antes-clareza-tres-produzidas')
const backup=path.join(work,'antes-clareza')
const revised=JSON.parse(fs.readFileSync(path.join(work,'revisao-clareza.json'),'utf8'))
const folders={P01:'p01-uma-ideia-dele',P07:'p07-primeira-dificuldade',P34:'p34-a-ideia-veio-dele'}
const sourceFiles=['01-p01-a-p10.md','09-p31-a-p40.md','13-guia-de-copy.md','05-direcao-visual-e-producao.md']
fs.mkdirSync(history,{recursive:true})
for(const name of sourceFiles){
 const dst=path.join(history,name)
 if(!fs.existsSync(dst))fs.copyFileSync(path.join(base,'postagens',name),dst)
}
for(const [id,slug] of Object.entries(folders)){
 const source=path.join(base,'producao/postagens',slug),dest=path.join(backup,slug)
 fs.mkdirSync(dest,{recursive:true})
 for(const entry of fs.readdirSync(source,{withFileTypes:true})){
  if(entry.isFile()&&!fs.existsSync(path.join(dest,entry.name)))fs.copyFileSync(path.join(source,entry.name),path.join(dest,entry.name))
 }
 const v4=path.join(source,'apoio/v4')
 fs.mkdirSync(v4,{recursive:true})
 fs.writeFileSync(path.join(v4,'fontes-e-producao.md'),`# ${id}: revisão de clareza\n\nRevisão editorial de 13/10/2026 após a leitura das artes pela Helena.\n\n${revised[id].reason}\n\nArte, pessoas, paleta e capturas da v3 preservadas. A copy foi remontada sobre a mesma direção visual. As legendas e os textos alternativos longos acompanham os novos textos. A identificação das comparações usa palavras comuns, em vez de coordenadas ou multiplicadores.\n\nFontes das imagens e verificações dos jogos: [registro da v3](../v3/fontes-e-producao.md). Prompts: [v3](../v3/prompts.json). O texto usado nesta versão está em copy-fonte.md e a conferência do layout em verificacao-layout.json. As artes anteriores estão em output/instagram/refacao-final-2026-10-13/antes-clareza.\n\nAs falas reais foram preservadas. Revisão editorial e checagem dos arquivos; nenhuma publicação nem teste de conversão realizado.\n`)
}
const q=ps=>ps.map(p=>'> '+p).join('\n>\n')
for(const source of ['01-p01-a-p10.md','09-p31-a-p40.md']){
 const filename=path.join(base,'postagens',source)
 let doc=fs.readFileSync(filename,'utf8').replaceAll('\r\n','\n')
 for(const [id,data] of Object.entries(revised)){
  const start=doc.indexOf('## '+id+' · ')
  if(start<0)continue
  const next=doc.indexOf('\n<a id=',start)
  const end=next<0?doc.length:next
  let section=doc.slice(start,end)
  section=section.replace(/^## [^\n]+/,`## ${id} · ${data.slides[0].slice(0,2).join(' ')}`)
  section=section.replace(/\*\*O que mudou nesta revisão:\*\*[^\n]+/,`**O que mudou nesta revisão de clareza:** ${data.reason}`)
  let count=0
  section=section.replace(/(### Slide (\d+)[^\n]*\n+)[\s\S]*?(?=\n\*\*Visual:)/g,(_,heading,n)=>{count++;return heading+q(data.slides[Number(n)-1])+'\n'})
  assert.equal(count,data.slides.length,id+' slides encontrados')
  section=section.replace(/(### Legenda\n+)[\s\S]*?(?=\n\*\*Produção:)/,(_,heading)=>heading+q(data.caption)+'\n')
  section=section.replace(/\*\*Produção concluída — revisão 4:\*\*[^\n]+/,`**Produção atual — revisão de clareza:** [${data.slides.length} slides e arquivos](../producao/postagens/${folders[id]}/index.html). Copy e legenda simplificadas; arte aprovada preservada. Capturas, pessoas e fontes na v3; texto atual e verificação em \`apoio/v4\`.`)
  if(id==='P07')section=section.replace('**Gancho:** Frase da criança com lacuna numérica (“quatro palavras”).','**Gancho:** Frase da criança e dificuldade reconhecível para o responsável.')
  // O histórico técnico continua disponível; a nota atual prevalece sobre pedidos já executados.
  section=section.replace('**Produção:** **Revisão 4:**','**Produção:** As orientações técnicas abaixo registram a arte já executada; a copy vigente é a revisão de clareza acima. **Revisão 4:**')
  doc=doc.slice(0,start)+section+doc.slice(end)
 }
 const note=source==='01-p01-a-p10.md'?'P01 e P07':'P34'
 const banner=`**Revisão de clareza de 13/10/2026:** ${note} revistos após a leitura das artes pela Helena. A ligação entre a situação da família e a criação de jogos agora é explicada diretamente, com palavras comuns. Demais peças continuam na revisão anterior. [Versão anterior](../historico/2026-10-13-antes-clareza-tres-produzidas/${source}).\n\n`
 const headingEnd=doc.indexOf('\n\n')+2
 doc=doc.slice(0,headingEnd)+banner+doc.slice(headingEnd)
 fs.writeFileSync(filename,doc)
}
console.log('Três copies atualizadas; textos e artes anteriores arquivados.')
