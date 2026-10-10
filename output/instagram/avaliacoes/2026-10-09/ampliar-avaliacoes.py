import json
from pathlib import Path

work = Path(__file__).resolve().parent
script = work / 'montar-stories.mjs'
backup = work / 'montar-stories-antes-ampliacao.mjs'
if not backup.exists():
    backup.write_bytes(script.read_bytes())
s = backup.read_text(encoding='utf-8')
s = s.replace("path.join(work, 'finais')", "path.join(work, 'finais-beneficios')")
s = s.replace("const photos = {", "const localImage = name => `data:image/png;base64,${fs.readFileSync(path.resolve(name)).toString('base64')}`;\nconst photos = {\n  fernando: localImage('output/instagram/alunos/2026-10-09/referencias/fernando.png'),\n  jeffrey: localImage('output/instagram/alunos/2026-10-09/referencias/jeffrey.png'),\n  daniel: localImage('output/instagram/avaliacoes/2026-10-09/fontes/daniel-12s.png'),\n  harle: localImage('output/instagram/avaliacoes/2026-10-09/fontes/harle-60s.png'),\n  flavia: localImage('output/instagram/avaliacoes/2026-10-09/fontes/flavia-60s.png'),")
additions = json.loads((work/'novos-relatos.json').read_text(encoding='utf-8'))
for a in additions:
    a['type']='quote'
    a.setdefault('quoteMarkup',a['quote'])
new_data = "\nconst additions = " + json.dumps(additions, ensure_ascii=False, indent=2) + ";\nstories.push(...additions);\nconst order=['AV01','AV02','AV08','AV03','AV10','AV07','AV09','AV04','AV11','AV06','AV12','AV05'];\nstories.sort((a,b)=>order.indexOf(a.id)-order.indexOf(b.id));\nfor(const [i,s] of stories.entries())s.file=String(i+1).padStart(2,'0')+'-'+(s.type==='quote'?'relato-'+(s.slug??s.photo):s.type==='intro'?'o-que-contam-sobre-as-aulas':'conheca-a-chave-do-farol')+'.png';\nconst people=['rafael','daniel','debora','jeffrey','harle','andre','fernando','flavia'].map(photo=>stories.find(s=>s.photo===photo));\n"
s = s.replace('\nconst css = `',new_data+'\nconst css = `')
s = s.replace(".quote-card blockquote:after{content:'”'}", '')
s = s.replace('<span class="quote-mark" aria-hidden="true">“</span><blockquote data-check>${s.quoteMarkup}</blockquote>', '<span class="quote-mark quote-open" aria-hidden="true">“</span><blockquote data-check>${s.quoteMarkup}</blockquote><span class="quote-mark quote-close" aria-hidden="true">”</span>')
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
.quote-mark{width:150px;height:145px}
.quote-close{top:auto;left:auto;right:66px;bottom:24px;text-align:right}
.AV08 .quote-card blockquote{font-size:60px;top:220px}
.AV09 .quote-card blockquote{font-size:60px;top:208px}
.AV10 .quote-card blockquote{font-size:65px;top:228px}
.AV11 .quote-card blockquote{font-size:66px;top:228px}
.AV12 .quote-card blockquote{font-size:59px;top:208px}
'''
s = s.replace('\n`;\n\nconst footer',extra_css+'\n`;\n\nconst face = (photo,name,extra="") => `<span class="face ${photo} ${extra}"><img src="${photos[photo]}" alt="${name}"></span>`;\nconst footer')
s = s.replace("${['rafael', 'debora', 'andre'].map(p => `<div class=\"voice\"><img src=\"${photos[p]}\" alt=\"\"></div>`).join('')}", "${people.map(s => `<div class=\"voice\">${face(s.photo,s.name)}</div>`).join('')}")
s = s.replace('<img class="portrait" src="${photos[s.photo]}" alt="${s.name}">','${face(s.photo,s.name,"portrait")}')
s = s.replace("'publicacao.md'", "'publicacao.txt'")
s = s.replace('Publicar as cinco imagens', 'Publicar as doze imagens').replace('No story 05,','No story 12,').replace('stories[4].sticker','stories.at(-1).sticker')
s = s.replace('Fotos originais dos depoimentos da oferta, sem recriar pessoas. Falas literais conferidas no roteiro, com nome, identificação como aluno ou aluna e contexto do relato.', 'Cinco crianças e três responsáveis. São dez cartelas de relatos, alternando uma criança e um responsável. Daniel aparece em duas cartelas, sobre organização e criatividade; Harle fala de responsabilidade; Flávia aparece em duas, sobre independência e uso da tela para criar. A abertura reúne os oito rostos, e o convite é a imagem 12. Fotos das crianças obtidas das referências fornecidas e da oferta; retratos dos responsáveis extraídos dos vídeos originais. Os trechos foram conferidos por uma segunda transcrição. A pontuação foi ajustada para leitura; cortes internos estão marcados com […]. As palavras e o sentido foram mantidos. Nome, participação e tema acompanham cada relato. Os novos vídeos falam sobre criar jogos, fazer as aulas e mudanças percebidas pelas famílias; não atribuir esses relatos especificamente ao Farol. Fontes e segundos de cada recorte estão em fontes-dos-relatos.txt.')
s = s.replace('A pontuação foi ajustada para leitura; cortes internos estão marcados com […].', 'A pontuação foi ajustada para leitura. Conforme orientação do usuário, as cartelas não exibem reticências ou colchetes; os recortes permanecem documentados no arquivo de fontes. As aspas de abertura e fechamento usam o mesmo estilo, fora do texto.')
s += "\nfs.writeFileSync(path.join(work,'copy-revisao.txt'), stories.map(s=>[s.title?.replaceAll('<br>',' '),s.name,s.role,s.context?.replaceAll('<br>',' '),s.quote,...s.paragraphs??[],s.sticker?.label].filter(Boolean).join('\\n')).join('\\n\\n'));\n"
script.write_text(s,encoding='utf-8')
(work/'novos-relatos.json').write_text(json.dumps(additions,ensure_ascii=False,indent=2),encoding='utf-8')
print('Montagem revisada: doze stories, dez cartelas de relatos e oito rostos.')
