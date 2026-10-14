import fs from 'node:fs'
const dir='output/instagram/revisao-clareza-calendario/'
const st=dir+'stories.json'
fs.writeFileSync(st,fs.readFileSync(st,'utf8').replaceAll('\u2019},','\u2019"},'))
for(const f of ['p02-p10.json','p11-p20.json','p21-p30.json','p31-p40.json','p41-p50.json','p51-p60.json']){
 const data=JSON.parse(fs.readFileSync(dir+f,'utf8'))
 if(data.P10)data.P10.caption=data.P10.caption.map(p=>p.replace(' Não é uma promessa de resolver distrações; é algo concreto que ela pode construir e observar.',' Ao montar essa resposta, a criança testa se o jogador consegue perceber o resultado da própria ação.'))
 if(data.P21)data.P21.slides[0]=['O curso promete criatividade e raciocínio.','Peça para ver a atividade que trabalha isso.']
 if(data.P09)data.P09.slides[0]=['A atividade ficou pronta.','Mas sua filha sabe explicar uma escolha que fez?']
 if(data.P33)data.P33.caption[1]='‘Eu me sinto criando meus próprios jogos muito feliz, animado, para ver depois o que que vai dar.’ Imagine seu filho querendo compartilhar uma descoberta assim com você.'
 if(data.P39)data.P39.cover='Seu filho errou uma parte. Vejam o que pode ser aproveitado antes de refazer tudo.'
 if(data.P52)data.P52.caption[2]='Na demonstração deste post, um ataque forte às vezes erra e outro mais fraco sempre acerta. Quem criou escolheu essa diferença para oferecer duas opções ao jogador. Seu filho pode imaginar decisões parecidas a partir de um assunto de que gosta.'
 if(data.P45)data.P45.art=['Seu filho teve uma ideia para o jogo.','Criar permite testar o que ele imaginou e ver o resultado.']
 for(const [id,d]of Object.entries(data))if(d.art&&['P03','P08','P19','P29','P38','P45','P49','P58'].includes(id))d.title=d.art.slice(0,2).join(' ')
 if(data.P54){
  data.P54.slides[3]=['Na criação de um jogo, parar inclui conferir o salvamento.','Na atividade do Estúdio, esperem aparecer ‘Guardado na sua conta’, no cabeçalho, antes de fechar.']
  data.P54.caption=data.P54.caption.map(p=>p.replace('Na nossa plataforma, é preciso esperar aparecer ‘Salvo’ antes de fechar.','Na atividade do Estúdio, esperem ‘Guardado na sua conta’, no cabeçalho, antes de fechar.'))
  data.P54.visuals[3]='Captura real do cabeçalho da atividade no estado Guardado na sua conta, legível. Não usar apenas o Salvo do editor.'
 }
 fs.writeFileSync(dir+f,JSON.stringify(data,null,2))
}
