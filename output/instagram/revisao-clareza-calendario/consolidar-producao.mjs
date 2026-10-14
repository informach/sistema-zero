import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
const base=path.resolve('docs/marketing/kids/comunidade-dos-criadores/instagram')
const work=path.resolve('output/instagram/revisao-clareza-calendario')
const notes=JSON.parse(fs.readFileSync(path.join(work,'producao-consolidada.json'),'utf8'))
const origins=JSON.parse(fs.readFileSync(path.join(work,'originais.json'),'utf8'))
assert.equal(Object.keys(notes).length,57)
const read=f=>fs.readFileSync(path.join(base,f),'utf8').replaceAll('\r\n','\n')
const write=(f,s)=>fs.writeFileSync(path.join(base,f),s)
const files=[...new Set(origins.map(o=>'postagens/'+o.source))]
for(const f of files){
 let doc=read(f)
 for(const [id,note]of Object.entries(notes)){
  const start=doc.indexOf('## '+id+' · ');if(start<0)continue
  const next=doc.indexOf('\n<a id=',start),end=next<0?doc.length:next
  const section=doc.slice(start,end),prod=section.indexOf('**Produção:**')
  assert.ok(prod>=0,id+' produção')
  const source='../historico/2026-10-13-antes-clareza-geral/'+f+'#'+id.toLowerCase()
  const revised=section.slice(0,prod)+'**Produção:** '+note+'\n\n**Registro técnico anterior:** [Fontes e checagens do exemplo]('+source+'). As cenas, o texto e os tempos válidos para produzir são os desta ficha; instruções de revisões anteriores foram substituídas.\n'+(next<0?'':'\n---\n')
  doc=doc.slice(0,start)+revised+doc.slice(end)
 }
 doc=doc.replace('- demonstração de jogo só onde ela prova alguma coisa, sempre contada como teste da equipe;','- demonstração de jogo para explicar uma ação ou escolha, com a autoria identificada;')
 doc=doc.replace('- convite final que promete algo para a casa;','- convite final para acompanhar conteúdos sobre crianças criando jogos;')
 write(f,doc)
}
let mc=read('04-postagens-manychat.md')
const replacements=[
 [/^- \*\*Capa do Reel:\*\* ganhou[^\n]+\n/gm,''],
 [/^- \*\*Astronauta do slide 4:\*\*[^\n]+/gm,'- **Ideia imaginada:** o desenho da criança ilustra uma escolha, sem ser atribuído a aluno.'],
 ['reclamação que vira mudança','escolhas de quem cria'],
 ['- **O “20” do slide 7:**','- **Distância de produção:**'],
 ['com 30. É uma hipótese falada, no condicional.','com 30. A comparação deve mudar só esse valor.'],
 [/^- \*\*Gancho \(adaptação declarada\):\*\*[^\n]+/gm,'- **Gancho:** parte do fato contado pela família: uma parte do tempo de tela do André passou a ser usada para criar jogos.'],
 ['Pendência: a família ainda decide se assume o parentesco nas outras peças; esta mantém “nosso filho”.','Nas demais peças de avaliação, manter a identificação aluno/aluna, conforme orientação da Helena.'],
 [/^- \*\*“Muita profissão de hoje nem existia”:\*\*[^\n]+\n/gm,''],
 ['não publicar na semana do P25 ou do P55 (a mesma Base da Lua)','não publicar na semana do P25 (a mesma Base da Lua)'],
 ['não publicar na semana do P05, do P29 ou do P54 (a mesma vila e a tese do futuro)','não publicar na semana do P05 ou do P29 (a mesma vila ou o tema de futuro)'],
 ['não publicar na semana do P07, do P08, do P26 ou do P53 (a frase da criança, o “sou ruim nisso” e o mesmo Equilibrista)','não publicar na semana do P07, do P08 ou do P26 (a dificuldade numa tentativa ou o mesmo Equilibrista)'],
 ['e a tese “quem decide é gente” é nossa.','sem atribuir endosso ao maestro.'],
 ['A copy diz só que a regra do erro foi escrita por gente.','A copy mostra a alternância de vez e a mudança do vento como regras observáveis.'],
 [/^- \*\*Personagem do Molda:\*\*[^\n]+/gm,'- **Personagem do Molda:** usar a captura real indicada pela Helena, no editor, como inspiração em Minecraft. Sem atribuição de autoria não confirmada ou montagem que o coloque num jogo em funcionamento.'],
 ['[Guia de copy](postagens/13-guia-de-copy.md), seção 7.','[Guia de copy](postagens/13-guia-de-copy.md).']
]
for(const[a,b]of replacements)mc=mc.replace(a,b)
write('04-postagens-manychat.md',mc)
let visual=read('postagens/05-direcao-visual-e-producao.md')
visual=visual.replace('**Revisão: 13/10/2026, noite (revisão 4).**','**Revisão editorial: 13/10/2026, clareza geral.**')
visual=visual.replace('P01, P07 e P34 já foram refeitos conforme as fichas atuais; fontes, prompts e verificações estão em `apoio/v3` nas respectivas pastas. Todas as outras mídias aguardam produção.','P01, P07 e P34 são as referências de clareza preservadas. As demais fichas receberam novas copies, legendas e ajustes de cena; suas mídias aguardam produção. Seguir a ficha atual, sem recuperar textos ou cenas substituídos do histórico.')
visual=visual.replace('Nos posts que misturam relato e exemplo, como P14, P33, P34 e P53, a legenda diferencia explicitamente as duas fontes.','Nos posts que misturam relato e exemplo, como P34, P50 e P60, a legenda diferencia explicitamente as duas fontes. P14, P33 e P53 se concentram nos relatos, sem demonstração de jogo.')
visual=visual.replace('com textos e legendas conferidos contra a revisão 4','com textos e legendas atualizados na revisão de clareza das três referências')
write('postagens/05-direcao-visual-e-producao.md',visual)
let showcase=read('postagens/14-vitrine-de-exemplos.md')
showcase=showcase.replace('Veias novas surgem sozinhas.','Na versão básica, novos blocos surgem individualmente durante a partida.')
showcase=showcase.replace('Atenção: o boneco lembra muito a Alex, personagem padrão do Minecraft; o uso nas peças aguarda decisão da dona.','Usar a captura real indicada pela Helena como referência da ferramenta, sem atribuir a autoria a uma criança nem apresentar o modelo dentro de um jogo em funcionamento.')
write('postagens/14-vitrine-de-exemplos.md',showcase)
console.log('57 notas consolidadas; direções vigentes alinhadas às copies.')
