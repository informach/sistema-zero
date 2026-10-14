import fs from 'node:fs'
import path from 'node:path'
const base=path.resolve('docs/marketing/kids/comunidade-dos-criadores/instagram')
const work=path.resolve('output/instagram/revisao-clareza-calendario')
const norm=s=>s.replaceAll('\r\n','\n')
const read=f=>norm(fs.readFileSync(path.join(base,f),'utf8'))
const write=(f,s)=>fs.writeFileSync(path.join(base,f),s)
const originals=JSON.parse(fs.readFileSync(path.join(work,'originais.json'),'utf8'))
const titles=new Map(),reports=[]
for(const source of [...new Set(originals.map(o=>o.source))]){
 const f='postagens/'+source
 let doc=read(f)
 doc=doc.replace(/\*\*Revisão de clareza de 13\/10\/2026:\*\*[^\n]+\n\n/,'')
 doc=doc.replace(/\*\*Revisão:[^\n]+/,`**Revisão de clareza: 13/10/2026.** Todas as peças deste arquivo seguem a régua aprovada em P01, P07 e P34. Linguagem simples, ligação explícita entre a situação e a ação de criar, legendas completas e cenas coerentes. As três referências aprovadas foram preservadas. [Guia vigente](13-guia-de-copy.md) · [Calendário](../03-postagens.md) · [Cobertura](12-mapa-cobertura.md) · [Versão anterior](../historico/2026-10-13-antes-clareza-geral/postagens/${source}).`)
 doc=doc.replace(/## (P\d+) · ([^\n]+)([\s\S]*?)(?=\n<a id=|$)/g,(section,id,title,body)=>{
  titles.set(id,title)
  if(['P01','P07','P34'].includes(id))return section
  body=body.replace(/\*\*Gancho:\*\*[^\n]+/,`**Gancho:** ${title}`)
  body=body.replace(/\*\*Convite final:\*\*[^.]+\./,'**Convite final:** seguir o perfil.')
  // Fonte técnica anterior preservada como registro; a direção e as cenas atuais governam a produção.
  body=body.replace(/\*\*Produção:\*\* /,'**Produção:** ')
  return `## ${id} · ${title}`+body
 })
 if(source==='02-p11-a-p20.md'){
  doc=doc.replace('| P14 | Diário de criador | Ilha dos Criadores (só na legenda) | Mundo 3D |','| P14 | Diário de criador | Sem jogo: relato do Jeffrey | não se aplica |')
  doc=doc.replace('| P19 | Tradução de criança | Escalada do Guerreiro Profissional (só na legenda) | Jogo 2D Avançado |','| P19 | Tradução de criança | Sem jogo: conversa sobre continuar | não se aplica |')
 }
 if(source==='11-p51-a-p60.md')doc=doc.replace(/^\| P54 \|[^\n]+$/m,'| P54 | Teste em casa | Sem jogo: rotina e salvamento da atividade | não se aplica |')
 write(f,doc)
}
for(const f of ['postagens/04-stories.md','postagens/07-extras-para-familias.md','04-postagens-manychat.md'])for(const m of read(f).matchAll(/^## ((?:ST|E|MC)\d+) · ([^\n]+)/gm))titles.set(m[1],m[2])
const replaceLabels=s=>s.replace(/\[((?:P|ST|E|MC)\d+) · [^\]]+\](\([^)]+\))/g,(all,id,target)=>titles.has(id)?`[${id} · ${titles.get(id)}]${target}`:all)
for(const f of ['03-postagens.md','postagens/12-mapa-cobertura.md'])write(f,replaceLabels(read(f)))
let cal=read('03-postagens.md')
cal=cal.replace(/\*\*Revisão: 12\/10\/2026;[^\n]+/,`**Revisão de clareza: 13/10/2026.** São **60 publicações principais**, uma para cada uma das 30 dores e dos 30 desejos: **30 carrosséis, 18 Reels e 12 imagens únicas**. Há seis extras de acompanhamento e vinte sequências de quatro stories. Os três fixados e as 14 peças ManyChat ficam separados. As 57 peças restantes receberam a mesma revisão aprovada em P01, P07 e P34, preservadas integralmente.`)
cal=cal.replace(/\*\*(?:Revisão profunda, 13\/10 à tarde|Segunda revisão, 13\/10 à noite|Terceira revisão, 13\/10 à noite):\*\*[^\n]+\n\n/g,'')
cal=cal.replace(/\*\*Clareza após leitura das artes:\*\*[^\n]+/,`**Clareza aplicada ao conjunto:** P01, P07 e P34 foram usados como referência para revisar as demais 97 peças: 57 principais, seis extras, vinte sequências de stories e 14 ManyChat. Foram revistos ganchos, explicações, legendas, falas, directs e as cenas que deixaram de combinar com o texto. A ordem do calendário e a cobertura de necessidades foram mantidas.`)
cal=cal.replace(/\*\*13\/10\/2026, noite:\*\*[^\n]+\n\n/,'')
cal=cal.replace(/\*\*Revisão 4 \(13\/10\/2026, noite\):\*\*[^\n]+/,`**Registro da revisão atual:** [Clareza aplicada ao calendário e ao ManyChat](pesquisas/revisao-clareza-geral-2026-10-13.md). A [versão anterior](historico/2026-10-13-antes-clareza-geral/03-postagens.md) conserva o histórico e as formulações substituídas.`)
cal=cal.replace(/- \*\*Parentesco da Débora e do André:\*\*[^\n]+/,'- **Identificação dos relatos:** Débora e André aparecem como aluna e aluno, conforme decisão da Helena. O vínculo de filho aparece na história de origem da família.')
cal=cal.replace('fontes em `apoio/v3`','copy atual em `apoio/v4` e fontes visuais em `apoio/v3`')
write('03-postagens.md',cal)
let main=read('README.md')
main=main.replace('**Postagens ManyChat: 14 copies para revisão**','**Postagens ManyChat: 14 copies revisadas**')
main=main.replace('[Postagens ManyChat: 14 copies para revisão]','[Postagens ManyChat: 14 copies revisadas]')
const marker='**Clareza aplicada ao conjunto, 13/10/2026:**'
if(!main.includes(marker))main=main.replace('## Posicionamento',`${marker} a régua aprovada em P01, P07 e P34 foi aplicada às demais postagens principais, aos extras, às vinte sequências de stories e às 14 peças ManyChat. [Registro e conferências](pesquisas/revisao-clareza-geral-2026-10-13.md). As três peças de referência e suas artes foram preservadas; as demais têm textos atualizados para a futura produção.\n\n## Posicionamento`)
write('README.md',main)
write('postagens/13-guia-de-copy.md',norm(fs.readFileSync(path.join(work,'guia-copy.md'),'utf8')))
write('postagens/15-guia-manychat.md',norm(fs.readFileSync(path.join(work,'guia-manychat.md'),'utf8')))
const mcReport=JSON.parse(fs.readFileSync(path.join(work,'manychat-revisto.json'),'utf8'))
let campaign=read('campanhas/manychat-desafio/README.md')
campaign=campaign.replace(/\| (MC\d+) \|[^\n]+/g,line=>{const id=line.match(/^\| (MC\d+)/)[1],r=mcReport.find(p=>p.id===id);if(!r)return line;const c=line.split('|').map(t=>t.trim());c[2]=r.title;if(r.seconds)c[3]=c[3].replace(/cerca de \d+ s/,`cerca de ${r.seconds} s`);return '| '+c.slice(1,-1).join(' | ')+' |'})
campaign=campaign.replace('Textos e roteiros completos para revisão;','Textos e roteiros completos revistos com a régua de clareza de P01, P07 e P34;')
write('campanhas/manychat-desafio/README.md',campaign)
let mc=read('04-postagens-manychat.md')
const head=mc.indexOf('## Como conferir')
mc=`# Postagens ManyChat: 14 copies e conversas de direct\n\n**Revisão de clareza, 13/10/2026.** Categoria separada do calendário, dos extras e dos fixados. As 14 peças foram revistas com a régua aprovada em P01, P07 e P34: palavras comuns, situações reconhecíveis e explicação de como a criança participa ao criar. Cada ficha contém referência, copy integral, legenda, palavra própria e duas mensagens de direct.\n\nAs palavras, referências e UTMs foram preservadas. As DMs apresentam o primeiro projeto e suas condições; os exemplos dos posts continuam identificados como demonstrações da equipe. As durações dos Reels são estimativas de leitura natural. As artes, a configuração da automação e a publicação são etapas posteriores.\n\n[Guia de copy](postagens/13-guia-de-copy.md) · [Guia ManyChat](postagens/15-guia-manychat.md) · [Fluxo curto](campanhas/manychat-desafio/fluxo-curto.md) · [Versão anterior](historico/2026-10-13-antes-clareza-geral/04-postagens-manychat.md).\n\n`+mc.slice(head)
mc=mc.replace('Cada linha da tabela foi medida em até 2,4 palavras por segundo','Cada linha da tabela foi estimada em até 2,2 palavras por segundo')
mc=mc.replace('Cada peça abre com a ideia da referência e desenvolve essa ideia na vida do pai. Só depois mostra um jogo feito pela nossa equipe no Estúdio.','Cada peça abre com a ideia da referência, relacionada ao interesse da família, e desenvolve a explicação antes da demonstração. Os jogos mostrados foram preparados pela nossa equipe no Estúdio.')
write('04-postagens-manychat.md',mc)
let flow=read('campanhas/manychat-desafio/fluxo-curto.md')
flow=flow.replace('aulas gravadas no computador e orientação para 9 a 14 anos','aulas gravadas no computador ou notebook, com mouse e teclado, e orientação para 9 a 14 anos')
flow=flow.replace('O uso livre é liberado conforme o avanço na Jornada.','O uso livre das ferramentas é liberado conforme seu filho avança nas etapas da Comunidade.')
flow=flow.replace('Uma frase situa o jogo do post como demonstração da nossa equipe.','Uma frase identifica o exemplo do post como demonstração da equipe, sem confundir as possibilidades mostradas com o conteúdo da compra.')
write('campanhas/manychat-desafio/fluxo-curto.md',flow)
fs.writeFileSync(path.join(work,'titulos-atuais.json'),JSON.stringify(Object.fromEntries(titles),null,2))
console.log('Índices, guias, metadados e fluxo sincronizados. IDs e ordem mantidos.')
