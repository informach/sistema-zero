import fs from 'node:fs'
import path from 'node:path'
const root='docs/marketing/kids/comunidade-dos-criadores/instagram'
const updates={
 'producao/postagens/README.md':[['Cinco PNGs','Seis PNGs'],['os cinco PNGs','os seis PNGs'],['convite final para seguir o perfil','convite para seguir o perfil acrescentado como slide 6']],
 '03-postagens.md':[['P01 produzido em cinco slides','P01 produzido em seis slides'],['convite para seguir o perfil no final','convite para seguir o perfil em um sexto slide próprio']],
 'README.md':[['com cinco slides 4:5','com seis slides 4:5'],['A capa mostra a criança jogando; o final convida a seguir o perfil.','A capa mostra a criança jogando; o slide 5 conclui a ideia e o slide 6 convida a seguir o perfil.']],
 'postagens/05-direcao-visual-e-producao.md':[['Cinco slides produzidos','Seis slides produzidos'],['o último slide convida a seguir o perfil','o slide 5 preserva a conclusão e o slide 6 acrescenta o convite para seguir o perfil']],
 'pesquisas/revisao-60-dores-desejos-2026-10-12.md':[['P01 produzido em cinco slides','P01 produzido em seis slides'],['o último slide e a legenda convidam','o novo slide 6 e a legenda convidam'],['Os cinco PNGs','Os seis PNGs']],
 'producao/postagens/p01-uma-ideia-dele/apoio/prompts.md':[['Quatro ilustrações geradas','Cinco ilustrações geradas'],['A cena de conversa abaixo permanece apenas como referência de estilo e identidade fictícia usada na geração.','A cena de conversa abaixo é usada no novo slide 6, dedicado ao convite para seguir o perfil; também serviu de referência de estilo e identidade fictícia para a capa.']]
}
for(const [file,changes] of Object.entries(updates)){
 const target=path.join(root,file);let text=fs.readFileSync(target,'utf8')
 for(const [before,after] of changes){if(!text.includes(before))throw Error('Trecho ausente em '+file+': '+before);text=text.replace(before,after)}
 fs.writeFileSync(target,text)
}
const script='output/instagram/p01-2026-10-13/montar-carrossel.mjs'
let renderer=fs.readFileSync(script,'utf8')
renderer=renderer.replace('P01 · 5 slides ·','P01 · 6 slides ·').replace('0${i+1} / 05','0${i+1} / 06')
fs.writeFileSync(script,renderer)
