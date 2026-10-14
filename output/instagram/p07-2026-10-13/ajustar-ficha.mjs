import fs from 'node:fs'
const file='docs/marketing/kids/comunidade-dos-criadores/instagram/postagens/01-p01-a-p10.md'
let raw=fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n')
const production='**Produção: 13/10/2026.** [Prévia dos sete slides](../producao/postagens/p07-primeira-dificuldade/index.html) · [Artes, legenda e texto alternativo](../producao/postagens/p07-primeira-dificuldade/). Terceiro carrossel na ordem editorial, depois de P01 e P34.'
const extent='**Extensão:** 7 slides. Os seis primeiros desenvolvem e concluem a ideia; o sétimo acrescenta o convite para seguir o perfil.'
function editBlock(id,next,fn){const start=raw.indexOf(`<a id="${id}"></a>`),end=raw.indexOf(`<a id="${next}"></a>`);if(start<0||end<start)throw Error('Bloco não encontrado');raw=raw.slice(0,start)+fn(raw.slice(start,end))+raw.slice(end)}
editBlock('p04','p05',b=>b.replace('**Destino principal:** seguir o perfil para conhecer a criação de jogos;','**Destino principal:** a própria peça;').replace(extent,'**Extensão:** 6 slides.').replace(production+'\n\n',''))
editBlock('p07','p08',b=>b.replace('**Destino principal:** a própria peça;','**Destino principal:** seguir o perfil para conhecer a criação de jogos;').replace('**Extensão:** 6 slides.',extent+'\n\n'+production).replace('V07 é caso estrangeiro, não regra. Preparar e testar a cena de plataforma.','V07 é caso estrangeiro, não regra. Mini plataforma foi adaptado com duas plataformas e capturado no runtime oficial. As duas versões usam as mesmas teclas e o mesmo salto; só muda a posição da plataforma de destino. Medições e fontes em apoio/captura-real.json e apoio/fontes.md na pasta de produção.'))
fs.writeFileSync(file,raw)
