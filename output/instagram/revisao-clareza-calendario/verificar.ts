import fs from 'node:fs'
import path from 'node:path'
import {lintLightCopy} from '../../../packages/marketing/src/domain/copy/light-copy'
const base=path.resolve('docs/marketing/kids/comunidade-dos-criadores/instagram')
const work=path.resolve('output/instagram/revisao-clareza-calendario')
const read=(f:string)=>fs.readFileSync(path.join(base,f),'utf8').replaceAll('\r\n','\n')
const wc=(s:string)=>s.trim()?s.trim().split(/\s+/).length:0
const quoted=(s:string)=>[...s.matchAll(/(?:^>[^\n]*(?:\n|$))+/gm)].map(m=>m[0].replace(/^> ?/gm,'').trim())
const origins=JSON.parse(fs.readFileSync(path.join(work,'originais.json'),'utf8'))
const errors:string[]=[],warnings:string[]=[],pieces:any[]=[],files=new Set<string>()
function check(ok:unknown,message:string){if(!ok)errors.push(message)}
function sec(doc:string,id:string){const start=doc.indexOf('## '+id+' · '),end=doc.indexOf('\n<a id=',start);return start<0?'':doc.slice(start,end<0?undefined:end).trimEnd()}
for(const o of origins){
 const f='postagens/'+o.source;files.add(f)
 const s=sec(read(f),o.id);check(s,o.id+' existe')
 if(['P01','P07','P34'].includes(o.id))check(s===sec(read('historico/2026-10-13-antes-clareza-geral/'+f),o.id),o.id+' preservado integralmente')
 pieces.push({id:o.id,file:f,section:s})
}
for(const[f,prefix]of [['postagens/04-stories.md','ST'],['postagens/07-extras-para-familias.md','E'],['04-postagens-manychat.md','MC']]){
 files.add(f)
 const doc=read(f),matches=[...doc.matchAll(new RegExp('^## ('+prefix+'\\d+) · ','gm'))]
 for(let i=0;i<matches.length;i++)pieces.push({id:matches[i][1],file:f,section:doc.slice(matches[i].index,matches[i+1]?.index||doc.length)})
}
check(pieces.length===100,'100 peças no conjunto (incluindo as 3 preservadas)')
const summaries=[]
for(const p of pieces){
 const s=p.section,q=quoted(s)
 check(q.length>0,p.id+' tem texto completo')
 const captions=s.match(/### Legenda(?: completa)?\n+([\s\S]*?)(?=\n(?:\*\*|###|##|<a)|$)/)?.[1]
 const cap=quoted(captions||'').join('\n\n')
 const slides=[...s.matchAll(/### (?:Slide|Tela) (\d+)[^\n]*\n+([\s\S]*?)(?=\n###|\n\*\*Produção|$)/g)].map(m=>({n:+m[1],copy:quoted(m[2])[0]||'',visual:/\*\*Visual(?:\/alt)?:\*\* \S/.test(m[2])}))
 const rows=[...s.matchAll(/^\| (\d+)[–-](\d+) s \|([^\n]+)$/gm)].map(m=>{const cols=m[3].split('|').map(t=>t.trim());return {a:+m[1],b:+m[2],speech:p.id.startsWith('E')?cols[2]:cols[1],scene:p.id.startsWith('E')?cols[0]:cols[2]}})
 let end=0
 for(const row of rows){check(row.a===end&&row.b>row.a,p.id+' tempo contínuo');check(row.scene,p.id+' cena completa');if(row.speech&&!row.speech.includes('sem fala'))check(wc(row.speech)/(row.b-row.a)<=2.4,p.id+' tempo de fala');end=row.b}
 if(slides.length){check(slides.every((x,i)=>x.n===i+1&&x.copy&&x.visual),p.id+' slides completos, numerados e com visual');if(p.id.startsWith('ST'))check(slides.length===4,p.id+' quatro telas')}
 const first=rows.length?(s.match(/\*\*Capa(?: do Reel)?:\*\* ([^\n]+)/)?.[1]||''):q[0]
 const copy=q.join('\n\n')+'\n'+rows.map(r=>r.speech).join(' ')
 for(const issue of lintLightCopy(first))warnings.push(p.id+' capa: '+issue.label)
 for(const issue of lintLightCopy(copy).filter(x=>x.rule!==3))warnings.push(p.id+' corpo: '+issue.label)
 if(!p.id.startsWith('ST')){
  check(cap,p.id+' legenda')
  const opening=cap.split(/(?<=[.!?])\s/)[0]||''
  if(opening.length>120)warnings.push(p.id+' primeira frase da legenda: '+opening.length+' caracteres')
 }
 if(p.id.startsWith('P'))check(/siga/i.test(cap),p.id+' CTA seguir na legenda')
 if(p.id.startsWith('ST'))check(!/siga|comente \w+ para|oferta|link da bio/i.test(q.join(' ')),p.id+' sem convite comercial ou seguir')
 if(p.id.startsWith('MC')){
  const dm1=quoted(s.match(/\*\*DM1\*\*([\s\S]*?)\*\*Botão interno:/)?.[1]||'').join(' ')
  const dm2=quoted(s.match(/\*\*DM2 \(depois do toque\)\*\*([\s\S]*?)\*\*Botão de site:/)?.[1]||'').join(' ')
  check(wc(dm1)<=25&&dm1.includes('automática'),p.id+' DM1 curta e identificada')
  check(wc(dm2)<=70&&dm2.length<640,p.id+' DM2 curta')
  for(const t of ['Desafio do Primeiro Jogo','A Chave do Farol','Aulas gravadas','9 a 14','computador ou notebook','mouse e teclado','Pagamento único','30 dias após aprovação do pagamento','7 dias a partir da compra'])check(dm2.includes(t),p.id+' DM2: '+t)
  const publicPart=s.split('### Direct')[0]
  check(!/A Chave do Farol/.test(quoted(publicPart).join(' ')),p.id+' Farol só no direct')
  const old=sec(read('historico/2026-10-13-antes-clareza-geral/04-postagens-manychat.md'),p.id)
  const url=(text:string)=>text.match(/https:\/\/sistemazero\.com\.br\/kids\/desafio-primeiro-jogo\/oferta[^\s]+/)?.[0]
  check(url(s)===url(old),p.id+' UTM preservada')
  const kw=(text:string)=>text.match(/\*\*Palavra:\*\* ([^.]+)\./)?.[1]
  check(kw(s)===kw(old),p.id+' palavra preservada')
  const ref=(text:string)=>text.match(/\*\*Referência:\*\* (\[[^\n]+?\]\([^)]+\))/)?.[1]
  check(ref(s)===ref(old),p.id+' referência preservada')
 }
 summaries.push({id:p.id,slides:slides.length||undefined,seconds:end||undefined,captionWords:wc(cap)||undefined,maxSlideWords:slides.length?Math.max(...slides.map(x=>wc(x.copy))):undefined})
}
const cal=read('03-postagens.md'),backup=read('historico/2026-10-13-antes-clareza-geral/03-postagens.md')
const order=(s:string)=>[...s.matchAll(/\[P\d+ · [^\]]+\]\([^\n]+?\)/g)].map(m=>m[0].match(/\[(P\d+)/)![1])
check(JSON.stringify(order(cal))===JSON.stringify(order(backup)),'ordem P01–P60 preservada')
const needs=pieces.filter(p=>p.id.startsWith('P')).map(p=>p.section.match(/\*\*Necessidade:\*\* ([DW]\d+)/)?.[1])
check(new Set(needs).size===60&&!needs.includes(undefined),'60 necessidades distintas preservadas')
const quotes:[string,string][]=[['P14','Eu gosto bastante de produzir os meus jogos, porque é uma forma de eu expressar as minhas ideias.'],['P22','Achei que ia ser difícil, mas fui montando os bloquinhos e deu certo.'],['P33','Eu me sinto criando meus próprios jogos muito feliz, animado, para ver depois o que que vai dar.'],['P41','No início eu acompanhei mais, agora eu acompanho menos. Ele faz o curso com total independência no momento.'],['P50','No fim eu peguei o link e mandei pro meu amigo jogar.'],['P53','No último dia chamei a minha mãe pra ver o meu jogo.'],['P60','Esse foi o primeiro e já quero fazer um maior.'],['MC03','Começou a ter a sua regra de todo dia ir lá olhar, ver o que que tem no curso pra ele fazer.'],['MC03','Ele ficou mais responsável com as coisas dele.'],['MC07','O Fernando passava muito tempo nas telas, mas ele mais assistia, não desenvolvia nada. O curso incentivou ele a desenvolver, a programar, não a jogar.'],['MC11','Eu já jogava um monte, agora eu faço os meus jogos.']]
for(const[id,quote]of quotes)check(pieces.find(p=>p.id===id)?.section.includes(quote),id+' fala literal preservada')
const approved=new Set(['P01','P07','P34'])
const changed=pieces.filter(p=>!approved.has(p.id)).length
const report={pieces:pieces.length,changed,errors,warnings,summaries}
fs.writeFileSync(path.join(work,'verificacao.json'),JSON.stringify(report,null,2))
console.log(JSON.stringify({pieces:pieces.length,changed,errors,warnings,maxWordsStory:Math.max(...summaries.filter(p=>p.id.startsWith('ST')).map(p=>p.maxSlideWords||0)),longSlides:summaries.filter(p=>(p.maxSlideWords||0)>35)},null,2))
if(errors.length)process.exitCode=1
