import json
from pathlib import Path

work = Path(__file__).resolve().parent
script = work / 'montar-stories.mjs'
backup = work / 'montar-stories-antes-ampliacao.mjs'
if not backup.exists():
    backup.write_bytes(script.read_bytes())
s = backup.read_text(encoding='utf-8')
s = s.replace("path.join(work, 'finais')", "path.join(work, 'finais-ampliados')")
s = s.replace("const photos = {", "const localImage = name => `data:image/png;base64,${fs.readFileSync(path.resolve(name)).toString('base64')}`;\nconst photos = {\n  fernando: localImage('output/instagram/alunos/2026-10-09/referencias/fernando.png'),\n  jeffrey: localImage('output/instagram/alunos/2026-10-09/referencias/jeffrey.png'),\n  daniel: localImage('output/instagram/avaliacoes/2026-10-09/fontes/daniel-12s.png'),\n  harle: localImage('output/instagram/avaliacoes/2026-10-09/fontes/harle-60s.png'),\n  flavia: localImage('output/instagram/avaliacoes/2026-10-09/fontes/flavia-60s.png'),")
additions = [
    dict(id='AV06', name='Fernando', role='Aluno', photo='fernando', context='Relato sobre criar jogos.', quote='Eu me sinto criando meus próprios jogos muito feliz, animado, para ver depois o que que vai dar.', sourceFile=r'C:\Users\tocha\Downloads\Eu me sinto muito feliz fazendo isso _ Fernando, PCD.mp4', sourceStart=0, sourceEnd=8.14),
    dict(id='AV07', name='Jeffrey', role='Aluno', photo='jeffrey', context='Relato sobre criar jogos.', quote='Eu gosto bastante de produzir os meus jogos, porque é uma forma de eu expressar as minhas ideias.', sourceFile=r'C:\Users\tocha\Downloads\Ele conseguiu se expressar com isso _ Jeffrey, PCD.mp4', sourceStart=101.42, sourceEnd=109.34),
    dict(id='AV08', name='Daniel', role='Pai do Rafael', photo='daniel', context='Relato sobre as aulas.', quote='O Rafa ficou bastante empolgado com o curso. Acabava uma aula e ele vinha contar: “Aprendi isso aqui”, e me mostrava no computador.', sourceFile=r'C:\Users\tocha\Downloads\Isso trouxe para o meu filho organização, lógica e criatividade _ Daniel, PCD.mp4', sourceStart=60.16, sourceEnd=68.78),
    dict(id='AV09', name='Harle', role='Pai do Jeffrey', photo='harle', context='Relato sobre as aulas.', quote='Começou a ter a sua regra de todo dia ir lá olhar, ver o que que tem no curso pra ele fazer.', sourceFile=r'C:\Users\tocha\Downloads\Meu filho autista superou todas as expectativas _ Harle, PCD.mp4', sourceStart=69.48, sourceEnd=77.28),
    dict(id='AV10', name='Flávia', role='Mãe do Fernando', photo='flavia', context='Relato sobre as aulas.', quote='No início eu acompanhei mais, agora eu acompanho menos. Ele faz o curso com total independência no momento.', sourceFile=r'C:\Users\tocha\Downloads\Isso não incentivou meu filho a jogar, mas a desenvolver _ Flávia, PCD.mp4', sourceStart=56.14, sourceEnd=62.14),
]
for a in additions:
    a['type']='quote'
    a['quoteMarkup']=a['quote']
