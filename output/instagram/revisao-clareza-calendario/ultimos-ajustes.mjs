import fs from 'node:fs'
import path from 'node:path'
const work=path.resolve('output/instagram/revisao-clareza-calendario')
const edit=(file,fn)=>{const p=path.join(work,file),d=JSON.parse(fs.readFileSync(p,'utf8'));fn(d);fs.writeFileSync(p,JSON.stringify(d,null,2)+'\n')}
edit('mc01-mc07.json',d=>{
 d.MC06.caption[2]='O jogo de bichinhos mostrado no post é uma demonstração das nossas ferramentas. Ele reúne personagens, lugares e regras diferentes. Ao experimentar e contar o que achou, sua filha ajuda você a conhecer melhor os interesses dela.'
 d.MC03.slides[6]=['‘Começou a ter a sua regra de todo dia ir lá olhar, ver o que que tem no curso pra ele fazer.’','Harle · pai do Jeffrey']
 d.MC03.caption[2]='Harle contou sobre o curso que Jeffrey fez com a gente: ‘Ele ficou mais responsável com as coisas dele.’ É a experiência dessa família. A fazenda mostrada é uma demonstração da equipe de como um projeto pode ser montado e testado em partes.'
})
edit('mc08-mc14.json',d=>{
 d.MC14.caption[2]='Ao montar um jogo, seu filho também precisa testar o que fez. Se uma ação não acontece, vale conferir a instrução daquela parte e voltar à explicação. Comparar o que esperava com o que apareceu ajuda a escolher por onde começar.'
})
const qa=path.join(work,'verificar.ts')
let s=fs.readFileSync(qa,'utf8')
s=s.replace("['MC03','Começou a ter a sua regra de todo dia ir lá olhar, ver o que que tem no curso pra ele fazer. Ele ficou mais responsável com as coisas dele.']", "['MC03','Começou a ter a sua regra de todo dia ir lá olhar, ver o que que tem no curso pra ele fazer.'],['MC03','Ele ficou mais responsável com as coisas dele.']")
fs.writeFileSync(qa,s)
console.log('Últimos ajustes de clareza e densidade preparados.')