new_data = "\nconst additions = " + json.dumps(additions, ensure_ascii=False, indent=2) + ";\nstories.push(...additions);\nconst order=['AV01','AV02','AV08','AV03','AV07','AV09','AV04','AV06','AV10','AV05'];\nstories.sort((a,b)=>order.indexOf(a.id)-order.indexOf(b.id));\nfor(const [i,s] of stories.entries())s.file=String(i+1).padStart(2,'0')+'-'+(s.type==='quote'?'relato-'+s.photo:s.type==='intro'?'o-que-contam-sobre-as-aulas':'conheca-a-chave-do-farol')+'.png';\n"
s = s.replace('\nconst css = `',new_data+'\nconst css = `')
extra_css = '''
.title,.author h1{line-height:1.3}
.AV02 .quote-card blockquote,.AV03 .quote-card blockquote,.AV04 .quote-card blockquote{line-height:1.3}
.project .game{top:490px;height:710px}
.voices{left:122px;top:545px;width:836px;height:620px;display:grid;grid-template-columns:repeat(6,1fr);grid-template-rows:repeat(3,190px);gap:24px;align-items:center;justify-items:center}
.voice{grid-column:span 2;width:226px;height:190px;box-shadow:0 8px 0 #104bd6}
.voice:nth-child(2){transform:none}
.voice:nth-child(7){grid-column:2/span 2}.voice:nth-child(8){grid-column:4/span 2}
.voice:nth-child(3n){background:#ffc02e}.voice:nth-child(3n):after{background:#ffc02e}
.face{position:relative;display:block;width:162px;height:162px;overflow:hidden;border-radius:50%;flex:none;background:#e8eef6}
.face img{position:absolute;display:block;width:100%;height:100%;border-radius:0;object-fit:cover;max-width:none}
.face.jeffrey img{width:291%;height:auto;left:-43.2%;top:-14.5%}
.face.fernando img{width:291%;height:auto;left:-25.9%;top:-13.6%}
.face.daniel img{width:320%;height:auto;left:-182.5%;top:-27.5%}
.face.harle img{width:378.2%;height:auto;left:-153.9%;top:-49%}
.face.flavia img{width:523.6%;height:auto;left:-105.5%;top:-23.6%}
.portrait{position:absolute;width:154px;height:154px;top:285px;right:80px;border:5px solid white}
.intro-card{top:1210px;padding:28px 32px}
.intro-card p{font-size:44px;line-height:1.3;margin:0 0 25px}
.intro-card p:last-child{margin-bottom:0}
.quote-card blockquote{line-height:1.3}
.AV08 .quote-card blockquote{font-size:60px;top:220px}
.AV09 .quote-card blockquote{font-size:68px;top:228px}
.AV10 .quote-card blockquote{font-size:65px;top:228px}
'''
s = s.replace('\n`;\n\nconst footer',extra_css+'\n`;\n\nconst face = (photo,name,extra="") => `<span class="face ${photo} ${extra}"><img src="${photos[photo]}" alt="${name}"></span>`;\nconst footer')
s = s.replace("${['rafael', 'debora', 'andre'].map(p => `<div class=\"voice\"><img src=\"${photos[p]}\" alt=\"\"></div>`).join('')}", "${stories.filter(s=>s.type==='quote').map(s => `<div class=\"voice\">${face(s.photo,s.name)}</div>`).join('')}")
s = s.replace('<img class="portrait" src="${photos[s.photo]}" alt="${s.name}">','${face(s.photo,s.name,"portrait")}')
s = s.replace("'publicacao.md'", "'publicacao.txt'")
s = s.replace('Publicar as cinco imagens', 'Publicar as dez imagens').replace('No story 05,','No story 10,').replace('stories[4].sticker','stories[9].sticker')
s = s.replace('Fotos originais dos depoimentos da oferta, sem recriar pessoas. Falas literais conferidas no roteiro, com nome, identificação como aluno ou aluna e contexto do relato.', 'Cinco crianças e três responsáveis, intercalados. Fotos das crianças obtidas das referências fornecidas e da oferta; retratos dos responsáveis extraídos dos vídeos originais. As falas novas foram transcritas e os trechos escolhidos conferidos por uma segunda transcrição. A pontuação foi ajustada para leitura; as palavras e o sentido foram mantidos. Nome, participação e contexto acompanham cada relato. Os novos vídeos falam sobre criar jogos e fazer as aulas; não atribuir esses relatos especificamente ao Farol. Fontes e segundos dos trechos estão em fontes-dos-relatos.txt. A abertura reúne os oito rostos, sem lista ou quantidade fixa no texto.')
s += "\nfs.writeFileSync(path.join(work,'copy-revisao.txt'), stories.map(s=>[s.title?.replaceAll('<br>',' '),s.name,s.role,s.context?.replaceAll('<br>',' '),s.quote,...s.paragraphs??[],s.sticker?.label].filter(Boolean).join('\\n')).join('\\n\\n'));\n"
script.write_text(s,encoding='utf-8')
(work/'novos-relatos.json').write_text(json.dumps(additions,ensure_ascii=False,indent=2),encoding='utf-8')
print('Montagem ampliada: dez stories, oito relatos e oito rostos.')
